import type { UpdateFilter } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { createRefund } from "@/lib/paytabs";
import { addJob, QUEUE_NAMES } from "@/lib/queues/setup";
import { logger } from "@/lib/logger";
import { ClaimService } from "./claim-service";

export interface RefundRequest {
  claimId: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  reason: string;
  originalPaymentMethod: string;
  originalTransactionId?: string;
}

type SellerBalanceDocument = {
  sellerId: string;
  availableBalance: number;
  transactions: Array<{
    transactionId: string;
    type: string;
    amount: number;
    reason: string;
    createdAt: Date;
  }>;
  updatedAt?: Date;
};

export interface RefundResult {
  refundId: string;
  status: "initiated" | "processing" | "completed" | "failed";
  amount: number;
  transactionId?: string;
  completedAt?: Date;
  failureReason?: string;
}

export interface Refund {
  refundId: string;
  claimId: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  reason: string;
  paymentMethod: string;
  originalTransactionId?: string;

  status: "initiated" | "processing" | "completed" | "failed";
  transactionId?: string;
  processedAt?: Date;
  completedAt?: Date;
  failureReason?: string;
  retryCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export class RefundProcessor {
  private static COLLECTION = "souq_refunds";
  private static MAX_RETRIES = 3;
  private static RETRY_DELAY_MS = 5000; // 5 seconds
  private static async collection() {
    const db = await getDatabase();
    return db.collection<Refund>(this.COLLECTION);
  }

  /**
   * Process refund for approved claim
   */
  static async processRefund(request: RefundRequest): Promise<RefundResult> {
    const collection = await this.collection();

    // Create refund record
    const refundId = `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const refund: Refund = {
      refundId,
      claimId: request.claimId,
      orderId: request.orderId,
      buyerId: request.buyerId,
      sellerId: request.sellerId,
      amount: request.amount,
      reason: request.reason,
      paymentMethod: request.originalPaymentMethod,
      originalTransactionId: request.originalTransactionId,
      status: "initiated",
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collection.insertOne(refund);

    // Attempt to process refund
    try {
      const result = await this.executeRefund(refund);

      // Update refund status
      await this.updateRefundStatus(refundId, result.status, {
        transactionId: result.transactionId,
        completedAt: result.status === "completed" ? new Date() : undefined,
        failureReason: result.failureReason,
      });

      // Update order status
      if (result.status === "completed") {
        await this.updateOrderStatus(request.orderId, "refunded");
      }

      // Notify parties
      await this.notifyRefundStatus(request.buyerId, request.sellerId, result);

      return result;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      await this.updateRefundStatus(refundId, "failed", {
        failureReason: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  /**
   * Execute refund with payment gateway (PayTabs)
   */
  private static async executeRefund(refund: Refund): Promise<RefundResult> {
    // Update to processing
    await this.updateRefundStatus(refund.refundId, "processing");

    try {
      // Call PayTabs refund API
      const gatewayResult = await this.callPaymentGateway(refund);

      return {
        refundId: refund.refundId,
        status: "completed",
        amount: refund.amount,
        transactionId: gatewayResult.transactionId,
        completedAt: new Date(),
      };
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      // Retry logic
      if (refund.retryCount < this.MAX_RETRIES) {
        await this.scheduleRetry(refund);

        return {
          refundId: refund.refundId,
          status: "processing",
          amount: refund.amount,
        };
      }

      return {
        refundId: refund.refundId,
        status: "failed",
        amount: refund.amount,
        failureReason:
          error instanceof Error ? error.message : "Failed after max retries",
      };
    }
  }

  /**
   * Call payment gateway API - Using PayTabs for Saudi market
   */
  private static async callPaymentGateway(refund: Refund): Promise<{
    transactionId: string;
    status: string;
  }> {
    if (!refund.originalTransactionId) {
      throw new Error("Missing original transaction reference for refund");
    }

    if (!process.env.PAYTABS_SERVER_KEY) {
      throw new Error(
        "PayTabs credentials not configured. Set PAYTABS_SERVER_KEY and PAYTABS_PROFILE_ID.",
      );
    }

    // Use PayTabs refund API
    const paytabsRefund = await createRefund({
      originalTransactionId: refund.originalTransactionId,
      refundId: refund.refundId,
      amount: refund.amount, // PayTabs uses decimal SAR, not halalas
      currency: "SAR",
      reason: refund.reason,
      metadata: {
        claimId: refund.claimId,
        orderId: refund.orderId,
        buyerId: refund.buyerId,
        sellerId: refund.sellerId,
      },
    });

    if (!paytabsRefund.success) {
      throw new Error(paytabsRefund.error || "PayTabs refund failed");
    }

    // Map PayTabs status codes to internal status
    // A = Approved, P = Pending, D = Declined
    const status =
      paytabsRefund.status === "A"
        ? "SUCCEEDED"
        : paytabsRefund.status === "P"
          ? "PENDING"
          : "FAILED";

    if (status === "FAILED") {
      throw new Error(`PayTabs refund declined: ${paytabsRefund.message}`);
    }

    return {
      transactionId: paytabsRefund.refundId!,
      status: status,
    };
  }

  /**
   * Schedule retry for failed refund
   */
  private static async scheduleRetry(refund: Refund): Promise<void> {
    const collection = await this.collection();

    await collection.updateOne(
      { refundId: refund.refundId },
      {
        $inc: { retryCount: 1 },
        $set: {
          status: "processing",
          updatedAt: new Date(),
        },
      },
    );

    // Schedule retry after delay
    setTimeout(
      async () => {
        const latestCollection = await this.collection();
        const updatedRefund = await latestCollection.findOne({
          refundId: refund.refundId,
        });

        if (updatedRefund && updatedRefund.status === "processing") {
          await this.executeRefund(updatedRefund);
        }
      },
      this.RETRY_DELAY_MS * (refund.retryCount + 1),
    ); // Exponential backoff
  }

  /**
   * Update refund status
   */
  private static async updateRefundStatus(
    refundId: string,
    status: Refund["status"],
    data?: {
      transactionId?: string;
      completedAt?: Date;
      failureReason?: string;
    },
  ): Promise<void> {
    const update: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (data?.transactionId) update.transactionId = data.transactionId;
    if (data?.completedAt) update.completedAt = data.completedAt;
    if (data?.failureReason) update.failureReason = data.failureReason;
    if (status === "processing") update.processedAt = new Date();

    const collection = await this.collection();
    await collection.updateOne({ refundId }, { $set: update });
  }

  /**
   * Update order status after refund
   */
  private static async updateOrderStatus(
    orderId: string,
    status: string,
  ): Promise<void> {
    const db = await getDatabase();
    await db.collection("souq_orders").updateOne(
      { orderId },
      {
        $set: {
          status,
          refundedAt: new Date(),
          updatedAt: new Date(),
          "payment.status": "refunded",
        },
      },
    );
  }

  /**
   * Notify parties about refund status
   */
  private static async notifyRefundStatus(
    buyerId: string,
    sellerId: string,
    result: RefundResult,
  ): Promise<void> {
    await addJob(QUEUE_NAMES.NOTIFICATIONS, "souq-claim-refund-status", {
      buyerId,
      sellerId,
      refundId: result.refundId,
      status: result.status,
      amount: result.amount,
      failureReason: result.failureReason,
      transactionId: result.transactionId,
      completedAt: result.completedAt,
    });
  }

  /**
   * Get refund by ID
   */
  static async getRefund(refundId: string): Promise<Refund | null> {
    const collection = await this.collection();
    return collection.findOne({ refundId });
  }

  /**
   * List refunds with filters
   */
  static async listRefunds(filters: {
    buyerId?: string;
    sellerId?: string;
    claimId?: string;
    status?: Refund["status"];
    limit?: number;
    offset?: number;
  }): Promise<{ refunds: Refund[]; total: number }> {
    const collection = await this.collection();

    const query: Record<string, unknown> = {};
    if (filters.buyerId) query.buyerId = filters.buyerId;
    if (filters.sellerId) query.sellerId = filters.sellerId;
    if (filters.claimId) query.claimId = filters.claimId;
    if (filters.status) query.status = filters.status;

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    const [refunds, total] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    return {
      refunds,
      total,
    };
  }

  /**
   * Retry failed refunds
   */
  static async retryFailedRefunds(): Promise<number> {
    const collection = await this.collection();
    const failedRefunds = await collection
      .find({
        status: "failed",
        retryCount: { $lt: this.MAX_RETRIES },
      })
      .toArray();

    let retriedCount = 0;

    for (const refund of failedRefunds) {
      try {
        await this.executeRefund(refund);
        retriedCount++;
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.error("Failed to retry refund", error, {
          refundId: refund.refundId,
        });
      }
    }

    return retriedCount;
  }

  /**
   * Get refund statistics
   */
  static async getRefundStats(filters: {
    sellerId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalRefunds: number;
    totalAmount: number;
    byStatus: Record<Refund["status"], number>;
    avgProcessingTime: number;
    successRate: number;
  }> {
    const collection = await this.collection();

    const query: {
      sellerId?: string;
      createdAt?: { $gte?: Date; $lte?: Date };
    } = {};
    if (filters.sellerId) query.sellerId = filters.sellerId;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    const refunds = await collection.find(query).toArray();

    const byStatus: Record<string, number> = {};
    let totalAmount = 0;
    let totalProcessingTime = 0;
    let processedCount = 0;
    let successCount = 0;

    refunds.forEach((refund) => {
      byStatus[refund.status] = (byStatus[refund.status] || 0) + 1;
      totalAmount += refund.amount;

      if (refund.status === "completed" && refund.completedAt) {
        const processingTime =
          refund.completedAt.getTime() - refund.createdAt.getTime();
        totalProcessingTime += processingTime;
        processedCount++;
        successCount++;
      } else if (refund.status === "failed") {
        processedCount++;
      }
    });

    return {
      totalRefunds: refunds.length,
      totalAmount,
      byStatus: byStatus as Record<Refund["status"], number>,
      avgProcessingTime:
        processedCount > 0 ? totalProcessingTime / processedCount : 0,
      successRate: processedCount > 0 ? successCount / processedCount : 0,
    };
  }

  /**
   * Calculate seller deduction from refund
   */
  static async calculateSellerDeduction(
    claimId: string,
    refundAmount: number,
  ): Promise<{
    refundAmount: number;
    sellerDeduction: number;
    platformFeeRefund: number;
    netSellerDeduction: number;
  }> {
    const claim = await ClaimService.getClaim(claimId);
    if (!claim) throw new Error("Claim not found");

    // Platform takes back its commission (assume 10%)
    const platformFeeRate = 0.1;
    const platformFeeRefund = refundAmount * platformFeeRate;

    // Seller pays the full refund amount
    const sellerDeduction = refundAmount;

    // Net seller loss (after getting back items if returned)
    const netSellerDeduction = sellerDeduction - platformFeeRefund;

    return {
      refundAmount,
      sellerDeduction,
      platformFeeRefund,
      netSellerDeduction,
    };
  }

  /**
   * Process seller payout deduction
   */
  static async deductFromSellerBalance(
    sellerId: string,
    amount: number,
    reason: string,
  ): Promise<void> {
    const balances = (await getDatabase()).collection<SellerBalanceDocument>(
      "souq_seller_balances",
    );
    const newTransaction: SellerBalanceDocument["transactions"][number] = {
      transactionId: `TXN-${Date.now()}`,
      type: "deduction",
      amount: -amount,
      reason,
      createdAt: new Date(),
    };

    const update: UpdateFilter<SellerBalanceDocument> = {
      $inc: { availableBalance: -amount },
      $push: {
        transactions: newTransaction,
      },
      $set: { updatedAt: new Date() },
      $setOnInsert: {
        sellerId,
        availableBalance: 0,
        transactions: [],
      },
    };

    await balances.updateOne({ sellerId }, update, { upsert: true });
  }
}
