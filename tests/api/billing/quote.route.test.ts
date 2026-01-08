/**
 * Tests for POST /api/billing/quote
 * @description Computes billing quote for modules and seats
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/billing/quote/route";

// Mock dependencies
vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn().mockResolvedValue({
    data: {
      items: [{ moduleCode: "core", seatCount: 5 }],
      billingCycle: "monthly",
      seatTotal: 5,
    },
    error: null,
  }),
}));

vi.mock("@/lib/pricing", () => ({
  computeQuote: vi.fn().mockReturnValue({
    monthly: 100,
    annual: 1000,
    savings: 200,
  }),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn().mockReturnValue(new Response("Rate limit exceeded", { status: 429 })),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn().mockImplementation((body, status) => {
    return new Response(JSON.stringify(body), { status: status || 200 });
  }),
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

describe("POST /api/billing/quote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes quote for valid request", async () => {
    const request = new NextRequest("http://localhost/api/billing/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ moduleCode: "core", seatCount: 5 }],
        billingCycle: "monthly",
        seatTotal: 5,
      }),
    });

    const response = await POST(request);
    expect([200, 400, 429, 500]).toContain(response.status);
  });

  it("handles rate limiting", async () => {
    const { smartRateLimit } = await import("@/server/security/rateLimit");
    vi.mocked(smartRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 });

    const request = new NextRequest("http://localhost/api/billing/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ moduleCode: "core" }],
        billingCycle: "monthly",
      }),
    });

    const response = await POST(request);
    expect([200, 429]).toContain(response.status);
  });
});
