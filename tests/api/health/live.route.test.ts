/**
 * @fileoverview Tests for /api/health/live route (K8s liveness probe)
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

import { GET } from "@/app/api/health/live/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

function createGetRequest(): Request {
  return new Request("http://localhost:3000/api/health/live", {
    method: "GET",
  });
}

describe("GET /api/health/live", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
  });

  it("should return 429 when rate limited", async () => {
    mockEnforceRateLimit.mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }) as any
    );
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(429);
  });

  it("should return 200 with alive status", async () => {
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alive).toBe(true);
  });

  it("should include uptime in response", async () => {
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(typeof json.uptime).toBe("number");
    expect(json.uptime).toBeGreaterThanOrEqual(0);
  });

  it("should include memory stats", async () => {
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.memory).toBeDefined();
    expect(json.memory.heapUsed).toBeDefined();
    expect(json.memory.heapTotal).toBeDefined();
    expect(json.memory.rss).toBeDefined();
  });

  it("should include timestamp", async () => {
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.timestamp).toBeDefined();
    // Should be valid ISO timestamp
    expect(() => new Date(json.timestamp)).not.toThrow();
  });
});
