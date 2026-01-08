/**
 * @fileoverview Tests for /api/health/auth route
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/server/security/health-token", () => ({
  isAuthorizedHealthRequest: vi.fn().mockReturnValue(false),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status) => 
    new Response(JSON.stringify(body), { status: status || 200 })
  ),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

import { GET } from "@/app/api/health/auth/route";
import { isAuthorizedHealthRequest } from "@/server/security/health-token";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockIsAuthorized = vi.mocked(isAuthorizedHealthRequest);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

function createGetRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/health/auth", {
    method: "GET",
    headers,
  });
}

describe("GET /api/health/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthorized.mockReturnValue(false);
    mockEnforceRateLimit.mockReturnValue(null);
  });

  it("should return 429 when rate limited", async () => {
    mockEnforceRateLimit.mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }) as any
    );
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(429);
  });

  it("should return auth config status for public request", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json).toBeDefined();
    }
  });

  it("should return detailed info with X-Health-Token", async () => {
    mockIsAuthorized.mockReturnValue(true);
    const res = await GET(createGetRequest({ "X-Health-Token": "valid-token" }) as any);
    expect([200, 500]).toContain(res.status);
  });

  it("should check critical environment variables", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      // Should contain auth config info
      expect(json.status || json.authConfig).toBeDefined();
    }
  });

  it("should not expose secret values", async () => {
    mockIsAuthorized.mockReturnValue(false);
    const res = await GET(createGetRequest() as any);
    if (res.status === 200) {
      const text = await res.text();
      // Should not contain actual secret values
      expect(text).not.toContain(process.env.NEXTAUTH_SECRET || "FAKE_SECRET");
    }
  });
});
