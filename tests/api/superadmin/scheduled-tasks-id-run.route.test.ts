/**
 * @fileoverview Tests for superadmin/scheduled-tasks/[id]/run API route
 * @description POST to manually run a scheduled task
 * @route /api/superadmin/scheduled-tasks/[id]/run
 * @sprint 40
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

// Mock mongoose
vi.mock("mongoose", async () => {
  const actual = await vi.importActual("mongoose");
  return {
    ...actual,
    default: {
      ...actual,
      startSession: vi.fn().mockResolvedValue({
        withTransaction: vi.fn().mockImplementation(async (fn) => fn()),
        endSession: vi.fn(),
      }),
    },
    isValidObjectId: vi.fn().mockImplementation((id) => /^[0-9a-fA-F]{24}$/.test(id)),
  };
});

// Mock ScheduledTask model
vi.mock("@/server/models/ScheduledTask", () => ({
  ScheduledTask: {
    findById: vi.fn().mockResolvedValue(null),
  },
}));

// Mock TaskExecution model
vi.mock("@/server/models/TaskExecution", () => ({
  TaskExecution: {
    create: vi.fn().mockResolvedValue({ _id: "exec-id" }),
  },
  ITaskExecution: {},
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

describe("superadmin/scheduled-tasks/[id]/run route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/superadmin/scheduled-tasks/[id]/run", () => {
    it("should enforce rate limiting", async () => {
      const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
      vi.mocked(enforceRateLimit).mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );

      const { POST } = await import("@/app/api/superadmin/scheduled-tasks/[id]/run/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks/507f1f77bcf86cd799439011/run", {
        method: "POST",
      });
      const response = await POST(request, createContext("507f1f77bcf86cd799439011"));
      expect(response.status).toBe(429);
    });

    it("should return 400 for invalid ObjectId", async () => {
      const { POST } = await import("@/app/api/superadmin/scheduled-tasks/[id]/run/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks/invalid-id/run", {
        method: "POST",
      });
      const response = await POST(request, createContext("invalid-id"));
      expect(response.status).toBe(400);
    });

    it("should return 401 when not authenticated", async () => {
      const { POST } = await import("@/app/api/superadmin/scheduled-tasks/[id]/run/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks/507f1f77bcf86cd799439011/run", {
        method: "POST",
      });
      const response = await POST(request, createContext("507f1f77bcf86cd799439011"));
      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent task", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { POST } = await import("@/app/api/superadmin/scheduled-tasks/[id]/run/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks/507f1f77bcf86cd799439011/run", {
        method: "POST",
      });
      const response = await POST(request, createContext("507f1f77bcf86cd799439011"));
      expect(response.status).toBe(404);
    });
  });
});
