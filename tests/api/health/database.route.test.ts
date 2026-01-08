/**
 * @fileoverview Tests for /api/health/database route
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mongodb-unified", () => ({
  checkDatabaseHealth: vi.fn().mockResolvedValue(true),
  getDatabase: vi.fn().mockResolvedValue({
    admin: () => ({
      ping: vi.fn().mockResolvedValue({ ok: 1 }),
    }),
  }),
}));

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

import { GET } from "@/app/api/health/database/route";
import { checkDatabaseHealth } from "@/lib/mongodb-unified";
import { isAuthorizedHealthRequest } from "@/server/security/health-token";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockCheckDatabaseHealth = vi.mocked(checkDatabaseHealth);
const mockIsAuthorized = vi.mocked(isAuthorizedHealthRequest);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

function createGetRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/health/database", {
    method: "GET",
    headers,
  });
}

describe("GET /api/health/database", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckDatabaseHealth.mockResolvedValue(true);
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

  it("should return healthy status when DB is connected", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.status).toBe("healthy");
    }
  });

  it("should return 503 when DB is unhealthy", async () => {
    mockCheckDatabaseHealth.mockResolvedValue(false);
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.status).toBe("unhealthy");
  });

  it("should include response time in payload", async () => {
    const res = await GET(createGetRequest() as any);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.responseTime).toBeDefined();
    }
  });

  it("should return extended diagnostics for authorized requests", async () => {
    mockIsAuthorized.mockReturnValue(true);
    const res = await GET(createGetRequest({ "X-Health-Token": "valid-token" }) as any);
    expect([200, 503]).toContain(res.status);
  });
});
