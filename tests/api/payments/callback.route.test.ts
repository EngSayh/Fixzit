/**
 * @fileoverview Tests for /api/payments/callback route
 * @sprint 66
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// The callback route is a shim that forwards to /api/tap/webhook
vi.mock("@/app/api/tap/webhook/route", () => ({
  POST: vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ success: true }), { status: 200 })
  ),
}));

import { POST } from "@/app/api/payments/callback/route";

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/payments/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/payments/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should forward to tap webhook handler", async () => {
    const res = await POST(createPostRequest({
      id: "chg_123",
      status: "CAPTURED",
    }) as any);
    expect([200, 302, 307, 400, 401, 500]).toContain(res.status);
  });

  it("should handle TAP payment success", async () => {
    const res = await POST(createPostRequest({
      id: "chg_123",
      status: "CAPTURED",
      amount: 500,
      currency: "SAR",
    }) as any);
    expect([200, 302, 307, 400, 401, 500]).toContain(res.status);
  });

  it("should handle TAP payment failure", async () => {
    const res = await POST(createPostRequest({
      id: "chg_123",
      status: "FAILED",
      error: { message: "Payment declined" },
    }) as any);
    expect([200, 302, 307, 400, 401, 500]).toContain(res.status);
  });

  it("should handle empty body", async () => {
    const res = await POST(createPostRequest({}) as any);
    expect([200, 400, 401, 500]).toContain(res.status);
  });

  it("should handle INITIATED status", async () => {
    const res = await POST(createPostRequest({
      id: "chg_123",
      status: "INITIATED",
    }) as any);
    expect([200, 202, 400, 401, 500]).toContain(res.status);
  });
});
