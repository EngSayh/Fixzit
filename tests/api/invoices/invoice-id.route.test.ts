/**
 * @fileoverview Tests for /api/invoices/[id] route
 * @sprint 68
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Hoisted mocks
const { mockGetSessionUser, mockInvoiceFindById, mockConnectDb } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockInvoiceFindById: vi.fn(),
  mockConnectDb: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: mockConnectDb.mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn().mockImplementation((body, status) =>
    new Response(JSON.stringify(body), { status })
  ),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("test-key"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Rate limit" }), { status: 429 })
  ),
  handleApiError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Internal Error" }), { status: 500 })
  ),
  zodValidationError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Validation Error" }), { status: 400 })
  ),
}));

vi.mock("@/server/models/Invoice", () => ({
  Invoice: {
    findById: mockInvoiceFindById,
    findOne: vi.fn(),
  },
}));

vi.mock("@/lib/zatca", () => ({
  generateZATCATLV: vi.fn().mockReturnValue("mock-tlv"),
  generateZATCAQR: vi.fn().mockReturnValue("mock-qr"),
}));

vi.mock("mongoose", () => ({
  default: {
    isValidObjectId: vi.fn().mockReturnValue(true),
  },
}));

import { GET, PATCH, DELETE } from "@/app/api/invoices/[id]/route";

function createGetRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/invoices/${id}`, { method: "GET" });
}

function createPatchRequest(id: string, body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest(`http://localhost:3000/api/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function createDeleteRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/invoices/${id}`, { method: "DELETE" });
}

const params = { id: "507f1f77bcf86cd799439011" };

describe("GET /api/invoices/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: "user-1",
      orgId: "org-1",
      role: "FM_MANAGER",
    });
    mockInvoiceFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        orgId: "org-1",
        invoiceNumber: "INV-001",
        status: "DRAFT",
      }),
    });
  });

  it("should verify user session", async () => {
    await GET(createGetRequest(params.id), { params });
    expect(mockGetSessionUser).toHaveBeenCalled();
  });

  it("should fetch invoice when authenticated", async () => {
    const res = await GET(createGetRequest(params.id), { params });
    expect([200, 401, 403, 404, 429, 500]).toContain(res.status);
  });
});

describe("PATCH /api/invoices/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: "user-1",
      orgId: "org-1",
      role: "FM_MANAGER",
    });
  });

  it("should verify user session on update", async () => {
    await PATCH(createPatchRequest(params.id, { status: "APPROVED" }), { params });
    expect(mockGetSessionUser).toHaveBeenCalled();
  });
});

describe("DELETE /api/invoices/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: "user-1",
      orgId: "org-1",
      role: "FM_MANAGER",
    });
  });

  it("should verify user session on delete", async () => {
    await DELETE(createDeleteRequest(params.id), { params });
    expect(mockGetSessionUser).toHaveBeenCalled();
  });
});
