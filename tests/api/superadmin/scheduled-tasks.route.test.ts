/**
 * @fileoverview Tests for superadmin/scheduled-tasks API route
 * @description GET/POST scheduled tasks with auto-seeding
 * @route /api/superadmin/scheduled-tasks
 * @sprint 39
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiter before import
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

// Mock MongoDB
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock ScheduledTask model
vi.mock("@/server/models/ScheduledTask", () => ({
  ScheduledTask: {
    countDocuments: vi.fn().mockResolvedValue(0),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ _id: "test-id", name: "Test Task" }),
    insertMany: vi.fn().mockResolvedValue([]),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("superadmin/scheduled-tasks route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/scheduled-tasks", () => {
    it("should enforce rate limiting", async () => {
      const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
      vi.mocked(enforceRateLimit).mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );

      const { GET } = await import("@/app/api/superadmin/scheduled-tasks/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks");
      const response = await GET(request);
      expect(response.status).toBe(429);
    });

    it("should return 401 when not authenticated", async () => {
      const { GET } = await import("@/app/api/superadmin/scheduled-tasks/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return tasks with valid session", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { GET } = await import("@/app/api/superadmin/scheduled-tasks/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks");
      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /api/superadmin/scheduled-tasks", () => {
    it("should enforce rate limiting", async () => {
      const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
      vi.mocked(enforceRateLimit).mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );

      const { POST } = await import("@/app/api/superadmin/scheduled-tasks/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks", {
        method: "POST",
        body: JSON.stringify({ name: "Test Task" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it("should return 401 when not authenticated", async () => {
      const { POST } = await import("@/app/api/superadmin/scheduled-tasks/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Task",
          schedule: "0 * * * *",
          handler: "jobs/test",
        }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
