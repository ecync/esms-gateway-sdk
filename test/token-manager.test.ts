import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "../src/http/http-client.js";
import { TokenManager } from "../src/auth/token-manager.js";
import { EsmsApiError } from "../src/errors/esms-error.js";

/** Builds a fetch stub that returns a successful login response every time it's called. */
function successfulLoginFetch(token = "token-123", expirationSeconds = 43200) {
  return vi.fn(async () =>
    new Response(
      JSON.stringify({
        status: "success",
        comment: "You have logged in",
        token,
        remainingCount: null,
        expiration: expirationSeconds,
        refreshToken: "refresh-token",
        refreshExpiration: 604800,
        errCode: ""
      }),
      { status: 200 }
    )
  );
}

describe("TokenManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("logs in once and reuses the cached token for calls within the token's lifetime", async () => {
    const fetchImpl = successfulLoginFetch();
    const httpClient = new HttpClient({ fetchImpl });
    const manager = new TokenManager({
      credentials: { username: "nimal", password: "Admin#67!" },
      httpClient
    });

    const first = await manager.getValidToken();
    const second = await manager.getValidToken();

    expect(first).toBe("token-123");
    expect(second).toBe("token-123");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("proactively refreshes the token once the documented expiration has effectively passed", async () => {
    const fetchImpl = successfulLoginFetch("token-123", 43200); // 12 hours
    const httpClient = new HttpClient({ fetchImpl });
    const manager = new TokenManager({
      credentials: { username: "nimal", password: "Admin#67!" },
      httpClient
    });

    await manager.getValidToken();
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // Move the clock forward past 12 hours plus the refresh skew.
    vi.setSystemTime(new Date("2026-01-01T12:05:00Z"));

    await manager.getValidToken();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not refresh early: staying within the token lifetime causes no extra login calls", async () => {
    const fetchImpl = successfulLoginFetch("token-123", 43200);
    const httpClient = new HttpClient({ fetchImpl });
    const manager = new TokenManager({
      credentials: { username: "nimal", password: "Admin#67!" },
      httpClient
    });

    await manager.getValidToken();
    vi.setSystemTime(new Date("2026-01-01T06:00:00Z")); // halfway through the 12h lifetime
    await manager.getValidToken();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("de-duplicates concurrent calls into a single login request", async () => {
    const fetchImpl = successfulLoginFetch();
    const httpClient = new HttpClient({ fetchImpl });
    const manager = new TokenManager({
      credentials: { username: "nimal", password: "Admin#67!" },
      httpClient
    });

    const results = await Promise.all([
      manager.getValidToken(),
      manager.getValidToken(),
      manager.getValidToken(),
      manager.getValidToken(),
      manager.getValidToken()
    ]);

    expect(results).toEqual(Array(5).fill("token-123"));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("forceRefresh always performs a new login, bypassing the cached token", async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      return new Response(
        JSON.stringify({
          status: "success",
          comment: "ok",
          token: `token-${call}`,
          remainingCount: null,
          expiration: 43200,
          refreshToken: null,
          refreshExpiration: null,
          errCode: ""
        }),
        { status: 200 }
      );
    });
    const httpClient = new HttpClient({ fetchImpl });
    const manager = new TokenManager({
      credentials: { username: "nimal", password: "Admin#67!" },
      httpClient
    });

    const first = await manager.getValidToken();
    const refreshed = await manager.forceRefresh();

    expect(first).toBe("token-1");
    expect(refreshed).toBe("token-2");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("calls onTokenRefreshed with the new token and expiry each time a login succeeds", async () => {
    const fetchImpl = successfulLoginFetch("token-abc", 3600);
    const httpClient = new HttpClient({ fetchImpl });
    const onTokenRefreshed = vi.fn();
    const manager = new TokenManager({
      credentials: { username: "nimal", password: "Admin#67!" },
      httpClient,
      onTokenRefreshed
    });

    await manager.getValidToken();

    expect(onTokenRefreshed).toHaveBeenCalledTimes(1);
    expect(onTokenRefreshed).toHaveBeenCalledWith("token-abc", new Date("2026-01-01T01:00:00Z").getTime());
  });

  it("throws an EsmsApiError when the login request itself fails", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: "failed",
            comment: "Username or password invalid",
            token: null,
            remainingCount: 4,
            expiration: null,
            refreshToken: null,
            refreshExpiration: null,
            errCode: "115"
          }),
          { status: 200 }
        )
    );
    const httpClient = new HttpClient({ fetchImpl });
    const manager = new TokenManager({
      credentials: { username: "nimal", password: "wrong" },
      httpClient
    });

    await expect(manager.getValidToken()).rejects.toThrow(EsmsApiError);
    await expect(manager.getValidToken()).rejects.toMatchObject({ code: "115" });
  });
});
