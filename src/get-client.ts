import { EsmsApiError } from "./errors/esms-error.js";
import { HttpClient, type HttpClientOptions } from "./http/http-client.js";
import type { CheckBalanceResult, SendSmsViaUrlInput, SendSmsViaUrlResult } from "./types/get-api.js";
import { CHECK_BALANCE_VIA_URL_ENDPOINT, SEND_SMS_VIA_URL_ENDPOINT } from "./utils/constants.js";
import {
  assertNonEmptyRecipients,
  assertValidGetMsisdn,
  assertValidSourceAddress,
  dedupeRecipients,
  warnIfOverRecommendedBatchSize
} from "./utils/validators.js";

export interface EsmsUrlClientOptions {
  /**
   * The static key generated from the "URL Message Key" section of the
   * eSMS portal dashboard. This is not the same as the bearer token used
   * by {@link EsmsClient}; it does not expire on a schedule and stays
   * valid until you regenerate or remove it in the portal.
   */
  esmsqk: string;
  httpClientOptions?: HttpClientOptions;
}

/**
 * Client for Dialog's eSMS Gateway GET/query-string API: sending SMS via a
 * single URL request, and checking wallet balance.
 *
 * This is a separate, simpler API from {@link EsmsClient}. It has no
 * login step and no token expiry to manage, because authentication is a
 * single static key (`esmsqk`) generated once from the portal. The
 * document notes this functionality is opt-in per account: an
 * administrator has to enable it before the key even appears in the
 * portal.
 *
 * The trade-off is a smaller feature set: there is no campaign-status
 * lookup endpoint for this flow, and responses are plain numeric codes or
 * pipe-delimited text rather than JSON, both of which this client parses
 * into typed results for you.
 *
 * This is an unofficial SDK. It is not published or endorsed by Dialog
 * Axiata PLC or Adeona Technologies. See the package README for details.
 */
export class EsmsUrlClient {
  private readonly httpClient: HttpClient;
  private readonly esmsqk: string;

  public constructor(options: EsmsUrlClientOptions) {
    this.httpClient = new HttpClient(options.httpClientOptions);
    this.esmsqk = options.esmsqk;
  }

  /**
   * Sends an SMS campaign via a single GET request.
   *
   * @throws {EsmsValidationError} if the input fails local validation
   * before any network call is made.
   * @throws {EsmsApiError} if the eSMS API returns a code other than 1.
   */
  public async sendSms(input: SendSmsViaUrlInput): Promise<SendSmsViaUrlResult> {
    const recipients = dedupeRecipients(input.recipients);
    assertNonEmptyRecipients(recipients);
    recipients.forEach(assertValidGetMsisdn);
    if (input.sourceAddress) {
      assertValidSourceAddress(input.sourceAddress);
    }
    warnIfOverRecommendedBatchSize(recipients.length, "get");

    const params = new URLSearchParams({
      esmsqk: this.esmsqk,
      list: recipients.join(","),
      message: input.message
    });

    if (input.sourceAddress) {
      params.set("source_address", input.sourceAddress);
    }
    if (input.paymentMethod !== undefined) {
      params.set("paymentType", String(input.paymentMethod));
    }
    if (input.pushNotificationUrl) {
      params.set("push_notification_url", input.pushNotificationUrl);
    }

    const url = `${SEND_SMS_VIA_URL_ENDPOINT}?${params.toString()}`;
    const raw = await this.httpClient.getText(url);
    const code = this.parseIntegerResponse(raw);

    if (code !== 1) {
      throw new EsmsApiError(String(code), "get");
    }

    return { success: true, code };
  }

  /**
   * Checks the account's wallet balance. Only available for accounts
   * enabled for the GET-based SMS flow, per the document's prerequisite
   * note on this endpoint.
   */
  public async checkBalance(): Promise<CheckBalanceResult> {
    const url = `${CHECK_BALANCE_VIA_URL_ENDPOINT}?${new URLSearchParams({ esmsqk: this.esmsqk }).toString()}`;
    const raw = await this.httpClient.getText(url);

    const [codeText, balanceText] = raw.split("|");
    const code = Number.parseInt(codeText ?? "", 10);
    const balance = Number.parseFloat(balanceText ?? "0");

    if (Number.isNaN(code)) {
      throw new EsmsApiError("2002", "get", `Unrecognized balance response: "${raw}"`);
    }

    if (code !== 1) {
      throw new EsmsApiError(String(code), "get");
    }

    return { success: true, code, balance };
  }

  private parseIntegerResponse(raw: string): number {
    const trimmed = raw.trim();
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      throw new EsmsApiError("2002", "get", `Unrecognized response: "${raw}"`);
    }
    return parsed;
  }
}
