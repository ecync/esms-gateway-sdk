/**
 * Shared types used across both the POST (JSON) client and the GET
 * (query-string) client.
 */

/**
 * How a campaign gets paid for.
 *
 * The API document only defines two values: 0 for wallet balance and 4 for
 * a pre-purchased SMS package. New accounts should stick to `Wallet` unless
 * they know they have an active package, since `Package` fails with error
 * 110/2010 ("not eligible to consume packaging") on accounts without one.
 */
export enum PaymentMethod {
  Wallet = 0,
  Package = 4
}

/**
 * One recipient entry in the POST `/api/v2/sms` request body.
 *
 * The API expects a 9-digit local mobile number without the leading zero or
 * country code, e.g. "714551682" rather than "0714551682" or
 * "94714551682". The GET API is more lenient and accepts all three formats.
 */
export interface MsisdnEntry {
  mobile: string;
}

/**
 * A single request's standard envelope status, mirrored by both the login
 * and send-SMS POST endpoints.
 */
export type ApiStatus = "success" | "failed";
