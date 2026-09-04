/**
 * Delivery status codes the eSMS platform sends when it calls back the
 * `push_notification_url` supplied on a send-SMS request.
 *
 * The API document notes that success is reported in two steps (submitted,
 * then delivered) and that the order between them is not guaranteed, so a
 * receiver should treat either 1 or 3 as a positive signal rather than
 * waiting for a specific sequence.
 */
export enum DeliveryStatus {
  /** Successfully handed off to the carrier's SMSC. */
  SubmittedToSmsc = 1,
  /** Submission failed: invalid number or a connectivity failure. */
  SubmissionFailed = 2,
  /** Confirmed delivered to the handset. */
  Delivered = 3,
  /** Delivery failed after submission. */
  DeliveryFailed = 4
}

/**
 * Query parameters the eSMS platform appends to your `push_notification_url`
 * for each recipient in a campaign.
 *
 * This type exists purely as a reference contract. The SDK does not run a
 * server for you; see `examples/express-delivery-webhook.ts` for a sample
 * receiver you can adapt to your own framework.
 */
export interface DeliveryReportPayload {
  campaignId: number;
  msisdn: string;
  status: DeliveryStatus;
}

/** Human-readable description for each {@link DeliveryStatus} value. */
export const DELIVERY_STATUS_DESCRIPTIONS: Record<DeliveryStatus, string> = {
  [DeliveryStatus.SubmittedToSmsc]: "Successfully submitted to SMSC",
  [DeliveryStatus.SubmissionFailed]: "SMS submission failed due to an invalid number or a connectivity failure",
  [DeliveryStatus.Delivered]: "Successfully delivered",
  [DeliveryStatus.DeliveryFailed]: "Delivery failed"
};
