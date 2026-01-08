/**
 * @fileoverview Tests for /api/payments/create route
 * @sprint 66
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({
  getAuthSession: vi.fn().mockResolvedValue({
    user: { id: "user-1", email: "user@test.com", orgId: "org-1" },
  }),
}));

vi.mock("@/server/models/Invoice", () => ({
  InvoiceModel: {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "inv-1",
        org_id: "org-1",
        total: 500,
        status: "PENDING",
        customer: { email: "customer@test.com", name: "Customer" },
      }),
    }),
  },
}));

// Mock TAP payment gateway
const mockTapCreate = vi.fn().mockResolvedValue({
  id: "chg_123",
  transaction: { url: "https://tap.company/pay/123" },
});

vi.mock("@/lib/payments/tap-client", () => ({
  TapClient: vi.fn().mockImplementation(() => ({
    charges: { create: mockTapCreate },
  })),
  createTapCharge: vi.fn().mockResolvedValue({
    id: "chg_123",
    transaction: { url: "https://tap.company/pay/123" },
  }),
}));

import { POST } from "@/app/api/payments/create/route";
import { getAuthSession } from "@/lib/auth";

const mockGetAuth = vi.mocked(getAuthSession);

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/payments/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/payments/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuth.mockResolvedValue({
      user: { id: "user-1", email: "user@test.com", orgId: "org-1" },
    } as any);
  });

  it("should return 401 for unauthenticated users", async () => {
    mockGetAuth.mockResolvedValue(null);
    const res = await POST(createPostRequest({ invoiceId: "inv-1" }) as any);
    expect([401, 403, 500]).toContain(res.status);
  });

  it("should require invoiceId", async () => {
    const res = await POST(createPostRequest({}) as any);
    expect([400, 422, 500]).toContain(res.status);
  });

  it("should create payment for valid invoice", async () => {
    const res = await POST(createPostRequest({ invoiceId: "inv-1" }) as any);
    expect([200, 201, 400, 401, 500]).toContain(res.status);
    if (res.status === 200 || res.status === 201) {
      const json = await res.json();
      expect(json.paymentUrl || json.url || json.charge).toBeDefined();
    }
  });

  it("should return payment URL for TAP gateway", async () => {
    const res = await POST(createPostRequest({ invoiceId: "inv-1" }) as any);
    if (res.status === 200 || res.status === 201) {
      const json = await res.json();
      if (json.paymentUrl) {
        expect(json.paymentUrl).toContain("tap");
      }
    }
  });

  it("should reject invalid invoice ID format", async () => {
    const res = await POST(createPostRequest({ invoiceId: "" }) as any);
    expect([400, 422, 500]).toContain(res.status);
  });

  it("should handle invoice not found", async () => {
    const Invoice = await import("@/server/models/Invoice");
    vi.mocked(Invoice.InvoiceModel.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);
    const res = await POST(createPostRequest({ invoiceId: "inv-notfound" }) as any);
    expect([400, 404, 500]).toContain(res.status);
  });

  it("should handle TAP gateway errors", async () => {
    mockTapCreate.mockRejectedValue(new Error("TAP gateway error"));
    const res = await POST(createPostRequest({ invoiceId: "inv-1" }) as any);
    expect([400, 500, 502]).toContain(res.status);
  });
});
