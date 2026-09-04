import type { ApiStatus } from "./common.js";

/**
 * Credentials used to obtain an access token from
 * `POST /api/v2/user/login`.
 *
 * These are the same username and password used to sign in to the eSMS
 * web portal at https://esms.dialog.lk, not a separate API key.
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Raw JSON body returned by the login endpoint, before the SDK unwraps it
 * into a thrown error (on failure) or a plain token string (on success).
 *
 * The document marks `refreshToken` / `refreshExpiration` as reserved for
 * future use. The SDK still surfaces them in case Dialog activates refresh
 * tokens later, but nothing in the SDK currently relies on them.
 */
export interface LoginResponseBody {
  status: ApiStatus;
  comment: string;
  token: string | null;
  /** Seconds until the token expires. 43200 (12 hours) as of this writing. */
  expiration: number | null;
  /** Remaining login attempts before the account locks. Null on success. */
  remainingCount: number | null;
  refreshToken: string | null;
  refreshExpiration: number | null;
  /** Numeric error code as a string, e.g. "115" for bad credentials. Empty string on success. */
  errCode: string;
}

/**
 * A resolved, in-memory record of the current access token, kept by
 * {@link TokenManager}. `issuedAt` and `expiresAt` are wall-clock
 * milliseconds (`Date.now()`), computed from the login response's
 * `expiration` (seconds) at the moment the token was fetched.
 */
export interface StoredToken {
  token: string;
  issuedAt: number;
  expiresAt: number;
}
