import type { ApiStatus, MsisdnEntry, PaymentMethod } from "./common.js";

/**
 * Input accepted by {@link EsmsClient.sendSms}. The SDK builds the raw
 * `msisdn` array and numeric `payment_method` for you from this shape.
 */
export interface SendSmsInput {
  /** Recipient numbers as 9-digit local numbers, e.g. "714551682". */
  recipients: string[];
  message: string;
  /**
   * Mask visible to the recipient. Falls back to the account's default
   * mask when omitted. Maximum 11 characters, per the API document.
   */
  sourceAddress?: string;
  /**
   * A caller-supplied unique id, 1 to 18 digits. Reusing an id you've
   * already sent returns error 104 ("Transaction ID is already used"),
   * which the API uses as its idempotency guard against retries.
   */
  transactionId: number;
  paymentMethod?: PaymentMethod;
  /**
   * Endpoint the eSMS platform calls back with delivery status updates.
   * See {@link DeliveryReportPayload} for the shape of that callback.
   */
  pushNotificationUrl?: string;
}

/** Exact JSON body shape sent to `POST /api/v2/sms`. */
export interface SendSmsRequestBody {
  msisdn: MsisdnEntry[];
  message: string;
  sourceAddress?: string;
  transaction_id: number;
  payment_method?: PaymentMethod;
  push_notification_url?: string;
}

/** `data` object on a successful send-SMS response. */
export interface SendSmsResponseData {
  campaignId: number;
  campaignCost: number;
  walletBalance: number;
  userMobile: number;
  userId: number;
  duplicatesRemoved: number;
  invalidNumbers?: number;
  mask_blocked_numbers?: number;
}

/** Raw JSON body returned by `POST /api/v2/sms`. */
export interface SendSmsResponseBody {
  status: ApiStatus;
  comment: string;
  data: SendSmsResponseData | "" | null;
  errCode: string;
}

/** The result the SDK hands back after a successful send. */
export interface SendSmsResult {
  comment: string;
  campaignId: number;
  campaignCost: number;
  walletBalance: number;
  userId: number;
  userMobile: number;
  duplicatesRemoved: number;
  invalidNumbers: number;
  maskBlockedNumbers: number;
}

/** Lifecycle state of a created campaign, as returned by the status-check endpoint. */
export type CampaignStatus = "pending" | "running" | "completed";

/** Raw JSON body returned by `POST /api/v2/sms/check-transaction`. */
export interface CheckTransactionResponseBody {
  status: ApiStatus;
  comment: string;
  data: { "campaign status": CampaignStatus } | "" | null;
  errCode: string;
  transaction_id: number;
}

/** The result the SDK hands back after checking a transaction's status. */
export interface CheckTransactionResult {
  transactionId: number;
  campaignStatus: CampaignStatus;
  comment: string;
}
