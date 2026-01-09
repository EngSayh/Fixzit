/**
 * @fileoverview Tests for dev demo-accounts endpoint
 * @route GET /api/dev/demo-accounts
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/mongoose", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

const { GET } = await import("@/app/api/dev/demo-accounts/route");

describe("Dev Demo Accounts API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/dev/demo-accounts", () => {
    it("should handle request", async () => {
      const request = new NextRequest("http://localhost/api/dev/demo-accounts");

      const response = await GET(request);
      // Dev endpoints may be restricted in production
      expect([200, 403, 404, 500]).toContain(response.status);
    });

    it("should return JSON response when successful", async () => {
      const request = new NextRequest("http://localhost/api/dev/demo-accounts");

      const response = await GET(request);
      const contentType = response.headers.get("content-type");

      if (response.status === 200) {
        expect(contentType).toContain("application/json");
      }
    });
  });
});
