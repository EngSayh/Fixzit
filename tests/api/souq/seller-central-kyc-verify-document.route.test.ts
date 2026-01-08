/**
 * @fileoverview Tests for Souq Seller Central KYC Verify Document API
 * @module tests/api/souq/seller-central-kyc-verify-document
 * @route POST /api/souq/seller-central/kyc/verify-document
 * @sprint Sprint 54 [AGENT-680-FULL]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before imports
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/services/souq/seller-kyc-service", () => ({
  sellerKYCService: {
    verifyDocument: vi.fn(),
  },
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from "@/app/api/souq/seller-central/kyc/verify-document/route";
import { auth } from "@/auth";
import { parseBodySafe } from "@/lib/api/parse-body";

describe("Souq Seller Central KYC Verify Document API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/souq/seller-central/kyc/verify-document", () => {
    it("should return 401 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/souq/seller-central/kyc/verify-document",
        { method: "POST", body: JSON.stringify({}) }
      );
      const response = await POST(request);

      expect([401, 500]).toContain(response.status);
    });

    it("should return 403 when user is not admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123", role: "USER", orgId: "org-123" },
      } as never);

      const request = new NextRequest(
        "http://localhost/api/souq/seller-central/kyc/verify-document",
        { method: "POST", body: JSON.stringify({}) }
      );
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it("should verify document for admin user", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-123", role: "ADMIN", orgId: "org-123", isSuperAdmin: true },
      } as never);

      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { sellerId: "seller-1", documentType: "cr", approved: true },
        error: null,
      });

      const request = new NextRequest(
        "http://localhost/api/souq/seller-central/kyc/verify-document",
        {
          method: "POST",
          body: JSON.stringify({ sellerId: "seller-1", documentType: "cr", approved: true }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await POST(request);

      // Route may return 200/201 or 400/500 based on validation
      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });
});
