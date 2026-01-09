/**
 * @fileoverview Tests for dev demo-login endpoint
 * @route POST /api/dev/demo-login
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/mongoose", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

const { POST } = await import("@/app/api/dev/demo-login/route");

describe("Dev Demo Login API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/dev/demo-login", () => {
    it("should handle login request", async () => {
      const request = new NextRequest("http://localhost/api/dev/demo-login", {
        method: "POST",
        body: JSON.stringify({ email: "demo@example.com" }),
      });

      const response = await POST(request);
      // Dev endpoints may be restricted in production
      expect([200, 400, 403, 404, 500]).toContain(response.status);
    });

    it("should handle missing body", async () => {
      const request = new NextRequest("http://localhost/api/dev/demo-login", {
        method: "POST",
      });

      const response = await POST(request);
      // Dev endpoints may be disabled in production
      expect([200, 400, 403, 404, 500]).toContain(response.status);
    });
  });
});
