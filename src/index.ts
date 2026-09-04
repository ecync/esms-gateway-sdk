/**
 * esms-gateway-sdk
 *
 * An unofficial, community-built TypeScript SDK for Dialog's eSMS Gateway
 * API (published by Adeona Technologies (Pvt) Ltd). This package is not
 * affiliated with, endorsed by, or published by Dialog Axiata PLC or
 * Adeona Technologies. It was built by implementing the publicly
 * available "eSMS API Documentation v3.0" PDF in TypeScript.
 *
 * The eSMS platform and its API can change without notice. Treat
 * https://esms.dialog.lk as the source of truth for account setup,
 * credentials, and any behavior this SDK might not yet reflect.
 */

export { EsmsClient, type EsmsClientOptions } from "./client.js";
export { EsmsUrlClient, type EsmsUrlClientOptions } from "./get-client.js";

export { TokenManager, type TokenManagerOptions } from "./auth/token-manager.js";
export { HttpClient, EsmsTimeoutError, EsmsResponseParseError, type HttpClientOptions, type FetchLike } from "./http/http-client.js";

export { EsmsApiError, type EsmsErrorSource } from "./errors/esms-error.js";
export { POST_ERROR_CODES, GET_ERROR_CODES, describeErrorCode } from "./errors/error-codes.js";

export { EsmsValidationError } from "./utils/validators.js";
export * from "./utils/constants.js";

export { PaymentMethod } from "./types/common.js";
export type { MsisdnEntry, ApiStatus } from "./types/common.js";
export type { LoginCredentials, LoginResponseBody, StoredToken } from "./types/auth.js";
export type {
  SendSmsInput,
  SendSmsRequestBody,
  SendSmsResponseBody,
  SendSmsResponseData,
  SendSmsResult,
  CampaignStatus,
  CheckTransactionResponseBody,
  CheckTransactionResult
} from "./types/sms.js";
export type { SendSmsViaUrlInput, SendSmsViaUrlResult, CheckBalanceResult } from "./types/get-api.js";
export {
  DeliveryStatus,
  DELIVERY_STATUS_DESCRIPTIONS,
  type DeliveryReportPayload
} from "./types/delivery-report.js";
