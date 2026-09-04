import type { HttpClient } from "../http/http-client.js";
import type { LoginCredentials, LoginResponseBody, StoredToken } from "../types/auth.js";
import { EsmsApiError } from "../errors/esms-error.js";
import { DEFAULT_REFRESH_SKEW_MS, DEFAULT_TOKEN_TTL_SECONDS, LOGIN_URL } from "../utils/constants.js";

export interface TokenManagerOptions {
  credentials: LoginCredentials;
  httpClient: HttpClient;
  /**
   * Milliseconds to refresh ahead of the documented expiry, guarding
   * against clock drift between this process and the eSMS server. See the
   * class-level doc comment for the full reasoning.
   */
  refreshSkewMs?: number;
  /**
   * Called every time a new token is issued. Useful for a consumer that
   * wants to persist the token externally (Redis, a file, a database) for
   * reuse across process restarts or multiple instances. This is entirely
   * optional; the SDK works correctly with purely in-memory storage.
   */
  onTokenRefreshed?: (token: string, expiresAt: number) => void;
}

/**
 * Owns the current access token and decides when it needs to be
 * refreshed, so that {@link EsmsClient} never has to think about login
 * timing itself.
 *
 * The API document's working-scenario diagram describes the intended
 * flow as: get token -> save in memory -> check expiry -> send SMS -> on
 * expiry, get a new token. This class implements that flow with two
 * independent safety nets, since relying on either alone has a real
 * failure mode:
 *
 * 1. **Proactive, time-based refresh.** Before every call, compare the
 *    current time against `issuedAt + expiration - refreshSkew`. This is
 *    the common path and normally means zero extra network calls: the
 *    token gets refreshed slightly before the server would consider it
 *    stale, so requests almost never hit an expired-token error at all.
 *
 * 2. **Reactive, one-shot retry on error 100.** The proactive check trusts
 *    the `expiration` value from login, but the server is the actual
 *    source of truth. If the account gets logged out early for any reason
 *    (an admin revokes it, the server's clock disagrees with ours, the
 *    token was invalidated some other way), the very next authenticated
 *    call will fail with error code 100. `EsmsClient` catches that
 *    specific error, asks this class to force a fresh login, and retries
 *    the original request exactly once. It does not retry more than once
 *    per call, since a second failure means something other than a stale
 *    token (bad credentials, a locked account) and endlessly retrying
 *    would just hide that.
 *
 * Concurrent callers are also handled: if several requests discover the
 * token is stale at the same moment, they all share one in-flight login
 * call instead of each independently calling the login endpoint.
 */
export class TokenManager {
  private readonly credentials: LoginCredentials;
  private readonly httpClient: HttpClient;
  private readonly refreshSkewMs: number;
  private readonly onTokenRefreshed: ((token: string, expiresAt: number) => void) | undefined;

  private current: StoredToken | null = null;
  private inFlightLogin: Promise<StoredToken> | null = null;

  public constructor(options: TokenManagerOptions) {
    this.credentials = options.credentials;
    this.httpClient = options.httpClient;
    this.refreshSkewMs = options.refreshSkewMs ?? DEFAULT_REFRESH_SKEW_MS;
    this.onTokenRefreshed = options.onTokenRefreshed;
  }

  /**
   * Returns a token guaranteed (as far as this process can tell) not to be
   * expired yet. Logs in on first use, and transparently re-logs in once
   * the cached token is close to its documented expiry.
   */
  public async getValidToken(): Promise<string> {
    if (this.current && !this.isStale(this.current)) {
      return this.current.token;
    }

    const stored = await this.login();
    return stored.token;
  }

  /**
   * Forces a fresh login regardless of what is cached, and replaces the
   * stored token with the result. Intended to be called by
   * {@link EsmsClient} exactly once, right after catching an error-100
   * response, as the reactive fallback described in the class doc comment.
   */
  public async forceRefresh(): Promise<string> {
    this.current = null;
    const stored = await this.login();
    return stored.token;
  }

  /** Discards the cached token, forcing the next call to log in again. Mainly useful in tests. */
  public invalidate(): void {
    this.current = null;
  }

  private isStale(stored: StoredToken): boolean {
    return Date.now() >= stored.expiresAt - this.refreshSkewMs;
  }

  /**
   * Performs the actual login request, de-duplicating concurrent calls so
   * that N callers discovering an expired token at the same instant
   * result in exactly one network request, not N of them.
   */
  private async login(): Promise<StoredToken> {
    if (this.inFlightLogin) {
      return this.inFlightLogin;
    }

    const loginPromise = this.performLogin().finally(() => {
      this.inFlightLogin = null;
    });

    this.inFlightLogin = loginPromise;
    return loginPromise;
  }

  private async performLogin(): Promise<StoredToken> {
    const body = await this.httpClient.postJson<LoginResponseBody>(LOGIN_URL, {
      username: this.credentials.username,
      password: this.credentials.password
    });

    if (body.status !== "success" || !body.token) {
      throw new EsmsApiError(body.errCode || "115", "post", body.comment);
    }

    const issuedAt = Date.now();
    const ttlSeconds = body.expiration ?? DEFAULT_TOKEN_TTL_SECONDS;
    const expiresAt = issuedAt + ttlSeconds * 1000;

    const stored: StoredToken = { token: body.token, issuedAt, expiresAt };
    this.current = stored;
    this.onTokenRefreshed?.(stored.token, stored.expiresAt);

    return stored;
  }
}
