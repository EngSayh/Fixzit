/**
 * @fileoverview Tests for SuperAdmin Logout API
 * @module tests/api/superadmin/logout.route.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/superadmin/logout/route";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// Mock dependencies
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

const mockClearSuperadminCookies = vi.fn();

vi.mock("@/lib/superadmin/auth", () => ({
  clearSuperadminCookies: (...args: unknown[]) => mockClearSuperadminCookies(...args),
}));

function createRequest(): NextRequest {
  const url = new URL("http://localhost:3000/api/superadmin/logout");
  return new NextRequest(url, { method: "POST" });
}

describe("SuperAdmin Logout API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    mockClearSuperadminCookies.mockReset();
  });

  describe("POST /api/superadmin/logout", () => {
    it("should return success and clear cookies", async () => {
      const request = createRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Logged out successfully");
      expect(mockClearSuperadminCookies).toHaveBeenCalled();
    });

    it("should include X-Robots-Tag header", async () => {
      const request = createRequest();
      const response = await POST(request);

      expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    });

    it("should handle errors gracefully", async () => {
      mockClearSuperadminCookies.mockImplementation(() => {
        throw new Error("Cookie clear failed");
      });

      const request = createRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Logout failed");
    });
  });

  describe("GET /api/superadmin/logout", () => {
    it("should also work for GET requests (logout links)", async () => {
      const url = new URL("http://localhost:3000/api/superadmin/logout");
      const request = new NextRequest(url, { method: "GET" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
