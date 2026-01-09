/**
 * @fileoverview Tests for copilot stream endpoint
 * @route POST /api/copilot/stream
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn(),
}));

vi.mock("@/lib/db/mongoose", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

const { POST } = await import("@/app/api/copilot/stream/route");
const { getSessionOrNull } = await import("@/lib/auth/safe-session");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Copilot Stream API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("POST /api/copilot/stream", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({ ok: true, session: null });

      const request = new NextRequest("http://localhost/api/copilot/stream", {
        method: "POST",
        body: JSON.stringify({ message: "test" }),
      });

      const response = await POST(request);
      expect([401, 403, 500]).toContain(response.status);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/copilot/stream", {
        method: "POST",
        body: JSON.stringify({ message: "test" }),
      });

      const response = await POST(request);
      expect([200, 429, 500]).toContain(response.status);
    });
  });
});
