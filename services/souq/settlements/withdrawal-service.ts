import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { createPayout } from "@/lib/paytabs";

/**
 * Withdrawal Request from Seller
 */
export interface WithdrawalRequest {
  sellerId: string;
  statementId: string;
  amount: number;
  bankAccount: {
    iban: string;
    accountHolderName: string;
    accountNumber: string;
    bankName: string;
  };
}

/**
 * Withdrawal Record in Database
 */
export interface Withdrawal {
  withdrawalId: string;
  sellerId: string;
  statementId: string;
  amount: number;
  currency: string;
  bankAccount: {
    iban: string;
    accountHolderName: string;
    accountNumber: string;
    bankName: string;
  };
  status: "pending" | "processing" | "completed" | "failed";
  transactionId?: string;
  failureReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * Withdrawal Service for Seller Payouts
 */
export class WithdrawalService {
  private static COLLECTION = "souq_withdrawals";

  /**
   * Process withdrawal request from seller
   */
  static async processWithdrawal(request: WithdrawalRequest): Promise<{
    success: boolean;
    withdrawalId?: string;
    error?: string;
  }> {
    try {
      // Validate IBAN
      if (!this.isValidIBAN(request.bankAccount.iban)) {
        return { success: false, error: "Invalid IBAN format" };
      }

      // Validate amount
      if (request.amount <= 0) {
        return { success: false, error: "Invalid withdrawal amount" };
      }

      // Check seller balance
      const hasBalance = await this.checkSellerBalance(
        request.sellerId,
        request.amount,
      );
      if (!hasBalance) {
        return { success: false, error: "Insufficient balance" };
      }

      // Generate withdrawal ID
      const withdrawalId = `WD-${Date.now()}-${request.sellerId.slice(0, 8)}`;

      // Create withdrawal record
      await this.createWithdrawalRecord({
        withdrawalId,
        sellerId: request.sellerId,
        statementId: request.statementId,
        amount: request.amount,
        currency: "SAR",
        bankAccount: request.bankAccount,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info("[Withdrawal] Withdrawal initiated", {
        withdrawalId,
        sellerId: request.sellerId,
        amount: request.amount,
      });

      const paytabsHandled = await this.tryPayTabsPayout(withdrawalId, request);

      if (!paytabsHandled) {
        await this.markManualCompletion(
          withdrawalId,
          request,
          "Manual payout per finance runbook",
        );
      }

      return {
        success: true,
        withdrawalId,
      };
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("[Withdrawal] Error processing withdrawal", error, {
        request,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Validate Saudi IBAN format
   */
  private static isValidIBAN(iban: string): boolean {
    // Remove spaces and convert to uppercase
    const cleanIBAN = iban.replace(/\s/g, "").toUpperCase();

    // Saudi IBAN format: SA + 22 digits (24 characters total)
    if (!cleanIBAN.startsWith("SA") || cleanIBAN.length !== 24) {
      return false;
    }

    // Check if remaining characters are digits
    const digits = cleanIBAN.slice(2);
    if (!/^\d{22}$/.test(digits)) {
      return false;
    }

    // MOD-97 checksum validation
    return this.validateIBANChecksum(cleanIBAN);
  }

  /**
   * Validate IBAN checksum using MOD-97 algorithm
   */
  private static validateIBANChecksum(iban: string): boolean {
    try {
      // Move first 4 characters to end
      const rearranged = iban.slice(4) + iban.slice(0, 4);

      // Replace letters with numbers (A=10, B=11, ..., Z=35)
      const numeric = rearranged.replace(/[A-Z]/g, (char) =>
        (char.charCodeAt(0) - 55).toString(),
      );

      // Calculate MOD-97
      let remainder = "";
      for (let i = 0; i < numeric.length; i++) {
        remainder += numeric[i];
        if (remainder.length >= 9) {
          remainder = (parseInt(remainder, 10) % 97).toString();
        }
      }

      // Valid IBAN has remainder of 1
      return parseInt(remainder, 10) === 1;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("[Withdrawal] IBAN checksum validation error", error, {
        iban,
      });
      return false;
    }
  }

  /**
   * Check if seller has sufficient balance
   */
  private static async checkSellerBalance(
    sellerId: string,
    amount: number,
  ): Promise<boolean> {
    try {
      const db = await getDatabase();

      // Get latest settlement statement
      const statement = await db
        .collection("souq_settlement_statements")
        .findOne(
          { sellerId, status: "approved" },
          { sort: { statementDate: -1 } },
        );

      if (!statement) {
        return false;
      }

      // Check available balance
      const availableBalance =
        statement.netAmount - (statement.withdrawnAmount || 0);
      return availableBalance >= amount;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("[Withdrawal] Balance check error", error, {
        sellerId,
        amount,
      });
      return false;
    }
  }

  /**
   * Create withdrawal record in database
   */
  private static async createWithdrawalRecord(
    withdrawal: Withdrawal,
  ): Promise<void> {
    const db = await getDatabase();
    await db.collection(this.COLLECTION).insertOne(withdrawal);
  }

  /**
   * Update withdrawal status
   */
  private static async updateWithdrawalStatus(
    withdrawalId: string,
    status: Withdrawal["status"],
    updates: Partial<Withdrawal> = {},
  ): Promise<void> {
    const db = await getDatabase();
    await db.collection(this.COLLECTION).updateOne(
      { withdrawalId },
      {
        $set: {
          status,
          updatedAt: new Date(),
          ...updates,
        },
      },
    );
  }

  /**
   * Get withdrawal by ID
   * @param withdrawalId - The withdrawal ID to fetch
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async getWithdrawal(withdrawalId: string, orgId: string): Promise<Withdrawal | null> {
    if (!orgId) {
      throw new Error("orgId is required for withdrawal lookup (STRICT v4.1)");
    }
    const db = await getDatabase();
    const record = await db
      .collection<Withdrawal>(this.COLLECTION)
      .findOne({ withdrawalId, orgId });
    return record || null;
  }

  /**
   * Get withdrawals for seller
   * @param sellerId - The seller ID
   * @param orgId - Required for STRICT v4.1 tenant isolation
   * @param limit - Maximum number of results (default 20)
   */
  static async getSellerWithdrawals(
    sellerId: string,
    orgId: string,
    limit: number = 20,
  ): Promise<Withdrawal[]> {
    if (!orgId) {
      throw new Error("orgId is required for seller withdrawals lookup (STRICT v4.1)");
    }
    const db = await getDatabase();
    const withdrawals = await db
      .collection<Withdrawal>(this.COLLECTION)
      .find({ sellerId, orgId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return withdrawals;
  }

  private static isPayTabsEnabled(): boolean {
    return (
      process.env.PAYTABS_PAYOUT_ENABLED === "true" &&
      !!process.env.PAYTABS_PROFILE_ID &&
      !!process.env.PAYTABS_SERVER_KEY
    );
  }

  private static async tryPayTabsPayout(
    withdrawalId: string,
    request: WithdrawalRequest,
  ): Promise<boolean> {
    if (!this.isPayTabsEnabled()) {
      logger.debug(
        "[Withdrawal] PayTabs payout disabled, falling back to manual process",
        {
          withdrawalId,
        },
      );
      return false;
    }

    try {
      const payout = await createPayout({
        amount: request.amount,
        currency: "SAR",
        reference: `WD-${withdrawalId}`,
        description: `Seller withdrawal ${withdrawalId}`,
        beneficiary: {
          name: request.bankAccount.accountHolderName,
          iban: request.bankAccount.iban,
          bank: request.bankAccount.bankName,
          accountNumber: request.bankAccount.accountNumber,
        },
        metadata: {
          sellerId: request.sellerId,
          statementId: request.statementId,
        },
      });

      if (!payout.success) {
        logger.error(
            "[Withdrawal] PayTabs payout failed, manual process required",
          {
            withdrawalId,
            sellerId: request.sellerId,
            error: payout.error,
          },
        );
        return false;
      }

      const normalizedStatus =
        payout.status?.toUpperCase() === "COMPLETED"
          ? "completed"
          : "processing";

      await this.updateWithdrawalStatus(
        withdrawalId,
        normalizedStatus as Withdrawal["status"],
        {
          transactionId: payout.payoutId,
          notes: "PayTabs payout submitted",
        },
      );

      return true;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("[Withdrawal] PayTabs payout threw unexpected error", {
        withdrawalId,
        error,
      });
      return false;
    }
  }

  private static async markManualCompletion(
    withdrawalId: string,
    request: WithdrawalRequest,
    note?: string,
  ): Promise<void> {
    await this.updateWithdrawalStatus(withdrawalId, "completed", {
      completedAt: new Date(),
      transactionId: `MANUAL-${withdrawalId}`,
      notes: note,
    });

    logger.info("[Withdrawal] Withdrawal completed manually (bank transfer)", {
      withdrawalId,
      iban: request.bankAccount.iban,
      amount: request.amount,
      sellerId: request.sellerId,
      documentation: "See docs/payments/manual-withdrawal-process.md",
    });
  }
}
