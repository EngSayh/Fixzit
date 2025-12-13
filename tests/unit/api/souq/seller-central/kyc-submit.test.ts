/**
 * @fileoverview Tests for Souq Seller KYC Submit API
 * @route POST /api/souq/seller-central/kyc/submit
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
const mockSubmitKYC = vi.fn();

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
    submitKYC: (...args: unknown[]) => mockSubmitKYC(...args),
  },
}));

let currentSession: Record<string, unknown> | null = null;

const ORG_ID = "507f1f77bcf86cd799439011";
const SELLER_ID = "507f1f77bcf86cd799439012";

function createRequest(body: Record<string, unknown>): NextRequest {
  return {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json" }),
    nextUrl: new URL("http://localhost:3000/api/souq/seller-central/kyc/submit"),
    json: async () => body,
  } as unknown as NextRequest;
}

describe("/api/souq/seller-central/kyc/submit", () => {
  let POST: typeof import("@/app/api/souq/seller-central/kyc/submit/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    currentSession = null;
    mockSubmitKYC.mockResolvedValue({ success: true });

    const mod = await import("@/app/api/souq/seller-central/kyc/submit/route");
    POST = mod.POST;
  });

  describe("Authentication", () => {
    it("returns 401 when session is missing", async () => {
      currentSession = null;

      const res = await POST(
        createRequest({
          step: "company_info",
          data: { companyName: "Test Inc" },
        }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 401 when user id is missing", async () => {
      currentSession = { user: { email: "test@example.com" } };

      const res = await POST(
        createRequest({
          step: "company_info",
          data: { companyName: "Test Inc" },
        }),
      );
      expect(res.status).toBe(401);
    });
  });

  describe("Authorization", () => {
    it("returns 403 when orgId is missing", async () => {
      currentSession = {
        user: { id: SELLER_ID, email: "seller@example.com", role: "VENDOR" },
      };

      const res = await POST(
        createRequest({
          step: "company_info",
          data: { companyName: "Test Inc" },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("returns 403 when role is not seller/vendor", async () => {
      currentSession = {
        user: {
          id: SELLER_ID,
          orgId: ORG_ID,
          email: "seller@example.com",
          role: "ADMIN",
        },
      };

      const res = await POST(
        createRequest({
          step: "company_info",
          data: { companyName: "Test Inc" },
        }),
      );

      expect(res.status).toBe(403);
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      currentSession = {
        user: { id: SELLER_ID, orgId: ORG_ID, email: "seller@example.com", role: "VENDOR" },
      };
    });

    it("returns 400 when step is missing", async () => {
      const res = await POST(
        createRequest({
          data: { companyName: "Test Inc" },
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("step");
    });

    it("returns 400 when data is missing", async () => {
      const res = await POST(
        createRequest({
          step: "company_info",
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("data");
    });

    it("returns 400 for invalid step", async () => {
      const res = await POST(
        createRequest({
          step: "invalid_step",
          data: { foo: "bar" },
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Invalid step");
    });

    it("accepts valid step: company_info", async () => {
      const res = await POST(
        createRequest({
          step: "company_info",
          data: { companyName: "Test Inc", registrationNumber: "12345" },
        }),
      );
      expect(res.status).toBe(200);
    });

    it("accepts valid step: documents", async () => {
      const res = await POST(
        createRequest({
          step: "documents",
          data: { documentType: "cr", documentUrl: "https://example.com/doc.pdf" },
        }),
      );
      expect(res.status).toBe(200);
    });

    it("accepts valid step: bank_details", async () => {
      const res = await POST(
        createRequest({
          step: "bank_details",
          data: { bankName: "Al Rajhi", iban: "SA0000000000000000000000" },
        }),
      );
      expect(res.status).toBe(200);
    });
  });

  describe("KYC Submission Flow", () => {
    beforeEach(() => {
      currentSession = {
        user: { id: SELLER_ID, orgId: ORG_ID, email: "seller@example.com", role: "VENDOR" },
      };
    });

    it("calls sellerKYCService with correct parameters", async () => {
      const data = { companyName: "Test Inc", registrationNumber: "12345" };
      
      await POST(
        createRequest({
          step: "company_info",
          data,
        }),
      );

      expect(mockSubmitKYC).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId: SELLER_ID,
          orgId: ORG_ID,
          vendorId: SELLER_ID,
          step: "company_info",
          data,
        }),
      );
    });

    it("returns nextStep guidance after company_info", async () => {
      const res = await POST(
        createRequest({
          step: "company_info",
          data: { companyName: "Test Inc" },
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.nextStep).toBe("documents");
    });

    it("returns nextStep guidance after documents", async () => {
      const res = await POST(
        createRequest({
          step: "documents",
          data: { documentType: "cr" },
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.nextStep).toBe("bank_details");
    });

    it("returns verification as final step after bank_details", async () => {
      const res = await POST(
        createRequest({
          step: "bank_details",
          data: { bankName: "Al Rajhi" },
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.nextStep).toBe("verification");
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      currentSession = {
        user: { id: SELLER_ID, orgId: ORG_ID, email: "seller@example.com", role: "VENDOR" },
      };
    });

    it("returns 500 when service throws", async () => {
      mockSubmitKYC.mockRejectedValue(new Error("Service unavailable"));

      const res = await POST(
        createRequest({
          step: "company_info",
          data: { companyName: "Test Inc" },
        }),
      );
      expect(res.status).toBe(500);
    });
  });
});
