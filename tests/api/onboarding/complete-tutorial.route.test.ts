/**
 * @fileoverview Tests for /api/onboarding/[caseId]/complete-tutorial route
 * @description Marks onboarding tutorial as completed for a case
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { PUT } from "@/app/api/onboarding/[caseId]/complete-tutorial/route";

// Mock dependencies
vi.mock("@/lib/mongo", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/server/models/onboarding/OnboardingCase", () => ({
  OnboardingCase: {
    findOne: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { getSessionOrNull } from "@/lib/auth/safe-session";
import { OnboardingCase } from "@/server/models/onboarding/OnboardingCase";

describe("PUT /api/onboarding/[caseId]/complete-tutorial", () => {
  const mockParams = { caseId: "case-123" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should mark tutorial as completed", async () => {
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { id: "user-123", orgId: "org-123" },
      response: null,
    });
    
    const mockCase = {
      _id: "case-123",
      subject_user_id: "user-123",
      tutorial_completed: false,
      current_step: 2,
      save: vi.fn().mockResolvedValue(true),
    };
    vi.mocked(OnboardingCase.findOne).mockResolvedValue(mockCase);

    const req = new NextRequest(
      "http://localhost/api/onboarding/case-123/complete-tutorial",
      { method: "PUT" }
    );

    const res = await PUT(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("complete");
    expect(mockCase.tutorial_completed).toBe(true);
    expect(mockCase.current_step).toBe(4);
    expect(mockCase.save).toHaveBeenCalled();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: null,
      response: null,
    });

    const req = new NextRequest(
      "http://localhost/api/onboarding/case-123/complete-tutorial",
      { method: "PUT" }
    );

    const res = await PUT(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if case not found", async () => {
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { id: "user-123", orgId: "org-123" },
      response: null,
    });
    vi.mocked(OnboardingCase.findOne).mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/onboarding/case-123/complete-tutorial",
      { method: "PUT" }
    );

    const res = await PUT(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Not found");
  });

  it("should return 500 on database error", async () => {
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { id: "user-123", orgId: "org-123" },
      response: null,
    });
    vi.mocked(OnboardingCase.findOne).mockRejectedValue(new Error("DB error"));

    const req = new NextRequest(
      "http://localhost/api/onboarding/case-123/complete-tutorial",
      { method: "PUT" }
    );

    const res = await PUT(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to complete tutorial");
  });
});
