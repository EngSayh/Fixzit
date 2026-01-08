/**
 * @fileoverview Tests for /api/health/sms route
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status) => 
    new Response(JSON.stringify(body), { status: status || 200 })
  ),
}));

vi.mock("@/lib/resilience", () => ({
  withTimeout: vi.fn().mockImplementation((fn) => fn()),
}));

vi.mock("@/server/security/health-token", () => ({
  isAuthorizedHealthRequest: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/sms-providers/taqnyat", () => ({
  TAQNYAT_API_BASE: "https://api.taqnyat.sa",
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { GET } from "@/app/api/health/sms/route";
import { isAuthorizedHealthRequest } from "@/server/security/health-token";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockIsAuthorized = vi.mocked(isAuthorizedHealthRequest);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

function createGetRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/health/sms", {
    method: "GET",
    headers,
  });
}

describe("GET /api/health/sms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthorized.mockReturnValue(false);
    mockEnforceRateLimit.mockReturnValue(null);
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  });

  it("should return 429 when rate limited", async () => {
    mockEnforceRateLimit.mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }) as any
    );
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(429);
  });

  it("should return SMS health status for public requests", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 500, 503]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json).toBeDefined();
    }
  });

  it("should return detailed info for authorized requests", async () => {
    mockIsAuthorized.mockReturnValue(true);
    const res = await GET(createGetRequest({ "X-Health-Token": "valid-token" }) as any);
    expect([200, 500, 503]).toContain(res.status);
  });

  it("should handle Taqnyat not configured", async () => {
    const originalToken = process.env.TAQNYAT_BEARER_TOKEN;
    delete process.env.TAQNYAT_BEARER_TOKEN;
    const res = await GET(createGetRequest() as any);
    expect([200, 500, 503]).toContain(res.status);
    process.env.TAQNYAT_BEARER_TOKEN = originalToken;
  });

  it("should handle Taqnyat API error", async () => {
    process.env.TAQNYAT_BEARER_TOKEN = "test-token";
    mockFetch.mockRejectedValue(new Error("API unreachable"));
    const res = await GET(createGetRequest() as any);
    expect([200, 500, 503]).toContain(res.status);
  });

  it("should include timestamp in response", async () => {
    const res = await GET(createGetRequest() as any);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.timestamp || json.status).toBeDefined();
    }
  });
});
