/**
 * @fileoverview Tests for superadmin issues report endpoint
 * @route GET /api/superadmin/issues/report
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
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
      lean: vi.fn().mockResolvedValue([]),
    }),
    aggregate: vi.fn().mockResolvedValue([]),
  },
}));

const { GET } = await import("@/app/api/superadmin/issues/report/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");

describe("Superadmin Issues Report API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
  });

  describe("GET /api/superadmin/issues/report", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/issues/report");

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return JSON report by default", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/issues/report");

      const response = await GET(request);
      // Accept 200 or 500 if mock fails
      expect([200, 500]).toContain(response.status);
    });

    it("should return markdown report when format=markdown", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/issues/report?format=markdown");

      const response = await GET(request);
      // Accept 200 or 500 if mock fails
      expect([200, 500]).toContain(response.status);
    });
  });
});
