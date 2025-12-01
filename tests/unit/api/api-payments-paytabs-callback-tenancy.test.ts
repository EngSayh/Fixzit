import { describe, expect, it, vi, beforeEach } from "vitest";

// Mocks
const mockSetTenantContext = vi.fn();
const mockClearTenantContext = vi.fn();

vi.mock("@/server/plugins/tenantIsolation", () => ({
  setTenantContext: (...args: unknown[]) => mockSetTenantContext(...args),
  clearTenantContext: (...args: unknown[]) => mockClearTenantContext(...args),
}));

// Stubs for AqarPayment model chain calls
const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();

vi.mock("@/server/models/aqar", () => ({
  AqarPayment: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

// Minimal mocks for unrelated dependencies to keep the module importable
vi.mock("@/lib/paytabs", () => ({ validateCallback: vi.fn(() => true) }));
vi.mock("@/lib/payments/paytabs-callback.contract", () => ({
  buildPaytabsIdempotencyKey: vi.fn(),
  enforcePaytabsPayloadSize: vi.fn(),
  extractPaytabsSignature: vi.fn(),
  normalizePaytabsCallbackPayload: vi.fn(),
  parsePaytabsJsonPayload: vi.fn(),
  PaytabsCallbackValidationError: class extends Error {},
  PAYTABS_CALLBACK_IDEMPOTENCY_TTL_MS: 1000,
  PAYTABS_CALLBACK_RATE_LIMIT: { requests: 10, windowMs: 1000 },
}));
vi.mock("@/lib/http/fetchWithRetry", () => ({ fetchWithRetry: vi.fn() }));
vi.mock("@/lib/resilience", () => ({ getCircuitBreaker: vi.fn(() => null) }));
vi.mock("@/server/security/idempotency", () => ({
  withIdempotency: async (_key: string, fn: () => Promise<unknown>) => fn(),
}));
vi.mock("@/server/security/rateLimit", () => ({
  rateLimit: () => ({ allowed: true }),
}));
vi.mock("@/server/utils/errorResponses", () => ({
  unauthorizedError: (msg: string) =>
    new Response(JSON.stringify({ error: msg }), { status: 401 }),
  validationError: (msg: string) =>
    new Response(JSON.stringify({ error: msg }), { status: 400 }),
  rateLimitError: () => new Response("rate limited", { status: 429 }),
  handleApiError: (err?: unknown) =>
    new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "error" }),
      { status: 500 },
    ),
}));
vi.mock("@/server/security/headers", () => ({
  createSecureResponse: (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  getClientIP: () => "127.0.0.1",
}));
vi.mock("@/config/service-timeouts", () => ({
  SERVICE_RESILIENCE: { zatca: { timeouts: { clearanceMs: 1000 }, retries: { maxAttempts: 1, baseDelayMs: 1 } } },
}));
vi.mock("@/lib/config/constants", () => ({
  Config: { payment: { paytabs: { serverKey: "s", profileId: "p" } } },
}));

describe("PayTabs callback tenancy guard (snake_case org_id)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne.mockReset();
    mockFindOneAndUpdate.mockReset();
  });

  it("updates payment when existing doc stores org_id and sets tenant context with normalized string", async () => {
    const existingPayment = { _id: "cart1", org_id: "tenant-snake" };

    // Wire mock findOne chain: findOne().select().lean().exec()
    mockFindOne.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(existingPayment),
        }),
      }),
    });

    const updatedDoc = { _id: "cart1", orgId: "tenant-snake", updated: true };
    mockFindOneAndUpdate.mockResolvedValue(updatedDoc);

    const mod = await import(
      "@/app/api/payments/paytabs/callback/route"
    );
    const updatePaymentRecord = (mod as unknown as {
      updatePaymentRecord: (
        cartId: string,
        evidence: Parameters<typeof mockFindOneAndUpdate>[1],
      ) => Promise<unknown>;
    }).updatePaymentRecord;

    const result = await updatePaymentRecord("cart1", {
      zatcaQR: "qr",
      fatooraClearanceId: "clear",
      fatooraClearedAt: new Date(),
      zatcaSubmittedAt: new Date(),
      invoicePayload: {},
      complianceStatus: "CLEARED",
    });

    expect(result).toEqual(updatedDoc);

    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const [filter] = mockFindOneAndUpdate.mock.calls[0];
    expect(filter).toMatchObject({
      _id: "cart1",
      $or: [{ orgId: "tenant-snake" }, { org_id: "tenant-snake" }],
    });

    expect(mockSetTenantContext).toHaveBeenCalledWith({
      orgId: "tenant-snake",
      userId: "paytabs-webhook",
    });
    expect(mockClearTenantContext).toHaveBeenCalled();
  });
});
