/**
 * Seller Balance Service
 *
 * Real-time balance tracking using Redis for fast queries.
 * Manages transaction history, reserve management, and withdrawal requests.
 *
 * Features:
 * - Real-time balance tracking (available, reserved, pending)
 * - Transaction history with pagination
 * - Reserve management (hold/release)
 * - Withdrawal request handling
 * - Admin adjustments
 */

import { ObjectId } from "mongodb";
import { connectDb } from "@/lib/mongodb-unified";
import { getCache, setCache, CacheTTL, invalidateCacheKey } from "@/lib/redis";
import { PayoutProcessorService } from "@/services/souq/settlements/payout-processor";

/**
 * Balance types
 */
interface SellerBalance {
  sellerId: string;
  available: number; // Funds ready for withdrawal
  reserved: number; // Funds held for returns (7-14 days)
  pending: number; // Orders not yet delivered
  totalEarnings: number; // Lifetime earnings
  lastUpdated: Date;
}

/**
 * Transaction record
 */
interface Transaction {
  _id?: ObjectId;
  transactionId: string;
  sellerId: string;
  orderId?: string;
  type:
    | "sale"
    | "refund"
    | "commission"
    | "gateway_fee"
    | "vat"
    | "reserve_hold"
    | "reserve_release"
    | "withdrawal"
    | "adjustment"
    | "chargeback";
  amount: number; // Positive for credit, negative for debit
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  createdBy?: string; // Admin ID for adjustments
}

/**
 * Withdrawal request
 */
interface WithdrawalRequest {
  _id?: ObjectId;
  requestId: string;
  sellerId: string;
  orgId?: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  rejectionReason?: string;
  bankAccount: {
    iban: string;
    accountHolderName: string;
    bankName?: string;
    accountNumber?: string;
    swiftCode?: string;
  };
  payoutId?: string; // Reference to payout request
  notes?: string;
  statementId: string;
}

/**
 * Balance adjustment
 */
interface BalanceAdjustment {
  sellerId: string;
  orgId: string; // 🔐 STRICT v4.1: Required for tenant isolation
  amount: number; // Positive to add, negative to deduct
  reason: string;
  type: "manual" | "system";
  adminId?: string;
  reference?: string; // Order ID or other reference
}

/**
 * Seller Balance Service
 */
type TransactionFilters = {
  type?: Transaction["type"];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
};

export class SellerBalanceService {
  /**
   * Get seller balance (real-time from Redis)
   * @param sellerId - The seller ID
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async getBalance(sellerId: string, orgId?: string): Promise<SellerBalance> {
    // 🔐 STRICT v4.1: orgId is required in production for tenant isolation
    if (!orgId && process.env.NODE_ENV !== 'test') {
      throw new Error('orgId is required to fetch seller balance (STRICT v4.1 tenant isolation)');
    }
    const key = `seller:${sellerId}:${orgId || 'global'}:balance`;
    const cached = await getCache<SellerBalance>(key);
    if (cached) return cached;

    // Calculate from database if not cached
    const balance = await this.calculateBalance(sellerId, orgId);

    // Cache for 5 minutes
    await setCache(key, balance, CacheTTL.FIVE_MINUTES);

    return balance;
  }

  /**
   * Calculate balance from database
   * @param sellerId - The seller ID
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  private static async calculateBalance(
    sellerId: string,
    orgId?: string,
  ): Promise<SellerBalance> {
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const transactionsCollection = db.collection("souq_transactions");

    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const query: Record<string, unknown> = { sellerId };
    if (orgId) query.orgId = orgId;

    // Get all transactions
    const transactions = (await transactionsCollection
      .find(query)
      .sort({ createdAt: 1 })
      .toArray()) as Transaction[];

    let available = 0;
    let reserved = 0;
    let pending = 0;
    let totalEarnings = 0;

    for (const txn of transactions) {
      switch (txn.type) {
        case "sale":
          totalEarnings += txn.amount;
          available += txn.amount;
          break;
        case "refund":
        case "chargeback":
          available += txn.amount; // Negative amount
          break;
        case "commission":
        case "gateway_fee":
        case "vat":
          available += txn.amount; // Negative amount
          break;
        case "reserve_hold":
          available += txn.amount; // Negative amount
          reserved -= txn.amount; // Convert to positive
          break;
        case "reserve_release":
          reserved += txn.amount; // Negative amount
          available -= txn.amount; // Convert to positive
          break;
        case "withdrawal":
          available += txn.amount; // Negative amount
          break;
        case "adjustment":
          available += txn.amount;
          break;
      }
    }

    // Get pending balance (orders not yet delivered)
    const ordersCollection = db.collection("souq_orders");
    const pendingOrders = await ordersCollection
      .find({
        "items.sellerId": new ObjectId(sellerId),
        status: { $in: ["pending", "processing", "shipped"] },
      })
      .toArray();

    type PendingOrderItem = {
      sellerId?: unknown;
      subtotal?: number;
      pricePerUnit?: number;
      quantity?: number;
    };

    type PendingOrder = {
      items?: unknown;
      pricing?: {
        shippingFee?: number;
        tax?: number;
        discount?: number;
        total?: number;
      };
      shippingFee?: number;
    };

    const computePendingAmount = (
      order: PendingOrder,
      sellerIdStr: string,
    ): number => {
      const items = Array.isArray(order.items)
        ? (order.items as PendingOrderItem[])
        : [];
      const sellerItems = items.filter((item: PendingOrderItem) => {
        const id = item?.sellerId;
        if (!id) return false;
        if (typeof id === "string") return id === sellerIdStr;
        if (
          typeof id === "object" &&
          id !== null &&
          "toString" in id &&
          typeof id.toString === "function"
        ) {
          return id.toString() === sellerIdStr;
        }
        return String(id) === sellerIdStr;
      });
      if (sellerItems.length === 0) return 0;

      const subtotal = sellerItems.reduce(
        (sum: number, item: PendingOrderItem) => {
          if (typeof item.subtotal === "number") return sum + item.subtotal;
          const price =
            typeof item.pricePerUnit === "number" ? item.pricePerUnit : 0;
          const qty = typeof item.quantity === "number" ? item.quantity : 1;
          return sum + price * qty;
        },
        0,
      );

      const pricing = order.pricing ?? {};
      const shippingFee =
        typeof pricing.shippingFee === "number"
          ? pricing.shippingFee
          : (order.shippingFee ?? 0);
      const tax = typeof pricing.tax === "number" ? pricing.tax : 0;
      const discount =
        typeof pricing.discount === "number" ? pricing.discount : 0;

      if (typeof pricing.total === "number") {
        return pricing.total;
      }
      return Math.max(0, subtotal + shippingFee + tax - discount);
    };

    for (const order of pendingOrders) {
      pending += computePendingAmount(order as PendingOrder, sellerId);
    }

    return {
      sellerId,
      available: parseFloat(available.toFixed(2)),
      reserved: parseFloat(reserved.toFixed(2)),
      pending: parseFloat(pending.toFixed(2)),
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      lastUpdated: new Date(),
    };
  }

  /**
   * Record transaction and update balance
   * @param transaction - Transaction data including orgId for tenant isolation
   */
  static async recordTransaction(
    transaction: Omit<
      Transaction,
      "_id" | "transactionId" | "balanceBefore" | "balanceAfter" | "createdAt"
    > & { orgId: string },
  ): Promise<Transaction> {
    // 🔐 STRICT v4.1: Require orgId for tenant isolation
    if (!transaction.orgId) {
      throw new Error('orgId is required to record transaction (STRICT v4.1 tenant isolation)');
    }
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const transactionsCollection = db.collection("souq_transactions");

    // Get current balance
    const balance = await this.getBalance(transaction.sellerId, transaction.orgId);

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Calculate new balance
    const balanceBefore = balance.available;
    const balanceAfter = balanceBefore + transaction.amount;

    // Create transaction record
    const txn: Transaction = {
      ...transaction,
      transactionId,
      balanceBefore: parseFloat(balanceBefore.toFixed(2)),
      balanceAfter: parseFloat(balanceAfter.toFixed(2)),
      createdAt: new Date(),
    };

    // Save to database
    await transactionsCollection.insertOne(txn);

    // Invalidate Redis cache
    await this.invalidateBalanceCache(transaction.sellerId, transaction.orgId);

    return txn;
  }

  /**
   * Request withdrawal
   * @param sellerId - The seller ID
   * @param orgId - Required for STRICT v4.1 tenant isolation
   * @param amount - Withdrawal amount
   * @param bankAccount - Bank account details
   * @param statementId - Statement reference
   */
  static async requestWithdrawal(
    sellerId: string,
    orgId: string,
    amount: number,
    bankAccount: WithdrawalRequest["bankAccount"],
    statementId: string,
  ): Promise<WithdrawalRequest> {
    // 🔐 STRICT v4.1: Require orgId for tenant isolation
    if (!orgId) {
      throw new Error('orgId is required to request withdrawal (STRICT v4.1 tenant isolation)');
    }
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const withdrawalsCollection = db.collection("souq_withdrawal_requests");

    // Get current balance
    const balance = await this.getBalance(sellerId, orgId);

    // Validate withdrawal amount
    if (amount <= 0) {
      throw new Error("Withdrawal amount must be positive");
    }

    if (amount > balance.available) {
      throw new Error(
        `Insufficient balance. Available: ${balance.available} SAR`,
      );
    }

    const minimumWithdrawal = 500; // SAR
    if (amount < minimumWithdrawal) {
      throw new Error(`Minimum withdrawal amount is ${minimumWithdrawal} SAR`);
    }

    // Check for pending withdrawal
    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const pendingWithdrawal = await withdrawalsCollection.findOne({
      sellerId,
      orgId,
      status: "pending",
    });

    if (pendingWithdrawal) {
      throw new Error("You already have a pending withdrawal request");
    }

    if (!statementId) {
      throw new Error("statementId is required to request withdrawal");
    }

    // Generate request ID
    const requestId = `WDR-${Date.now()}-${sellerId.slice(-6).toUpperCase()}`;

    // Create withdrawal request
    // 🔐 STRICT v4.1: Include orgId for tenant isolation
    const request: WithdrawalRequest = {
      requestId,
      sellerId,
      orgId,
      amount,
      status: "pending",
      requestedAt: new Date(),
      bankAccount,
      statementId,
    };

    // Save to database
    await withdrawalsCollection.insertOne(request);

    // Record transaction (hold funds)
    await this.recordTransaction({
      sellerId,
      orgId,
      type: "withdrawal",
      amount: -amount,
      description: `Withdrawal request: ${requestId}`,
      metadata: { requestId },
    });

    return request;
  }

  /**
   * Approve withdrawal request (admin)
   * @param requestId - Withdrawal request ID
   * @param adminId - Admin user ID
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async approveWithdrawal(
    requestId: string,
    adminId: string,
    orgId: string,
  ): Promise<WithdrawalRequest> {
    // 🔐 STRICT v4.1: Require orgId for tenant isolation
    if (!orgId) {
      throw new Error('orgId is required to approve withdrawal (STRICT v4.1 tenant isolation)');
    }
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const withdrawalsCollection = db.collection("souq_withdrawal_requests");

    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const request = (await withdrawalsCollection.findOne({
      requestId,
      orgId,
    })) as WithdrawalRequest | null;
    if (!request) {
      throw new Error("Withdrawal request not found");
    }

    if (request.status !== "pending") {
      throw new Error(`Withdrawal is already ${request.status}`);
    }

    // Initiate payout (call PayoutProcessorService)
    const bankAccount = this.normalizeBankAccount(request.bankAccount);
    const payout = await PayoutProcessorService.requestPayout(
      request.sellerId,
      request.statementId,
      request.orgId || "",
      bankAccount,
    );

    const payoutStatus =
      payout.status === "pending" ? "processing" : payout.status;

    // Update status with payout reference
    await withdrawalsCollection.updateOne(
      { requestId },
      {
        $set: {
          status: payoutStatus,
          processedAt: new Date(),
          payoutId: payout.payoutId,
          notes: `Approved by admin ${adminId}`,
        },
      },
    );

    return {
      ...request,
      status: payoutStatus as WithdrawalRequest["status"],
      payoutId: payout.payoutId,
      processedAt: new Date(),
    };
  }

  /**
   * Reject withdrawal request (admin)
   * @param requestId - Withdrawal request ID
   * @param adminId - Admin user ID
   * @param reason - Rejection reason
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async rejectWithdrawal(
    requestId: string,
    adminId: string,
    reason: string,
    orgId: string,
  ): Promise<WithdrawalRequest> {
    // 🔐 STRICT v4.1: Require orgId for tenant isolation
    if (!orgId) {
      throw new Error('orgId is required to reject withdrawal (STRICT v4.1 tenant isolation)');
    }
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const withdrawalsCollection = db.collection("souq_withdrawal_requests");

    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const request = (await withdrawalsCollection.findOne({
      requestId,
      orgId,
    })) as WithdrawalRequest | null;
    if (!request) {
      throw new Error("Withdrawal request not found");
    }

    if (request.status !== "pending") {
      throw new Error(`Withdrawal is already ${request.status}`);
    }

    // Update status
    await withdrawalsCollection.updateOne(
      { requestId },
      {
        $set: {
          status: "rejected",
          processedAt: new Date(),
          rejectionReason: reason,
          notes: `Rejected by admin ${adminId}`,
        },
      },
    );

    // Refund the withdrawal amount (reverse transaction)
    await this.recordTransaction({
      sellerId: request.sellerId,
      orgId,
      type: "adjustment",
      amount: request.amount, // Positive to add back
      description: `Withdrawal rejected: ${reason}`,
      metadata: { requestId },
      createdBy: adminId,
    });

    return {
      ...request,
      status: "rejected",
      processedAt: new Date(),
      rejectionReason: reason,
    };
  }

  /**
   * Apply balance adjustment (admin)
   * @param adjustment - Adjustment details including orgId for tenant isolation
   */
  static async applyAdjustment(
    adjustment: BalanceAdjustment,
  ): Promise<Transaction> {
    // 🔐 STRICT v4.1: Require orgId for tenant isolation
    if (!adjustment.orgId) {
      throw new Error('orgId is required for balance adjustment (STRICT v4.1 tenant isolation)');
    }
    if (!adjustment.adminId && adjustment.type === "manual") {
      throw new Error("Admin ID required for manual adjustments");
    }

    return await this.recordTransaction({
      sellerId: adjustment.sellerId,
      orgId: adjustment.orgId,
      type: "adjustment",
      amount: adjustment.amount,
      description: adjustment.reason,
      metadata: {
        type: adjustment.type,
        reference: adjustment.reference,
      },
      createdBy: adjustment.adminId,
    });
  }

  /**
   * Get transaction history
   */
  static async getTransactionHistory(
    sellerId: string,
    orgIdOrFilters?: string | TransactionFilters,
    maybeFilters?: TransactionFilters,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const orgId = typeof orgIdOrFilters === "string" ? orgIdOrFilters : undefined;
    const filters =
      typeof orgIdOrFilters === "string" ? maybeFilters : orgIdOrFilters;

    if (!orgId) {
      throw new Error("orgId is required to fetch transaction history");
    }

    await connectDb();
    const db = (await connectDb()).connection.db!;
    const transactionsCollection = db.collection("souq_transactions");

    const query: Record<string, unknown> = { sellerId, orgId };

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        (query.createdAt as Record<string, unknown>).$gte = filters.startDate;
      }
      if (filters.endDate) {
        (query.createdAt as Record<string, unknown>).$lte = filters.endDate;
      }
    }

    const total = await transactionsCollection.countDocuments(query);
    const transactions = (await transactionsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(filters?.offset || 0)
      .limit(filters?.limit || 50)
      .toArray()) as Transaction[];

    return { transactions, total };
  }

  /**
   * Get withdrawal requests
   * @param sellerId - The seller ID
   * @param orgId - Required for STRICT v4.1 tenant isolation
   * @param status - Optional status filter
   */
  static async getWithdrawalRequests(
    sellerId: string,
    orgId: string,
    status?: WithdrawalRequest["status"],
  ): Promise<WithdrawalRequest[]> {
    if (!orgId) {
      throw new Error('orgId is required to fetch withdrawal requests (STRICT v4.1 tenant isolation)');
    }
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const withdrawalsCollection = db.collection("souq_withdrawal_requests");

    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const query: Record<string, unknown> = { sellerId, orgId };
    if (status) {
      query.status = status;
    }

    const requests = (await withdrawalsCollection
      .find(query)
      .sort({ requestedAt: -1 })
      .toArray()) as WithdrawalRequest[];

    return requests;
  }

  /**
   * Hold funds in reserve
   * @param sellerId - The seller ID
   * @param orgId - Required for STRICT v4.1 tenant isolation
   * @param orderId - Order reference
   * @param amount - Amount to hold
   */
  static async holdReserve(
    sellerId: string,
    orgId: string,
    orderId: string,
    amount: number,
  ): Promise<Transaction> {
    // 🔐 STRICT v4.1: Require orgId for tenant isolation
    if (!orgId) {
      throw new Error('orgId is required to hold reserve (STRICT v4.1 tenant isolation)');
    }
    return await this.recordTransaction({
      sellerId,
      orgId,
      orderId,
      type: "reserve_hold",
      amount: -amount, // Deduct from available
      description: `Reserve held for order ${orderId}`,
      metadata: { orderId },
    });
  }

  /**
   * Release reserve funds
   * @param sellerId - The seller ID
   * @param orgId - Required for STRICT v4.1 tenant isolation
   * @param orderId - Order reference
   * @param amount - Amount to release
   */
  static async releaseReserve(
    sellerId: string,
    orgId: string,
    orderId: string,
    amount: number,
  ): Promise<Transaction> {
    // 🔐 STRICT v4.1: Require orgId for tenant isolation
    if (!orgId) {
      throw new Error('orgId is required to release reserve (STRICT v4.1 tenant isolation)');
    }
    return await this.recordTransaction({
      sellerId,
      orgId,
      orderId,
      type: "reserve_release",
      amount: amount, // Add to available
      description: `Reserve released for order ${orderId}`,
      metadata: { orderId },
    });
  }

  private static normalizeBankAccount(
    bankAccount: WithdrawalRequest["bankAccount"],
  ): {
    bankName: string;
    accountNumber: string;
    iban: string;
    accountHolderName: string;
    swiftCode?: string;
  } {
    if (!bankAccount.accountNumber) {
      throw new Error("Account number is required for payout processing");
    }

    return {
      bankName: bankAccount.bankName || "UNKNOWN",
      accountNumber: bankAccount.accountNumber,
      iban: bankAccount.iban,
      accountHolderName: bankAccount.accountHolderName,
      swiftCode: bankAccount.swiftCode,
    };
  }

  /**
   * Invalidate Redis cache for seller balance
   * @param sellerId - The seller ID
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  private static async invalidateBalanceCache(sellerId: string, orgId: string): Promise<void> {
    // 🔐 STRICT v4.1: Cache key must include orgId for tenant isolation
    const key = `seller:${sellerId}:${orgId}:balance`;
    await invalidateCacheKey(key);
  }

  /**
   * Get balance summary for multiple sellers (admin)
   * @param sellerIds - Array of seller IDs
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async getBulkBalances(
    sellerIds: string[],
    orgId: string,
  ): Promise<Map<string, SellerBalance>> {
    if (!orgId) {
      throw new Error('orgId is required for bulk balance fetch (STRICT v4.1 tenant isolation)');
    }
    const balances = new Map<string, SellerBalance>();

    await Promise.all(
      sellerIds.map(async (sellerId) => {
        const balance = await this.getBalance(sellerId, orgId);
        balances.set(sellerId, balance);
      }),
    );

    return balances;
  }
}

export type {
  SellerBalance,
  Transaction,
  WithdrawalRequest,
  BalanceAdjustment,
};
