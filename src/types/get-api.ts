import type { PaymentMethod } from "./common.js";

/**
 * Input accepted by {@link EsmsUrlClient.sendSms}.
 *
 * Unlike the POST API, this flow does not use a bearer token. It uses a
 * static `esmsqk` key generated once from the eSMS portal's "URL Message
 * Key" section, so there is no login step and no expiry to manage.
 */
export interface SendSmsViaUrlInput {
  /**
   * Recipient numbers. The GET API accepts three formats per number:
   * 9-digit ("799999999"), 10-digit with leading zero ("0799999999"), or
   * 11-digit with country code ("94799999999").
   */
  recipients: string[];
  message: string;
  sourceAddress?: string;
  paymentMethod?: PaymentMethod;
  pushNotificationUrl?: string;
}

/**
 * Numeric response codes returned as the entire (non-JSON) body of the
 * GET send-SMS endpoint. 1 means success; everything else maps to
 * {@link GET_SEND_ERROR_CODES}.
 */
export interface SendSmsViaUrlResult {
  success: boolean;
  code: number;
}

/**
 * Parsed result of `GET /api/v1/message-via-url/check/balance`.
 *
 * The raw response is a pipe-delimited string like `1|8.24` on success or
 * `2007|0` on failure. The SDK splits this into a typed object so callers
 * never have to parse the pipe format themselves.
 */
export interface CheckBalanceResult {
  success: boolean;
  code: number;
  balance: number;
}
