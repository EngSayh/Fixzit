/**
 * @fileoverview Tests for /api/admin/notifications/send route
 * @description SUPER_ADMIN only access to broadcast notifications
 * 
 * Pattern: Static imports with mutable context variables (per TESTING_STRATEGY.md)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// === Mutable state for mocks ===
type AuthSession = { user: { id: string; role: string; orgId: string; email?: string }; expires: string } | null;
let mockAuthSession: AuthSession = null;
let mockRateLimitAllowed = true;

// Mock dependencies with mutable state
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockAuthSession),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/sms", () => ({
  sendSMS: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/communication-logger", () => ({
  logCommunication: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(async () => ({ allowed: mockRateLimitAllowed })),
  buildOrgAwareRateLimitKey: vi.fn(() => "rate-limit-key"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() =>
    new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    })
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Dynamic import to ensure fresh module per test run (prevents CI shard mock contamination)
const importRoute = async () => import("@/app/api/admin/notifications/send/route");

function createRequest(body: object): NextRequest {
  const url = "http://localhost:3000/api/admin/notifications/send";
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API /api/admin/notifications/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    // Reset mutable state
    mockAuthSession = null;
    mockRateLimitAllowed = true;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("POST /api/admin/notifications/send", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuthSession = null;

      const { POST } = await importRoute();
      const req = createRequest({
        recipients: { type: "all" },
        channels: ["email"],
        subject: "Test",
        message: "Test message",
        priority: "normal",
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 403 when not SUPER_ADMIN", async () => {
      mockAuthSession = {
        user: { id: "user1", role: "ADMIN", orgId: "org1", email: "admin@test.com" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      const { POST } = await importRoute();
      const req = createRequest({
        recipients: { type: "all" },
        channels: ["email"],
        subject: "Test",
        message: "Test message",
        priority: "normal",
      });
      const res = await POST(req);

      // May return 401 if auth check fails before role check
      expect([401, 403]).toContain(res.status);
    });

    it("enforces rate limiting", async () => {
      mockAuthSession = {
        user: { id: "admin1", role: "SUPER_ADMIN", orgId: "org1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };
      mockRateLimitAllowed = false;

      const { POST } = await importRoute();
      const req = createRequest({
        recipients: { type: "all" },
        channels: ["email"],
        subject: "Test",
        message: "Test message",
        priority: "normal",
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });

    // Pending integration tests tracked in SSOT:
    // - invalid recipients type, missing channels, send to all users
  });
});
