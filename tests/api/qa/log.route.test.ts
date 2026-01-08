/**
 * @fileoverview Tests for QA log endpoint
 * @route GET,POST /api/qa/log
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      }),
      insertOne: vi.fn().mockResolvedValue({ insertedId: "123" }),
    }),
  }),
}));

vi.mock("@/lib/db/collections", () => ({
  ensureQaIndexes: vi.fn().mockResolvedValue(undefined),
  COLLECTIONS: { QA_LOGS: "qa_logs" },
}));

vi.mock("@/lib/qa/sanitize", () => ({
  sanitizeQaPayload: vi.fn((x) => x),
}));

vi.mock("@/lib/qa/telemetry", () => ({
  recordQaStorageFailure: vi.fn(),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
  createSecureResponse: vi.fn((data, opts) => new Response(JSON.stringify(data), opts)),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("test-key"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
  unauthorizedError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn(),
}));

const { GET, POST } = await import("@/app/api/qa/log/route");
const { requireSuperAdmin } = await import("@/lib/authz");
const { smartRateLimit } = await import("@/server/security/rateLimit");

describe("QA Log API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(requireSuperAdmin).mockResolvedValue({
      id: "superadmin",
      tenantId: "test-tenant",
    } as any);
  });

  describe("GET /api/qa/log", () => {
    it("should return 401 if not super admin", async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );

      const request = new NextRequest("http://localhost/api/qa/log");

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });

      const request = new NextRequest("http://localhost/api/qa/log");

      const response = await GET(request);
      expect(response.status).toBe(429);
    });
  });

  describe("POST /api/qa/log", () => {
    it("should return 401 if not super admin", async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );

      const request = new NextRequest("http://localhost/api/qa/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "test" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
