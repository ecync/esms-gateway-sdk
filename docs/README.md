# esms-gateway-sdk

An unofficial TypeScript SDK for Dialog's eSMS Gateway API, built by Adeona Technologies (Pvt) Ltd
and offered through the Dialog Marketplace.

> **This is not an official package.** It is not written, published, or endorsed by Dialog Axiata
> PLC or Adeona Technologies. It was built independently by implementing the publicly available
> "eSMS API Documentation v3.0" PDF in TypeScript. The eSMS platform and its API can change without
> notice, so for anything account, billing, or security related, treat
> [https://esms.dialog.lk](https://esms.dialog.lk) as the source of truth, not this SDK.

## What this covers

Dialog's eSMS Gateway actually exposes two separate ways to send a message, and this SDK ships a
client for each:

- **`EsmsClient`**, for the POST/JSON v2 API. This is the full-featured flow: you log in with a
  username and password, get back a bearer token, and use that token to send SMS and check campaign
  status. The SDK manages the token's lifecycle for you, so you never have to think about when to
  log in again.
- **`EsmsUrlClient`**, for the GET/query-string v1 API. This is a simpler, opt-in flow meant for
  quick integrations: an administrator enables it on your account, you generate a static key (called
  `esmsqk`) from the eSMS portal once, and every send is a single GET request built from that key.
  There is no login step and no token expiry here at all.

If you are not sure which one applies to you, use `EsmsClient`. It is the default, always-available
flow for every eSMS account.

## Installation

```bash
npm install esms-gateway-sdk
```

Requires Node.js 18 or newer (for native `fetch`).

## Quick start: POST API

```ts
import { EsmsClient, PaymentMethod } from "esms-gateway-sdk";

const client = new EsmsClient({
  credentials: {
    username: process.env.ESMS_USERNAME!,
    password: process.env.ESMS_PASSWORD!
  }
});

const result = await client.sendSms({
  recipients: ["714551682", "763625800"],
  message: "Your order has shipped.",
  transactionId: Date.now(), // must be unique per attempt, 1 to 18 digits
  paymentMethod: PaymentMethod.Wallet
});

console.log(result.campaignId, result.campaignCost, result.walletBalance);

const status = await client.checkTransactionStatus(result.campaignId);
console.log(status.campaignStatus); // "pending" | "running" | "completed"
```

You never need to call a login method yourself: the first call to `sendSms` or
`checkTransactionStatus` logs in automatically, caches the token in memory, and refreshes it before
it expires. If you want to fail fast on bad credentials (for example, at application startup), call
`client.login()` explicitly.

## Quick start: GET API

```ts
import { EsmsUrlClient } from "esms-gateway-sdk";

const client = new EsmsUrlClient({ esmsqk: process.env.ESMS_QK! });

const balance = await client.checkBalance();
console.log(`LKR ${balance.balance}`);

await client.sendSms({
  recipients: ["0799999999"],
  message: "Your OTP is 482913."
});
```

## Handling errors

Every failure from the eSMS API, whether it is a JSON `{ status: "failed" }` envelope from the POST
API or a bare numeric failure code from the GET API, is thrown as an `EsmsApiError`:

```ts
import { EsmsApiError } from "esms-gateway-sdk";

try {
  await client.sendSms({ recipients: ["714551682"], message: "Hi", transactionId: 1 });
} catch (error) {
  if (error instanceof EsmsApiError) {
    console.error(error.code, error.description); // e.g. "104", "Transaction ID has already been used"
  } else {
    throw error;
  }
}
```

Input that fails local validation (a malformed number, a transaction id outside the documented
range, a message with no recipients) is rejected before any network call, as an
`EsmsValidationError`. This saves you a round trip for mistakes that can be caught client-side.

See [ERROR_CODES.md](./ERROR_CODES.md) for the full list of codes from both APIs.

## How token expiry is handled

The eSMS login token is valid for 12 hours (`expiration: 43200` seconds, as returned by the login
call). `EsmsClient` handles refreshing it with two layers, so you don't have to:

1. **Time-based refresh.** Before every request, the SDK checks whether the cached token is close
   to its documented expiry (with a small safety margin) and quietly logs in again first if so. This
   is the normal path and adds no extra request in the common case, since it only fires once every 12
   hours or so.
2. **Fallback on error 100.** If the server ever rejects a token early for a reason the client
   couldn't have predicted (a clock difference between processes, a manually revoked session), the
   very next authenticated call comes back with error code `100`. The SDK catches that specific case,
   logs in again, and retries the original request exactly once before giving up.

If your process crashes and restarts, or if you run several instances of your app, each `EsmsClient`
starts with no cached token and logs in on its first call, which is expected. If you need to share a
token across processes, pass an `onTokenRefreshed` callback in the client options and persist the
token yourself (Redis, a shared cache, whatever fits your infrastructure); this is optional, the SDK
works correctly without it.

```ts
const client = new EsmsClient({
  credentials: { username, password },
  onTokenRefreshed: (token, expiresAt) => {
    // Persist token/expiresAt somewhere shared, if you need to.
  }
});
```

## Delivery reports

If you pass `pushNotificationUrl` on a send-SMS call, the eSMS platform calls that URL back with a
plain GET request for every recipient, carrying `campaignId`, `msisdn`, and `status` as query
parameters. The SDK does not run a server for you (it can't guess your framework), but it exports
the shape of that callback (`DeliveryReportPayload`, `DeliveryStatus`) so you can build a typed
receiver. See `examples/express-delivery-webhook.ts` for a working reference implementation using
Node's built-in `http` module.

## Rate limits and other documented constraints

Dialog documents these limits at the account level. The SDK does not enforce them (the authoritative
check happens on their side), but they are exported as constants for your own reference or
client-side throttling:

- Send SMS: 20 transactions per second
- General API consumption: 30 transactions per second
- Campaign status checks: 2 transactions per second (120 per minute)
- Recommended batch size: up to 1000 recipients per POST campaign, up to 100 per GET campaign
- A system blackout window, generally 20:00 to 08:00 Sri Lanka time, during which new campaigns are
  rejected with error 118 (POST) or 2013 (GET). The exact hours are subject to change on Dialog's
  side.

```ts
import { RATE_LIMITS_TPS, BLACKOUT_WINDOW_NOTE } from "esms-gateway-sdk";
```

## Testing this SDK's own code

This repository uses Vitest. See [../test](../test) for the suite and
[Test environment](#test-environment-details) below for how the mocking approach works if you want
to extend it.

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

### Test environment details

`HttpClient` accepts an injectable `fetchImpl`, so tests never touch the real network. They pass a
`vi.fn()` that returns hand-built `Response` objects shaped exactly like the JSON and plain-text
bodies documented in the eSMS API PDF. Token-expiry behavior is tested with `vi.useFakeTimers()`,
simulating time passing well past the 12-hour token lifetime and asserting that exactly one new
login call happens, plus a separate test proving that five concurrent calls made right as a token
expires still only trigger one login request.

## More documentation

- [API_REFERENCE.md](./API_REFERENCE.md): full endpoint-by-endpoint parameter and response tables.
- [ERROR_CODES.md](./ERROR_CODES.md): both error code tables, POST and GET.
- [FAQ.md](./FAQ.md): common questions, carried over from the official documentation.
