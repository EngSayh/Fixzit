/**
 * @fileoverview Tests for superadmin issues stats endpoint
 * @route GET /api/superadmin/issues/stats
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/db/mongoose", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/BacklogIssue", () => ({
  default: {
    countDocuments: vi.fn().mockResolvedValue(50),
    aggregate: vi.fn().mockResolvedValue([{ _id: "pending", count: 10 }]),
  },
}));

const { GET } = await import("@/app/api/superadmin/issues/stats/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");

describe("Superadmin Issues Stats API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
  });

  describe("GET /api/superadmin/issues/stats", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/issues/stats");

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return issue statistics", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/issues/stats");

      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("total");
    });
  });
});
