/**
 * Tests for POST /api/billing/charge-recurring
 * @description DEPRECATED Legacy recurring charge endpoint
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/billing/charge-recurring/route";

// Mock dependencies
vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn().mockImplementation((body, status) => {
    return new Response(JSON.stringify(body), { status });
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe("POST /api/billing/charge-recurring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 501 for deprecated endpoint", async () => {
    const request = new NextRequest("http://localhost/api/billing/charge-recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(501);
  });

  it("returns deprecated error message", async () => {
    const request = new NextRequest("http://localhost/api/billing/charge-recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();
    expect(data.error).toBe("DEPRECATED_ENDPOINT");
  });
});
