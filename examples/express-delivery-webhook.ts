/**
 * Reference receiver for the delivery report callback described in
 * docs/API_REFERENCE.md (section "Delivery report webhook").
 *
 * When you pass `pushNotificationUrl` on a send-SMS call, the eSMS
 * platform calls that URL back as a plain GET request, once per
 * recipient, with `campaignId`, `msisdn`, and `status` as query
 * parameters. This example uses Node's built-in `http` module instead of
 * a framework like Express, so it runs with no extra dependencies; the
 * same logic drops straight into an Express route handler,
 * `req.query.campaignId` and friends work the same way there.
 *
 * Run with: npx tsx examples/express-delivery-webhook.ts
 * Then point a send-SMS call's pushNotificationUrl at, for example,
 * http://localhost:3000/delivery-report
 */
import { createServer } from "node:http";
import { DeliveryStatus, DELIVERY_STATUS_DESCRIPTIONS } from "../src/index.js";

const PORT = 3000;

const server = createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400).end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/delivery-report") {
    res.writeHead(404).end();
    return;
  }

  const campaignId = url.searchParams.get("campaignId");
  const msisdn = url.searchParams.get("msisdn");
  const statusParam = url.searchParams.get("status");
  const status = statusParam ? (Number.parseInt(statusParam, 10) as DeliveryStatus) : null;

  if (!campaignId || !msisdn || status === null) {
    res.writeHead(400).end("Missing campaignId, msisdn, or status");
    return;
  }

  const description = DELIVERY_STATUS_DESCRIPTIONS[status] ?? "Unknown status";
  console.log(`Campaign ${campaignId} -> ${msisdn}: ${description} (status ${status})`);

  // The document notes that submission (1) and delivery (3) can arrive in
  // either order, so treat both as positive signals rather than expecting
  // a specific sequence.
  if (status === DeliveryStatus.Delivered || status === DeliveryStatus.SubmittedToSmsc) {
    // Record success in your own system here.
  } else {
    // Record failure and decide whether to retry, alert, or just log it.
  }

  res.writeHead(200).end("ok");
});

server.listen(PORT, () => {
  console.log(`Delivery report receiver listening on http://localhost:${PORT}/delivery-report`);
});
