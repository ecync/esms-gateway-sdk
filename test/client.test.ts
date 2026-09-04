import { beforeEach, describe, expect, it, vi } from "vitest";
import { EsmsClient } from "../src/client.js";
import { EsmsApiError } from "../src/errors/esms-error.js";
import { EsmsValidationError } from "../src/utils/validators.js";

const LOGIN_URL = "https://esms.dialog.lk/api/v2/user/login";
const SEND_URL = "https://e-sms.dialog.lk/api/v2/sms";
const CHECK_URL = "https://e-sms.dialog.lk/api/v2/sms/check-transaction";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

function loginSuccessBody() {
  return {
    status: "success",
    comment: "You have logged in",
    token: "token-123",
    remainingCount: null,
    expiration: 43200,
    refreshToken: "refresh",
    refreshExpiration: 604800,
    errCode: ""
  };
}

describe("EsmsClient.sendSms", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  it("logs in, then sends the SMS and returns a typed result on success", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === LOGIN_URL) return jsonResponse(loginSuccessBody());
      if (url === SEND_URL) {
        return jsonResponse({
          status: "success",
          comment: "Campaign Created, Campaign ID 25, Campaign payment of (LKR) 5 was successful",
          data: {
            campaignId: 25,
            campaignCost: 5,
            walletBalance: 3.24,
            userMobile: 94714551682,
            userId: 4812,
            duplicatesRemoved: 1,
            invalidNumbers: 0,
            mask_blocked_numbers: 0
          },
          errCode: ""
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const client = new EsmsClient({
      credentials: { username: "nimal", password: "Admin#67!" },
      httpClientOptions: { fetchImpl }
    });

    const result = await client.sendSms({
      recipients: ["714551682", "763625800", "763625800"],
      message: "Hello there",
      transactionId: 1001
    });

    expect(result.campaignId).toBe(25);
    expect(result.duplicatesRemoved).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2); // one login, one send

    const sendCall = fetchImpl.mock.calls.find(([url]) => url === SEND_URL);
    const sentBody = JSON.parse((sendCall?.[1] as RequestInit).body as string);
    expect(sentBody.msisdn).toEqual([{ mobile: "714551682" }, { mobile: "763625800" }]);
    expect(sentBody.transaction_id).toBe(1001);

    const sendHeaders = (sendCall?.[1] as RequestInit).headers as Record<string, string>;
    expect(sendHeaders.Authorization).toBe("Bearer token-123");
  });

  it("throws EsmsApiError with the failure code when the API rejects the send", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === LOGIN_URL) return jsonResponse(loginSuccessBody());
      if (url === SEND_URL) {
        return jsonResponse({
          status: "failed",
          comment: "Transaction ID is already used",
          data: "",
          errCode: "104"
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const client = new EsmsClient({
      credentials: { username: "nimal", password: "Admin#67!" },
      httpClientOptions: { fetchImpl }
    });

    await expect(
      client.sendSms({ recipients: ["714551682"], message: "hi", transactionId: 1001 })
    ).rejects.toBeInstanceOf(EsmsApiError);
    await expect(
      client.sendSms({ recipients: ["714551682"], message: "hi", transactionId: 1001 })
    ).rejects.toMatchObject({ code: "104" });
  });

  it("re-logs in and retries exactly once when the send fails with error 100 (token expired)", async () => {
    let sendAttempts = 0;
    let loginAttempts = 0;

    const fetchImpl = vi.fn(async (url: string) => {
      if (url === LOGIN_URL) {
        loginAttempts += 1;
        return jsonResponse({ ...loginSuccessBody(), token: `token-${loginAttempts}` });
      }
      if (url === SEND_URL) {
        sendAttempts += 1;
        if (sendAttempts === 1) {
          return jsonResponse({ status: "failed", comment: "Authentication Token Expired", data: "", errCode: "100" });
        }
        return jsonResponse({
          status: "success",
          comment: "Campaign Created",
          data: {
            campaignId: 26,
            campaignCost: 5,
            walletBalance: 1,
            userMobile: 94714551682,
            userId: 4812,
            duplicatesRemoved: 0,
            invalidNumbers: 0,
            mask_blocked_numbers: 0
          },
          errCode: ""
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const client = new EsmsClient({
      credentials: { username: "nimal", password: "Admin#67!" },
      httpClientOptions: { fetchImpl }
    });

    const result = await client.sendSms({ recipients: ["714551682"], message: "hi", transactionId: 1002 });

    expect(result.campaignId).toBe(26);
    expect(sendAttempts).toBe(2);
    expect(loginAttempts).toBe(2); // initial login + forced refresh after error 100

    const secondSendHeaders = (fetchImpl.mock.calls.filter(([url]) => url === SEND_URL)[1]?.[1] as RequestInit)
      .headers as Record<string, string>;
    expect(secondSendHeaders.Authorization).toBe("Bearer token-2");
  });

  it("rejects locally, without a network call, on an invalid msisdn", async () => {
    const fetchImpl = vi.fn();
    const client = new EsmsClient({
      credentials: { username: "nimal", password: "Admin#67!" },
      httpClientOptions: { fetchImpl }
    });

    await expect(
      client.sendSms({ recipients: ["0714551682"], message: "hi", transactionId: 1 })
    ).rejects.toThrow(EsmsValidationError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("EsmsClient.checkTransactionStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  it("returns the parsed campaign status on success", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === LOGIN_URL) return jsonResponse(loginSuccessBody());
      if (url === CHECK_URL) {
        return jsonResponse({
          status: "success",
          comment: "campaign found for the transaction id:126",
          data: { "campaign status": "completed" },
          errCode: "",
          transaction_id: 126
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const client = new EsmsClient({
      credentials: { username: "nimal", password: "Admin#67!" },
      httpClientOptions: { fetchImpl }
    });

    const result = await client.checkTransactionStatus(126);
    expect(result).toEqual({
      transactionId: 126,
      campaignStatus: "completed",
      comment: "campaign found for the transaction id:126"
    });
  });

  it("throws EsmsApiError when the transaction cannot be found", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === LOGIN_URL) return jsonResponse(loginSuccessBody());
      if (url === CHECK_URL) {
        return jsonResponse({
          status: "failed",
          comment: "no campaign found",
          data: "",
          errCode: "103",
          transaction_id: 999
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const client = new EsmsClient({
      credentials: { username: "nimal", password: "Admin#67!" },
      httpClientOptions: { fetchImpl }
    });

    await expect(client.checkTransactionStatus(999)).rejects.toMatchObject({ code: "103" });
  });
});
