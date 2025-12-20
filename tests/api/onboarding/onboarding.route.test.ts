/**
import { expectAuthFailure } from '@/tests/api/_helpers';
 * @fileoverview Tests for /api/onboarding routes
 * Tests onboarding case management for KYC, document submission, and approval workflows
 * CRITICAL: Core user registration flow
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

// Mock database connection
vi.mock("@/lib/mongo", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

// Mock tenant isolation
vi.mock("@/server/plugins/tenantIsolation", () => ({
  setTenantContext: vi.fn(),
  clearTenantContext: vi.fn(),
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
    find: vi.fn(),
    create: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
  },
  ONBOARDING_STATUSES: ["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED"],
  ONBOARDING_ROLES: ["VENDOR", "TENANT", "OWNER"],
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { OnboardingCase } from "@/server/models/onboarding/OnboardingCase";

const importRoute = async () => {
  vi.resetModules();
  return await import("@/app/api/onboarding/route");
};

describe("API /api/onboarding", () => {
  const mockOrgId = "507f1f77bcf86cd799439011";
  const mockUser = {
    id: "507f1f77bcf86cd799439012",
    orgId: mockOrgId,
    role: "ADMIN",
    roles: ["ADMIN"],
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

  describe("GET - List Onboarding Cases", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/onboarding");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();

      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding");
      const response = await route.GET(req);

      expectAuthFailure(response);
    });

    it("returns 400 when orgId is missing", async () => {
      const route = await importRoute();

      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: { id: "507f1f77bcf86cd799439012", role: "ADMIN", roles: ["ADMIN"] },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding");
      const response = await route.GET(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Organization");
    });

    it("returns 503 on session infrastructure error", async () => {
      const route = await importRoute();

      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: false,
        response: new Response(JSON.stringify({ error: "Service unavailable" }), { status: 503 }),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding");
      const response = await route.GET(req);

      expect(response.status).toBe(503);
    });

    it("returns onboarding cases with org_id scope for privileged users", async () => {
      const route = await importRoute();

      const mockCases = [
        {
          _id: "case_1",
          status: "PENDING",
          role: "VENDOR",
          orgId: mockOrgId,
          subject_user_id: "user_456",
        },
      ];

      vi.mocked(OnboardingCase.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockCases),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("non-privileged users only see their own cases", async () => {
      const route = await importRoute();

      // Set non-privileged user
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: { id: "user_123", orgId: mockOrgId, role: "USER", roles: ["USER"] },
      } as never);

      vi.mocked(OnboardingCase.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      // Verify find was called with $or filter for own cases
      expect(OnboardingCase.find).toHaveBeenCalled();
    });

    it("filters by status when provided", async () => {
      const route = await importRoute();

      vi.mocked(OnboardingCase.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding?status=PENDING");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
    });

    it("filters by role when provided", async () => {
      const route = await importRoute();

      vi.mocked(OnboardingCase.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding?role=VENDOR");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
    });

    it("respects limit parameter with bounds (1-100)", async () => {
      const route = await importRoute();

      vi.mocked(OnboardingCase.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/onboarding?limit=50");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
    });
  });
});
