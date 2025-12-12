import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

const state = vi.hoisted(() => {
  const escrowAccounts: any[] = [];
  const escrowTransactions: any[] = [];
  const escrowReleases: any[] = [];
  const outbox: any[] = [];
  const addJobMock = vi.fn(async () => undefined);

  const EscrowState = {
    CREATED: "CREATED",
    FUNDED: "FUNDED",
    RELEASE_REQUESTED: "RELEASE_REQUESTED",
    RELEASED: "RELEASED",
    REFUNDED: "REFUNDED",
    FAILED: "FAILED",
  } as const;

  const EscrowTransactionType = {
    FUND: "FUND",
    RELEASE: "RELEASE",
    REFUND: "REFUND",
  } as const;

  const EscrowTransactionStatus = {
    SUCCEEDED: "SUCCEEDED",
  } as const;

  const EscrowReleaseStatus = {
    REQUESTED: "REQUESTED",
    RELEASED: "RELEASED",
  } as const;

  const makeAccount = (data: Record<string, unknown>) => ({
    _id: data._id ?? new Types.ObjectId(),
    orgId: data.orgId ?? new Types.ObjectId(),
    status: data.status ?? EscrowState.CREATED,
    holdAmount: data.holdAmount ?? 0,
    fundedAmount: data.fundedAmount ?? 0,
    releasedAmount: data.releasedAmount ?? 0,
    refundedAmount: data.refundedAmount ?? 0,
    releasePolicy: data.releasePolicy ?? { riskHold: false },
    idempotencyKeys: data.idempotencyKeys ?? [],
    auditTrail: data.auditTrail ?? [],
    save: vi.fn(async function save() {
      return this;
    }),
  });

  return {
    escrowAccounts,
    escrowTransactions,
    escrowReleases,
    outbox,
    addJobMock,
    EscrowState,
    EscrowTransactionType,
    EscrowTransactionStatus,
    EscrowReleaseStatus,
    makeAccount,
  };
});

const {
  escrowAccounts,
  escrowTransactions,
  escrowReleases,
  outbox,
  addJobMock,
  EscrowState,
  EscrowTransactionType,
  EscrowTransactionStatus,
  EscrowReleaseStatus,
  makeAccount,
} = state;

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(),
  getDatabase: vi.fn(async () => ({
    collection: () => ({
      updateOne: vi.fn(async (filter: unknown, update: unknown) => {
        outbox.push({ filter, update });
        return { acknowledged: true };
      }),
    }),
  })),
}));

vi.mock("@/lib/monitoring/metrics-registry", () => ({
  metricsRegistry: {},
}));

vi.mock("prom-client", () => {
  class FakeCounter {
    inc = vi.fn();
  }
  class FakeHistogram {
    startTimer = vi.fn(() => vi.fn());
  }
  return { Counter: FakeCounter, Histogram: FakeHistogram };
});

vi.mock("@/lib/queues/setup", () => ({
  addJob: (...args: unknown[]) => addJobMock(...args),
  QUEUE_NAMES: { SETTLEMENT: "SETTLEMENT", NOTIFICATIONS: "NOTIFICATIONS" },
}));

vi.mock("@/server/models/finance/EscrowAccount", () => ({
  EscrowAccount: {
    findOne: vi.fn(async (filter: Record<string, unknown>) => {
      const id = (filter._id as { toString?: () => string } | undefined)?.toString?.();
      const orgId = (filter.orgId as { toString?: () => string } | undefined)?.toString?.();
      return (
        escrowAccounts.find(
          (acc) =>
            (!id || acc._id.toString() === id) &&
            (!orgId || acc.orgId.toString() === orgId),
        ) ?? null
      );
    }),
    create: vi.fn(async (data: Record<string, unknown>) => {
      const account = makeAccount(data);
      escrowAccounts.push(account);
      return account;
    }),
  },
  EscrowSource: { ORDER: "ORDER" },
  EscrowState: state.EscrowState,
}));

vi.mock("@/server/models/finance/EscrowTransaction", () => ({
  EscrowTransaction: {
    findOne: vi.fn(async (filter: Record<string, unknown>) => {
      return (
        escrowTransactions.find(
          (tx) =>
            (!filter.orgId || tx.orgId.toString() === filter.orgId.toString?.()) &&
            (!filter.idempotencyKey || tx.idempotencyKey === filter.idempotencyKey) &&
            (!filter.type || tx.type === filter.type) &&
            (!filter._id || tx._id.toString() === filter._id.toString?.()),
        ) ?? null
      );
    }),
    create: vi.fn(async (data: Record<string, unknown>) => {
      const tx = {
        _id: new Types.ObjectId(),
        ...data,
      };
      escrowTransactions.push(tx);
      return tx;
    }),
  },
  EscrowTransactionType: state.EscrowTransactionType,
  EscrowTransactionStatus: state.EscrowTransactionStatus,
}));

vi.mock("@/server/models/finance/EscrowRelease", () => ({
  EscrowRelease: {
    create: vi.fn(async (data: Record<string, unknown>) => {
      const release = {
        _id: new Types.ObjectId(),
        ...data,
      };
      escrowReleases.push(release);
      return release;
    }),
    findOneAndUpdate: vi.fn(async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      const found = escrowReleases.find(
        (r) =>
          r._id.toString() === filter._id.toString?.() &&
          r.orgId?.toString?.() === filter.orgId?.toString?.(),
      );
      if (found) {
        Object.assign(found, update);
      }
      return found ?? null;
    }),
  },
  EscrowReleaseStatus: state.EscrowReleaseStatus,
}));

vi.mock("@/lib/id-generator", () => ({
  generateEscrowNumber: () => "ESC-123",
  generatePayoutId: () => "PAYOUT-1",
  generateTransactionId: () => "TX-1",
  generateBatchId: () => "BATCH-1",
}));

import { escrowService } from "@/services/souq/settlements/escrow-service";

describe("EscrowService", () => {
  const orgId = new Types.ObjectId();

  beforeEach(() => {
    escrowAccounts.length = 0;
    escrowTransactions.length = 0;
    escrowReleases.length = 0;
    outbox.length = 0;
    addJobMock.mockClear();
    process.env.FEATURE_ESCROW_ENABLED = "true";
  });

  it("records funding and prevents duplicate processing via idempotency", async () => {
    const account = makeAccount({ orgId });
    escrowAccounts.push(account);

    const input = {
      escrowAccountId: account._id,
      orgId,
      amount: 100,
      currency: "SAR",
      idempotencyKey: "fund-1",
    };

    const first = await escrowService.recordFunding(input);
    const second = await escrowService.recordFunding(input);

    expect(first.account.holdAmount).toBe(100);
    expect(first.account.fundedAmount).toBe(100);
    expect(second.transaction._id).toEqual(first.transaction._id);
    expect(escrowTransactions.filter((tx) => tx.type === EscrowTransactionType.FUND).length).toBe(1);
    expect(addJobMock).toHaveBeenCalledWith(
      "SETTLEMENT",
      "escrow.funded",
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("throws when releasing more than held balance", async () => {
    const account = makeAccount({ orgId, holdAmount: 50, fundedAmount: 50, status: EscrowState.FUNDED });
    escrowAccounts.push(account);

    await expect(
      escrowService.releaseFunds({
        escrowAccountId: account._id,
        orgId,
        amount: 100,
        currency: "SAR",
      }),
    ).rejects.toThrow("Release amount exceeds held funds");
    expect(escrowTransactions.filter((tx) => tx.type === EscrowTransactionType.RELEASE)).toHaveLength(0);
  });

  it("marks escrow as failed and emits event", async () => {
    const account = makeAccount({ orgId, status: EscrowState.FUNDED });
    escrowAccounts.push(account);

    const updated = await escrowService.failEscrow(orgId, account._id, "risk");
    expect(updated.status).toBe(EscrowState.FAILED);
    expect(addJobMock).toHaveBeenCalledWith(
      "SETTLEMENT",
      "escrow.failed",
      expect.objectContaining({ reason: "risk" }),
      expect.any(Object),
    );
  });
});
