/**
 * @fileoverview Tests for /api/finance/zatca/onboarding route
 * @description ZATCA e-invoicing onboarding - compliance and production CSID flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE (read by mock factories via closures)
// ============================================================================
type SessionUser = { id: string; orgId: string; role: string } | null;
let mockSessionUser: SessionUser = null;
let mockDbResult: unknown = null;

// Mock dependencies before import
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(async () => mockSessionUser),
}));

vi.mock("@/lib/mongo", () => ({
  connectDb: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      findOne: vi.fn(async () => mockDbResult),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    }),
  }),
}));

vi.mock("@/lib/zatca/fatoora-client", () => ({
  requestComplianceCsid: vi.fn().mockResolvedValue({ success: true, csid: "test-csid", secret: "test-secret", requestId: "test-req-id", expiresAt: new Date().toISOString() }),
  requestProductionCsid: vi.fn().mockResolvedValue({ success: true, csid: "prod-csid", secret: "prod-secret", expiresAt: new Date().toISOString() }),
  submitComplianceInvoice: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/db/collection-names", () => ({
  COLLECTIONS: {
    ZATCA_CREDENTIALS: "zatca_credentials",
    ZATCA_SUBMISSIONS: "zatca_submissions",
  },
}));

// Import route after mocks
import { GET, POST } from "@/app/api/finance/zatca/onboarding/route";

// ============================================================================
// TESTS
// ============================================================================

describe("ZATCA Onboarding API", () => {
  beforeEach(() => {
    mockSessionUser = null;
    mockDbResult = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/finance/zatca/onboarding", () => {
    it("should reject unauthenticated requests", async () => {
      mockSessionUser = null;
      const req = new NextRequest("http://localhost/api/finance/zatca/onboarding");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return not_started when no credentials exist", async () => {
      mockSessionUser = { id: "user1", orgId: "org1", role: "admin" };
      mockDbResult = null;
      const req = new NextRequest("http://localhost/api/finance/zatca/onboarding");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("not_started");
      expect(data.hasCompliance).toBe(false);
      expect(data.hasProduction).toBe(false);
    });

    it("should return compliance status when credentials exist", async () => {
      mockSessionUser = { id: "user1", orgId: "org1", role: "admin" };
      mockDbResult = { status: "compliance", complianceCsid: "test-csid", updatedAt: new Date() };
      const req = new NextRequest("http://localhost/api/finance/zatca/onboarding");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("compliance");
      expect(data.hasCompliance).toBe(true);
      expect(data.hasProduction).toBe(false);
    });
  });

  describe("POST /api/finance/zatca/onboarding", () => {
    it("should reject unauthenticated requests", async () => {
      mockSessionUser = null;
      const req = new NextRequest("http://localhost/api/finance/zatca/onboarding", {
        method: "POST",
        body: JSON.stringify({ action: "request-compliance" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should reject request-compliance without CSR and OTP", async () => {
      mockSessionUser = { id: "user1", orgId: "org1", role: "admin" };
      const req = new NextRequest("http://localhost/api/finance/zatca/onboarding", {
        method: "POST",
        body: JSON.stringify({ action: "request-compliance" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("CSR and OTP required");
    });

    it("should reject submit-compliance without credentials", async () => {
      mockSessionUser = { id: "user1", orgId: "org1", role: "admin" };
      mockDbResult = null;
      const req = new NextRequest("http://localhost/api/finance/zatca/onboarding", {
        method: "POST",
        body: JSON.stringify({ action: "submit-compliance", invoice: "xml", invoiceHash: "hash" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("No compliance credentials");
    });

    it("should reject request-production without completing compliance first", async () => {
      mockSessionUser = { id: "user1", orgId: "org1", role: "admin" };
      mockDbResult = null;
      const req = new NextRequest("http://localhost/api/finance/zatca/onboarding", {
        method: "POST",
        body: JSON.stringify({ action: "request-production" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Complete compliance first");
    });

    it("should reject invalid action", async () => {
      mockSessionUser = { id: "user1", orgId: "org1", role: "admin" };
      const req = new NextRequest("http://localhost/api/finance/zatca/onboarding", {
        method: "POST",
        body: JSON.stringify({ action: "invalid-action" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid action");
    });
  });
});
