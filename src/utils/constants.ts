/**
 * Values documented in the eSMS API v3.0 PDF that are not configuration,
 * just facts about how the API behaves. Centralizing them here means a
 * future API version bump only needs one edit instead of a search across
 * the codebase.
 */

/** Base URL for the POST/JSON v2 endpoints (login, send SMS, check transaction). */
export const POST_API_BASE_URL = "https://e-sms.dialog.lk/api/v2";

/** Base URL for the GET/query-string v1 endpoints. */
export const GET_API_BASE_URL = "https://e-sms.dialog.lk/api/v1";

/**
 * The login endpoint lives on a slightly different host in the document
 * (`esms.dialog.lk` rather than `e-sms.dialog.lk`). This is called out
 * explicitly rather than assumed, since it is easy to misread as a typo.
 */
export const LOGIN_URL = "https://esms.dialog.lk/api/v2/user/login";

export const SEND_SMS_URL = `${POST_API_BASE_URL}/sms`;
export const CHECK_TRANSACTION_URL = `${POST_API_BASE_URL}/sms/check-transaction`;
export const SEND_SMS_VIA_URL_ENDPOINT = `${GET_API_BASE_URL}/message-via-url/create/urlcampaign`;
export const CHECK_BALANCE_VIA_URL_ENDPOINT = `${GET_API_BASE_URL}/message-via-url/check/balance`;

/** Token lifetime as documented, in seconds (12 hours). Used only as a fallback if a login response omits `expiration`. */
export const DEFAULT_TOKEN_TTL_SECONDS = 43200;

/**
 * How long before the documented expiry the token manager proactively
 * refreshes, in milliseconds. Guards against clock drift between this
 * process and the eSMS server, and against a request that starts just
 * before expiry and finishes just after.
 */
export const DEFAULT_REFRESH_SKEW_MS = 60_000;

/** Recommended maximum recipients per campaign for the POST API, per the document's reliability note. */
export const RECOMMENDED_MAX_RECIPIENTS_POST = 1000;

/** Recommended maximum recipients per campaign for the GET API. */
export const RECOMMENDED_MAX_RECIPIENTS_GET = 100;

/** Maximum length allowed for a custom sourceAddress / mask, in characters. */
export const MAX_SOURCE_ADDRESS_LENGTH = 11;

/** Maximum number of digits allowed in a transaction_id. */
export const MAX_TRANSACTION_ID_DIGITS = 18;

/**
 * Documented per-account throughput limits (transactions per second).
 * These are enforced by Dialog's infrastructure, not by this SDK; they are
 * exposed here purely for reference in client-side rate limiting if a
 * consumer wants to self-throttle.
 */
export const RATE_LIMITS_TPS = {
  sendSms: 20,
  apiConsumption: 30,
  campaignStatusCheck: 2
} as const;

/**
 * The document states that campaigns cannot be created during a system
 * blackout window, generally 8 PM to 8 AM local (Sri Lanka) time, though it
 * notes this may vary by internal policy. This constant is informational
 * only: the SDK does not block requests during this window, since the
 * authoritative check happens server-side (error 118 / 2013) and the
 * documented hours are explicitly approximate.
 */
export const BLACKOUT_WINDOW_NOTE =
  "Campaign creation may be blocked roughly between 20:00 and 08:00 Sri Lanka time. This is enforced by the eSMS platform, not this SDK, and the exact hours can change without notice.";
