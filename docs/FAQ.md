# FAQ

These questions are carried over from the official eSMS API documentation's FAQ section, reworded
here in the context of using this SDK specifically.

## Why can't I see the "URL Message Key" section on my eSMS dashboard?

That section is what lets you generate the `esmsqk` key used by `EsmsUrlClient`. If it's missing:

- Try clearing your browser cache and logging in to the portal again.
- If it still doesn't show up, your account has not been given access to this feature yet. It is
  opt-in per account, so contact the eSMS administrator to have it enabled.

This is not something the SDK can fix on its own; it is an account-level setting on Dialog's side.

## I'm getting error 104 on retry. What does that mean?

Error 104 ("Transaction ID has already been used") means the transaction id you supplied has
already been registered by the system, whether or not the original send actually succeeded. The API
uses transaction ids as an idempotency key specifically to protect against duplicate sends caused by
retried requests.

If you need to retry a failed send, generate a new transaction id for the retry. Don't reuse the one
from the failed attempt. A common pattern is `Date.now()` or a UUID converted to a numeric hash, as
long as it stays within the documented 1-to-18-digit range (`assertValidTransactionId` in this SDK
enforces that range before any request goes out).

## Why does `sendSms` sometimes log in before sending, and sometimes not?

`EsmsClient` caches its access token in memory and only logs in again when the cached token is
close to its documented 12-hour expiry, or when the server rejects it early with error 100. On a
freshly created client, the very first call always triggers a login, since there is nothing cached
yet. Every call after that reuses the same token until it needs refreshing. See the main README's
"How token expiry is handled" section for the full mechanics.

## Can I use the GET API and the POST API on the same account?

Yes. They are independent features on Dialog's side and the SDK reflects that with two separate
client classes (`EsmsClient` and `EsmsUrlClient`). Whether the GET API is available to your account
at all depends on whether an administrator enabled it; the POST API is available to every eSMS
account by default.

## Does this SDK enforce Dialog's rate limits for me?

No. The documented limits (20 TPS for sending, 30 TPS for general API use, 2 TPS for campaign status
checks, recommended batch sizes of 1000/100 recipients) are enforced by Dialog's own infrastructure.
This SDK exposes them as constants (`RATE_LIMITS_TPS` and friends) so you can build your own
client-side throttling if you need to, but it does not throttle requests on your behalf.

## Something in this SDK disagrees with what the eSMS portal or support tells me. Which is right?

The portal and Dialog's own support channels are the source of truth. This SDK was built by reading
the published "eSMS API Documentation v3.0" PDF, and it is not maintained by Dialog or Adeona
Technologies, so if the live API has moved on since that document was written, this SDK may be out
of date. Please open an issue with what you're seeing so it can be corrected.
