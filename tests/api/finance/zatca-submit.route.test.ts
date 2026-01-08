/**
 * @fileoverview Tests for /api/finance/zatca/submit route
 * @description ZATCA e-invoicing submission - clearance and reporting flow
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
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn().mockResolvedValue({ insertedId: "test-id" }),
    }),
  }),
}));

vi.mock("@/lib/zatca/fatoora-client", () => ({
  submitForClearance: vi.fn().mockResolvedValue({ success: true, clearanceStatus: "CLEARED" }),
  submitForReporting: vi.fn().mockResolvedValue({ success: true, reportingStatus: "REPORTED" }),
  encodeInvoiceXml: vi.fn((xml) => Buffer.from(xml).toString("base64")),
}));

vi.mock("@/lib/zatca/crypto", () => ({
  generateInvoiceHash: vi.fn(() => "test-invoice-hash"),
}));

vi.mock("@/lib/db/collection-names", () => ({
  COLLECTIONS: {
    ZATCA_CREDENTIALS: "zatca_credentials",
    ZATCA_SUBMISSIONS: "zatca_submissions",
  },
}));

// Import route after mocks
import { GET, POST } from "@/app/api/finance/zatca/submit/route";

// ============================================================================
// TESTS
// ============================================================================

describe("ZATCA Submit API", () => {
  beforeEach(() => {
    mockSessionUser = null;
    mockDbResult = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/finance/zatca/submit", () => {
    it("should reject unauthenticated requests", async () => {
      mockSessionUser = null;
      const req = new NextRequest("http://localhost/api/finance/zatca/submit");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return empty submissions list", async () => {
      mockSessionUser = { id: "user1", orgId: "org1", role: "admin" };
      const req = new NextRequest("http://localhost/api/finance/zatca/submit");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.submissions).toEqual([]);
      expect(data.total).toBe(0);
    });
  });

  describe("POST /api/finance/zatca/submit", () => {
    it("should reject unauthenticated requests", async () => {
      mockSessionUser = null;
      const req = new NextRequest("http://localhost/api/finance/zatca/submit", {
        method: "POST",
        body: JSON.stringify({ type: "clearance", invoiceXml: "<xml>", invoiceId: "INV-001" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should reject missing invoiceXml", async () => {
      mockSessionUser = { id: "user1", orgId: "org1", role: "admin" };
      const req = new NextRequest("http://localhost/api/finance/zatca/submit", {
        method: "POST",
        body: JSON.stringify({ type: "clearance", invoiceId: "INV-001" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/invoiceXml/i);
    });

    it("should reject missing invoiceId", async () => {
      mockSessionUser = { id: "user1", orgId: "org1", role: "admin" };
      const req = new NextRequest("http://localhost/api/finance/zatca/submit", {
        method: "POST",
        body: JSON.stringify({ type: "clearance", invoiceXml: "<xml>" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/invoiceId/i);
    });

    it("should reject invalid type", async () => {
      mockSessionUser = { id: "user1", orgId: "org1", role: "admin" };
      const req = new NextRequest("http://localhost/api/finance/zatca/submit", {
        method: "POST",
        body: JSON.stringify({ type: "invalid", invoiceXml: "<xml>", invoiceId: "INV-001" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid type");
    });

    it("should reject without ZATCA onboarding", async () => {
      mockSessionUser = { id: "user1", orgId: "org1", role: "admin" };
      mockDbResult = null;
      const req = new NextRequest("http://localhost/api/finance/zatca/submit", {
        method: "POST",
        body: JSON.stringify({ type: "clearance", invoiceXml: "<xml>", invoiceId: "INV-001" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Complete ZATCA onboarding first");
    });
  });
});
