import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveApiBaseUrl,
  extractErrorMessage,
  normalizePaginatedPayload,
  createApiClient,
} from "./index";

// ─── resolveApiBaseUrl ──────────────────────────────────────────────────────

describe("resolveApiBaseUrl", () => {
  it("appends /api/v1 to a bare origin", () => {
    expect(resolveApiBaseUrl("http://localhost:3004")).toBe(
      "http://localhost:3004/api/v1",
    );
  });

  it("preserves path that already contains /api", () => {
    expect(resolveApiBaseUrl("http://localhost:3004/api/v1")).toBe(
      "http://localhost:3004/api/v1",
    );
    expect(resolveApiBaseUrl("http://localhost:3004/api/v2/")).toBe(
      "http://localhost:3004/api/v2",
    );
  });

  it("handles trailing slashes", () => {
    expect(resolveApiBaseUrl("http://localhost:3004/")).toBe(
      "http://localhost:3004/api/v1",
    );
  });

  it("handles non-URL strings gracefully", () => {
    expect(resolveApiBaseUrl("/backend")).toBe("/backend/api/v1");
    expect(resolveApiBaseUrl("/api/v1")).toBe("/api/v1");
  });
});

// ─── extractErrorMessage ────────────────────────────────────────────────────

describe("extractErrorMessage", () => {
  function makeResponse(status: number, body: unknown): Response {
    return {
      status,
      json: () => Promise.resolve(body),
    } as Response;
  }

  it("extracts string message from body", async () => {
    const msg = await extractErrorMessage(
      makeResponse(400, { message: "Invalid email" }),
    );
    expect(msg).toBe("Invalid email");
  });

  it("joins array messages", async () => {
    const msg = await extractErrorMessage(
      makeResponse(422, { message: ["Field A required", "Field B invalid"] }),
    );
    expect(msg).toBe("Field A required, Field B invalid");
  });

  it("extracts nested message.message", async () => {
    const msg = await extractErrorMessage(
      makeResponse(500, { message: { message: "DB down" } }),
    );
    expect(msg).toBe("DB down");
  });

  it("falls back to HTTP status when body has no message", async () => {
    const msg = await extractErrorMessage(makeResponse(403, {}));
    expect(msg).toBe("HTTP 403");
  });

  it("falls back to HTTP status on parse error", async () => {
    const msg = await extractErrorMessage({
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    } as Response);
    expect(msg).toBe("HTTP 500");
  });
});

// ─── normalizePaginatedPayload ──────────────────────────────────────────────

describe("normalizePaginatedPayload", () => {
  it("normalizes backend paginated format to frontend format", () => {
    const input = {
      items: [{ id: "1" }, { id: "2" }],
      pagination: { page: 2, limit: 10, total: 25 },
    };
    const result = normalizePaginatedPayload<{
      data: { id: string }[];
      total: number;
      page: number;
      pageSize: number;
    }>(input);
    expect(result.data).toEqual([{ id: "1" }, { id: "2" }]);
    expect(result.total).toBe(25);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
  });

  it("passes through non-paginated payloads unchanged", () => {
    const input = { users: [{ id: "1" }] };
    expect(normalizePaginatedPayload(input)).toBe(input);
  });

  it("passes through arrays unchanged", () => {
    const input = [1, 2, 3];
    expect(normalizePaginatedPayload(input)).toBe(input);
  });

  it("passes through null/undefined", () => {
    expect(normalizePaginatedPayload(null)).toBeNull();
    expect(normalizePaginatedPayload(undefined)).toBeUndefined();
  });
});

// ─── createApiClient ────────────────────────────────────────────────────────

describe("createApiClient", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  function makeClient(overrides: Record<string, unknown> = {}) {
    return createApiClient({
      baseUrl: "http://localhost:3004",
      fetchFn: mockFetch as typeof fetch,
      ...overrides,
    });
  }

  it("makes GET requests to resolved base URL", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const client = makeClient();
    const result = await client.get<{ ok: boolean }>("/health");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3004/api/v1/health");
    expect(result.ok).toBe(true);
  });

  it("sends JSON body on POST", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "new" }), { status: 201 }),
    );

    const client = makeClient();
    await client.post("/events", { title: "Test" });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ title: "Test" }));
  });

  it("throws with error message on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }),
    );

    const client = makeClient();
    await expect(client.get("/secret")).rejects.toThrow("Forbidden");
  });

  it("retries on 401 when retryOnUnauthorized is enabled", async () => {
    // First call: 401
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
    // Refresh call: 200
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
    // Retry call: 200 with data
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: "ok" }), { status: 200 }),
    );

    const client = makeClient({ retryOnUnauthorized: true });
    const result = await client.get<{ data: string }>("/protected");

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.data).toBe("ok");
  });

  it("calls onSessionExpired when refresh fails", async () => {
    const onSessionExpired = vi.fn();

    mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 })); // refresh fails

    const client = makeClient({ retryOnUnauthorized: true, onSessionExpired });

    await expect(client.get("/protected")).rejects.toThrow("Session expired");
    expect(onSessionExpired).toHaveBeenCalledOnce();
  });

  it("handles 204 No Content responses", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const client = makeClient();
    const result = await client.delete("/items/1");
    expect(result).toBeUndefined();
  });
});
