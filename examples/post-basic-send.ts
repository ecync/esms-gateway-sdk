/**
 * Minimal example: send an SMS using the POST/JSON API.
 *
 * Run with: npx tsx examples/post-basic-send.ts
 * (after setting ESMS_USERNAME and ESMS_PASSWORD in your environment)
 */
import { EsmsApiError, EsmsClient, PaymentMethod } from "../src/index.js";

async function main() {
  const username = process.env.ESMS_USERNAME;
  const password = process.env.ESMS_PASSWORD;

  if (!username || !password) {
    console.error("Set ESMS_USERNAME and ESMS_PASSWORD before running this example.");
    process.exitCode = 1;
    return;
  }

  const client = new EsmsClient({ credentials: { username, password } });

  try {
    // A unique id per attempt. Reusing one you already sent returns error 104.
    const transactionId = Date.now();

    const result = await client.sendSms({
      recipients: ["714551682"],
      message: "Hello from esms-gateway-sdk",
      transactionId,
      paymentMethod: PaymentMethod.Wallet
    });

    console.log("Campaign created:", result);

    // The status usually is not final immediately after creation, so this
    // is just a demonstration of the lookup call, not a guarantee of
    // "completed" on the first check.
    const status = await client.checkTransactionStatus(transactionId);
    console.log("Current status:", status);
  } catch (error) {
    if (error instanceof EsmsApiError) {
      console.error(`eSMS API rejected the request: [${error.code}] ${error.description}`);
    } else {
      throw error;
    }
  }
}

main();
