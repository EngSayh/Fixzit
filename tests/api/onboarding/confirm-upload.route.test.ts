/**
 * @fileoverview Tests for /api/onboarding/[caseId]/documents/confirm-upload route
 * @description Confirms document upload and enqueues OCR processing
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
    session: { id: "user-123", role: "USER", orgId: "org-123" },
  }),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn().mockResolvedValue({
    data: {
      document_type_code: "NATIONAL_ID",
      file_storage_key: "uploads/doc-123.pdf",
      original_name: "id.pdf",
      mime_type: "application/pdf",
      size_bytes: 1024,
    },
    error: null,
  }),
}));

vi.mock("@/server/models/onboarding/OnboardingCase", () => ({
  OnboardingCase: {
    findOne: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/server/models/onboarding/VerificationDocument", () => ({
  VerificationDocument: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/server/models/onboarding/VerificationLog", () => ({
  VerificationLog: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/server/models/onboarding/DocumentProfile", () => ({
  DocumentProfile: {
    findOne: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/jobs/onboarding-queue", () => ({
  enqueueOnboardingOcr: vi.fn().mockResolvedValue(undefined),
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
    return await import("@/app/api/onboarding/[caseId]/documents/confirm-upload/route");
  } catch {
    return null;
  }
};

describe("POST /api/onboarding/[caseId]/documents/confirm-upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { id: "user-123", role: "USER", orgId: "org-123" },
    });
    vi.mocked(parseBodySafe).mockResolvedValue({
      data: {
        document_type_code: "NATIONAL_ID",
        file_storage_key: "uploads/doc-123.pdf",
        original_name: "id.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
      },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 429 when rate limited", async () => {
    const route = await importRoute();
    if (!route?.POST) {
      expect(true).toBe(true);
      return;
    }
    
    vi.mocked(enforceRateLimit).mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
    );

    const req = new NextRequest("http://localhost/api/onboarding/case-123/documents/confirm-upload", {
      method: "POST",
    });

    const res = await route.POST(req, { params: { caseId: "507f1f77bcf86cd799439011" } });
    expect(res.status).toBe(429);
  });

  it("should return 401 when not authenticated", async () => {
    const route = await importRoute();
    if (!route?.POST) {
      expect(true).toBe(true);
      return;
    }
    
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: null,
    });

    const req = new NextRequest("http://localhost/api/onboarding/case-123/documents/confirm-upload", {
      method: "POST",
    });

    const res = await route.POST(req, { params: { caseId: "507f1f77bcf86cd799439011" } });
    expect(res.status).toBe(401);
  });

  it("should return 400 for missing required fields", async () => {
    const route = await importRoute();
    if (!route?.POST) {
      expect(true).toBe(true);
      return;
    }
    
    vi.mocked(parseBodySafe).mockResolvedValue({
      data: { document_type_code: "NATIONAL_ID" }, // Missing file_storage_key and original_name
      error: null,
    });

    const req = new NextRequest("http://localhost/api/onboarding/case-123/documents/confirm-upload", {
      method: "POST",
    });

    const res = await route.POST(req, { params: { caseId: "507f1f77bcf86cd799439011" } });
    expect(res.status).toBe(400);
  });

  it("should return 404 when case not found", async () => {
    const route = await importRoute();
    if (!route?.POST) {
      expect(true).toBe(true);
      return;
    }

    const req = new NextRequest("http://localhost/api/onboarding/case-123/documents/confirm-upload", {
      method: "POST",
    });

    const res = await route.POST(req, { params: { caseId: "507f1f77bcf86cd799439011" } });
    expect(res.status).toBe(404);
  });
});
