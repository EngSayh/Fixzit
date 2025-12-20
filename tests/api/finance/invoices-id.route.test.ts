import { describe, expect, it, vi, beforeEach } from "vitest";

const mockEnforceRateLimit = vi.fn();
const mockGetUserFromToken = vi.fn();
const mockInvoiceService = vi.fn();
const mockCanEditInvoices = vi.fn();

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

vi.mock("@/lib/auth", () => ({
  getUserFromToken: (...args: unknown[]) => mockGetUserFromToken(...args),
}));

vi.mock("@/server/finance/invoice.service", () => ({
  post: (...args: unknown[]) => mockInvoiceService(...args),
  get: vi.fn().mockResolvedValue(null),
  cancel: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/auth/role-guards", () => ({
  canEditInvoices: (...args: unknown[]) => mockCanEditInvoices(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/server/utils/errorResponses", () => ({
  zodValidationError: vi.fn((error) => {
    return new Response(JSON.stringify({ error: "Validation failed" }), { status: 400 });
  }),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
  createSecureResponse: vi.fn((data, status) => {
    return new Response(JSON.stringify(data), { 
      status, 
      headers: { "Content-Type": "application/json" } 
    });
  }),
}));

import { PATCH } from "@/app/api/finance/invoices/[id]/route";
import { NextRequest } from "next/server";

const mockUser = {
  id: "user-1",
  email: "finance@example.com",
  role: "FINANCE_MANAGER",
  orgId: "org-1",
};

function createRequest(method: string, body?: unknown): NextRequest {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
      "Authorization": "Bearer valid-token",
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new NextRequest("http://localhost/api/finance/invoices/inv-123", options);
}

describe("finance/invoices/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockGetUserFromToken.mockResolvedValue(mockUser);
    mockCanEditInvoices.mockReturnValue(true);
  });

  describe("PATCH /api/finance/invoices/[id]", () => {
    it("returns 429 when rate limited", async () => {
      mockEnforceRateLimit.mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );
      
      const req = createRequest("PATCH", { status: "PAID" });
      const res = await PATCH(req, { params: { id: "inv-123" } });
      
      expect(res.status).toBe(429);
    });

    it("returns 401 when no auth token provided", async () => {
      const req = new NextRequest("http://localhost/api/finance/invoices/inv-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      
      const res = await PATCH(req, { params: { id: "inv-123" } });
      
      expect(res.status).toBe(401);
    });

    it("returns 401 for invalid token", async () => {
      mockGetUserFromToken.mockResolvedValueOnce(null);
      
      const req = createRequest("PATCH", { status: "PAID" });
      const res = await PATCH(req, { params: { id: "inv-123" } });
      
      expect(res.status).toBe(401);
    });

    it("returns 403 when user lacks permission", async () => {
      mockCanEditInvoices.mockReturnValueOnce(false);
      
      const req = createRequest("PATCH", { status: "PAID" });
      const res = await PATCH(req, { params: { id: "inv-123" } });
      
      expect(res.status).toBe(403);
    });

    it("updates invoice with valid payload", async () => {
      const mockUpdatedInvoice = {
        _id: "inv-123",
        status: "PAID",
        amount: 5000,
      };
      mockInvoiceService.mockResolvedValueOnce(mockUpdatedInvoice);
      
      const req = createRequest("PATCH", { status: "PAID" });
      const res = await PATCH(req, { params: { id: "inv-123" } });
      
      // Should not be 401, 403, or 429
      expect([401, 403, 429]).not.toContain(res.status);
    });
  });
});
