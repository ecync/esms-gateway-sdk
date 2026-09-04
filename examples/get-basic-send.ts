/**
 * Minimal example: send an SMS using the GET/query-string API, and check
 * the account's wallet balance.
 *
 * This flow requires a portal-generated "URL Message Key" (esmsqk),
 * which is a separate, opt-in feature an administrator has to enable on
 * the account first. See docs/API_REFERENCE.md for details.
 *
 * Run with: npx tsx examples/get-basic-send.ts
 * (after setting ESMS_QK in your environment)
 */
import { EsmsApiError, EsmsUrlClient } from "../src/index.js";

async function main() {
  const esmsqk = process.env.ESMS_QK;

  if (!esmsqk) {
    console.error("Set ESMS_QK (your URL Message Key from the eSMS portal) before running this example.");
    process.exitCode = 1;
    return;
  }

  const client = new EsmsUrlClient({ esmsqk });

  try {
    const balance = await client.checkBalance();
    console.log(`Current wallet balance: LKR ${balance.balance}`);

    const result = await client.sendSms({
      recipients: ["0799999999"],
      message: "Hello from esms-gateway-sdk (GET API)"
    });

    console.log("Send result:", result);
  } catch (error) {
    if (error instanceof EsmsApiError) {
      console.error(`eSMS API rejected the request: [${error.code}] ${error.description}`);
    } else {
      throw error;
    }
  }
}

main();
