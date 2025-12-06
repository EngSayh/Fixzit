import { Types } from "mongoose";
import {
  EscrowAccount,
  EscrowSource,
  EscrowState,
} from "@/server/models/finance/EscrowAccount";
import {
  EscrowTransaction,
  EscrowTransactionStatus,
  EscrowTransactionType,
} from "@/server/models/finance/EscrowTransaction";
import {
  EscrowRelease,
  EscrowReleaseStatus,
} from "@/server/models/finance/EscrowRelease";
import { connectDb, getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { addJob, QUEUE_NAMES } from "@/lib/queues/setup";
import { metricsRegistry } from "@/lib/monitoring/metrics-registry";
import { Counter, Histogram } from "prom-client";
import { validateEscrowEventPayload } from "./escrow-events.contract";

export type EscrowEventName =
  | "escrow.created"
  | "escrow.funded"
  | "escrow.release.requested"
  | "escrow.released"
  | "escrow.refunded"
  | "escrow.failed";

type EscrowSourceContext = {
  source: (typeof EscrowSource)[keyof typeof EscrowSource];
  sourceId: Types.ObjectId;
  orgId: Types.ObjectId;
  buyerId?: Types.ObjectId;
  sellerId?: Types.ObjectId;
  bookingId?: Types.ObjectId;
  orderId?: Types.ObjectId;
  expectedAmount: number;
  currency?: string;
  releaseAfter?: Date;
  idempotencyKey?: string;
  riskHold?: boolean;
};

type EscrowMoneyMovement = {
  escrowAccountId: Types.ObjectId;
  orgId: Types.ObjectId;
  amount: number;
  currency?: string;
  idempotencyKey?: string;
  provider?: "PAYTABS" | "SADAD" | "SPAN" | "MANUAL" | "UNKNOWN";
  actorId?: Types.ObjectId;
  reason?: string;
  force?: boolean;
};

const escrowEventCounter = new Counter({
  name: "fixzit_escrow_events_total",
  help: "Escrow lifecycle events",
  labelNames: ["event"],
  registers: [metricsRegistry],
});

const escrowLatency = new Histogram({
  name: "fixzit_escrow_operation_seconds",
  help: "Latency for escrow operations",
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

const FEATURE_FLAG = process.env.FEATURE_ESCROW_ENABLED ?? "true";

function assertEscrowEnabled() {
  if (FEATURE_FLAG === "false") {
    throw new Error(
      "Escrow feature flag disabled (FEATURE_ESCROW_ENABLED=false)",
    );
  }
}

async function emitEscrowEvent(
  event: EscrowEventName,
  payload: Record<string, unknown>,
): Promise<void> {
  const validatedPayload = validateEscrowEventPayload(event, payload);
  escrowEventCounter.inc({ event });
  const idempotencyKey =
    (validatedPayload.idempotencyKey as string | undefined) ??
    `${event}-${validatedPayload.escrowAccountId ?? ""}-${validatedPayload.transactionId ?? ""}`;

  try {
    const db = await getDatabase();
    await db.collection("finance_escrow_events").updateOne(
      { event, idempotencyKey },
      {
        $setOnInsert: { createdAt: new Date() },
        $set: {
          payload: validatedPayload,
          status: "queued",
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  } catch (_storeError) {
    const storeError =
      _storeError instanceof Error
        ? _storeError
        : new Error(String(_storeError));
    logger.warn("[Escrow] Failed to persist event outbox", {
      event,
      error: storeError.message,
      payload: validatedPayload,
    });
  }

  try {
    await addJob(QUEUE_NAMES.SETTLEMENT, event, validatedPayload, {
      jobId: idempotencyKey,
    });
    await addJob(
      QUEUE_NAMES.NOTIFICATIONS,
      "escrow.notification",
      { event, payload: validatedPayload, idempotencyKey },
      { jobId: `notify-${idempotencyKey}` },
    );
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    logger.warn("[Escrow] Failed to enqueue event, falling back to log-only", {
      event,
      error: error.message,
      payload: validatedPayload,
    });
  }
  logger.info(`[Escrow] Event emitted ${event}`, validatedPayload);
}

export class EscrowService {
  async createEscrowAccount(context: EscrowSourceContext) {
    assertEscrowEnabled();
    const endTimer = escrowLatency.startTimer({ operation: "create_account" });
    await connectDb();

    const existing = await EscrowAccount.findOne({
      orgId: context.orgId,
      source: context.source,
      sourceId: context.sourceId,
    });

    if (existing) {
      endTimer();
      return existing;
    }

    const escrowNumber = `ESC-${Date.now()}-${context.sourceId.toString().slice(-6)}`;

    const account = await EscrowAccount.create({
      orgId: context.orgId,
      escrowNumber,
      source: context.source,
      sourceId: context.sourceId,
      buyerId: context.buyerId,
      sellerId: context.sellerId,
      bookingId: context.bookingId,
      orderId: context.orderId,
      expectedAmount: context.expectedAmount,
      currency: context.currency ?? "SAR",
      holdAmount: 0,
      releasePolicy: {
        autoReleaseAt: context.releaseAfter,
        riskHold: Boolean(context.riskHold),
        requiresReview: Boolean(context.riskHold),
      },
      auditTrail: [
        {
          at: new Date(),
          action: "created",
          actorType: "SYSTEM",
          metadata: { source: context.source },
        },
      ],
      idempotencyKeys: context.idempotencyKey ? [context.idempotencyKey] : [],
    });

    await emitEscrowEvent("escrow.created", {
      escrowAccountId: account._id.toString(),
      source: context.source,
      sourceId: context.sourceId.toString(),
      orgId: context.orgId.toString(),
      idempotencyKey: context.idempotencyKey,
    });

    endTimer();
    return account;
  }

  async recordFunding(input: EscrowMoneyMovement) {
    assertEscrowEnabled();
    const endTimer = escrowLatency.startTimer({ operation: "fund" });
    await connectDb();

    const account = await EscrowAccount.findOne({
      _id: input.escrowAccountId,
      orgId: input.orgId,
    });
    if (!account) {
      endTimer();
      throw new Error("Escrow account not found");
    }

    if (input.idempotencyKey) {
      const dupTx = await EscrowTransaction.findOne({
        orgId: input.orgId,
        idempotencyKey: input.idempotencyKey,
        type: EscrowTransactionType.FUND,
      });
      if (dupTx) {
        endTimer();
        return { account, transaction: dupTx };
      }
    }

    const transaction = await EscrowTransaction.create({
      orgId: input.orgId,
      escrowAccountId: input.escrowAccountId,
      type: EscrowTransactionType.FUND,
      status: EscrowTransactionStatus.SUCCEEDED,
      amount: input.amount,
      currency: input.currency ?? "SAR",
      provider: input.provider ?? "UNKNOWN",
      idempotencyKey: input.idempotencyKey,
      initiatedBy: input.actorId,
      executedAt: new Date(),
    });

    account.fundedAmount += input.amount;
    account.holdAmount += input.amount;
    account.status = EscrowState.FUNDED;
    account.auditTrail.push({
      at: new Date(),
      action: "funded",
      actorId: input.actorId,
      actorType: "USER",
      metadata: { transactionId: transaction._id },
    });
    if (
      input.idempotencyKey &&
      !account.idempotencyKeys?.includes(input.idempotencyKey)
    ) {
      account.idempotencyKeys = [
        ...(account.idempotencyKeys ?? []),
        input.idempotencyKey,
      ];
    }
    await account.save();

    await emitEscrowEvent("escrow.funded", {
      escrowAccountId: account._id.toString(),
      orgId: input.orgId.toString(),
      amount: input.amount,
      currency: input.currency ?? "SAR",
      idempotencyKey: input.idempotencyKey,
      transactionId: transaction._id.toString(),
    });

    endTimer();
    return { account, transaction };
  }

  async requestRelease(
    input: EscrowMoneyMovement & { scheduleFor?: Date; riskFlags?: string[] },
  ) {
    assertEscrowEnabled();
    const endTimer = escrowLatency.startTimer({ operation: "request_release" });
    await connectDb();

    const account = await EscrowAccount.findOne({
      _id: input.escrowAccountId,
      orgId: input.orgId,
    });
    if (!account) {
      endTimer();
      throw new Error("Escrow account not found");
    }

    // Guard rails
    if (
      account.status === EscrowState.REFUNDED ||
      account.status === EscrowState.RELEASED
    ) {
      endTimer();
      throw new Error("Escrow already closed");
    }
    if (account.releasePolicy?.riskHold && !input.force) {
      endTimer();
      throw new Error("Escrow is on risk hold; manual review required");
    }
    if (
      account.releasePolicy?.autoReleaseAt &&
      account.releasePolicy.autoReleaseAt > new Date() &&
      !input.force
    ) {
      endTimer();
      throw new Error("Release blocked until autoReleaseAt threshold");
    }

    const release = await EscrowRelease.create({
      orgId: input.orgId,
      escrowAccountId: input.escrowAccountId,
      requestedBy: input.actorId,
      amount: input.amount,
      currency: input.currency ?? "SAR",
      status: EscrowReleaseStatus.REQUESTED,
      scheduledFor: input.scheduleFor,
      notes: input.reason,
      riskFlags: input.riskFlags ?? [],
      autoRelease: Boolean(
        account.releasePolicy?.autoReleaseAt && !input.scheduleFor,
      ),
    });

    account.status = EscrowState.RELEASE_REQUESTED;
    account.auditTrail.push({
      at: new Date(),
      action: "release_requested",
      actorId: input.actorId,
      actorType: "USER",
      reason: input.reason,
    });
    await account.save();

    await emitEscrowEvent("escrow.release.requested", {
      escrowAccountId: account._id.toString(),
      releaseId: release._id.toString(),
      amount: input.amount,
      orgId: input.orgId.toString(),
      idempotencyKey: input.idempotencyKey,
    });

    endTimer();
    return { account, release };
  }

  async releaseFunds(
    input: EscrowMoneyMovement & { releaseId?: Types.ObjectId },
  ) {
    assertEscrowEnabled();
    const endTimer = escrowLatency.startTimer({ operation: "release" });
    await connectDb();

    const account = await EscrowAccount.findOne({
      _id: input.escrowAccountId,
      orgId: input.orgId,
    });
    if (!account) {
      endTimer();
      throw new Error("Escrow account not found");
    }

    if (input.amount > account.holdAmount && !input.force) {
      endTimer();
      throw new Error("Release amount exceeds held funds");
    }

    const transaction = await EscrowTransaction.create({
      orgId: input.orgId,
      escrowAccountId: input.escrowAccountId,
      type: EscrowTransactionType.RELEASE,
      status: EscrowTransactionStatus.SUCCEEDED,
      amount: input.amount,
      currency: input.currency ?? "SAR",
      provider: input.provider ?? "UNKNOWN",
      idempotencyKey: input.idempotencyKey,
      initiatedBy: input.actorId,
      executedAt: new Date(),
    });

    account.releasedAmount += input.amount;
    account.holdAmount = Math.max(0, account.holdAmount - input.amount);
    account.status = EscrowState.RELEASED;
    account.auditTrail.push({
      at: new Date(),
      action: "released",
      actorId: input.actorId,
      actorType: "USER",
      metadata: { transactionId: transaction._id },
    });
    await account.save();

    if (input.releaseId) {
      await EscrowRelease.findOneAndUpdate(
        { _id: input.releaseId, orgId: input.orgId },
        {
          status: EscrowReleaseStatus.RELEASED,
          releaseTransactionId: transaction._id,
          releasedAt: new Date(),
        },
      );
    }

    await emitEscrowEvent("escrow.released", {
      escrowAccountId: account._id.toString(),
      releaseId: input.releaseId?.toString(),
      amount: input.amount,
      orgId: input.orgId.toString(),
      idempotencyKey: input.idempotencyKey,
      transactionId: transaction._id.toString(),
    });

    endTimer();
    return { account, transaction };
  }

  async refund(input: EscrowMoneyMovement) {
    assertEscrowEnabled();
    const endTimer = escrowLatency.startTimer({ operation: "refund" });
    await connectDb();

    const account = await EscrowAccount.findOne({
      _id: input.escrowAccountId,
      orgId: input.orgId,
    });
    if (!account) {
      endTimer();
      throw new Error("Escrow account not found");
    }

    if (input.amount > account.holdAmount && !input.force) {
      endTimer();
      throw new Error("Refund exceeds held funds");
    }

    const transaction = await EscrowTransaction.create({
      orgId: input.orgId,
      escrowAccountId: input.escrowAccountId,
      type: EscrowTransactionType.REFUND,
      status: EscrowTransactionStatus.SUCCEEDED,
      amount: input.amount,
      currency: input.currency ?? "SAR",
      provider: input.provider ?? "UNKNOWN",
      idempotencyKey: input.idempotencyKey,
      initiatedBy: input.actorId,
      executedAt: new Date(),
    });

    account.refundedAmount += input.amount;
    account.holdAmount = Math.max(0, account.holdAmount - input.amount);
    account.status = EscrowState.REFUNDED;
    account.auditTrail.push({
      at: new Date(),
      action: "refunded",
      actorId: input.actorId,
      actorType: "USER",
      metadata: { transactionId: transaction._id },
    });
    await account.save();

    await emitEscrowEvent("escrow.refunded", {
      escrowAccountId: account._id.toString(),
      amount: input.amount,
      orgId: input.orgId.toString(),
      idempotencyKey: input.idempotencyKey,
      transactionId: transaction._id.toString(),
    });

    endTimer();
    return { account, transaction };
  }

  async failEscrow(
    orgId: Types.ObjectId,
    escrowAccountId: Types.ObjectId,
    reason: string,
  ) {
    assertEscrowEnabled();
    await connectDb();
    const account = await EscrowAccount.findOne({
      _id: escrowAccountId,
      orgId,
    });
    if (!account) {
      throw new Error("Escrow account not found");
    }

    account.status = EscrowState.FAILED;
    account.auditTrail.push({
      at: new Date(),
      action: "failed",
      actorType: "SYSTEM",
      reason,
    });
    await account.save();

    await emitEscrowEvent("escrow.failed", {
      escrowAccountId: escrowAccountId.toString(),
      orgId: orgId.toString(),
      reason,
    });

    return account;
  }
}

export const escrowService = new EscrowService();
