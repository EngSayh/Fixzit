/**
 * @fileoverview Tests for superadmin export endpoint
 * @route GET,POST /api/superadmin/export
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("mongoose", () => ({
  default: {
    connection: {
      db: {
        listCollections: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ name: "organizations" }]),
        }),
        collection: vi.fn().mockReturnValue({
          find: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      },
    },
  },
}));

const { GET, POST } = await import("@/app/api/superadmin/export/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Superadmin Export API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
  });

  describe("GET /api/superadmin/export", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/export");

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return available collections", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/export");

      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("availableCollections");
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/export");

      const response = await GET(request);
      expect(response.status).toBe(429);
    });
  });

  describe("POST /api/superadmin/export", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/export", {
        method: "POST",
        body: JSON.stringify({ format: "json" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
