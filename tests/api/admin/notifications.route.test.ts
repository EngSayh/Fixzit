/**
 * @fileoverview Admin Notifications API Route Tests
 * @description Tests for /api/admin/notifications endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock("@/lib/mongo", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock rate limit
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock notification model
vi.mock("@/server/models/Notification", () => ({
  NotificationModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

import { auth } from "@/auth";

describe("Admin Notifications API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/notifications/config", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      
      const { GET } = await import("@/app/api/admin/notifications/config/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/notifications/config")
      );
      
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-admin users", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user-1", role: "VIEWER", orgId: "org-1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      
      const { GET } = await import("@/app/api/admin/notifications/config/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/notifications/config")
      );
      
      const response = await GET(request);
      expect([401, 403]).toContain(response.status);
    });
  });

  describe("GET /api/admin/notifications/history", () => {
    it("requires authentication", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      
      const { GET } = await import("@/app/api/admin/notifications/history/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/notifications/history")
      );
      
      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/admin/notifications/test", () => {
    it("requires authentication", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      
      const { POST } = await import("@/app/api/admin/notifications/test/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/notifications/test"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "email", to: "test@example.com" }),
        }
      );
      
      const response = await POST(request);
      // Route may return 401 or 403 depending on middleware order
      expect([401, 403]).toContain(response.status);
    });

    it("requires admin role", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user-1", role: "VIEWER", orgId: "org-1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      
      const { POST } = await import("@/app/api/admin/notifications/test/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/notifications/test"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "email", to: "test@example.com" }),
        }
      );
      
      const response = await POST(request);
      expect([401, 403]).toContain(response.status);
    });
  });
});
