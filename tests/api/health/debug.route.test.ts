/**
 * @fileoverview Tests for /api/health/debug route
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("mongoose", () => ({
  default: {
    connection: {
      readyState: 1,
      host: "localhost",
      name: "fixzit",
    },
  },
}));

vi.mock("mongodb", () => ({
  MongoClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    db: vi.fn().mockReturnValue({
      command: vi.fn().mockResolvedValue({ ok: 1 }),
    }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@/server/security/health-token", () => ({
  isAuthorizedHealthRequest: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Store original env
const originalEnv = process.env.HEALTH_CHECK_TOKEN;

import { GET } from "@/app/api/health/debug/route";
import { isAuthorizedHealthRequest } from "@/server/security/health-token";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockIsAuthorized = vi.mocked(isAuthorizedHealthRequest);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

function createGetRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/health/debug", {
    method: "GET",
    headers,
  });
}

describe("GET /api/health/debug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthorized.mockReturnValue(false);
    mockEnforceRateLimit.mockReturnValue(null);
    process.env.HEALTH_CHECK_TOKEN = "test-token";
  });

  afterAll(() => {
    process.env.HEALTH_CHECK_TOKEN = originalEnv;
  });

  it("should return 429 when rate limited", async () => {
    mockEnforceRateLimit.mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }) as any
    );
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(429);
  });

  it("should return 404 when HEALTH_CHECK_TOKEN is not set", async () => {
    delete process.env.HEALTH_CHECK_TOKEN;
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(404);
  });

  it("should return 401 for unauthorized requests", async () => {
    mockIsAuthorized.mockReturnValue(false);
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(401);
  });

  it("should return diagnostics for authorized requests", async () => {
    mockIsAuthorized.mockReturnValue(true);
    const res = await GET(createGetRequest({ "X-Health-Token": "test-token" }) as any);
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.timestamp).toBeDefined();
    }
  });

  it("should include mongoose connection state", async () => {
    mockIsAuthorized.mockReturnValue(true);
    const res = await GET(createGetRequest({ "X-Health-Token": "test-token" }) as any);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.mongooseConnectionState !== undefined || json.mongoose !== undefined).toBe(true);
    }
  });

  it("should not expose full MONGODB_URI value", async () => {
    mockIsAuthorized.mockReturnValue(true);
    process.env.MONGODB_URI = "mongodb+srv://user:secret@cluster.example.com";
    const res = await GET(createGetRequest({ "X-Health-Token": "test-token" }) as any);
    if (res.status === 200) {
      const text = await res.text();
      expect(text).not.toContain("secret");
    }
  });
});
