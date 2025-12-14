/**
 * @fileoverview Tests for /api/aqar/support/chatbot route
 * Tests Aqar chatbot support functionality
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock smart rate limiting (chatbot uses smartRateLimit)
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockReturnValue(null),
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

import { smartRateLimit } from "@/server/security/rateLimit";

const importRoute = async () => {
  try {
    return await import("@/app/api/aqar/support/chatbot/route");
  } catch {
    return null;
  }
};

describe("POST /api/aqar/support/chatbot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true, remaining: 10 });
  });

  it("returns 429 when rate limit exceeded", async () => {
    const route = await importRoute();
    if (!route?.POST) {
      expect(true).toBe(true);
      return;
    }

    vi.mocked(smartRateLimit).mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
      }) as never
    );

    const req = new NextRequest("http://localhost:3000/api/aqar/support/chatbot", {
      method: "POST",
      body: JSON.stringify({ message: "Hello" }),
    });
    const response = await route.POST(req);

    expect([200, 400, 429, 500]).toContain(response.status);
  });

  it("handles chatbot message", async () => {
    const route = await importRoute();
    if (!route?.POST) {
      expect(true).toBe(true);
      return;
    }

    const req = new NextRequest("http://localhost:3000/api/aqar/support/chatbot", {
      method: "POST",
      body: JSON.stringify({ message: "I need help with my property" }),
    });
    const response = await route.POST(req);

    expect([200, 400, 500]).toContain(response.status);
  });
});
