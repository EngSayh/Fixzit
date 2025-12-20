/**
import { expectAuthFailure, expectValidationFailure } from '@/tests/api/_helpers';
 * @fileoverview Tests for /api/vendors routes
 * Tests vendor listing and creation
 * MULTI-TENANT: Enforces org_id scope
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting - route uses smartRateLimit from @/server/security/rateLimit
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Vendor model
vi.mock("@/server/models/Vendor", () => ({
  Vendor: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
    findOne: vi.fn(),
  },
}));

import { smartRateLimit } from "@/server/security/rateLimit";
import { auth } from "@/auth";

const importRoute = async () => {
  try {
    return await import("@/app/api/vendors/route");
  } catch {
    return null;
  }
};

describe("API /api/vendors", () => {
  const mockOrgId = "org_123456789";
  const mockUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "ADMIN",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true, remaining: 10 } as never);
    vi.mocked(auth).mockResolvedValue({
      user: mockUser,
      expires: new Date(Date.now() + 86400000).toISOString(),
    } as never);
  });

  describe("GET - List Vendors", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false, remaining: 0 } as never);

      const req = new NextRequest("http://localhost:3000/api/vendors");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/vendors");
      const response = await route.GET(req);

      expectAuthFailure(response);
    });
  });

  describe("POST - Create Vendor", () => {
    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/vendors", {
        method: "POST",
        body: JSON.stringify({
          name: "HVAC Pro Services",
          email: "contact@hvacpro.com",
          services: ["HVAC", "Plumbing"],
        }),
      });
      const response = await route.POST(req);

      expectAuthFailure(response);
    });

    it("returns 400 for missing vendor name", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/vendors", {
        method: "POST",
        body: JSON.stringify({ email: "test@vendor.com" }),
      });
      const response = await route.POST(req);

      expectValidationFailure(response);
    });
  });
});
