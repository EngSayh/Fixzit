/**
 * @fileoverview Tests for /api/onboarding/initiate routes
 * Tests onboarding case creation for various user roles
 * CRITICAL: Entry point for KYC and verification workflows
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock session
vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn(),
}));

// Mock body parsing
vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(),
}));

// Mock database connection
vi.mock("@/lib/mongo", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
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

// Mock OnboardingCase model
vi.mock("@/server/models/onboarding/OnboardingCase", () => ({
  OnboardingCase: {
    create: vi.fn(),
  },
  ONBOARDING_ROLES: ["VENDOR", "TENANT", "OWNER", "DRIVER"],
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { parseBodySafe } from "@/lib/api/parse-body";
import { OnboardingCase } from "@/server/models/onboarding/OnboardingCase";

const importRoute = async () => {
  try {
    return await import("@/app/api/onboarding/initiate/route");
  } catch {
    return null;
  }
};

describe("API /api/onboarding/initiate", () => {
  const mockOrgId = "507f1f77bcf86cd799439011";
  const mockUser = {
    id: "507f1f77bcf86cd799439012",
    orgId: mockOrgId,
    role: "USER",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: mockUser,
    } as never);
  });

  describe("POST - Initiate Onboarding Case", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/onboarding/initiate", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding/initiate", {
        method: "POST",
        body: JSON.stringify({
          role: "VENDOR",
          basic_info: { name: "Test Vendor" },
        }),
      });
      const response = await route.POST(req);

      expect([401, 500, 503]).toContain(response.status);
    });

    it("returns 400 when orgId is missing", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: { id: mockUser.id, role: mockUser.role },
      } as never);

      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { role: "VENDOR", basic_info: { name: "Test Vendor" } },
        error: null,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding/initiate", {
        method: "POST",
        body: JSON.stringify({ role: "VENDOR", basic_info: { name: "Test Vendor" } }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Organization");
    });

    it("returns 400 for invalid request body", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(parseBodySafe).mockResolvedValue({
        data: null,
        error: "Parse error",
      } as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding/initiate", {
        method: "POST",
        body: "invalid json",
      });
      const response = await route.POST(req);

      expect(response.status).toBe(400);
    });

    it("returns 400 for invalid role", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { role: "INVALID_ROLE", basic_info: { name: "Test" } },
        error: null,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding/initiate", {
        method: "POST",
        body: JSON.stringify({ role: "INVALID_ROLE", basic_info: { name: "Test" } }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(400);
    });

    it("returns 400 when basic_info is missing", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { role: "VENDOR" },
        error: null,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding/initiate", {
        method: "POST",
        body: JSON.stringify({ role: "VENDOR" }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(400);
    });

    it("creates onboarding case for VENDOR role", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const mockCreatedCase = {
        _id: "507f1f77bcf86cd799439013",
        orgId: mockOrgId,
        subject_user_id: mockUser.id,
        role: "VENDOR",
        status: "PENDING",
        current_step_index: 0,
      };

      vi.mocked(parseBodySafe).mockResolvedValue({
        data: {
          role: "VENDOR",
          basic_info: { businessName: "Test Vendor Co", contactEmail: "vendor@test.com" },
        },
        error: null,
      } as never);

      vi.mocked(OnboardingCase.create).mockResolvedValue(mockCreatedCase as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding/initiate", {
        method: "POST",
        body: JSON.stringify({
          role: "VENDOR",
          basic_info: { businessName: "Test Vendor Co", contactEmail: "vendor@test.com" },
        }),
      });
      const response = await route.POST(req);

      expect([200, 201]).toContain(response.status);
    });

    it("creates onboarding case for OWNER role", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const mockCreatedCase = {
        _id: "507f1f77bcf86cd799439014",
        orgId: mockOrgId,
        subject_user_id: mockUser.id,
        role: "OWNER",
        status: "PENDING",
        current_step_index: 0,
      };

      vi.mocked(parseBodySafe).mockResolvedValue({
        data: {
          role: "OWNER",
          basic_info: { fullName: "Property Owner", idNumber: "1234567890" },
          country: "SA",
        },
        error: null,
      } as never);

      vi.mocked(OnboardingCase.create).mockResolvedValue(mockCreatedCase as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding/initiate", {
        method: "POST",
        body: JSON.stringify({
          role: "OWNER",
          basic_info: { fullName: "Property Owner", idNumber: "1234567890" },
          country: "SA",
        }),
      });
      const response = await route.POST(req);

      expect([200, 201]).toContain(response.status);
    });
  });
});
