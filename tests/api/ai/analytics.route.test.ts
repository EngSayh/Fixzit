/**
 * @fileoverview Tests for /api/ai/analytics route
 * Tests authentication, demo mode, and analytics response
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock auth
let mockSession: { user?: { id: string; orgId?: string } } | null = null;
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { GET } from "@/app/api/ai/analytics/route";

describe("API /api/ai/analytics", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockSession = null;
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.ENABLE_DEMO_MODE = "false";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated and demo mode disabled", async () => {
      mockSession = null;
      process.env.ENABLE_DEMO_MODE = "false";

      const res = await GET();

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe("FIXZIT-AUTH-001");
    });

    it("returns 400 when authenticated user has no orgId", async () => {
      mockSession = {
        user: { id: "user-123", orgId: undefined },
      };
      process.env.ENABLE_DEMO_MODE = "false";

      const res = await GET();

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("FIXZIT-TENANT-001");
    });
  });

  describe("Demo Mode", () => {
    it("allows unauthenticated access when demo mode enabled", async () => {
      mockSession = null;
      process.env.ENABLE_DEMO_MODE = "true";

      const res = await GET();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.is_demo).toBe(true);
      expect(data.orgId).toBe("demo");
    });

    it("uses real orgId when authenticated even with demo mode enabled", async () => {
      mockSession = {
        user: { id: "user-123", orgId: "org-123" },
      };
      process.env.ENABLE_DEMO_MODE = "true";

      const res = await GET();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.is_demo).toBe(false);
      expect(data.orgId).toBe("org-123");
    });
  });

  describe("Success Cases", () => {
    it("returns analytics data for authenticated user", async () => {
      mockSession = {
        user: { id: "user-123", orgId: "org-123" },
      };

      const res = await GET();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("anomalies");
      expect(data).toHaveProperty("generated_at");
      expect(data.orgId).toBe("org-123");
    });
  });
});
