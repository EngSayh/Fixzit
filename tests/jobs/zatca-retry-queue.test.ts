import { beforeEach, describe, expect, it, vi } from "vitest";

type ZatcaRetryJobData = {
  aqarPaymentId: string;
  orgId: string;
  amount: number;
  currency?: string;
  attemptNumber?: number;
};

type TestJob = {
  id: string;
  attemptsMade: number;
  data: ZatcaRetryJobData;
};

const {
  mockFetchWithRetry,
  mockUpdateOne,
  mockBuildOrgScopedFilter,
  mockSetTenantContext,
  mockClearTenantContext,
  mockConnectToDatabase,
} = vi.hoisted(() => ({
  mockFetchWithRetry: vi.fn(),
  mockUpdateOne: vi.fn(),
  mockBuildOrgScopedFilter: vi.fn(),
  mockSetTenantContext: vi.fn(),
  mockClearTenantContext: vi.fn(),
  mockConnectToDatabase: vi.fn(),
}));

vi.mock("@/lib/http/fetchWithRetry", () => ({
  fetchWithRetry: (...args: unknown[]) => mockFetchWithRetry(...args),
}));

vi.mock("@/server/models/aqar", () => ({
  AqarPayment: {
    updateOne: (...args: unknown[]) => mockUpdateOne(...args),
  },
}));

vi.mock("@/lib/utils/org-scope", () => ({
  buildOrgScopedFilter: (...args: unknown[]) => mockBuildOrgScopedFilter(...args),
}));

vi.mock("@/server/plugins/tenantIsolation", () => ({
  setTenantContext: (...args: unknown[]) => mockSetTenantContext(...args),
  clearTenantContext: (...args: unknown[]) => mockClearTenantContext(...args),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: (...args: unknown[]) => mockConnectToDatabase(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const createJob = (
  overrides: Partial<ZatcaRetryJobData> = {},
  attemptsMade = 0,
): TestJob => ({
  id: "job-1",
  attemptsMade,
  data: {
    aqarPaymentId: "pay_1",
    orgId: "org_1",
    amount: 250,
    currency: "SAR",
    ...overrides,
  },
});

const loadWorker = async () => {
  const { startZatcaRetryWorker } = await import("@/jobs/zatca-retry-queue");
  const worker = await startZatcaRetryWorker();
  return worker as unknown as { process: (job: TestJob) => Promise<unknown> };
};

describe("zatca-retry-queue", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    vi.stubEnv("ZATCA_API_KEY", "test-api-key");
    vi.stubEnv("ZATCA_SELLER_NAME", "Fixzit");
    vi.stubEnv("ZATCA_VAT_NUMBER", "300000000000003");
    vi.stubEnv("ZATCA_SELLER_ADDRESS", "Saudi Arabia");
    vi.stubEnv("ZATCA_CLEARANCE_API_URL", "https://zatca.example.com/clearance");

    mockConnectToDatabase.mockResolvedValue(undefined);
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mockBuildOrgScopedFilter.mockReturnValue({
      _id: "pay_1",
      $or: [{ orgId: "org_1" }],
    });
  });

  it("stores clearance evidence after successful ZATCA response", async () => {
    mockFetchWithRetry.mockResolvedValue(
      new Response(
        JSON.stringify({
          clearanceStatus: "CLEARED",
          clearanceId: "clear-123",
          qrCode: "qr-code",
          invoiceHash: "hash-456",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const worker = await loadWorker();
    const job = createJob();

    await worker.process(job);

    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      "https://zatca.example.com/clearance",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
        }),
      }),
      expect.objectContaining({
        label: "zatca-clearance-retry",
      }),
    );
    expect(mockBuildOrgScopedFilter).toHaveBeenCalledWith("pay_1", "org_1");
    expect(mockSetTenantContext).toHaveBeenCalledWith({
      orgId: "org_1",
      userId: "zatca-retry-worker",
    });
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: "pay_1", $or: [{ orgId: "org_1" }] },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "COMPLETED",
          "zatca.complianceStatus": "CLEARED",
          "zatca.clearanceId": "clear-123",
          "zatca.qrCode": "qr-code",
          "zatca.invoiceHash": "hash-456",
        }),
        $unset: {
          "zatca.lastError": "",
          "zatca.lastRetryError": "",
        },
      }),
    );
    expect(mockClearTenantContext).toHaveBeenCalled();
  });

  it("records retry metadata when ZATCA rejects clearance", async () => {
    mockFetchWithRetry.mockResolvedValue(
      new Response(
        JSON.stringify({
          clearanceStatus: "REJECTED",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const worker = await loadWorker();
    const job = createJob({}, 0);

    await expect(worker.process(job)).rejects.toThrow(
      "ZATCA clearance not approved: REJECTED",
    );

    expect(mockBuildOrgScopedFilter).toHaveBeenCalledWith("pay_1", "org_1");
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: "pay_1", $or: [{ orgId: "org_1" }] },
      expect.objectContaining({
        $set: expect.objectContaining({
          "zatca.lastRetryAt": expect.any(Date),
          "zatca.lastRetryError": "ZATCA clearance not approved: REJECTED",
          "zatca.retryAttempts": 1,
        }),
      }),
    );
    expect(mockClearTenantContext).toHaveBeenCalled();
  });
});
