import { describe, it, expect, vi, beforeAll } from "vitest";
import { NextResponse } from "next/server";

const mockAuth = vi.fn();
const mockGetRefundableAmount = vi.fn();
const mockProcessRefund = vi.fn();
const mockFireNotifications = vi.fn();
const mockFindOne = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/services/souq/returns-service", () => ({
  returnsService: {
    getRefundableAmount: mockGetRefundableAmount,
    processRefund: mockProcessRefund,
    fireNotifications: mockFireNotifications,
  },
}));

vi.mock("@/server/models/souq/RMA", () => ({
  SouqRMA: {
    findOne: mockFindOne,
  },
}));

describe("POST /api/souq/returns/refund", () => {
  let postHandler: typeof import("@/app/api/souq/returns/refund/route").POST;

  beforeAll(async () => {
    ({ POST: postHandler } = await import("@/app/api/souq/returns/refund/route"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
  });

  it("returns 400 for invalid rmaId before hitting database", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "ADMIN", orgId: "org-1", isSuperAdmin: false },
    });

    const request = new Request("http://localhost/api/souq/returns/refund", {
      method: "POST",
      body: JSON.stringify({
        rmaId: "not-an-objectid",
        refundAmount: 100,
        refundMethod: "wallet",
      }),
    });

    const response = (await postHandler(request)) as NextResponse;
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/Invalid rmaId/i);
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockProcessRefund).not.toHaveBeenCalled();
  });

  it("returns 404 when RMA not found in tenant scope (cross-org or missing)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2", role: "SUPER_ADMIN", orgId: "org-a", isSuperAdmin: true },
    });
    mockFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

    const validId = "65a0d6f5e8b9c2a1d4f5e6a7";
    const request = new Request("http://localhost/api/souq/returns/refund", {
      method: "POST",
      body: JSON.stringify({
        rmaId: validId,
        refundAmount: 50,
        refundMethod: "wallet",
      }),
    });

    const response = (await postHandler(request)) as NextResponse;
    expect(response.status).toBe(404);
    expect(mockFindOne).toHaveBeenCalled();
    expect(mockProcessRefund).not.toHaveBeenCalled();
  });

  it("returns 500 when refund processing fails after RMA lookup", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-3", role: "ADMIN", orgId: "org-1", isSuperAdmin: false },
    });
    mockFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        orgId: "org-1",
        inspection: { condition: "good", restockable: true },
      }),
    });
    mockGetRefundableAmount.mockResolvedValue(100);
    mockProcessRefund.mockRejectedValue(new Error("payment error"));

    const validId = "65a0d6f5e8b9c2a1d4f5e6a7";
    const request = new Request("http://localhost/api/souq/returns/refund", {
      method: "POST",
      body: JSON.stringify({
        rmaId: validId,
        refundAmount: 50,
        refundMethod: "wallet",
      }),
    });

    const response = (await postHandler(request)) as NextResponse;
    expect(response.status).toBe(500);
    expect(mockFindOne).toHaveBeenCalled();
    expect(mockGetRefundableAmount).toHaveBeenCalled();
    expect(mockProcessRefund).toHaveBeenCalled();
  });
});
