import {
  MAX_SOURCE_ADDRESS_LENGTH,
  RECOMMENDED_MAX_RECIPIENTS_GET,
  RECOMMENDED_MAX_RECIPIENTS_POST
} from "./constants.js";

/** Thrown when input fails a check before a request is ever sent to the API. */
export class EsmsValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "EsmsValidationError";
    Object.setPrototypeOf(this, EsmsValidationError.prototype);
  }
}

/** 9-digit local mobile number, e.g. "714551682", as required by the POST send-SMS API. */
const NINE_DIGIT_MSISDN = /^\d{9}$/;

/**
 * The GET API additionally accepts a leading-zero 10-digit form and an
 * 11-digit form with the country code, per the document's `list` parameter
 * description.
 */
const TEN_DIGIT_MSISDN = /^0\d{9}$/;
const ELEVEN_DIGIT_MSISDN = /^94\d{9}$/;

/**
 * Validates a recipient number for the POST API, which only documents the
 * 9-digit format.
 */
export function assertValidPostMsisdn(mobile: string): void {
  if (!NINE_DIGIT_MSISDN.test(mobile)) {
    throw new EsmsValidationError(
      `"${mobile}" is not a valid recipient number. The POST send-SMS API expects a 9-digit local number, e.g. "714551682".`
    );
  }
}

/**
 * Validates a recipient number for the GET API, which accepts three
 * documented formats: 9, 10 (leading zero), or 11 (country code) digits.
 */
export function assertValidGetMsisdn(mobile: string): void {
  const isValid =
    NINE_DIGIT_MSISDN.test(mobile) || TEN_DIGIT_MSISDN.test(mobile) || ELEVEN_DIGIT_MSISDN.test(mobile);

  if (!isValid) {
    throw new EsmsValidationError(
      `"${mobile}" is not a valid recipient number. The GET send-SMS API accepts "799999999", "0799999999", or "94799999999" style formats.`
    );
  }
}

/**
 * The document specifies a transaction id must be a positive integer
 * between 1 and 18 digits combined. It doubles as the API's idempotency
 * key (reusing one returns error 104), so catching an out-of-range value
 * locally saves a wasted round trip.
 *
 * There is a subtlety worth calling out: JavaScript's `number` type can
 * only represent integers exactly up to `Number.MAX_SAFE_INTEGER`, which
 * is 9007199254740991, 16 digits. The document's 18-digit allowance is
 * wider than that. Rather than silently sending a value that has already
 * lost precision (which could produce a transaction id different from the
 * one the caller thinks they sent, and break the id's job as an
 * idempotency key), this validator rejects anything above the safely
 * representable range with a clear error, instead of pretending to
 * support the full 18-digit span. In practice this is not a real
 * limitation: a millisecond timestamp (`Date.now()`, 13 digits) or a
 * timestamp with a random suffix comfortably fits within the safe range.
 */
export function assertValidTransactionId(transactionId: number): void {
  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw new EsmsValidationError(`transactionId must be a positive integer, received: ${transactionId}`);
  }

  if (!Number.isSafeInteger(transactionId)) {
    throw new EsmsValidationError(
      `transactionId ${transactionId} exceeds Number.MAX_SAFE_INTEGER (${Number.MAX_SAFE_INTEGER}). ` +
        "JavaScript numbers above that can't be represented exactly, which risks sending a different " +
        "id than intended and defeating its use as an idempotency key. Use a smaller value, such as a " +
        "millisecond timestamp."
    );
  }

  // No separate digit-count check against MAX_TRANSACTION_ID_DIGITS (18) is
  // needed here: Number.MAX_SAFE_INTEGER tops out at 16 digits, which is
  // already inside the API's 18-digit allowance, so the safe-integer check
  // above is strictly the tighter constraint.
}

/** The document caps a custom mask/source address at 11 characters. */
export function assertValidSourceAddress(sourceAddress: string): void {
  if (sourceAddress.length > MAX_SOURCE_ADDRESS_LENGTH) {
    throw new EsmsValidationError(
      `sourceAddress "${sourceAddress}" is ${sourceAddress.length} characters long, which exceeds the documented maximum of ${MAX_SOURCE_ADDRESS_LENGTH}.`
    );
  }
}

/** A message list must contain at least one recipient. */
export function assertNonEmptyRecipients(recipients: string[]): void {
  if (recipients.length === 0) {
    throw new EsmsValidationError("At least one recipient is required.");
  }
}

/**
 * The document frames the recipient-count limits as a reliability
 * recommendation rather than a hard, enforced cap, so this only warns
 * (via the console) instead of throwing. Blocking a real send because of
 * a soft limit would be worse than letting the API make the final call.
 */
export function warnIfOverRecommendedBatchSize(recipientCount: number, api: "post" | "get"): void {
  const limit = api === "post" ? RECOMMENDED_MAX_RECIPIENTS_POST : RECOMMENDED_MAX_RECIPIENTS_GET;
  if (recipientCount > limit) {
    console.warn(
      `[esms-gateway-sdk] Sending to ${recipientCount} recipients in one campaign, above the ${limit} the ${api.toUpperCase()} API has been documented as reliably tested for. This may still work, but consider splitting into smaller batches.`
    );
  }
}

/**
 * Removes duplicate recipient numbers before a request is built. The API
 * also deduplicates server-side and reports the count back
 * (`duplicatesRemoved`), but doing it client-side too avoids sending a
 * bloated payload for large, dirty contact lists.
 */
export function dedupeRecipients(recipients: string[]): string[] {
  return Array.from(new Set(recipients));
}
