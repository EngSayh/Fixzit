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
});
