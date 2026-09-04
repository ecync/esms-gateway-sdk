import { describe, expect, it, vi } from "vitest";
import { EsmsUrlClient } from "../src/get-client.js";
import { EsmsApiError } from "../src/errors/esms-error.js";
import { EsmsValidationError } from "../src/utils/validators.js";

function textResponse(text: string): Response {
  return new Response(text, { status: 200 });
}

describe("EsmsUrlClient.sendSms", () => {
  it("returns success when the API replies with 1", async () => {
    const fetchImpl = vi.fn(async () => textResponse("1"));
    const client = new EsmsUrlClient({ esmsqk: "test-key", httpClientOptions: { fetchImpl } });

    const result = await client.sendSms({ recipients: ["0799999999", "94799999999"], message: "hi" });

    expect(result).toEqual({ success: true, code: 1 });
    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toContain("esmsqk=test-key");
    expect(url).toContain("list=0799999999%2C94799999999");
  });

  it("throws EsmsApiError with the GET-table description when the API replies with a failure code", async () => {
    const fetchImpl = vi.fn(async () => textResponse("2007"));
    const client = new EsmsUrlClient({ esmsqk: "bad-key", httpClientOptions: { fetchImpl } });

    await expect(client.sendSms({ recipients: ["799999999"], message: "hi" })).rejects.toMatchObject({
      code: "2007",
      source: "get"
    });
  });

  it("validates recipient number formats before making a request", async () => {
    const fetchImpl = vi.fn();
    const client = new EsmsUrlClient({ esmsqk: "test-key", httpClientOptions: { fetchImpl } });

    await expect(client.sendSms({ recipients: ["12345"], message: "hi" })).rejects.toThrow(EsmsValidationError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("EsmsUrlClient.checkBalance", () => {
  it("parses a successful pipe-delimited balance response", async () => {
    const fetchImpl = vi.fn(async () => textResponse("1|8.24"));
    const client = new EsmsUrlClient({ esmsqk: "test-key", httpClientOptions: { fetchImpl } });

    const result = await client.checkBalance();
    expect(result).toEqual({ success: true, code: 1, balance: 8.24 });
  });

  it("throws EsmsApiError for a failure response, per the documented `<error_id>|0` format", async () => {
    const fetchImpl = vi.fn(async () => textResponse("2007|0"));
    const client = new EsmsUrlClient({ esmsqk: "bad-key", httpClientOptions: { fetchImpl } });

    await expect(client.checkBalance()).rejects.toBeInstanceOf(EsmsApiError);
    await expect(client.checkBalance()).rejects.toMatchObject({ code: "2007" });
  });
});
