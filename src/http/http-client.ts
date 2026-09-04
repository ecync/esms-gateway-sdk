/**
 * A minimal fetch signature, matched by both the global `fetch` and the
 * `vi.fn()` stubs used in tests. Keeping this narrow (instead of importing
 * the full DOM lib types) is what lets `fetchImpl` be swapped out cleanly.
 */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface HttpClientOptions {
  /** Injectable fetch implementation, primarily for tests. Defaults to the global `fetch`. */
  fetchImpl?: FetchLike;
  /** Request timeout in milliseconds. Defaults to 15 seconds. */
  timeoutMs?: number;
}

/** Thrown when a request does not complete within `timeoutMs`. */
export class EsmsTimeoutError extends Error {
  public constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = "EsmsTimeoutError";
    Object.setPrototypeOf(this, EsmsTimeoutError.prototype);
  }
}

/** Thrown when the API returns a response body that isn't valid JSON where JSON was expected. */
export class EsmsResponseParseError extends Error {
  public constructor(url: string, cause: unknown) {
    super(`Failed to parse JSON response from ${url}`);
    this.name = "EsmsResponseParseError";
    this.cause = cause;
    Object.setPrototypeOf(this, EsmsResponseParseError.prototype);
  }
}

/**
 * A thin wrapper around `fetch` that adds a timeout, JSON parsing, and a
 * single injection point for tests. This intentionally does not know
 * anything about eSMS-specific error codes: that mapping happens one layer
 * up, in {@link EsmsClient} and {@link EsmsUrlClient}, so this class stays
 * reusable and easy to unit test in isolation.
 */
export class HttpClient {
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  public constructor(options: HttpClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  /** Sends a JSON POST request and parses the JSON response body. */
  public async postJson<TResponse>(url: string, body: unknown, headers: Record<string, string> = {}): Promise<TResponse> {
    const response = await this.withTimeout(url, (signal) =>
      this.fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal
      })
    );

    return this.parseJson<TResponse>(url, response);
  }

  /** Sends a GET request and returns the raw text body, for the eSMS GET endpoints that reply with plain text. */
  public async getText(url: string): Promise<string> {
    const response = await this.withTimeout(url, (signal) => this.fetchImpl(url, { method: "GET", signal }));
    return response.text();
  }

  private async withTimeout(url: string, run: (signal: AbortSignal) => Promise<Response>): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await run(controller.signal);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new EsmsTimeoutError(url, this.timeoutMs);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private async parseJson<TResponse>(url: string, response: Response): Promise<TResponse> {
    const text = await response.text();
    try {
      return JSON.parse(text) as TResponse;
    } catch (cause) {
      throw new EsmsResponseParseError(url, cause);
    }
  }
}
