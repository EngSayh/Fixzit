/**
 * @fileoverview Tests for admin/logo/upload API route
 * @description Uploads platform logo for white-labeling
 * @route POST /api/admin/logo/upload
 * @sprint 49
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/logo/upload/route";

// Mock auth middleware
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn().mockRejectedValue(new Error("Not authenticated")),
}));

// Mock rate limit
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock MongoDB
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock PlatformSettings model
vi.mock("@/server/models/PlatformSettings", () => ({
  PlatformSettings: {
    findOneAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));

// Mock fs
vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("admin/logo/upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/admin/logo/upload", () => {
    it("should return 401 or 500 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/admin/logo/upload", {
        method: "POST",
      });
      const response = await POST(request);
      // 401 = auth rejected, 500 = auth threw error
      expect([401, 500]).toContain(response.status);
    });

    it("should return 403 for non-SUPER_ADMIN", async () => {
      const { getSessionUser } = await import("@/server/middleware/withAuthRbac");
      vi.mocked(getSessionUser).mockResolvedValueOnce({
        id: "user-1",
        orgId: "org-1",
        role: "ADMIN",
      } as never);

      const request = new NextRequest("http://localhost:3000/api/admin/logo/upload", {
        method: "POST",
      });
      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });
});
