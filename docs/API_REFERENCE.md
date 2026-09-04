# API reference

> This is an unofficial reference, written against the "eSMS API Documentation v3.0" PDF published
> by Adeona Technologies. It describes what the SDK implements, not a guarantee of what Dialog's
> servers will do in every case. If something here disagrees with your own account's behavior, trust
> the account and open an issue.

## `EsmsClient` (POST / JSON API)

### Authentication

Handled automatically. See the "How token expiry is handled" section in the main
[README](./README.md). The underlying call is:

| | |
|---|---|
| Endpoint | `POST https://esms.dialog.lk/api/v2/user/login` |
| Body | `{ "username": string, "password": string }` |
| Token lifetime | 12 hours (`expiration: 43200` seconds), as of this writing |

### `client.sendSms(input)`

| | |
|---|---|
| Endpoint | `POST https://e-sms.dialog.lk/api/v2/sms` |
| Auth | `Authorization: Bearer <token>` header (handled for you) |

**Input**

| Field | Type | Required | Notes |
|---|---|---|---|
| `recipients` | `string[]` | yes | 9-digit local numbers, e.g. `"714551682"`. Duplicates are removed client-side before sending. |
| `message` | `string` | yes | The message body. |
| `sourceAddress` | `string` | no | Mask shown to the recipient. Max 11 characters. Falls back to the account's default mask. |
| `transactionId` | `number` | yes | 1 to 18 digits, unique per attempt. Reusing one already sent returns error `104`. |
| `paymentMethod` | `PaymentMethod` | no | `PaymentMethod.Wallet` (0, default) or `PaymentMethod.Package` (4). |
| `pushNotificationUrl` | `string` | no | Endpoint that receives delivery report callbacks. See the README's "Delivery reports" section. |

**Result** (`SendSmsResult`)

| Field | Notes |
|---|---|
| `campaignId` | Id of the created campaign. Use this with `checkTransactionStatus`. |
| `campaignCost` | Cost charged for this campaign, in LKR. |
| `walletBalance` | Remaining wallet balance after this campaign. |
| `userId`, `userMobile` | Account identifiers echoed back by the API. |
| `duplicatesRemoved` | How many numbers were removed as duplicates. |
| `invalidNumbers` | How many numbers were removed as invalid. |
| `maskBlockedNumbers` | How many recipients had blocked messages from the given mask. |
| `comment` | Raw success comment from the API. |

Throws `EsmsApiError` on failure, `EsmsValidationError` if local checks fail first.

> **Batch size note:** the document states the POST API has been reliability-tested up to 1000
> recipients per campaign. Going over that is not blocked by the SDK, since the document frames it
> as a recommendation, not a hard limit, but it logs a `console.warn` so you notice.

### `client.checkTransactionStatus(transactionId)`

| | |
|---|---|
| Endpoint | `POST https://e-sms.dialog.lk/api/v2/sms/check-transaction` |
| Auth | `Authorization: Bearer <token>` header (handled for you) |
| Rate limit | 120 requests per minute per account, per the documented limit (not enforced client-side) |

**Result** (`CheckTransactionResult`)

| Field | Notes |
|---|---|
| `transactionId` | Echoed back from the request. |
| `campaignStatus` | `"pending"` \| `"running"` \| `"completed"` |
| `comment` | Raw comment from the API. |

### Delivery report webhook (not an SDK method, a contract you implement)

If `pushNotificationUrl` was set on a `sendSms` call, the eSMS platform calls that URL back once per
recipient, as a plain `GET` request:

```
<push_notification_url>?campaignId=<id>&msisdn=<number>&status=<status>
```

| Status | Meaning |
|---|---|
| 1 | Successfully submitted to the carrier's SMSC |
| 2 | Submission failed (invalid number or connectivity failure) |
| 3 | Successfully delivered |
| 4 | Delivery failed |

The document notes that a successful delivery is reported in two separate calls (statuses 1 and 3),
and their order is not guaranteed, so treat either as a positive signal rather than expecting a
fixed sequence. The SDK exports `DeliveryStatus` and `DeliveryReportPayload` for building a typed
receiver; see `examples/express-delivery-webhook.ts`.

## `EsmsUrlClient` (GET / query-string API)

This API must be enabled on your account first by an administrator. Once enabled, generate a key
(`esmsqk`) from the "URL Message Key" section of the eSMS portal dashboard. That key does not expire
on a schedule; it stays valid until you regenerate or remove it from the portal, at which point the
old key stops working immediately.

### `client.sendSms(input)`

| | |
|---|---|
| Endpoint | `GET https://e-sms.dialog.lk/api/v1/message-via-url/create/urlcampaign` |
| Auth | `esmsqk` query parameter |

**Input**

| Field | Type | Required | Notes |
|---|---|---|---|
| `recipients` | `string[]` | yes | Accepts three documented formats per number: `"799999999"` (9 digits), `"0799999999"` (10 digits), or `"94799999999"` (11 digits). |
| `message` | `string` | yes | |
| `sourceAddress` | `string` | no | Same 11-character cap as the POST API. |
| `paymentMethod` | `PaymentMethod` | no | `Wallet` (0, default) or `Package` (4). |
| `pushNotificationUrl` | `string` | no | Same delivery report contract as the POST API. |

**Result** (`SendSmsViaUrlResult`): `{ success: true, code: 1 }` on success. Throws `EsmsApiError` on
any other numeric response, with `error.source === "get"`.

> **Batch size note:** the document states this endpoint has been reliability-tested up to 100
> recipients per campaign, a smaller number than the POST API. Same advisory, non-blocking warning
> behavior as above.

### `client.checkBalance()`

| | |
|---|---|
| Endpoint | `GET https://e-sms.dialog.lk/api/v1/message-via-url/check/balance` |
| Auth | `esmsqk` query parameter |

The raw response is a pipe-delimited string, `<code>|<balance>`. The SDK parses this into
`{ success: boolean, code: number, balance: number }` so you never have to split the string
yourself.

## Constants exported for reference

```ts
import {
  RATE_LIMITS_TPS,
  RECOMMENDED_MAX_RECIPIENTS_POST,
  RECOMMENDED_MAX_RECIPIENTS_GET,
  MAX_TRANSACTION_ID_DIGITS,
  MAX_SOURCE_ADDRESS_LENGTH,
  BLACKOUT_WINDOW_NOTE
} from "esms-gateway-sdk";
```

These mirror facts stated in the document (section 5, "API Utilization Related Restrictions", and
the various per-field notes throughout section 3). They exist for your own client-side throttling or
UI validation; the SDK itself does not enforce the ones that the document frames as advisory rather
than hard limits.
