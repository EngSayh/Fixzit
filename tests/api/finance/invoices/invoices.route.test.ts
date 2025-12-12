/**
 * @fileoverview Tests for Finance Invoices API
 * @description Tests for invoice listing and creation with Zod validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Mock services
const mockListInvoices = vi.fn();
const mockCreateInvoice = vi.fn();

vi.mock("@/server/finance/invoice.service", () => ({
  listInvoices: (...args: unknown[]) => mockListInvoices(...args),
  createInvoice: (...args: unknown[]) => mockCreateInvoice(...args),
}));

const mockGetSessionUser = vi.fn();
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

vi.mock("@/lib/auth", () => ({
  getUserFromToken: vi.fn(),
}));

vi.mock("@/lib/auth/role-guards", () => ({
  canViewInvoices: vi.fn().mockReturnValue(true),
  canEditInvoices: vi.fn().mockReturnValue(true),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn().mockImplementation((body, init) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json(body, init);
  }),
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("rate_key"),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import routes after mocks
import { GET, POST } from "@/app/api/finance/invoices/route";

const makeRequest = (
  url: string,
  method: string,
  body?: Record<string, unknown>
): NextRequest =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;

describe("Finance Invoices API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListInvoices.mockResolvedValue({ invoices: [], total: 0 });
  });

  describe("GET /api/finance/invoices", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockGetSessionUser.mockResolvedValue(null);

      const req = makeRequest("https://example.com/api/finance/invoices", "GET");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns invoices for authenticated user", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_123",
        role: "ADMIN",
      });
      mockListInvoices.mockResolvedValue({
        invoices: [
          {
            _id: "inv_1",
            invoiceNumber: "INV-001",
            amount: 1000,
            status: "DRAFT",
          },
        ],
        total: 1,
      });

      const req = makeRequest("https://example.com/api/finance/invoices", "GET");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.invoices).toHaveLength(1);
    });

    it("filters by status", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_123",
        role: "ADMIN",
      });
      mockListInvoices.mockResolvedValue({ invoices: [], total: 0 });

      const req = makeRequest(
        "https://example.com/api/finance/invoices?status=PAID",
        "GET"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("filters by customer", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_123",
        role: "ADMIN",
      });
      mockListInvoices.mockResolvedValue({ invoices: [], total: 0 });

      const req = makeRequest(
        "https://example.com/api/finance/invoices?customerId=cust_123",
        "GET"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/finance/invoices", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockGetSessionUser.mockResolvedValue(null);

      const req = makeRequest("https://example.com/api/finance/invoices", "POST", {
        amount: 1000,
        description: "Test Invoice",
        dueDate: "2025-12-31",
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("validates required fields with Zod", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_123",
        role: "ADMIN",
      });

      // Missing required amount
      const req = makeRequest("https://example.com/api/finance/invoices", "POST", {
        description: "Test",
        dueDate: "2025-12-31",
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("validates amount must be positive", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_123",
        role: "ADMIN",
      });

      const req = makeRequest("https://example.com/api/finance/invoices", "POST", {
        amount: -100, // Negative amount
        description: "Test",
        dueDate: "2025-12-31",
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("creates invoice with valid data", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_123",
        role: "ADMIN",
      });
      mockCreateInvoice.mockResolvedValue({
        _id: "inv_new",
        invoiceNumber: "INV-002",
        amount: 1000,
        status: "DRAFT",
      });

      const req = makeRequest("https://example.com/api/finance/invoices", "POST", {
        amount: 1000,
        description: "Test Invoice",
        dueDate: "2025-12-31",
        currency: "SAR",
      });
      const res = await POST(req);

      expect([200, 201]).toContain(res.status);
    });

    it("validates line items structure when provided", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_123",
        role: "ADMIN",
      });

      const req = makeRequest("https://example.com/api/finance/invoices", "POST", {
        amount: 1000,
        description: "Test Invoice",
        dueDate: "2025-12-31",
        items: [
          {
            description: "Item 1",
            quantity: 0, // Invalid: must be positive
            price: 100,
          },
        ],
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });
});
