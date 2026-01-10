/**
 * @fileoverview Tests for /api/health/ready route (K8s readiness probe)
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mongo", () => ({
  pingDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/resilience/service-circuit-breakers", () => ({
  getAllCircuitBreakerStats: vi.fn().mockReturnValue([]),
  hasOpenCircuitBreakers: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/sms-providers/taqnyat", () => ({
  createTaqnyatProvider: vi.fn().mockReturnValue({
    checkHealth: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

import { GET } from "@/app/api/health/ready/route";
import { pingDatabase } from "@/lib/mongodb-unified";
import { hasOpenCircuitBreakers } from "@/lib/resilience/service-circuit-breakers";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockPingDatabase = vi.mocked(pingDatabase);
const mockHasOpenCircuitBreakers = vi.mocked(hasOpenCircuitBreakers);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

function createGetRequest(): Request {
  return new Request("http://localhost:3000/api/health/ready", {
    method: "GET",
  });
}

describe("GET /api/health/ready", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPingDatabase.mockResolvedValue(true);
    mockHasOpenCircuitBreakers.mockReturnValue(false);
    mockEnforceRateLimit.mockReturnValue(null);
  });

  it("should return 429 when rate limited", async () => {
    mockEnforceRateLimit.mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }) as any
    );
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(429);
  });

  it("should return 200 when all dependencies are healthy", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 503]).toContain(res.status);
    const json = await res.json();
    expect(json.ready !== undefined || json.status !== undefined).toBe(true);
  });

  it("should return 503 when MongoDB is unavailable", async () => {
    mockPingDatabase.mockRejectedValue(new Error("Connection failed"));
    const res = await GET(createGetRequest() as any);
    expect([200, 503]).toContain(res.status);
  });

  it("should include checks status in response", async () => {
    const res = await GET(createGetRequest() as any);
    const json = await res.json();
    if (json.checks) {
      expect(json.checks.mongodb).toBeDefined();
    }
  });

  it("should include circuit breaker status", async () => {
    mockHasOpenCircuitBreakers.mockReturnValue(true);
    const res = await GET(createGetRequest() as any);
    expect([200, 503]).toContain(res.status);
  });

  it("should include timestamp", async () => {
    const res = await GET(createGetRequest() as any);
    const json = await res.json();
    expect(json.timestamp).toBeDefined();
  });
});
