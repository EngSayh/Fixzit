/**
 * @fileoverview Tests for /api/finance/payments routes
 * Tests payment creation, listing, and validation
 * FINANCIAL TAG: Critical for payment processing and invoice allocation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock authentication
vi.mock("@/server/middleware/withAuthRbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/middleware/withAuthRbac")>();
  return {
    ...actual,
    getSessionUser: vi.fn(),
  };
});

// Mock auth context
vi.mock("@/server/lib/authContext", () => ({
  runWithContext: vi.fn((_user, fn) => fn()),
}));

// Mock RBAC
vi.mock("@/config/rbac.config", () => ({
  requirePermission: vi.fn(),
}));

// Mock API parsing
vi.mock("@/lib/api/parse-body", () => ({
  parseBodyOrNull: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

// Mock Payment model
vi.mock("@/server/models/finance/Payment", () => ({
  Payment: {
    find: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}));

// Mock Invoice model for allocations
vi.mock("@/server/models/Invoice", () => ({
  Invoice: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

// Mock error responses
vi.mock("@/server/utils/errorResponses", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/utils/errorResponses")>();
  return {
    ...actual,
    forbiddenError: vi.fn(() => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })),
    unauthorizedError: vi.fn(() => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })),
    validationError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
    isForbidden: vi.fn().mockReturnValue(false),
  };
});

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { requirePermission } from "@/config/rbac.config";
import { parseBodyOrNull } from "@/lib/api/parse-body";
import { Payment } from "@/server/models/finance/Payment";
import { Invoice } from "@/server/models/Invoice";

const importRoute = () => import("@/app/api/finance/payments/route");

describe("API /api/finance/payments", () => {
  const mockOrgId = "507f1f77bcf86cd799439011";
  const mockUser = {
    id: "507f1f77bcf86cd799439012",
    orgId: mockOrgId,
    role: "FINANCE",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionUser).mockResolvedValue(mockUser as never);
    vi.mocked(requirePermission).mockReturnValue(undefined);
  });

  describe("GET /api/finance/payments", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost/api/finance/payments");
      const { GET } = await importRoute();
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/finance/payments");
      const { GET } = await importRoute();
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns empty array when no payments exist", async () => {
      vi.mocked(Payment.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as never);
      vi.mocked(Payment.countDocuments).mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/finance/payments");
      const { GET } = await importRoute();
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it("filters payments by status", async () => {
      const mockPayments = [
        { _id: "pay1", status: "COMPLETED", amount: 1000 },
      ];
      vi.mocked(Payment.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockPayments),
      } as never);
      vi.mocked(Payment.countDocuments).mockResolvedValue(1);

      const req = new NextRequest("http://localhost/api/finance/payments?status=COMPLETED");
      const { GET } = await importRoute();
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });

    it("filters payments by payment method", async () => {
      vi.mocked(Payment.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as never);
      vi.mocked(Payment.countDocuments).mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/finance/payments?method=CASH");
      const { GET } = await importRoute();
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(Payment.find).toHaveBeenCalled();
    });
  });

  describe("POST /api/finance/payments", () => {
    const validPaymentData = {
      paymentDate: new Date().toISOString(),
      paymentType: "RECEIVED",
      paymentMethod: "CASH",
      amount: 1000,
      currency: "SAR",
      partyType: "TENANT",
      partyId: "507f1f77bcf86cd799439013",
      partyName: "Test Tenant",
      description: "Rent payment",
    };

    it("returns 401 when not authenticated", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost/api/finance/payments", {
        method: "POST",
        body: JSON.stringify(validPaymentData),
      });
      const { POST } = await importRoute();
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 400 when body is invalid JSON", async () => {
      vi.mocked(parseBodyOrNull).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/finance/payments", {
        method: "POST",
        body: "invalid json",
      });
      const { POST } = await importRoute();
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Invalid JSON");
    });

    it("returns 400 when required fields are missing", async () => {
      vi.mocked(parseBodyOrNull).mockResolvedValue({ amount: 1000 });

      const req = new NextRequest("http://localhost/api/finance/payments", {
        method: "POST",
        body: JSON.stringify({ amount: 1000 }),
      });
      const { POST } = await importRoute();
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("creates payment with DRAFT status", async () => {
      vi.mocked(parseBodyOrNull).mockResolvedValue(validPaymentData);
      const mockCreatedPayment = {
        _id: "pay123",
        ...validPaymentData,
        status: "DRAFT",
        orgId: mockOrgId,
      };
      vi.mocked(Payment.create).mockResolvedValue(mockCreatedPayment as never);

      const req = new NextRequest("http://localhost/api/finance/payments", {
        method: "POST",
        body: JSON.stringify(validPaymentData),
      });
      const { POST } = await importRoute();
      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe("DRAFT");
    });

    it("validates invoice allocations belong to org", async () => {
      const paymentWithAllocations = {
        ...validPaymentData,
        invoiceAllocations: [
          { invoiceId: "507f1f77bcf86cd799439014", amount: 500 },
        ],
      };
      vi.mocked(parseBodyOrNull).mockResolvedValue(paymentWithAllocations);
      
      // Invoice not found in org
      vi.mocked(Invoice.find).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      const req = new NextRequest("http://localhost/api/finance/payments", {
        method: "POST",
        body: JSON.stringify(paymentWithAllocations),
      });
      const { POST } = await importRoute();
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/finance/payments", {
        method: "POST",
        body: JSON.stringify(validPaymentData),
      });
      const { POST } = await importRoute();
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });
});
