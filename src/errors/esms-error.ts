import { describeErrorCode, POST_ERROR_CODES, GET_ERROR_CODES } from "./error-codes.js";

/**
 * Which error table an {@link EsmsApiError} was resolved against. Kept on
 * the error instance so callers (and log output) can tell at a glance
 * whether a numeric code came from the POST or the GET API.
 */
export type EsmsErrorSource = "post" | "get";

/**
 * Thrown whenever the eSMS API responds with a failure, whether that is a
 * `{ status: "failed" }` JSON envelope from the POST API or a non-1 numeric
 * code from the GET API.
 *
 * Wrapping failures in a real error class (instead of returning the raw
 * `errCode` string, the way the official Java/PHP plugins do) lets callers
 * use ordinary try/catch and `instanceof EsmsApiError` instead of manually
 * inspecting a status field after every call.
 */
export class EsmsApiError extends Error {
  /** Raw error code as returned by the API, e.g. "104" or "2007". */
  public readonly code: string;

  /** Human-readable description looked up from the matching error table. */
  public readonly description: string;

  /** Which error table this code was resolved against. */
  public readonly source: EsmsErrorSource;

  /** The raw `comment` field from the API response, when available. */
  public readonly apiComment: string | undefined;

  public constructor(code: string, source: EsmsErrorSource, apiComment?: string) {
    const table = source === "post" ? POST_ERROR_CODES : GET_ERROR_CODES;
    const description = describeErrorCode(table, code);
    const message = apiComment ? `${description} (${apiComment})` : description;

    super(`eSMS API error ${code}: ${message}`);
    this.name = "EsmsApiError";
    this.code = code;
    this.description = description;
    this.source = source;
    this.apiComment = apiComment;

    // Restores the correct prototype chain when compiled targets that
    // don't natively support extending built-ins (older transpilation
    // targets); harmless no-op on modern runtimes.
    Object.setPrototypeOf(this, EsmsApiError.prototype);
  }

  /** True when this is error code 100, the "token expired" signal the token manager retries on. */
  public isTokenExpired(): boolean {
    return this.source === "post" && this.code === "100";
  }
}
