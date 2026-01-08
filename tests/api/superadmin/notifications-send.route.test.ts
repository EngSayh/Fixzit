/**
 * @fileoverview Tests for superadmin/notifications/send API route
 * @description Sends a broadcast notification (superadmin)
 * @route /api/superadmin/notifications/send
 * @sprint 44
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

// Mock MongoDB
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      insertOne: vi.fn().mockResolvedValue({ insertedId: "test-id" }),
    }),
  }),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock collections
vi.mock("@/lib/db/collections", () => ({
  COLLECTIONS: {
    NOTIFICATIONS: "notifications",
  },
}));

describe("superadmin/notifications/send route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/superadmin/notifications/send", () => {
    it("should return 401 when not authenticated", async () => {
      const { POST } = await import("@/app/api/superadmin/notifications/send/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/notifications/send", {
        method: "POST",
        body: JSON.stringify({ title: "Test", message: "Test message" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 400 for missing required fields", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { POST } = await import("@/app/api/superadmin/notifications/send/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/notifications/send", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should validate channels is array", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { POST } = await import("@/app/api/superadmin/notifications/send/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/notifications/send", {
        method: "POST",
        body: JSON.stringify({ title: "Test", message: "Test message", channels: "email" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
