import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

const {
  mockParseWebhookEvent,
  mockSmartRateLimit,
  mockWithIdempotency,
  mockConnect,
  savedTransactions,
  savedPayments,
  savedInvoices,
  TapTransactionMock,
  PaymentMock,
  InvoiceMock,
} = vi.hoisted(() => {
  const mockParseWebhookEvent = vi.fn();
  const mockSmartRateLimit = vi.fn(async () => ({ allowed: true }));
  const mockWithIdempotency = vi.fn(async (_key: string, cb: () => Promise<unknown>) => cb());
  const mockConnect = vi.fn();

  const savedTransactions: any[] = [];
  const savedPayments: any[] = [];
  const savedInvoices: any[] = [];

  const TapTransactionMock = vi.fn(function TapTransaction(this: any, data: Record<string, unknown>) {
    Object.assign(this, data);
    this._id = this._id ?? `tx_${savedTransactions.length + 1}`;
    this.events = this.events ?? [];
    this.refunds = this.refunds ?? [];
    this.save = vi.fn(async () => {
      if (!savedTransactions.includes(this)) {
        savedTransactions.push(this);
      }
      return this;
    });
  });

  TapTransactionMock.findOne = vi.fn(async (filter: Record<string, unknown>) => {
    if (!filter) return null;
    if (filter.chargeId) {
      return savedTransactions.find((tx) => tx.chargeId === filter.chargeId) ?? null;
    }
    if (filter._id) {
      return savedTransactions.find((tx) => tx._id === filter._id) ?? null;
    }
    return null;
  });

  const PaymentMock = {
    create: vi.fn(async (payload: Record<string, unknown>) => {
      const payment = {
        _id: `pay_${savedPayments.length + 1}`,
        status: payload.status ?? "POSTED",
        refundReason: undefined as string | undefined,
        allocateToInvoice: vi.fn(async () => undefined),
        save: vi.fn(async () => payment),
        ...payload,
      };
      savedPayments.push(payment);
      return payment;
    }),
    findById: vi.fn(async (id: string) => savedPayments.find((p) => p._id === id) ?? null),
    findOne: vi.fn(async (filter: Record<string, unknown>) => {
      // sec-002: support orgId-scoped lookup
      const payment = savedPayments.find((p) => {
        if (filter._id && p._id !== filter._id && p._id?.toString?.() !== filter._id?.toString?.()) return false;
        if (filter.orgId && p.orgId?.toString?.() !== filter.orgId?.toString?.()) return false;
        return true;
      });
      return payment ?? null;
    }),
  };

  const InvoiceMock = {
    findOne: vi.fn(async (filter: Record<string, unknown>) => {
      const id =
        (filter?._id as { toString?: () => string } | undefined)?.toString?.() ??
        filter?._id;
      const orgId =
        (filter?.orgId as { toString?: () => string } | undefined)?.toString?.() ??
        filter?.orgId;
      const candidate = savedInvoices.find(
        (inv) =>
          inv._id === id ||
          inv._id?.toString?.() === id ||
          inv.orgId === orgId ||
          inv.org_id === orgId,
      );
      return candidate ?? null;
    }),
  };

  return {
    mockParseWebhookEvent,
    mockSmartRateLimit,
    mockWithIdempotency,
    mockConnect,
    savedTransactions,
    savedPayments,
    savedInvoices,
    TapTransactionMock,
    PaymentMock,
    InvoiceMock,
  };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/finance/tap-payments", () => ({
  tapPayments: {
    parseWebhookEvent: (...args: unknown[]) => mockParseWebhookEvent(...args),
    halalasToSAR: (amount: number) => Number(amount) / 100,
  },
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => mockSmartRateLimit(...args),
}));

vi.mock("@/server/security/idempotency", () => ({
  withIdempotency: (...args: unknown[]) => mockWithIdempotency(...args),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: (...args: unknown[]) => mockConnect(...args),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: () =>
    NextResponse.json({ error: "Rate limited" }, { status: 429 }),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: () => "1.1.1.1",
}));

vi.mock("@/server/models/finance/TapTransaction", () => ({
  TapTransaction: TapTransactionMock,
}));

vi.mock("@/server/models/finance/Payment", () => ({
  Payment: PaymentMock,
}));

vi.mock("@/server/models/Invoice", () => ({
  Invoice: InvoiceMock,
}));

const loadRoute = async () => {
  vi.resetModules();
  return import("@/app/api/payments/tap/webhook/route");
};

describe("tap webhook route", () => {
  const orgId = new Types.ObjectId().toString();

  const createRequest = (
    body: unknown,
    headers: Record<string, string> = {},
  ) =>
    ({
      text: async () =>
        typeof body === "string" ? body : JSON.stringify(body),
      json: async () =>
        typeof body === "string" ? JSON.parse(body) : body,
      headers: new Headers(headers),
      nextUrl: new URL("http://localhost/api/payments/tap/webhook"),
    }) as unknown as NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    savedTransactions.length = 0;
    savedPayments.length = 0;
    savedInvoices.length = 0;
    process.env.TAP_WEBHOOK_MAX_BYTES = "64000";
  });

  it("returns 429 when rate limit exceeded", async () => {
    const { POST } = await loadRoute();
    mockSmartRateLimit.mockResolvedValueOnce({ allowed: false });

    const req = createRequest({ id: "evt_rate_limit" }, { "x-tap-signature": "sig" });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("rejects webhooks when signature verification fails", async () => {
    const { POST } = await loadRoute();
    mockParseWebhookEvent.mockImplementationOnce(() => {
      throw new Error("bad signature");
    });

    const req = createRequest({ test: true }, { "x-tap-signature": "bad" });

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(mockParseWebhookEvent).toHaveBeenCalledWith(
      JSON.stringify({ test: true }),
      "bad",
    );
  });

  it("guards against oversized payloads", async () => {
    process.env.TAP_WEBHOOK_MAX_BYTES = "10";
    const { POST } = await loadRoute();
    const payload = { data: "x".repeat(50) };
    const req = createRequest(payload, { "x-tap-signature": "sig" });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(413);
    expect(body.error).toBe("Payload too large");
    expect(mockParseWebhookEvent).not.toHaveBeenCalled();
  });

  it("processes charge.captured events and creates payment + transaction", async () => {
    const { POST } = await loadRoute();
    const charge = {
      id: "chg_123",
      status: "CAPTURED",
      amount: 12500,
      currency: "SAR",
      customer: { first_name: "A", last_name: "User", email: "a@b.com" },
      reference: { order: "ord_1" },
      metadata: { organizationId: orgId, userId: "user-1" },
      transaction: { url: "https://tap" },
      response: { code: "200", message: "ok" },
    };
    mockParseWebhookEvent.mockReturnValueOnce({
      id: "evt_capture",
      type: "charge.captured",
      live_mode: false,
      data: { object: charge },
    });

    const req = createRequest({ id: "evt_capture" }, { "x-tap-signature": "good" });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockWithIdempotency).toHaveBeenCalledWith(
      expect.stringContaining("evt_capture"),
      expect.any(Function),
      expect.any(Number),
    );
    expect(PaymentMock.create).toHaveBeenCalledTimes(1);
    expect(savedTransactions.length).toBe(1);
    const transaction = savedTransactions[0];
    expect(transaction.events?.length).toBeGreaterThan(0);
    expect(transaction.amountSAR).toBeCloseTo(125);
  });

  it("updates refund state and payment status on refund.succeeded", async () => {
    const { POST } = await loadRoute();
    const invoiceId = new Types.ObjectId();
    const existingTx = {
      _id: "tx_existing",
      chargeId: "chg_refund",
      orgId: new Types.ObjectId(orgId),
      invoiceId,
      paymentId: "pay_existing",
      refunds: [],
      events: [],
      save: vi.fn(async function save() {
        return this;
      }),
    };
    savedTransactions.push(existingTx);
    savedPayments.push({
      _id: "pay_existing",
      orgId: new Types.ObjectId(orgId),
      status: "POSTED",
      refundReason: undefined,
      save: vi.fn(async function save() {
        return this;
      }),
    });
    savedInvoices.push({
      _id: invoiceId.toString(),
      orgId,
      payments: [{ transactionId: "chg_refund", status: "COMPLETED", notes: "" }],
      save: vi.fn(async function save() {
        return this;
      }),
    });

    mockParseWebhookEvent.mockReturnValueOnce({
      id: "evt_refund",
      type: "refund.succeeded",
      live_mode: false,
      data: {
        object: {
          id: "ref_1",
          charge: "chg_refund",
          amount: 5000,
          currency: "SAR",
          metadata: { organizationId: orgId },
          reason: "customer_request",
          response: { code: "200", message: "ok" },
        },
      },
    });

    const req = createRequest({ id: "evt_refund" }, { "x-tap-signature": "sig" });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(existingTx.refunds?.length).toBe(1);
    expect(existingTx.events?.length).toBe(1);
    const payment = savedPayments[0];
    expect(payment.status).toBe("REFUNDED");
    expect(payment.refundReason).toBe("customer_request");

    const invoice = savedInvoices[0];
    const entry = invoice.payments.find((p: any) => p.transactionId === "chg_refund");
    expect(entry?.status).toBe("REFUNDED");
  });
});
