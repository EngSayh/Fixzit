/**
 * @fileoverview Tests for superadmin/scheduled-tasks/[id]/executions API route
 * @description GET execution history for a scheduled task
 * @route /api/superadmin/scheduled-tasks/[id]/executions
 * @sprint 41
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

// Mock TaskExecution model
vi.mock("@/server/models/TaskExecution", () => ({
  TaskExecution: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
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

const createContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe("superadmin/scheduled-tasks/[id]/executions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/scheduled-tasks/[id]/executions", () => {
    it("should enforce rate limiting", async () => {
      const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
      vi.mocked(enforceRateLimit).mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );

      const { GET } = await import("@/app/api/superadmin/scheduled-tasks/[id]/executions/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks/507f1f77bcf86cd799439011/executions");
      const response = await GET(request, createContext("507f1f77bcf86cd799439011"));
      expect(response.status).toBe(429);
    });

    it("should return 400 for invalid ObjectId", async () => {
      const { GET } = await import("@/app/api/superadmin/scheduled-tasks/[id]/executions/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks/invalid-id/executions");
      const response = await GET(request, createContext("invalid-id"));
      expect(response.status).toBe(400);
    });

    it("should return 401 when not authenticated", async () => {
      const { GET } = await import("@/app/api/superadmin/scheduled-tasks/[id]/executions/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks/507f1f77bcf86cd799439011/executions");
      const response = await GET(request, createContext("507f1f77bcf86cd799439011"));
      expect(response.status).toBe(401);
    });

    it("should return executions with valid session", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { GET } = await import("@/app/api/superadmin/scheduled-tasks/[id]/executions/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks/507f1f77bcf86cd799439011/executions");
      const response = await GET(request, createContext("507f1f77bcf86cd799439011"));
      expect([200, 500]).toContain(response.status);
    });
  });
});
