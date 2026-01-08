/**
 * @fileoverview Tests for Souq Seller KYC Verify Document API
 * @route POST /api/souq/seller-central/kyc/verify-document
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockVerify = vi.fn();
let currentSession: Record<string, unknown> | null = null;

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => currentSession),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(async (req: { json: () => unknown }) => {
    try {
      const data = await req.json();
      return { data, error: null };
    } catch {
      return { data: null, error: "parse_error" };
    }
  }),
}));

vi.mock("@/services/souq/seller-kyc-service", () => ({
  sellerKYCService: {
    verifyDocument: (...args: unknown[]) => mockVerify(...args),
  },
}));

const ORG_ID = "507f1f77bcf86cd799439011";
const ADMIN_ID = "507f1f77bcf86cd799439012";

function createRequest(body: Record<string, unknown>): NextRequest {
  return {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json" }),
    nextUrl: new URL("http://localhost:3000/api/souq/seller-central/kyc/verify-document"),
    json: async () => body,
  } as unknown as NextRequest;
}

describe("/api/souq/seller-central/kyc/verify-document", () => {
  let POST: typeof import("@/app/api/souq/seller-central/kyc/verify-document/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    currentSession = null;
    mockVerify.mockResolvedValue(undefined);

    const mod = await import("@/app/api/souq/seller-central/kyc/verify-document/route");
    POST = mod.POST;
  });

  it("returns 401 when session is missing", async () => {
    currentSession = null;

    const res = await POST(
      createRequest({ sellerId: "seller-1", documentType: "vatCertificate", approved: true }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is not admin", async () => {
    currentSession = {
      user: { id: "user-1", orgId: ORG_ID, role: "VENDOR" },
    };

    const res = await POST(
      createRequest({ sellerId: "seller-1", documentType: "vatCertificate", approved: true }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    currentSession = {
      user: { id: ADMIN_ID, orgId: ORG_ID, role: "ADMIN" },
    };

    const res = await POST(createRequest({ sellerId: "seller-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when rejection reason is missing", async () => {
    currentSession = {
      user: { id: ADMIN_ID, orgId: ORG_ID, role: "ADMIN" },
    };

    const res = await POST(
      createRequest({ sellerId: "seller-1", documentType: "vatCertificate", approved: false }),
    );
    expect(res.status).toBe(400);
  });

  it("verifies document when approved", async () => {
    currentSession = {
      user: { id: ADMIN_ID, orgId: ORG_ID, role: "ADMIN" },
    };

    const res = await POST(
      createRequest({ sellerId: "seller-1", documentType: "vatCertificate", approved: true }),
    );
    expect(res.status).toBe(200);
    expect(mockVerify).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: "seller-1",
        orgId: ORG_ID,
        documentType: "vatCertificate",
        approved: true,
        verifiedBy: ADMIN_ID,
      }),
    );
  });
});
