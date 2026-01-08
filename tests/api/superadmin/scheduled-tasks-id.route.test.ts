/**
 * @fileoverview Tests for superadmin/scheduled-tasks/[id] API route
 * @description GET/PUT/DELETE individual scheduled task
 * @route /api/superadmin/scheduled-tasks/[id]
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

// Mock ScheduledTask model
vi.mock("@/server/models/ScheduledTask", () => ({
  ScheduledTask: {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    findByIdAndUpdate: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    findByIdAndDelete: vi.fn().mockResolvedValue(null),
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

describe("superadmin/scheduled-tasks/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/scheduled-tasks/[id]", () => {
    it("should enforce rate limiting", async () => {
      const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
      vi.mocked(enforceRateLimit).mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );

      const { GET } = await import("@/app/api/superadmin/scheduled-tasks/[id]/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks/507f1f77bcf86cd799439011");
      const response = await GET(request, createContext("507f1f77bcf86cd799439011"));
      expect(response.status).toBe(429);
    });

    it("should return 400 for invalid ObjectId", async () => {
      const { GET } = await import("@/app/api/superadmin/scheduled-tasks/[id]/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks/invalid-id");
      const response = await GET(request, createContext("invalid-id"));
      expect(response.status).toBe(400);
    });

    it("should return 401 when not authenticated", async () => {
      const { GET } = await import("@/app/api/superadmin/scheduled-tasks/[id]/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks/507f1f77bcf86cd799439011");
      const response = await GET(request, createContext("507f1f77bcf86cd799439011"));
      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/superadmin/scheduled-tasks/[id]", () => {
    it("should enforce rate limiting", async () => {
      const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
      vi.mocked(enforceRateLimit).mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );

      const { PUT } = await import("@/app/api/superadmin/scheduled-tasks/[id]/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks/507f1f77bcf86cd799439011", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Task" }),
      });
      const response = await PUT(request, createContext("507f1f77bcf86cd799439011"));
      expect(response.status).toBe(429);
    });

    it("should return 401 when not authenticated", async () => {
      const { PUT } = await import("@/app/api/superadmin/scheduled-tasks/[id]/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks/507f1f77bcf86cd799439011", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Task" }),
      });
      const response = await PUT(request, createContext("507f1f77bcf86cd799439011"));
      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/superadmin/scheduled-tasks/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      const { DELETE } = await import("@/app/api/superadmin/scheduled-tasks/[id]/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/scheduled-tasks/507f1f77bcf86cd799439011", {
        method: "DELETE",
      });
      const response = await DELETE(request, createContext("507f1f77bcf86cd799439011"));
      expect(response.status).toBe(401);
    });
  });
});
