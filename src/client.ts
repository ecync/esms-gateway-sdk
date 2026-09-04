import { TokenManager, type TokenManagerOptions } from "./auth/token-manager.js";
import { EsmsApiError } from "./errors/esms-error.js";
import { HttpClient, type HttpClientOptions } from "./http/http-client.js";
import type { LoginCredentials } from "./types/auth.js";
import { PaymentMethod, type MsisdnEntry } from "./types/common.js";
import type {
  CheckTransactionResponseBody,
  CheckTransactionResult,
  SendSmsInput,
  SendSmsRequestBody,
  SendSmsResponseBody,
  SendSmsResult
} from "./types/sms.js";
import { CHECK_TRANSACTION_URL, SEND_SMS_URL } from "./utils/constants.js";
import {
  assertNonEmptyRecipients,
  assertValidPostMsisdn,
  assertValidSourceAddress,
  assertValidTransactionId,
  dedupeRecipients,
  warnIfOverRecommendedBatchSize
} from "./utils/validators.js";

export interface EsmsClientOptions extends Pick<TokenManagerOptions, "refreshSkewMs" | "onTokenRefreshed"> {
  credentials: LoginCredentials;
  /** Advanced: override HTTP behavior (custom fetch implementation, timeout). Mainly for tests. */
  httpClientOptions?: HttpClientOptions;
}

/**
 * Client for Dialog's eSMS Gateway POST/JSON API (login, send SMS, check
 * campaign status by transaction id).
 *
 * Authentication is handled automatically: the first call logs in, the
 * token is cached in memory, and it is refreshed proactively before it
 * expires or reactively if the server ever rejects it with error 100. See
 * {@link TokenManager} for the full explanation of that logic. Callers
 * never need to call a "login" method themselves, though {@link login} is
 * exposed for cases where warming the token up front is useful (for
 * example, at application startup, to fail fast on bad credentials).
 *
 * This is an unofficial SDK. It is not published or endorsed by Dialog
 * Axiata PLC or Adeona Technologies. See the package README for details.
 */
export class EsmsClient {
  private readonly httpClient: HttpClient;
  private readonly tokenManager: TokenManager;

  public constructor(options: EsmsClientOptions) {
    this.httpClient = new HttpClient(options.httpClientOptions);
    this.tokenManager = new TokenManager({
      credentials: options.credentials,
      httpClient: this.httpClient,
      ...(options.refreshSkewMs !== undefined ? { refreshSkewMs: options.refreshSkewMs } : {}),
      ...(options.onTokenRefreshed !== undefined ? { onTokenRefreshed: options.onTokenRefreshed } : {})
    });
  }

  /**
   * Explicitly logs in and caches the token. Calling this is optional:
   * {@link sendSms} and {@link checkTransactionStatus} will log in
   * automatically on first use. Call it directly when you want to
   * validate credentials before your application starts serving traffic.
   */
  public async login(): Promise<void> {
    await this.tokenManager.getValidToken();
  }

  /**
   * Sends an SMS campaign to one or more recipients.
   *
   * @throws {EsmsValidationError} if the input fails local validation
   * (bad msisdn format, transaction id out of range, sourceAddress too
   * long, or an empty recipient list) before any network call is made.
   * @throws {EsmsApiError} if the eSMS API itself rejects the request.
   */
  public async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    const recipients = dedupeRecipients(input.recipients);
    assertNonEmptyRecipients(recipients);
    recipients.forEach(assertValidPostMsisdn);
    assertValidTransactionId(input.transactionId);
    if (input.sourceAddress) {
      assertValidSourceAddress(input.sourceAddress);
    }
    warnIfOverRecommendedBatchSize(recipients.length, "post");

    const msisdn: MsisdnEntry[] = recipients.map((mobile) => ({ mobile }));
    const body: SendSmsRequestBody = {
      msisdn,
      message: input.message,
      transaction_id: input.transactionId,
      ...(input.sourceAddress ? { sourceAddress: input.sourceAddress } : {}),
      ...(input.paymentMethod !== undefined ? { payment_method: input.paymentMethod } : {}),
      ...(input.pushNotificationUrl ? { push_notification_url: input.pushNotificationUrl } : {})
    };

    const response = await this.callWithTokenRetry<SendSmsResponseBody>((headers) =>
      this.httpClient.postJson<SendSmsResponseBody>(SEND_SMS_URL, body, headers)
    );

    if (response.status !== "success" || !response.data) {
      throw new EsmsApiError(response.errCode, "post", response.comment);
    }

    return {
      comment: response.comment,
      campaignId: response.data.campaignId,
      campaignCost: response.data.campaignCost,
      walletBalance: response.data.walletBalance,
      userId: response.data.userId,
      userMobile: response.data.userMobile,
      duplicatesRemoved: response.data.duplicatesRemoved,
      invalidNumbers: response.data.invalidNumbers ?? 0,
      maskBlockedNumbers: response.data.mask_blocked_numbers ?? 0
    };
  }

  /**
   * Looks up the delivery status of a campaign previously created with
   * {@link sendSms}, by the same transaction id you supplied at send time.
   *
   * The document caps this endpoint at 120 requests per minute per
   * account; the SDK does not enforce that limit itself, since the
   * authoritative check happens server-side.
   */
  public async checkTransactionStatus(transactionId: number): Promise<CheckTransactionResult> {
    assertValidTransactionId(transactionId);

    const response = await this.callWithTokenRetry<CheckTransactionResponseBody>((headers) =>
      this.httpClient.postJson<CheckTransactionResponseBody>(
        CHECK_TRANSACTION_URL,
        { transaction_id: transactionId },
        headers
      )
    );

    if (response.status !== "success" || !response.data) {
      throw new EsmsApiError(response.errCode, "post", response.comment);
    }

    return {
      transactionId: response.transaction_id,
      campaignStatus: response.data["campaign status"],
      comment: response.comment
    };
  }

  /**
   * Runs an authenticated request, transparently handling the reactive
   * token-expiry fallback described on {@link TokenManager}: if the API
   * comes back with error 100, the token manager is asked for a fresh
   * token and the request is retried exactly once.
   */
  private async callWithTokenRetry<TResponse extends { status: string; errCode: string; comment: string }>(
    run: (headers: Record<string, string>) => Promise<TResponse>
  ): Promise<TResponse> {
    const token = await this.tokenManager.getValidToken();
    const response = await run(this.authHeader(token));

    if (response.status === "failed" && response.errCode === "100") {
      const freshToken = await this.tokenManager.forceRefresh();
      return run(this.authHeader(freshToken));
    }

    return response;
  }

  private authHeader(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
  }
}

export { PaymentMethod };
