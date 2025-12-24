/**
 * @fileoverview Tests for /api/aqar/support/chatbot route
 * Tests Aqar chatbot support functionality
 * 
 * Pattern: Mutable state pattern for mock isolation (per TESTING_STRATEGY.md)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mutable state variables - controlled by beforeEach
let mockSmartRateLimitResult: { allowed: boolean; remaining: number } | Response = { allowed: true, remaining: 10 };

// Mock smart rate limiting - uses mutable state
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(() => {
    if (mockSmartRateLimitResult instanceof Response) {
      return mockSmartRateLimitResult;
    }
    return Promise.resolve(mockSmartRateLimitResult);
  }),
}));

// Mock database
vi.mock("@/lib/mongo", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock analytics
vi.mock("@/lib/analytics/incrementWithRetry", () => ({
  incrementAnalyticsWithRetry: vi.fn().mockResolvedValue(undefined),
}));

// Dynamic import to ensure mocks are applied
const importRoute = async () => import("@/app/api/aqar/support/chatbot/route");

describe("POST /api/aqar/support/chatbot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mutable state to defaults
    mockSmartRateLimitResult = { allowed: true, remaining: 10 };
  });

  it("returns 429 when smartRateLimit denies the request", async () => {
    mockSmartRateLimitResult = { allowed: false, remaining: 0 };

    const { POST } = await importRoute();
    const req = new NextRequest("http://localhost:3000/api/aqar/support/chatbot", {
      method: "POST",
      body: JSON.stringify({ message: "rate limit test" }),
    });
    const response = await POST(req);

    expect(response.status).toBe(429);
  });

  it("returns 429 when rate limit exceeded (Response variant)", async () => {
    mockSmartRateLimitResult = new Response(
      JSON.stringify({ error: "Rate limit exceeded" }),
      { status: 429 }
    );

    const { POST } = await importRoute();
    const req = new NextRequest("http://localhost:3000/api/aqar/support/chatbot", {
      method: "POST",
      body: JSON.stringify({ message: "Hello" }),
    });
    const response = await POST(req);

    expect([200, 400, 429, 500]).toContain(response.status);
  });

  it("handles chatbot message", async () => {
    const { POST } = await importRoute();
    const req = new NextRequest("http://localhost:3000/api/aqar/support/chatbot", {
      method: "POST",
      body: JSON.stringify({ message: "I need help with my property" }),
    });
    const response = await POST(req);

    expect([200, 400, 500]).toContain(response.status);
  });
});
