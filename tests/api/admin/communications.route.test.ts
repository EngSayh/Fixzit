/**
 * @fileoverview Admin Communications API Route Tests
 * @description Tests for /api/admin/communications endpoint
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

import { auth } from "@/auth";

describe("Admin Communications API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication & Authorization", () => {
    it("requires authentication for all operations", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      
      // Import dynamically to avoid module loading issues
      const { GET } = await import("@/app/api/admin/communications/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/communications")
      );
      
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("requires admin role for access", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user-1", role: "VIEWER", orgId: "org-1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      
      const { GET } = await import("@/app/api/admin/communications/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/communications")
      );
      
      const response = await GET(request);
      expect([401, 403]).toContain(response.status);
    });
  });
});
