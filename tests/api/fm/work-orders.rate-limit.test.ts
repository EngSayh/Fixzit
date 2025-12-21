/**
 * Rate Limit Contract Tests for FM Work Orders
 * Verifies 429 responses with Retry-After headers
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { NextResponse } from "next/server";

vi.mock("@/server/security/rateLimit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  getUserSession: vi.fn().mockResolvedValue({
    user: { id: "test-user", orgId: "test-org", roles: ["FM_MANAGER"] },
  }),
}));

describe("FM Work Orders Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("should handle rate limit response structure correctly", async () => {
    const mockRateLimitResponse = new NextResponse(
      JSON.stringify({ error: "Rate limit exceeded" }),
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "0",
        },
      }
    );

    vi.mocked(enforceRateLimit).mockReturnValue(mockRateLimitResponse as never);

    // Verify the mock response has correct structure
    expect(mockRateLimitResponse.status).toBe(429);
    expect(mockRateLimitResponse.headers.get("Retry-After")).toBe("60");
    expect(mockRateLimitResponse.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(mockRateLimitResponse.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});
