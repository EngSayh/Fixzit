/**
 * Payout Processor Service
 *
 * Handles bank transfers to sellers via TAP Payments Transfer API.
 * Manages batch processing, retry logic, and payout reconciliation.
 *
 * Features:
 * - TAP Transfer API for marketplace seller payouts
 * - Batch processing (weekly/bi-weekly)
 * - Minimum payout threshold (500 SAR)
 * - 7-day hold period post-delivery
 * - 3 retry attempts for failed transfers
 * - Payout status tracking
 *
 * Migration Note (2025-06): Migrated from SADAD/SPAN simulation to TAP Transfers.
 * TAP handles bank settlements directly via their Destination/Transfer APIs.
 */

import { ObjectId } from "mongodb";
import type { Document, Filter, Db } from "mongodb";
import { Types } from "mongoose";
import { createHash } from "crypto";
import { connectDb } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import type { SettlementStatement } from "./settlement-calculator";
import { escrowService } from "./escrow-service";
import { PAYOUT_CONFIG } from "./settlement-config";
import { generatePayoutId, generateTransactionId, generateBatchId } from "@/lib/id-generator";
// Tap Payments integration for marketplace seller payouts
import { tapPayments, type TapTransferResponse as _TapTransferResponse } from "@/lib/finance/tap-payments";
import { getTapConfig } from "@/lib/tapConfig";

function normalizeOrgId(orgId: string) {
  const orgIdStr = String(orgId);
  const orgObj = ObjectId.isValid(orgIdStr) ? new ObjectId(orgIdStr) : null;
  const orgCandidates = orgObj ? [orgIdStr, orgObj] : [orgIdStr];
  return { orgIdStr, orgCandidates };
}

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
 * SADAD/SPAN readiness configuration (simulated until credentials are available)
 */
/**
 * TAP Payout Configuration
 * Uses ENABLE_TAP_PAYOUTS to enable TAP Transfer API for seller payouts
 */
type TapPayoutReadiness =
  | { status: "disabled" }
  | { status: "not_configured"; reason: string }
  | { status: "simulation"; mode: "simulation" }
  | { status: "ready"; mode: "live" | "test" };

function getTapPayoutReadiness(): TapPayoutReadiness {
  const flagEnabled = process.env.ENABLE_TAP_PAYOUTS === "true";
  if (!flagEnabled) {
    return { status: "disabled" };
  }

  // Check if TAP is configured
  const tapConfig = getTapConfig();
  if (!tapConfig.isConfigured) {
    return { 
      status: "not_configured", 
      reason: "TAP credentials not configured. Set TAP_TEST_SECRET_KEY or TAP_LIVE_SECRET_KEY" 
    };
  }

  // Simulation mode for testing without real transfers
  const mode = (process.env.TAP_PAYOUT_MODE || "live").toLowerCase();
  if (mode === "simulation") {
    return { status: "simulation", mode: "simulation" };
  }

  return { status: "ready", mode: tapConfig.environment };
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
    withdrawalIndexesReady = (async () => {
      try {
        await db.collection("souq_withdrawal_requests").createIndexes([
          { key: { requestId: 1 }, unique: true, name: "requestId_unique", background: true },
          { key: { payoutId: 1, orgId: 1 }, name: "payout_org", background: true },
          {
            key: { orgId: 1, sellerId: 1, status: 1, requestedAt: -1 },
            name: "org_seller_status_requestedAt",
            background: true,
          },
        ]);
      } catch (error) {
        logger.error('[PayoutProcessor] Failed to ensure withdrawal indexes', { error });
        // 🔐 STRICT v4.1: Reset cached promise to allow retry on next call
        withdrawalIndexesReady = null;
        throw error; // Fail fast - don't run without critical unique/org indexes
      }
    })();
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
    const { orgIdStr, orgCandidates } = normalizeOrgId(orgId);
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
    const payoutId = generatePayoutId(sellerId.slice(-6).toUpperCase());

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
      { statementId, orgId: orgIdStr }, // STRING for souq_settlements; legacy ObjectId support handled via migration
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
    const { orgCandidates } = normalizeOrgId(orgId);
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
    const { orgCandidates } = normalizeOrgId(orgId);
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

      // Schedule retry job (via background queue or cron)
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
   * Execute bank transfer via TAP Transfer API
   * Replaces the previous SADAD/SPAN simulation with real TAP integration.
   */
  private static async executeBankTransfer(
    payout: PayoutRequest,
  ): Promise<BankTransferResponse> {
    const readiness = getTapPayoutReadiness();

    if (readiness.status === "disabled") {
      logger.warn(
        "[PayoutProcessor] TAP payouts disabled. Set ENABLE_TAP_PAYOUTS=true to enable.",
        {
          metric: "payout_integration_disabled",
          provider: "TAP",
          method: payout.method,
        },
      );
      return {
        success: false,
        errorCode: "INTEGRATION_DISABLED",
        errorMessage:
          "TAP payouts are disabled. Set ENABLE_TAP_PAYOUTS=true in environment.",
      };
    }

    if (readiness.status === "not_configured") {
      logger.error(
        "[PayoutProcessor] TAP not configured properly.",
        {
          metric: "payout_integration_misconfigured",
          provider: "TAP",
          method: payout.method,
          reason: readiness.reason,
        },
      );
      return {
        success: false,
        errorCode: "INTEGRATION_NOT_CONFIGURED",
        errorMessage: readiness.reason,
      };
    }

    // Simulation mode for testing
    if (readiness.status === "simulation") {
      logger.info(
        `[PayoutProcessor] Simulating TAP transfer for ${payout.amount} SAR`,
        {
          metric: "payout_simulated",
          provider: "TAP",
          method: payout.method,
          amount: payout.amount,
          mode: "simulation",
        },
      );

      // Deterministic simulation for testing
      const successRateEnv = process.env.PAYOUT_SIMULATION_SUCCESS_RATE ?? "0.95";
      const successRate = Math.max(0, Math.min(1, parseFloat(successRateEnv)));
      const seed = process.env.PAYOUT_SIMULATION_SEED ?? "";
      const hash = createHash("sha256")
        .update(`${payout.payoutId}-${seed}`)
        .digest();
      const deterministic = hash[0] / 255;
      const isSuccess = deterministic < successRate;

      // Simulate API latency
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (isSuccess) {
        return {
          success: true,
          transactionId: `tap_sim_${generateTransactionId()}`,
        };
      } else {
        return {
          success: false,
          errorCode: "SIMULATED_ERROR",
          errorMessage: "Simulated transfer failure for testing",
        };
      }
    }

    // Real TAP Transfer execution
    try {
      logger.info(
        `Executing TAP transfer for ${payout.amount} SAR to IBAN ${payout.bankAccount.iban.substring(0, 4)}****`,
        {
          metric: "payout_tap_transfer",
          provider: "TAP",
          method: payout.method,
          amount: payout.amount,
          mode: readiness.mode,
        },
      );

      // Get or create TAP destination for this seller
      // NOTE: In production, sellers should have a tapDestinationId stored in their profile
      // For now, we check if seller has a stored TAP destination ID
      const db = await getDbInstance();
      const sellersCollection = db.collection("souq_sellers");
      const seller = await sellersCollection.findOne({ 
        sellerId: payout.sellerId,
        orgId: payout.orgId,
      });

      let destinationId = seller?.tapDestinationId as string | undefined;

      // If seller doesn't have a TAP destination, create one
      if (!destinationId) {
        logger.info(`Creating TAP destination for seller ${payout.sellerId}`);
        
        const destination = await tapPayments.createDestination({
          display_name: payout.bankAccount.accountHolderName,
          bank_account: {
            iban: payout.bankAccount.iban,
          },
          settlement_by: "Acquirer",
        });

        destinationId = destination.id;

        // Store the destination ID for future payouts
        await sellersCollection.updateOne(
          { sellerId: payout.sellerId, orgId: payout.orgId },
          { 
            $set: { 
              tapDestinationId: destinationId,
              tapDestinationStatus: destination.status,
              tapDestinationUpdatedAt: new Date(),
            } 
          },
          { upsert: true },
        );
      }

      // Execute the transfer
      const transfer = await tapPayments.createTransfer({
        amount: tapPayments.sarToHalalas(payout.amount),
        currency: "SAR",
        destination: { id: destinationId },
        description: `Marketplace settlement payout - ${payout.payoutId}`,
        metadata: {
          payoutId: payout.payoutId,
          sellerId: payout.sellerId,
          statementId: payout.statementId,
          organizationId: String(payout.orgId),
        },
        reference: {
          merchant: payout.payoutId,
        },
      });

      // Check transfer status
      if (transfer.status === "SUCCEEDED") {
        logger.info("TAP transfer completed successfully", {
          transferId: transfer.id,
          amount: payout.amount,
          payoutId: payout.payoutId,
        });
        return {
          success: true,
          transactionId: transfer.id,
        };
      } else if (transfer.status === "PENDING") {
        // Pending transfers need webhook to confirm
        logger.info("TAP transfer pending - will be confirmed via webhook", {
          transferId: transfer.id,
          amount: payout.amount,
          payoutId: payout.payoutId,
        });
        return {
          success: true,
          transactionId: transfer.id,
        };
      } else {
        // FAILED or CANCELLED
        logger.error("TAP transfer failed", {
          transferId: transfer.id,
          status: transfer.status,
          response: transfer.response,
        });
        return {
          success: false,
          errorCode: transfer.response?.code || "TAP_ERROR",
          errorMessage: transfer.response?.message || "Transfer failed",
        };
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error executing TAP transfer", err, {
        payoutId: payout.payoutId,
        amount: payout.amount,
      });
      return {
        success: false,
        errorCode: "TAP_API_ERROR",
        errorMessage: err.message,
      };
    }
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
    const batchId = generateBatchId(scheduledDate);

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
      // 🔐 STRICT v4.1: souq_sellers.orgId is ObjectId; payout.orgId may be string.
      // Use dual-type candidates to match both legacy string and ObjectId storage.
      const db = await getDbInstance();
      const sellerIdObj = ObjectId.isValid(payout.sellerId)
        ? new ObjectId(payout.sellerId)
        : null;
      const orgIdStr = String(payout.orgId);
      const orgCandidatesForSeller = ObjectId.isValid(orgIdStr)
        ? [orgIdStr, new ObjectId(orgIdStr)]
        : [orgIdStr];
      const sellerFilter: Filter<Document> = sellerIdObj
        ? { _id: sellerIdObj, orgId: { $in: orgCandidatesForSeller } }
        : { sellerId: payout.sellerId, orgId: { $in: orgCandidatesForSeller } };
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
