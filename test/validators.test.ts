import { describe, expect, it, vi } from "vitest";
import {
  EsmsValidationError,
  assertNonEmptyRecipients,
  assertValidGetMsisdn,
  assertValidPostMsisdn,
  assertValidSourceAddress,
  assertValidTransactionId,
  dedupeRecipients,
  warnIfOverRecommendedBatchSize
} from "../src/utils/validators.js";

describe("assertValidPostMsisdn", () => {
  it("accepts a 9-digit local number", () => {
    expect(() => assertValidPostMsisdn("714551682")).not.toThrow();
  });

  it("rejects a number with a leading zero", () => {
    expect(() => assertValidPostMsisdn("0714551682")).toThrow(EsmsValidationError);
  });

  it("rejects a number with a country code prefix", () => {
    expect(() => assertValidPostMsisdn("94714551682")).toThrow(EsmsValidationError);
  });

  it("rejects non-numeric input", () => {
    expect(() => assertValidPostMsisdn("71abc5682")).toThrow(EsmsValidationError);
  });
});

describe("assertValidGetMsisdn", () => {
  it.each(["799999999", "0799999999", "94799999999"])("accepts the documented format %s", (mobile) => {
    expect(() => assertValidGetMsisdn(mobile)).not.toThrow();
  });

  it("rejects an 8-digit number", () => {
    expect(() => assertValidGetMsisdn("79999999")).toThrow(EsmsValidationError);
  });
});

describe("assertValidTransactionId", () => {
  it("accepts a small positive integer", () => {
    expect(() => assertValidTransactionId(126)).not.toThrow();
  });

  it("accepts a 16-digit integer at the edge of Number.MAX_SAFE_INTEGER", () => {
    expect(() => assertValidTransactionId(Number.MAX_SAFE_INTEGER)).not.toThrow();
  });

  it("rejects an integer above Number.MAX_SAFE_INTEGER, even though the API's own limit is 18 digits", () => {
    expect(() => assertValidTransactionId(Number.MAX_SAFE_INTEGER + 1)).toThrow(EsmsValidationError);
  });

  it("rejects zero", () => {
    expect(() => assertValidTransactionId(0)).toThrow(EsmsValidationError);
  });

  it("rejects a negative number", () => {
    expect(() => assertValidTransactionId(-5)).toThrow(EsmsValidationError);
  });

  it("rejects a non-integer", () => {
    expect(() => assertValidTransactionId(12.5)).toThrow(EsmsValidationError);
  });
});

describe("assertValidSourceAddress", () => {
  it("accepts a mask at the 11 character limit", () => {
    expect(() => assertValidSourceAddress("12345678901")).not.toThrow();
  });

  it("rejects a mask over 11 characters", () => {
    expect(() => assertValidSourceAddress("123456789012")).toThrow(EsmsValidationError);
  });
});

describe("assertNonEmptyRecipients", () => {
  it("rejects an empty list", () => {
    expect(() => assertNonEmptyRecipients([])).toThrow(EsmsValidationError);
  });

  it("accepts a non-empty list", () => {
    expect(() => assertNonEmptyRecipients(["714551682"])).not.toThrow();
  });
});

describe("dedupeRecipients", () => {
  it("removes duplicate numbers while preserving order", () => {
    expect(dedupeRecipients(["763625800", "714551682", "763625800"])).toEqual(["763625800", "714551682"]);
  });
});

describe("warnIfOverRecommendedBatchSize", () => {
  it("warns when the POST recipient count exceeds 1000", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    warnIfOverRecommendedBatchSize(1001, "post");
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it("does not warn when within the recommended limit", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    warnIfOverRecommendedBatchSize(50, "get");
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
