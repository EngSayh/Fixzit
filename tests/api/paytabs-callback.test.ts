import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDbConnect = vi.fn().mockResolvedValue(undefined);
vi.mock("@/db/mongoose", () => ({
  dbConnect: (...args: unknown[]) => mockDbConnect(...args),
}));

const mockNormalizePayload = vi.fn(() => ({
  cartId: "C123",
  tranRef: "T123",
  respStatus: "A",
}));
const mockFinalizeTransaction = vi.fn(async () => ({ ok: true }));

vi.mock("@/lib/finance/paytabs", () => ({
  normalizePayTabsPayload: (...args: unknown[]) =>
    mockNormalizePayload(...args),
  finalizePayTabsTransaction: (...args: unknown[]) =>
    mockFinalizeTransaction(...args),
}));

const mockValidateCallback = vi.fn(() => true);

vi.mock("@/lib/paytabs", () => ({
  validateCallback: (...args: unknown[]) => mockValidateCallback(...args),
}));

const mockCreateSecureResponse = vi.fn(
  (body: any, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
);
const mockGetClientIP = vi.fn(() => "127.0.0.1");

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: (...args: unknown[]) =>
    mockCreateSecureResponse(...args),
  getClientIP: (...args: unknown[]) => mockGetClientIP(...args),
}));

const mockRateLimit = vi.fn(() => ({ allowed: true }));
vi.mock("@/server/security/rateLimit", () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

const mockWithIdempotency = vi.fn(
  async (_key: string, exec: () => Promise<unknown>) => exec(),
);
vi.mock("@/server/security/idempotency", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    withIdempotency: (...args: unknown[]) => mockWithIdempotency(...args),
  };
});

const mockRateLimitError = vi.fn(
  () => new Response("rate limited", { status: 429 }),
);
const mockHandleApiError = vi.fn(
  (error?: unknown) =>
    new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "error",
      }),
      { status: 500 },
    ),
);

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: (...args: unknown[]) => mockRateLimitError(...args),
  handleApiError: (...args: unknown[]) => mockHandleApiError(...args),
}));

import { POST } from "@/app/api/paytabs/callback/route";

function makeRequest(
  rawBody: string,
  headers: Record<string, string> = {},
): NextRequest {
  return new Request("https://example.com/api/paytabs/callback", {
    method: "POST",
    body: rawBody,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  }) as unknown as NextRequest;
}

describe("API PayTabs callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateCallback.mockReturnValue(true);
    mockWithIdempotency.mockImplementation(
      async (_key: string, exec: () => Promise<unknown>) => exec(),
    );
  });

  it("returns 200 for valid signatures and persists results", async () => {
    const payload = { cart_id: "C1", signature: "ignored" };
    const req = makeRequest(JSON.stringify(payload), { signature: "good" });

    const res = await POST(req);
    expect(res.status).toBe(200);
    await res.json();

    expect(mockValidateCallback).toHaveBeenCalledWith(payload, "good");
    expect(mockNormalizePayload).toHaveBeenCalledWith(payload);
    expect(mockFinalizeTransaction).toHaveBeenCalledWith({
      cartId: "C123",
      tranRef: "T123",
      respStatus: "A",
    });
    expect(mockDbConnect).toHaveBeenCalledTimes(1);
  });

  it("returns 403 for invalid signatures", async () => {
    mockValidateCallback.mockReturnValueOnce(false);
    const req = makeRequest(JSON.stringify({ cart_id: "C1" }), {
      signature: "bad",
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({
      error: "Payment verification failed: Invalid signature",
    });
  });

  it("returns 400 when signature is missing entirely", async () => {
    const req = makeRequest(JSON.stringify({ cart_id: "C1" }));

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      error: "Payment verification failed: Missing signature",
    });
  });

  it("returns 400 for malformed JSON before signature validation", async () => {
    const req = makeRequest("{oops", { signature: "sig" });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      error: "Payment verification failed: Invalid JSON payload",
    });
    expect(mockValidateCallback).not.toHaveBeenCalled();
  });
});
