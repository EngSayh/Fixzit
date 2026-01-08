/**
 * @fileoverview Tests for admin/route-aliases/workflow API route
 * @description Manages workflow status for route alias resolution
 * @route GET/POST /api/admin/route-aliases/workflow
 * @sprint 49
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/route-aliases/workflow/route";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Mock rate limit
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock workflow store
vi.mock("@/lib/routes/workflowStore", () => ({
  readAliasWorkflow: vi.fn().mockReturnValue({}),
  upsertAliasWorkflow: vi.fn().mockReturnValue({ aliasFile: "test", resolved: false }),
}));

// Mock parse-body
vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

describe("admin/route-aliases/workflow route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/route-aliases/workflow", () => {
    it("should return 403 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/admin/route-aliases/workflow");
      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should return 403 for non-SUPER_ADMIN", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user-1", orgId: "org-1", role: "ADMIN" },
      } as never);

      const request = new NextRequest("http://localhost:3000/api/admin/route-aliases/workflow");
      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should return workflow map with SUPER_ADMIN", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user-1", orgId: "org-1", role: "SUPER_ADMIN" },
      } as never);

      const request = new NextRequest("http://localhost:3000/api/admin/route-aliases/workflow");
      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/admin/route-aliases/workflow", () => {
    it("should return 403 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/admin/route-aliases/workflow", {
        method: "POST",
        body: JSON.stringify({ aliasFile: "test" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("should return 403 for non-SUPER_ADMIN", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user-1", orgId: "org-1", role: "ADMIN" },
      } as never);

      const request = new NextRequest("http://localhost:3000/api/admin/route-aliases/workflow", {
        method: "POST",
        body: JSON.stringify({ aliasFile: "test" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });
});
