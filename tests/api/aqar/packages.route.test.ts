/**
 * @fileoverview Tests for /api/aqar/packages routes
 * Tests Aqar package/subscription management
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { expectAuthFailure } from "@/tests/api/_helpers";

type SessionUser = {
  id?: string;
  orgId?: string;
  role?: string;
};
let sessionUser: SessionUser | null = null;

// Mock authentication
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(async () => {
    if (!sessionUser) throw new Error("Unauthorized");
    return sessionUser;
  }),
}));

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock database
vi.mock("@/lib/mongo", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock Aqar models
vi.mock("@/server/models/aqar", () => ({
  AqarPackage: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
  AqarPayment: {},
  PackageType: {},
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock i18n
vi.mock("@/lib/i18n/server", () => ({
  getServerTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { GET } from "@/app/api/aqar/packages/route";

describe("API /api/aqar/packages", () => {
  beforeEach(() => {
    sessionUser = null;
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("GET - List Packages", () => {
    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/aqar/packages");
      const response = await GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401/500 when user is not authenticated", async () => {
      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/aqar/packages");
      const response = await GET(req);

      expectAuthFailure(response);
    });

    it("returns packages list successfully", async () => {
      sessionUser = { id: "user-123", orgId: "org-123" };

      const req = new NextRequest("http://localhost:3000/api/aqar/packages");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveProperty("packages");
    });
  });
});
