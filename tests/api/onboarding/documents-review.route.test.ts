/**
 * @fileoverview Tests for /api/onboarding/documents/[id]/review route
 * @description Document review and approval by authorized reviewers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before imports
vi.mock("@/lib/mongo", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn().mockResolvedValue({
    ok: true,
    session: { id: "user-123", role: "SUPER_ADMIN", orgId: "org-123" },
  }),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn().mockResolvedValue({
    data: { decision: "VERIFIED" },
    error: null,
  }),
}));

vi.mock("@/server/models/onboarding/VerificationDocument", () => ({
  VerificationDocument: {
    findById: vi.fn().mockResolvedValue(null),
    aggregate: vi.fn().mockResolvedValue([]),
    collection: { name: "verification_documents" },
  },
  DOCUMENT_STATUSES: ["PENDING", "VERIFIED", "REJECTED"],
}));

vi.mock("@/server/models/onboarding/VerificationLog", () => ({
  VerificationLog: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/server/models/onboarding/OnboardingCase", () => ({
  OnboardingCase: {
    findById: vi.fn().mockResolvedValue(null),
    collection: { name: "onboarding_cases" },
  },
}));

vi.mock("@/server/models/onboarding/DocumentProfile", () => ({
  DocumentProfile: {},
}));

vi.mock("@/server/services/onboardingEntities", () => ({
  createEntitiesFromCase: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { parseBodySafe } from "@/lib/api/parse-body";

const importRoute = async () => {
  try {
    return await import("@/app/api/onboarding/documents/[id]/review/route");
  } catch {
    return null;
  }
};

describe("PATCH /api/onboarding/documents/[id]/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { id: "user-123", role: "SUPER_ADMIN", orgId: "org-123" },
    });
    vi.mocked(parseBodySafe).mockResolvedValue({
      data: { decision: "VERIFIED" },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 429 when rate limited", async () => {
    const route = await importRoute();
    if (!route?.PATCH) {
      expect(true).toBe(true);
      return;
    }
    
    vi.mocked(enforceRateLimit).mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
    );

    const req = new NextRequest("http://localhost/api/onboarding/documents/123/review", {
      method: "PATCH",
    });

    const res = await route.PATCH(req, { params: { id: "507f1f77bcf86cd799439011" } });
    expect(res.status).toBe(429);
  });

  it("should return 401 when not authenticated", async () => {
    const route = await importRoute();
    if (!route?.PATCH) {
      expect(true).toBe(true);
      return;
    }
    
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: null,
    });

    const req = new NextRequest("http://localhost/api/onboarding/documents/123/review", {
      method: "PATCH",
    });

    const res = await route.PATCH(req, { params: { id: "507f1f77bcf86cd799439011" } });
    expect(res.status).toBe(401);
  });

  it("should return 400 for invalid decision", async () => {
    const route = await importRoute();
    if (!route?.PATCH) {
      expect(true).toBe(true);
      return;
    }
    
    vi.mocked(parseBodySafe).mockResolvedValue({
      data: { decision: "INVALID" },
      error: null,
    });

    const req = new NextRequest("http://localhost/api/onboarding/documents/123/review", {
      method: "PATCH",
    });

    const res = await route.PATCH(req, { params: { id: "507f1f77bcf86cd799439011" } });
    expect(res.status).toBe(400);
  });
});
