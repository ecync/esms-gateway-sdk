# esms-gateway-sdk

An unofficial TypeScript SDK for Dialog's eSMS Gateway API (published by Adeona Technologies (Pvt)
Ltd).

> **Not an official package.** This SDK is not written, published, or endorsed by Dialog Axiata PLC
> or Adeona Technologies. It was built independently from the publicly available "eSMS API
> Documentation v3.0" PDF. For anything account, billing, or security related, the source of truth
> is [https://esms.dialog.lk](https://esms.dialog.lk), not this repository.

Full documentation lives in [docs/README.md](./docs/README.md), including:

- [API_REFERENCE.md](./docs/API_REFERENCE.md): endpoint-by-endpoint parameters and responses.
- [ERROR_CODES.md](./docs/ERROR_CODES.md): both the POST and GET API error code tables.
- [FAQ.md](./docs/FAQ.md): common questions.

## Install

```bash
npm install @ecync/esms-gateway-sdk
```

## Quick start

```ts
import { EsmsClient } from "@ecync/esms-gateway-sdk";

const client = new EsmsClient({
  credentials: { username: process.env.ESMS_USERNAME!, password: process.env.ESMS_PASSWORD! }
});

const result = await client.sendSms({
  recipients: ["714551682"],
  message: "Hello from esms-gateway-sdk",
  transactionId: Date.now()
});

console.log(result.campaignId);
```

See [docs/README.md](./docs/README.md) for the GET API, error handling, token expiry behavior, and
delivery report webhooks.

## Development

```bash
npm install
npm run build          # compile TypeScript to dist/
npm test                # run the Vitest suite
npm run test:coverage   # with coverage
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
```

## License

MIT. See [LICENSE](./LICENSE).
