/**
 * Payout Processor Service
 *
 * Handles bank transfers to sellers via SADAD/SPAN network.
 * Manages batch processing, retry logic, and payout reconciliation.
 *
 * Features:
 * - SADAD/SPAN integration for Saudi bank transfers
 * - Batch processing (weekly/bi-weekly)
 * - Minimum payout threshold (500 SAR)
 * - 7-day hold period post-delivery
 * - 3 retry attempts for failed transfers
 * - Payout status tracking
 */

import { ObjectId } from "mongodb";
import type { Document, Filter, Db } from "mongodb";
import { Types } from "mongoose";
import { createHash } from "crypto";
import { connectDb } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import type { SettlementStatement } from "./settlement-calculator";
import { escrowService } from "./escrow-service";

/**
 * Payout status types
 */
type PayoutStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Payout method
 */
type PayoutMethod = "sadad" | "span" | "manual";

/**
 * Bank account details
 */
interface BankAccount {
  bankName: string;
  accountNumber: string;
  iban: string;
  accountHolderName: string;
  swiftCode?: string;
}

/**
 * Payout request
 * AUDIT-2025-12-06: orgId is stored as ObjectId in DB (per PayoutRequest.ts schema)
 * but may be string in input parameters. Use string | ObjectId for flexibility.
 */
interface PayoutRequest {
  _id?: ObjectId;
  payoutId: string;
  sellerId: string;
  statementId: string;
  orgId: string | ObjectId; // ObjectId in DB, string in input params
  escrowAccountId?: string;
  amount: number;
  currency: string;
  bankAccount: BankAccount;
  method: PayoutMethod;
  status: PayoutStatus;
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  transactionReference?: string; // Bank transaction ID
  notes?: string;
}

/**
 * Batch payout job
 */
interface BatchPayoutJob {
  _id?: ObjectId;
  batchId: string;
  orgId: string;
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: "scheduled" | "processing" | "completed" | "failed";
  totalPayouts: number;
  successfulPayouts: number;
  failedPayouts: number;
  totalAmount: number;
  payouts: string[]; // Payout IDs
}

/**
 * SADAD/SPAN API response (mock interface)
 */
interface BankTransferResponse {
  success: boolean;
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Payout configuration
 */
const PAYOUT_CONFIG = {
  minimumAmount: 500, // SAR
  holdPeriodDays: 7, // Days after delivery
  maxRetries: 3,
  retryDelayMinutes: 30,
  batchSchedule: "weekly", // 'weekly' or 'biweekly'
  batchDay: 5, // Friday (0 = Sunday, 6 = Saturday)
  currency: "SAR",
} as const;

/**
 * SADAD/SPAN readiness configuration (simulated until credentials are available)
 */
const SADAD_REQUIRED_ENV_VARS = [
  "SADAD_API_KEY",
  "SADAD_API_SECRET",
  "SADAD_API_ENDPOINT",
] as const;
type SadadSpanReadiness =
  | { status: "disabled" }
  | { status: "incomplete"; missingEnv: string[] }
  | { status: "simulation"; mode: "simulation" }
  | { status: "live_not_implemented"; mode: string };

function getSadadSpanReadiness(): SadadSpanReadiness {
  const flagEnabled = process.env.ENABLE_SADAD_PAYOUTS === "true";
  if (!flagEnabled) {
    return { status: "disabled" };
  }

  const missingEnv = SADAD_REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missingEnv.length > 0) {
    return { status: "incomplete", missingEnv };
  }

  const mode = (process.env.SADAD_SPAN_MODE || "simulation").toLowerCase();
  if (mode !== "simulation") {
    return { status: "live_not_implemented", mode };
  }

  return { status: "simulation", mode: "simulation" };
}

async function getDbInstance() {
  const mongooseInstance = await connectDb();
  const db = mongooseInstance.connection.db;
  if (!db) {
    throw new Error("Database connection not initialized");
  }
  return db;
}

let withdrawalIndexesReady: Promise<void> | null = null;
async function ensureWithdrawalIndexes(db: Db): Promise<void> {
  if (!withdrawalIndexesReady) {
    withdrawalIndexesReady = db
      .collection("souq_withdrawal_requests")
      .createIndexes([
        { key: { requestId: 1 }, unique: true, name: "requestId_unique" },
        { key: { payoutId: 1, orgId: 1 }, name: "payout_org" },
        {
          key: { orgId: 1, sellerId: 1, status: 1, requestedAt: -1 },
          name: "org_seller_status_requestedAt",
        },
      ])
      .then(() => undefined)
      .catch(() => undefined);
  }
  await withdrawalIndexesReady;
}

/**
 * Payout Processor Service
 */
export class PayoutProcessorService {
  /**
   * Request payout for a settlement
   */
  static async requestPayout(
    sellerId: string,
    statementId: string,
    orgId: string,
    bankAccount: BankAccount,
  ): Promise<PayoutRequest> {
    if (!orgId) {
      throw new Error("orgId is required to request payout");
    }
    // AUDIT-2025-12-07: Normalize to STRING for new writes; keep legacy ObjectId readable via $in
    const orgIdStr = String(orgId);
    const orgCandidates = ObjectId.isValid(orgIdStr)
      ? [orgIdStr, new ObjectId(orgIdStr)]
      : [orgIdStr];
    const sellerObjectId = ObjectId.isValid(sellerId)
      ? new ObjectId(sellerId)
      : sellerId;

    const db = await getDbInstance();
    await ensureWithdrawalIndexes(db);
    const statementsCollection = db.collection("souq_settlements");
    const payoutsCollection = db.collection("souq_payouts");

    // Fetch statement - souq_settlements uses STRING orgId
    const statement = (await statementsCollection.findOne({
      statementId,
      sellerId: sellerObjectId,
      orgId: { $in: orgCandidates }, // STRING for souq_settlements; allow legacy ObjectId
    })) as SettlementStatement | null;

    if (!statement) {
      throw new Error("Settlement statement not found");
    }

    if (statement.status !== "approved") {
      throw new Error("Statement must be approved before requesting payout");
    }

    // Enforce post-delivery hold period before releasing funds
    const periodEndRaw = (statement as { period?: { end?: Date | string } })?.period
      ?.end;
    if (periodEndRaw) {
      const periodEnd = new Date(periodEndRaw);
      const holdUntil = new Date(periodEnd);
      holdUntil.setDate(holdUntil.getDate() + PAYOUT_CONFIG.holdPeriodDays);
      if (Number.isFinite(holdUntil.getTime()) && Date.now() < holdUntil.getTime()) {
        throw new Error(
          `Payout hold period in effect until ${holdUntil.toISOString()}. Try after the hold window.`,
        );
      }
    }

    // Validate minimum payout amount
    if (statement.summary.netPayout < PAYOUT_CONFIG.minimumAmount) {
      throw new Error(
        `Payout amount (${statement.summary.netPayout} SAR) is below minimum threshold (${PAYOUT_CONFIG.minimumAmount} SAR)`,
      );
    }

    // Check for existing payout request
    const existingPayout = await payoutsCollection.findOne({
      statementId,
      orgId: { $in: orgCandidates },
      status: { $in: ["pending", "processing"] },
    });

    if (existingPayout) {
      throw new Error("Payout request already exists for this statement");
    }

    // Validate bank account
    this.validateBankAccount(bankAccount);

    // Generate payout ID
    const payoutId = `PAYOUT-${Date.now()}-${sellerId.slice(-6).toUpperCase()}`;

    // Create payout request
    const payoutRequest: PayoutRequest = {
      payoutId,
      sellerId,
      statementId,
      orgId: orgIdStr,
      escrowAccountId: (
        statement as SettlementStatement & { escrowAccountId?: string }
      ).escrowAccountId,
      amount: statement.summary.netPayout,
      currency: PAYOUT_CONFIG.currency,
      bankAccount,
      method: this.selectPayoutMethod(bankAccount),
      status: "pending",
      requestedAt: new Date(),
      retryCount: 0,
      maxRetries: PAYOUT_CONFIG.maxRetries,
    };

    // Save to database - store canonical STRING orgId; legacy ObjectId rows remain queryable via orgCandidates
    await payoutsCollection.insertOne({
      ...payoutRequest,
      sellerId: sellerObjectId,
      orgId: orgIdStr,
    });

    // Update statement status - souq_settlements uses STRING orgId
    await statementsCollection.updateOne(
      { statementId, orgId: { $in: orgCandidates } }, // STRING for souq_settlements; allow legacy ObjectId
      { $set: { status: "pending", payoutId } },
    );

    return payoutRequest;
  }

  /**
   * Process a single payout
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async processPayout(payoutId: string, orgId: string): Promise<PayoutRequest> {
    if (!orgId) {
      throw new Error('orgId is required for processPayout (STRICT v4.1 tenant isolation)');
    }
    const orgIdStr = String(orgId);
    const orgCandidates = ObjectId.isValid(orgIdStr)
      ? [orgIdStr, new ObjectId(orgIdStr)]
      : [orgIdStr];
    const db = await getDbInstance();
    const payoutsCollection = db.collection("souq_payouts");

    // 🔐 STRICT v4.1: Atomically claim the payout to avoid double-processing
    const claimed = await payoutsCollection.findOneAndUpdate(
      { payoutId, orgId: { $in: orgCandidates }, status: "pending" },
      {
        $set: {
          status: "processing",
          processedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    const payout = claimed?.value as PayoutRequest | null;
    if (!payout) {
      throw new Error("Payout not found or already processing");
    }

    try {
      // Execute bank transfer
      const transferResult = await this.executeBankTransfer(payout);

      if (transferResult.success) {
        // Success: Mark as completed - 🔐 STRICT v4.1: Include orgId
        await payoutsCollection.updateOne(
          { payoutId, orgId: { $in: orgCandidates } },
          {
            $set: {
              status: "completed",
              completedAt: new Date(),
              transactionReference: transferResult.transactionId,
            },
          },
        );

        // Update settlement statement - 🔐 STRICT v4.1: Pass orgId
        await this.updateStatementStatus(payout.statementId, orgId, "paid");

        // Send notification to seller
        await this.sendPayoutNotification(payout, "success");

        if (payout.escrowAccountId) {
          const payoutOrgId = payout.orgId;
          if (!payoutOrgId) {
            logger.warn(
              "[PayoutProcessor] Missing orgId on payout; escrow release skipped",
              {
                payoutId,
                escrowAccountId: payout.escrowAccountId,
              },
            );
          } else {
            try {
              // Convert safely to Types.ObjectId for escrow service only if valid
              if (Types.ObjectId.isValid(String(payoutOrgId))) {
                await escrowService.releaseFunds({
                  escrowAccountId: new Types.ObjectId(payout.escrowAccountId),
                  orgId: new Types.ObjectId(String(payoutOrgId)),
                  amount: payout.amount,
                  currency: payout.currency,
                  provider:
                    payout.method === "sadad"
                      ? "SADAD"
                      : payout.method === "span"
                        ? "SPAN"
                        : "MANUAL",
                  idempotencyKey: `payout-${payout.payoutId}`,
                  reason: "Settlement payout completed",
                });
              } else {
                logger.warn("[PayoutProcessor] payout orgId not valid ObjectId for escrow release", {
                  payoutId: payout.payoutId,
                  orgId: payoutOrgId,
                });
              }
            } catch (escrowError) {
              logger.error(
                "[PayoutProcessor] Failed to release escrow after payout completion",
                {
                  payoutId,
                  escrowAccountId: payout.escrowAccountId,
                  error: escrowError,
                },
              );
            }
          }
        }

        // Mark withdrawal as completed for consistency with ledger state
        try {
          const withdrawalsCollection = db.collection("souq_withdrawal_requests");
          await withdrawalsCollection.updateOne(
            { payoutId: payout.payoutId, orgId: { $in: orgCandidates } },
            {
              $set: {
                status: "completed",
                completedAt: new Date(),
                processedAt: new Date(),
                payoutId: payout.payoutId,
                notes: "Payout completed successfully",
              },
            },
          );
        } catch (_withdrawalUpdateError) {
          logger.warn(
            "[PayoutProcessor] Unable to update withdrawal status after payout completion",
            { payoutId: payout.payoutId, orgId, error: _withdrawalUpdateError },
          );
        }

        return {
          ...payout,
          status: "completed",
          transactionReference: transferResult.transactionId,
        };
      } else {
        // Failed: Retry or mark as failed - 🔐 STRICT v4.1: Pass orgId
        return await this.handlePayoutFailure(
          payout,
          orgId,
          transferResult.errorMessage || "Unknown error",
        );
      }
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      // Exception: Retry or mark as failed - 🔐 STRICT v4.1: Pass orgId
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return await this.handlePayoutFailure(payout, orgId, errorMessage);
    }
  }

  /**
   * Handle payout failure with retry logic
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  private static async handlePayoutFailure(
    payout: PayoutRequest,
    orgId: string,
    errorMessage: string,
  ): Promise<PayoutRequest> {
    const orgIdStr = String(orgId);
    const orgCandidates = ObjectId.isValid(orgIdStr)
      ? [orgIdStr, new ObjectId(orgIdStr)]
      : [orgIdStr];
    const db = await getDbInstance();
    await ensureWithdrawalIndexes(db);
    const payoutsCollection = db.collection("souq_payouts");

    const newRetryCount = payout.retryCount + 1;

    if (newRetryCount >= PAYOUT_CONFIG.maxRetries) {
      // Max retries reached: Mark as failed - 🔐 STRICT v4.1: Include orgId
      await payoutsCollection.updateOne(
        { payoutId: payout.payoutId, orgId: { $in: orgCandidates } },
        {
          $set: {
            status: "failed",
            failedAt: new Date(),
            retryCount: newRetryCount,
            errorMessage,
          },
        },
      );

      // Update settlement status - 🔐 STRICT v4.1: Pass orgId
      await this.updateStatementStatus(payout.statementId, orgId, "failed");

      // Sync withdrawal state and refund held funds back to the ledger to avoid stuck balances
      try {
        const withdrawalsCollection = db.collection("souq_withdrawal_requests");
        await withdrawalsCollection.updateOne(
          { payoutId: payout.payoutId, orgId: { $in: orgCandidates } },
          {
            $set: {
              status: "failed",
                processedAt: new Date(),
                rejectionReason: errorMessage,
                notes: `Payout failed: ${errorMessage}`,
              },
            },
          );

        const { SellerBalanceService } = await import(
          "@/services/souq/settlements/balance-service"
        );
        await SellerBalanceService.recordTransaction({
          sellerId: payout.sellerId,
          orgId,
          type: "adjustment",
          amount: payout.amount, // Refund the held amount back to available
          description: `Payout failed: ${errorMessage}`,
          metadata: { payoutId: payout.payoutId },
        });
      } catch (_refundError) {
        const refundError =
          _refundError instanceof Error
            ? _refundError
            : new Error(String(_refundError));
        logger.error(
          "[PayoutProcessor] Failed to refund withdrawal after payout failure",
          { payoutId: payout.payoutId, orgId, error: refundError },
        );
      }

      // Send failure notification
      await this.sendPayoutNotification(payout, "failed", errorMessage);

      return {
        ...payout,
        status: "failed",
        retryCount: newRetryCount,
        errorMessage,
      };
    } else {
      // Schedule retry - 🔐 STRICT v4.1: Include orgId
      await payoutsCollection.updateOne(
        { payoutId: payout.payoutId, orgId: { $in: orgCandidates } },
        {
          $set: {
            status: "pending",
            retryCount: newRetryCount,
            errorMessage,
          },
        },
      );

      // Schedule retry job (via BullMQ or cron)
      const retryDelay =
        PAYOUT_CONFIG.retryDelayMinutes *
        60 *
        1000 *
        Math.pow(2, newRetryCount - 1);
      logger.info(
        `Scheduling retry ${newRetryCount} for payout ${payout.payoutId} in ${retryDelay}ms`,
      );

      return {
        ...payout,
        status: "pending",
        retryCount: newRetryCount,
        errorMessage,
      };
    }
  }

  /**
   * Execute bank transfer via SADAD/SPAN
   */
  private static async executeBankTransfer(
    payout: PayoutRequest,
  ): Promise<BankTransferResponse> {
    const readiness = getSadadSpanReadiness();

    if (readiness.status === "disabled") {
      logger.warn(
        "[PayoutProcessor] SADAD/SPAN integration disabled. Using manual fallback. See docs/payments/manual-withdrawal-process.md for the current runbook.",
        {
          metric: "payout_integration_disabled",
          provider: "SADAD_SPAN",
          method: payout.method,
        },
      );
      return {
        success: false,
        errorCode: "INTEGRATION_DISABLED",
        errorMessage:
          "SADAD/SPAN payouts are deferred until banking approvals complete.",
      };
    }

    if (readiness.status === "incomplete") {
      const missingEnvList = readiness.missingEnv.join(", ");
      logger.error(
        "[PayoutProcessor] SADAD/SPAN flagged on but credentials are missing. Failing fast.",
        {
          metric: "payout_integration_misconfigured",
          provider: "SADAD_SPAN",
          method: payout.method,
          missingEnv: readiness.missingEnv,
        },
      );
      return {
        success: false,
        errorCode: "INTEGRATION_NOT_CONFIGURED",
        errorMessage: `SADAD/SPAN credentials missing: ${missingEnvList}`,
      };
    }

    if (readiness.status === "live_not_implemented") {
      logger.error(
        "[PayoutProcessor] SADAD/SPAN live mode requested but not implemented. Staying in manual fallback.",
        {
          metric: "payout_integration_not_implemented",
          provider: "SADAD_SPAN",
          method: payout.method,
          mode: readiness.mode,
        },
      );
      return {
        success: false,
        errorCode: "INTEGRATION_NOT_AVAILABLE",
        errorMessage:
          "SADAD/SPAN live mode is not implemented yet. Keep ENABLE_SADAD_PAYOUTS=false or SADAD_SPAN_MODE=simulation.",
      };
    }

    /**
     * SADAD/SPAN Integration - Currently Simulated
     *
     * Feature Flag: ENABLE_SADAD_PAYOUTS=true
     * Status: Awaiting banking API credentials and approvals
     *
     * When enabled, replace simulation with:
     * - Real SADAD/SPAN API client
     * - Production credentials from env
     * - Proper error handling and retry logic
     * - Webhook handlers for payment status
     *
     * Current behavior: 95% success simulation for testing flows
     */

    logger.info(
      `Executing ${payout.method.toUpperCase()} transfer for ${payout.amount} SAR to ${payout.bankAccount.iban}`,
      {
        metric: "payout_simulated",
        provider: "SADAD_SPAN",
        method: payout.method,
        amount: payout.amount,
        mode: readiness.mode,
      },
    );

    // Simulate API call (replace with real client when ENABLE_SADAD_PAYOUTS=true)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate success rate in a deterministic way to avoid flaky tests/CI.
    // Inspired by common testing patterns that hash an id + seed for reproducibility.
    const successRateEnv = process.env.PAYOUT_SIMULATION_SUCCESS_RATE ?? "0.95";
    const successRate = Math.max(0, Math.min(1, parseFloat(successRateEnv)));
    const seed = process.env.PAYOUT_SIMULATION_SEED ?? "";
    const hash = createHash("sha256")
      .update(`${payout.payoutId}-${seed}`)
      .digest();
    const deterministic = hash[0] / 255; // 0..1
    const isSuccess = deterministic < successRate;

    if (isSuccess) {
      return {
        success: true,
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      };
    } else {
      return {
        success: false,
        errorCode: "BANK_ERROR",
        errorMessage: "Temporary bank service unavailable",
      };
    }

    // Real SADAD/SPAN integration would look like:
    // const sadadClient = new SADADClient(process.env.SADAD_API_KEY);
    // const result = await sadadClient.transfer({
    //   amount: payout.amount,
    //   currency: payout.currency,
    //   beneficiaryIBAN: payout.bankAccount.iban,
    //   beneficiaryName: payout.bankAccount.accountHolderName,
    //   reference: payout.payoutId,
    //   purpose: 'Marketplace settlement payout',
    // });
    //
    // return {
    //   success: result.status === 'success',
    //   transactionId: result.transactionId,
    //   errorCode: result.errorCode,
    //   errorMessage: result.errorMessage,
    // };
  }

  /**
   * Process batch payouts
   */
  static async processBatchPayouts(
    orgId: string,
    scheduledDate: Date,
  ): Promise<BatchPayoutJob> {
    if (!orgId) {
      throw new Error("orgId is required for processBatchPayouts (STRICT v4.1 tenant isolation)");
    }
    const orgIdStr = String(orgId);
    const orgCandidates = ObjectId.isValid(orgIdStr)
      ? [orgIdStr, new ObjectId(orgIdStr)]
      : [orgIdStr];
    const orgKey = orgIdStr;
    const db = await getDbInstance();
    const payoutsCollection = db.collection("souq_payouts");
    const batchesCollection = db.collection("souq_payout_batches");

    // Generate batch ID
    const batchId = `BATCH-${scheduledDate.toISOString().split("T")[0]}-${Date.now()}`;

    // Fetch pending payouts
    const pendingPayouts = (await payoutsCollection
      .find({
        orgId: { $in: orgCandidates },
        status: "pending",
        retryCount: { $lt: PAYOUT_CONFIG.maxRetries },
      })
      .toArray()) as PayoutRequest[];

    // Create batch job
    const batch: BatchPayoutJob = {
      batchId,
      orgId: orgKey,
      scheduledDate,
      startedAt: new Date(),
      status: "processing",
      totalPayouts: pendingPayouts.length,
      successfulPayouts: 0,
      failedPayouts: 0,
      totalAmount: pendingPayouts.reduce((sum, p) => sum + p.amount, 0),
      payouts: pendingPayouts.map((p) => p.payoutId),
    };

    await batchesCollection.insertOne(batch);

    // Process each payout
    for (const payout of pendingPayouts) {
      try {
        // 🔐 STRICT v4.1: Pass orgId from payout record for tenant isolation
        const payoutOrgId = payout.orgId;
        if (!payoutOrgId) {
          logger.warn(`[PayoutProcessor] Skipping payout ${payout.payoutId} - missing orgId`);
          batch.failedPayouts++;
          continue;
        }
        // AUDIT-2025-12-06: Convert ObjectId to string for processPayout call
        const orgIdStr = payoutOrgId instanceof ObjectId ? payoutOrgId.toHexString() : String(payoutOrgId);
        const result = await this.processPayout(payout.payoutId, orgIdStr);
        if (result.status === "completed") {
          batch.successfulPayouts++;
        } else {
          batch.failedPayouts++;
        }
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.error("Error processing payout", {
          payoutId: payout.payoutId,
          error,
        });
        batch.failedPayouts++;
      }
    }

    // Update batch status
    batch.completedAt = new Date();
    batch.status = "completed";

    await batchesCollection.updateOne(
      { batchId, orgId: orgKey },
      {
        $set: {
          completedAt: batch.completedAt,
          status: batch.status,
          successfulPayouts: batch.successfulPayouts,
          failedPayouts: batch.failedPayouts,
        },
      },
    );

    return batch;
  }

  /**
   * Cancel payout request
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async cancelPayout(payoutId: string, orgId: string, reason: string): Promise<void> {
    if (!orgId) {
      throw new Error('orgId is required for cancelPayout (STRICT v4.1 tenant isolation)');
    }
    const orgIdStr = String(orgId);
    const orgCandidates = ObjectId.isValid(orgIdStr)
      ? [orgIdStr, new ObjectId(orgIdStr)]
      : [orgIdStr];
    const db = await getDbInstance();
    const payoutsCollection = db.collection("souq_payouts");

    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const payout = await payoutsCollection.findOne({ payoutId, orgId: { $in: orgCandidates } });
    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.status !== "pending") {
      throw new Error("Only pending payouts can be cancelled");
    }

    // 🔐 STRICT v4.1: Include orgId in update for tenant isolation
    await payoutsCollection.updateOne(
      { payoutId, orgId: { $in: orgCandidates } },
      {
        $set: {
          status: "cancelled",
          notes: reason,
        },
      },
    );

    // Update settlement status - 🔐 STRICT v4.1: Pass orgId
    await this.updateStatementStatus(payout.statementId, orgId, "approved");
  }

  /**
   * Get payout status
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async getPayoutStatus(payoutId: string, orgId: string): Promise<PayoutRequest> {
    if (!orgId) {
      throw new Error('orgId is required for getPayoutStatus (STRICT v4.1 tenant isolation)');
    }
    const orgIdStr = String(orgId);
    const orgCandidates = ObjectId.isValid(orgIdStr)
      ? [orgIdStr, new ObjectId(orgIdStr)]
      : [orgIdStr];
    const db = await getDbInstance();
    const payoutsCollection = db.collection("souq_payouts");

    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const payout = (await payoutsCollection.findOne({
      payoutId,
      orgId: { $in: orgCandidates },
    })) as PayoutRequest | null;
    if (!payout) {
      throw new Error("Payout not found");
    }

    return payout;
  }

  /**
   * List payouts for seller
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async listPayouts(
    sellerId: string,
    orgId: string,
    filters?: {
      status?: PayoutStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ payouts: PayoutRequest[]; total: number }> {
    if (!orgId) {
      throw new Error('orgId is required for listPayouts (STRICT v4.1 tenant isolation)');
    }
    const orgIdStr = String(orgId);
    const orgCandidates = ObjectId.isValid(orgIdStr)
      ? [orgIdStr, new ObjectId(orgIdStr)]
      : [orgIdStr];
    const sellerObjectId = ObjectId.isValid(sellerId)
      ? new ObjectId(sellerId)
      : sellerId;
    const db = await getDbInstance();
    const payoutsCollection = db.collection("souq_payouts");

    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const query: Record<string, unknown> = {
      sellerId: sellerObjectId,
      orgId: { $in: orgCandidates },
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      query.requestedAt = {};
      if (filters.startDate) {
        (query.requestedAt as Record<string, unknown>).$gte = filters.startDate;
      }
      if (filters.endDate) {
        (query.requestedAt as Record<string, unknown>).$lte = filters.endDate;
      }
    }

    const total = await payoutsCollection.countDocuments(query);
    const limit = Math.min(Math.max(filters?.limit ?? 20, 1), 200);
    const offset = Math.max(filters?.offset ?? 0, 0);
    const payouts = (await payoutsCollection
      .find(query)
      .sort({ requestedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray()) as PayoutRequest[];

    return { payouts, total };
  }

  /**
   * Validate bank account details
   */
  private static validateBankAccount(bankAccount: BankAccount): void {
    if (!bankAccount.iban || !bankAccount.iban.startsWith("SA")) {
      throw new Error("Invalid IBAN: Must be a Saudi Arabian IBAN (SA...)");
    }

    if (bankAccount.iban.length !== 24) {
      throw new Error("Invalid IBAN: Must be 24 characters long");
    }

    if (
      !bankAccount.accountHolderName ||
      bankAccount.accountHolderName.length < 3
    ) {
      throw new Error("Invalid account holder name");
    }

    if (!bankAccount.accountNumber) {
      throw new Error("Account number is required");
    }
  }

  /**
   * Select payout method based on bank
   */
  private static selectPayoutMethod(bankAccount: BankAccount): PayoutMethod {
    // SADAD for most Saudi banks, SPAN for international
    if (bankAccount.iban.startsWith("SA")) {
      return "sadad";
    }
    return "span";
  }

  /**
   * Update settlement statement status
   * @param orgId - Required for STRICT v4.1 tenant isolation
   * AUDIT-2025-12-06: souq_settlements.orgId is STRING - do NOT convert to ObjectId
   */
  private static async updateStatementStatus(
    statementId: string,
    orgId: string,
    status: SettlementStatement["status"],
  ): Promise<void> {
    if (!orgId) {
      throw new Error('orgId is required for updateStatementStatus (STRICT v4.1 tenant isolation)');
    }
    // AUDIT-2025-12-06: souq_settlements uses STRING orgId; allow legacy ObjectId with $in
    const orgCandidates = ObjectId.isValid(orgId)
      ? [orgId, new ObjectId(orgId)]
      : [orgId];
    const db = await getDbInstance();
    const statementsCollection = db.collection("souq_settlements");

    const update: Record<string, unknown> = { status };

    if (status === "paid") {
      update.paidAt = new Date();
    }

    // 🔐 STRICT v4.1: Include orgId in update for tenant isolation - STRING for souq_settlements
    await statementsCollection.updateOne(
      { statementId, orgId: { $in: orgCandidates } }, // STRING with legacy ObjectId support
      { $set: update },
    );
  }

  /**
   * Send payout notification to seller
   */
  private static async sendPayoutNotification(
    payout: PayoutRequest,
    type: "success" | "failed",
    errorMessage?: string,
  ): Promise<void> {
    try {
      const { sendWhatsAppTextMessage, isWhatsAppEnabled } = await import(
        "@/lib/integrations/whatsapp"
      );

      // Get seller details for phone number, scoped by orgId for tenant isolation
      const db = await getDbInstance();
      const sellerIdObj = ObjectId.isValid(payout.sellerId)
        ? new ObjectId(payout.sellerId)
        : null;
      const sellerFilter: Filter<Document> = sellerIdObj
        ? { _id: sellerIdObj, orgId: payout.orgId }
        : { sellerId: payout.sellerId, orgId: payout.orgId };
      const seller = await db.collection("souq_sellers").findOne(sellerFilter);

      if (!seller?.contactInfo?.phone) {
        logger.warn(
          `No phone number for seller ${payout.sellerId}, skipping notification`,
        );
        return;
      }

      const message =
        type === "success"
          ? `تم تحويل مبلغ ${payout.amount.toFixed(2)} ريال سعودي إلى حسابك البنكي بنجاح.\n\nرقم المرجع: ${payout.transactionReference}\n\nسيصل المبلغ خلال 1-2 يوم عمل.`
          : `فشل تحويل مبلغ ${payout.amount.toFixed(2)} ريال سعودي.\n\nالسبب: ${errorMessage}\n\nسيتم إعادة المحاولة تلقائياً.`;

      if (isWhatsAppEnabled()) {
        const result = await sendWhatsAppTextMessage({
          to: seller.contactInfo.phone,
          message,
        });

        if (result.success) {
          logger.info(
            `Payout notification sent via WhatsApp for ${payout.payoutId}`,
            {
              messageId: result.messageId,
            },
          );
        } else {
          logger.error(
            `Failed to send WhatsApp notification for ${payout.payoutId}`,
            {
              error: result.error,
            },
          );
        }
      } else {
        logger.info(
          `WhatsApp disabled, logging ${type} notification for payout ${payout.payoutId}`,
          {
            phone: seller.contactInfo.phone,
            message,
          },
        );
      }
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error));
      logger.error(`Error sending payout notification for ${payout.payoutId}`, {
        error,
        payoutId: payout.payoutId,
        sellerId: payout.sellerId,
      });
    }
  }

  /**
   * Get next payout date
   */
  static getNextPayoutDate(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntil = (PAYOUT_CONFIG.batchDay - dayOfWeek + 7) % 7 || 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntil);
    nextDate.setHours(12, 0, 0, 0);
    return nextDate;
  }

  /**
   * Schedule batch payout job
   */
  static async scheduleBatchPayout(orgId: string): Promise<BatchPayoutJob> {
    if (!orgId) {
      throw new Error("orgId is required for scheduleBatchPayout (STRICT v4.1 tenant isolation)");
    }
    const nextPayoutDate = this.getNextPayoutDate();
    return await this.processBatchPayouts(orgId, nextPayoutDate);
  }
}

export { PAYOUT_CONFIG };
export type {
  PayoutRequest,
  PayoutStatus,
  PayoutMethod,
  BankAccount,
  BatchPayoutJob,
};
