import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/finance/payments/[id]/complete/route";
import type { NextRequest } from "next/server";

const mockFindOne = vi.fn();
const mockRequirePermission = vi.fn();
const mockRunWithContext = vi.fn((_ctx, fn) => fn());
const mockGetSessionUser = vi.fn();

vi.mock("@/server/models/finance/Payment", () => ({
  PaymentStatus: {
    DRAFT: "DRAFT",
    POSTED: "POSTED",
    CLEARED: "CLEARED",
    BOUNCED: "BOUNCED",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
  },
  Payment: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
  },
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
}));

vi.mock("@/server/lib/authContext", () => ({
  runWithContext: (...args: unknown[]) => mockRunWithContext(...args),
}));

vi.mock("@/config/rbac.config", () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

const makeReq = () => ({ headers: new Headers() } as unknown as NextRequest);

describe("POST /api/finance/payments/[id]/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: "65c2c2c2c2c2c2c2c2c2c2c2",
      orgId: "org-1",
      role: "FINANCE",
    });
  });

  it("returns 400 for invalid ObjectId", async () => {
    const res = await POST(makeReq(), { params: { id: "bad-id" } });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid payment ID",
    });
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it("returns 401 when session is missing", async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const res = await POST(makeReq(), { params: { id: "65d2d2d2d2d2d2d2d2d2d2d2" } });
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Authentication"),
    });
  });

  it("returns 404 when payment is not found", async () => {
    mockFindOne.mockResolvedValueOnce(null);
    const res = await POST(makeReq(), { params: { id: "65d2d2d2d2d2d2d2d2d2d2d2" } });
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("not found"),
    });
  });

  it("returns 400 when payment already cleared", async () => {
    const payment = {
      _id: "65d2d2d2d2d2d2d2d2d2d2d2",
      paymentNumber: "PAY-1",
      status: "CLEARED",
      amount: 100,
      currency: "USD",
      paymentDate: new Date(),
      reconciliation: {},
      save: vi.fn(),
    };
    mockFindOne.mockResolvedValueOnce(payment);
    const res = await POST(makeReq(), { params: { id: "65d2d2d2d2d2d2d2d2d2d2d2" } });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Payment is already completed",
    });
    expect(payment.save).not.toHaveBeenCalled();
  });

  it("returns 400 when payment is not in POSTED status", async () => {
    const payment = {
      _id: "65d2d2d2d2d2d2d2d2d2d2d2",
      paymentNumber: "PAY-2",
      status: "DRAFT",
      amount: 50,
      currency: "USD",
      paymentDate: new Date(),
      reconciliation: {},
      save: vi.fn(),
    };
    mockFindOne.mockResolvedValueOnce(payment);

    const res = await POST(makeReq(), { params: { id: "65d2d2d2d2d2d2d2d2d2d2d2" } });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Payment must be in POSTED status before it can be marked as completed",
    });
    expect(payment.save).not.toHaveBeenCalled();
  });

  it("marks payment as cleared and returns sanitized payload", async () => {
    const now = new Date("2024-01-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const payment = {
      _id: {
        toString: () => "65d2d2d2d2d2d2d2d2d2d2d2",
      },
      paymentNumber: "PAY-1",
      status: "POSTED",
      amount: 150,
      currency: "USD",
      paymentDate: new Date("2023-12-31T00:00:00Z"),
      reconciliation: {},
      save: vi.fn(),
    };
    mockFindOne.mockResolvedValueOnce(payment);

    const res = await POST(makeReq(), { params: { id: "65d2d2d2d2d2d2d2d2d2d2d2" } });
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(payment.status).toBe("CLEARED");
    expect(payment.reconciliation?.isReconciled).toBe(true);
    expect(payment.save).toHaveBeenCalled();

    expect(json).toMatchObject({
      success: true,
      data: {
        id: "65d2d2d2d2d2d2d2d2d2d2d2",
        paymentNumber: "PAY-1",
        status: "CLEARED",
        amount: 150,
        currency: "USD",
        paymentDate: payment.paymentDate.toISOString(),
        reconciledBy: "65c2c2c2c2c2c2c2c2c2c2c2",
      },
    });
    vi.useRealTimers();
  });
});
