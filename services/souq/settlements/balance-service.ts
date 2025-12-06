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

const WITHDRAWAL_HOLD_DAYS = 7; // Align with settlement hold period (PAYOUT_CONFIG.holdPeriodDays)

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
  orgId: string; // 🔐 STRICT v4.1: Required for tenant isolation
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
  orgId: string; // 🔐 STRICT v4.1: Required for tenant isolation
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
   * Get seller balance (real-time from Redis or balance document)
   * 🔧 FIX: Now uses souq_seller_balances collection as primary source
   * for faster reads and consistency with atomic recordTransaction.
   * @param sellerId - The seller ID
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async getBalance(
    sellerId: string,
    orgId: string,
    options?: { bypassCache?: boolean },
  ): Promise<SellerBalance> {
    // 🔐 STRICT v4.1: orgId is ALWAYS required for tenant isolation
    if (!orgId) {
      throw new Error('orgId is required to fetch seller balance (STRICT v4.1 tenant isolation)');
    }
    const key = `seller:${sellerId}:${orgId}:balance`;
    const cached = options?.bypassCache ? null : await getCache<SellerBalance>(key);
    if (cached) return cached;

    // 🔧 FIX: Try to get from balance document first (fast path)
    const connection = await connectDb();
    const db = connection.connection.db!;
    const balancesCollection = db.collection("souq_seller_balances");
    
    const sellerFilter = ObjectId.isValid(sellerId)
      ? new ObjectId(sellerId)
      : sellerId;
    const orgFilter = ObjectId.isValid(orgId) ? new ObjectId(orgId) : orgId;
    
    const balanceDoc = await balancesCollection.findOne({
      sellerId: sellerFilter,
      orgId: orgFilter,
    });

    let balance: SellerBalance;

    if (balanceDoc) {
      // Use balance document (updated atomically by recordTransaction)
      balance = {
        sellerId,
        available: (balanceDoc as { available?: number }).available ?? 0,
        reserved: (balanceDoc as { reserved?: number }).reserved ?? 0,
        pending: (balanceDoc as { pending?: number }).pending ?? 0,
        totalEarnings: (balanceDoc as { totalEarnings?: number }).totalEarnings ?? 0,
        lastUpdated: (balanceDoc as { updatedAt?: Date }).updatedAt ?? new Date(),
      };
      
      // Calculate pending from orders (not tracked in balance doc)
      const pendingFromOrders = await this.calculatePendingFromOrders(sellerId, orgId);
      balance.pending = pendingFromOrders;
    } else {
      // Fallback: Calculate from transactions if no balance document exists
      // This handles legacy sellers or first-time balance requests
      balance = await this.calculateBalance(sellerId, orgId);
    }

    // Cache for 5 minutes (unless bypassing cache)
    if (!options?.bypassCache) {
      await setCache(key, balance, CacheTTL.FIVE_MINUTES);
    }

    return balance;
  }

  /**
   * Calculate pending balance from orders (orders not yet delivered)
   * @param sellerId - The seller ID
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  private static async calculatePendingFromOrders(
    sellerId: string,
    orgId: string,
  ): Promise<number> {
    const connection = await connectDb();
    const db = connection.connection.db!;
    const ordersCollection = db.collection("souq_orders");
    
    const sellerFilter = ObjectId.isValid(sellerId)
      ? new ObjectId(sellerId)
      : sellerId;
    const orgFilter = ObjectId.isValid(orgId) ? new ObjectId(orgId) : orgId;

    // Use aggregation for efficiency
    const result = await ordersCollection.aggregate([
      {
        $match: {
          "items.sellerId": sellerFilter,
          status: { $in: ["pending", "processing", "shipped"] },
          orgId: orgFilter,
        },
      },
      { $unwind: "$items" },
      {
        $match: {
          "items.sellerId": sellerFilter,
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $ifNull: [
                "$items.subtotal",
                { $multiply: ["$items.pricePerUnit", { $ifNull: ["$items.quantity", 1] }] },
              ],
            },
          },
        },
      },
    ]).toArray();

    return result.length > 0 ? parseFloat((result[0].total ?? 0).toFixed(2)) : 0;
  }

  /**
   * Calculate balance from database (fallback for legacy sellers)
   * @param sellerId - The seller ID
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  private static async calculateBalance(
    sellerId: string,
    orgId: string,
  ): Promise<SellerBalance> {
    // 🔐 STRICT v4.1: orgId is ALWAYS required for tenant isolation
    if (!orgId) {
      throw new Error('orgId is required to calculate balance (STRICT v4.1 tenant isolation)');
    }
    // 🔧 FIX: Single connectDb call instead of duplicate
    const connection = await connectDb();
    const db = connection.connection.db!;
    const transactionsCollection = db.collection("souq_transactions");

    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const sellerFilter = ObjectId.isValid(sellerId)
      ? new ObjectId(sellerId)
      : sellerId;
    const orgFilter = ObjectId.isValid(orgId) ? new ObjectId(orgId) : orgId;

    // 🔧 FIX: Use aggregation pipeline instead of unbounded find().toArray()
    // This leverages the { orgId, sellerId, createdAt } compound index
    const balanceAggregation = await transactionsCollection.aggregate([
      { $match: { sellerId: sellerFilter, orgId: orgFilter } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    // Initialize balance components
    let available = 0;
    let reserved = 0;
    let pending = 0;
    let totalEarnings = 0;

    // Process aggregated results by transaction type
    for (const item of balanceAggregation) {
      const txnType = item._id as string;
      const total = item.total as number;

      switch (txnType) {
        case "sale":
          totalEarnings += total;
          available += total;
          break;
        case "refund":
        case "chargeback":
        case "commission":
        case "gateway_fee":
        case "vat":
        case "withdrawal":
          available += total; // These are negative amounts
          break;
        case "reserve_hold":
          available += total; // Negative amount
          reserved -= total; // Convert to positive
          break;
        case "reserve_release":
          // Release adds to available and reduces reserved
          available += Math.abs(total);
          reserved = Math.max(0, reserved - Math.abs(total));
          break;
        case "adjustment":
          available += total;
          break;
      }
    }

    // Get pending balance (orders not yet delivered)
    // 🔐 STRICT v4.1: orgId is REQUIRED for tenant isolation in pending orders query
    const ordersCollection = db.collection("souq_orders");
    const orderSellerId =
      ObjectId.isValid(sellerId) ? new ObjectId(sellerId) : sellerId;
    const pendingOrders = await ordersCollection
      .find({
        "items.sellerId": orderSellerId,
        status: { $in: ["pending", "processing", "shipped"] },
        orgId: orgFilter, // 🔐 STRICT v4.1: Always filter by orgId for tenant isolation
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
   * Record transaction and update balance ATOMICALLY
   * 🔐 FIX: Uses MongoDB session with optimistic locking to prevent race conditions
   * and double-spend/overdraw scenarios under concurrent withdrawals/adjustments.
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
    
    const connection = await connectDb();
    const db = connection.connection.db!;
    const client = connection.connection.getClient();
    const transactionsCollection = db.collection("souq_transactions");
    const balancesCollection = db.collection("souq_seller_balances");

    const sellerFilter = ObjectId.isValid(transaction.sellerId)
      ? new ObjectId(transaction.sellerId)
      : transaction.sellerId;
    const orgFilter = ObjectId.isValid(transaction.orgId)
      ? new ObjectId(transaction.orgId)
      : transaction.orgId;

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // 🔐 ATOMIC OPERATION: Use MongoDB session for transactional consistency
    const session = client.startSession();
    let txn: Transaction;

    try {
      await session.withTransaction(async () => {
        // Step 1: Find or create balance document with atomic upsert
        const balanceDoc = await balancesCollection.findOne(
          { sellerId: sellerFilter, orgId: orgFilter },
          { session }
        );

        let balanceBefore = 0;
        
        if (balanceDoc) {
          balanceBefore = (balanceDoc as { available?: number }).available ?? 0;
        } else {
          // Create new balance document if doesn't exist
          await balancesCollection.insertOne(
            {
              sellerId: sellerFilter,
              orgId: orgFilter,
              available: 0,
              reserved: 0,
              pending: 0,
              totalEarnings: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            { session }
          );
        }

        // Step 2: Calculate new balance and guard against overdraft
        const balanceAfter = balanceBefore + transaction.amount;
        if (balanceAfter < 0) {
          throw new Error(`Insufficient available balance. Current: ${balanceBefore} SAR, Required debit: ${Math.abs(transaction.amount)} SAR`);
        }

        // Step 3: Atomic balance update with version check
        // 🔐 This prevents race conditions: if another transaction modified the balance
        // between our read and write, the update will fail (optimistic locking)
        const updateResult = await balancesCollection.updateOne(
          { 
            sellerId: sellerFilter, 
            orgId: orgFilter,
            available: balanceBefore, // Optimistic lock: only update if balance unchanged
          },
          {
            $set: {
              available: parseFloat(balanceAfter.toFixed(2)),
              updatedAt: new Date(),
            },
            $inc: {
              // Track total earnings for sales
              ...(transaction.type === "sale" ? { totalEarnings: transaction.amount } : {}),
              // Track reserved for holds/releases
              ...(transaction.type === "reserve_hold" ? { reserved: -transaction.amount } : {}),
              ...(transaction.type === "reserve_release" ? { reserved: -Math.abs(transaction.amount) } : {}),
            },
          },
          { session }
        );

        if (updateResult.modifiedCount === 0) {
          // Race condition detected - balance was modified concurrently
          throw new Error("Balance was modified concurrently. Please retry the transaction.");
        }

        // Step 4: Insert transaction record
        txn = {
          ...transaction,
          transactionId,
          balanceBefore: parseFloat(balanceBefore.toFixed(2)),
          balanceAfter: parseFloat(balanceAfter.toFixed(2)),
          createdAt: new Date(),
        };

        await transactionsCollection.insertOne(
          {
            ...txn,
            sellerId: sellerFilter,
            orgId: orgFilter,
          },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    // Invalidate Redis cache after successful transaction
    await this.invalidateBalanceCache(transaction.sellerId, transaction.orgId);

    return txn!;
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
    const orgObjectId = ObjectId.isValid(orgId) ? new ObjectId(orgId) : orgId;
    const sellerObjectId = ObjectId.isValid(sellerId) ? new ObjectId(sellerId) : sellerId;
    const connection = await connectDb();
    const db = connection.connection.db!;
    const withdrawalsCollection = db.collection("souq_withdrawal_requests");
    const settlementsCollection = db.collection("souq_settlements");
    const payoutsCollection = db.collection("souq_payouts");

    // Get current balance (fresh read to avoid stale cached balance for debits)
    const balance = await this.getBalance(sellerId, orgId, { bypassCache: true });
    const requestedAmount = amount;

    // Validate statement and derive authoritative amount to prevent tampering
    const settlementDoc = await settlementsCollection.findOne({
      statementId,
      sellerId: sellerObjectId,
      orgId: orgObjectId,
    });
    if (!settlementDoc) {
      throw new Error("Settlement statement not found for this seller/org");
    }
    if ((settlementDoc as { status?: string }).status !== "approved") {
      throw new Error(
        `Settlement must be approved before withdrawal. Current status: ${(settlementDoc as { status?: string }).status || "unknown"}`,
      );
    }
    const netPayout = (settlementDoc as { summary?: { netPayout?: number } })?.summary
      ?.netPayout;
    if (typeof netPayout !== "number" || netPayout <= 0) {
      throw new Error("Settlement statement has no payable netPayout amount");
    }

    // 🔧 FIX: Use authoritative netPayout as the withdrawal amount BEFORE validation
    // This prevents bypassing balance check when netPayout > user-supplied amount
    const withdrawalAmount = netPayout;
    const minimumWithdrawal = 500; // SAR

    // Validate withdrawal amount against available balance (using authoritative amount)
    if (withdrawalAmount <= 0) {
      throw new Error("Withdrawal amount must be positive");
    }
    
    if (withdrawalAmount > balance.available) {
      throw new Error(
        `Insufficient balance for payout. Available: ${balance.available} SAR, Required: ${withdrawalAmount} SAR`,
      );
    }

    if (withdrawalAmount < minimumWithdrawal) {
      throw new Error(`Minimum withdrawal amount is ${minimumWithdrawal} SAR. Payout amount: ${withdrawalAmount} SAR`);
    }

    // Enforce post-delivery hold period (aligns with settlement-calculator and payout-processor)
    const periodEndRaw = (settlementDoc as { period?: { end?: Date | string } })
      ?.period?.end;
    if (periodEndRaw) {
      const periodEnd = new Date(periodEndRaw);
      const holdUntil = new Date(periodEnd);
      holdUntil.setDate(holdUntil.getDate() + WITHDRAWAL_HOLD_DAYS);
      if (Number.isFinite(holdUntil.getTime()) && Date.now() < holdUntil.getTime()) {
        throw new Error(
          `Settlement still in hold period until ${holdUntil.toISOString()}. Try after the hold window.`,
        );
      }
    }

    // Check for pending withdrawal
    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const pendingWithdrawal = await withdrawalsCollection.findOne({
      sellerId: sellerObjectId,
      orgId: orgObjectId,
      status: "pending",
    });

    if (pendingWithdrawal) {
      throw new Error("You already have a pending withdrawal request");
    }

    if (!statementId) {
      throw new Error("statementId is required to request withdrawal");
    }

    // If a payout is already in-flight for this statement, do not create another withdrawal
    const existingPayout = await payoutsCollection.findOne({
      statementId,
      orgId: orgObjectId,
      status: { $in: ["pending", "processing"] },
    });
    if (existingPayout) {
      throw new Error("Payout already in progress for this statement");
    }

    // Generate request ID
    const requestId = `WDR-${Date.now()}-${sellerId.slice(-6).toUpperCase()}`;

    // Create withdrawal request
    // 🔐 STRICT v4.1: Include orgId for tenant isolation
    const request: WithdrawalRequest = {
      requestId,
      sellerId,
      orgId,
      amount: withdrawalAmount,
      status: "pending",
      requestedAt: new Date(),
      bankAccount,
      statementId,
    };

    // Save to database
    await withdrawalsCollection.insertOne({
      ...request,
      sellerId: sellerObjectId,
      orgId: orgObjectId,
    });

    // Record transaction (hold funds)
    await this.recordTransaction({
      sellerId,
      orgId,
      type: "withdrawal",
      amount: -withdrawalAmount,
      description: `Withdrawal request: ${requestId}`,
      metadata: { requestId, requestedAmount },
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
    const orgObjectId = ObjectId.isValid(orgId) ? new ObjectId(orgId) : orgId;
    const connection = await connectDb();
    const db = connection.connection.db!;
    const withdrawalsCollection = db.collection("souq_withdrawal_requests");

    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const request = (await withdrawalsCollection.findOne({
      requestId,
      orgId: orgObjectId,
    })) as WithdrawalRequest | null;
    if (!request) {
      throw new Error("Withdrawal request not found");
    }

    if (request.status !== "pending") {
      throw new Error(`Withdrawal is already ${request.status}`);
    }

    // Initiate payout (call PayoutProcessorService)
    const bankAccount = this.normalizeBankAccount(request.bankAccount);
    const { PayoutProcessorService } = await import(
      "@/services/souq/settlements/payout-processor"
    );
    const orgIdValue = (request as { orgId?: unknown }).orgId;
    const sellerIdValue = (request as { sellerId?: unknown }).sellerId;
    const payoutOrgId =
      typeof orgIdValue === "string"
        ? orgIdValue
        : orgIdValue
          ? String(orgIdValue)
          : orgId;
    const payoutSellerId =
      typeof sellerIdValue === "string"
        ? sellerIdValue
        : sellerIdValue
          ? String(sellerIdValue)
          : "";
    if (!payoutSellerId) {
      throw new Error("Withdrawal request is missing sellerId");
    }
    const payout = await PayoutProcessorService.requestPayout(
      payoutSellerId,
      request.statementId,
      payoutOrgId,
      bankAccount,
    );

    const payoutStatus =
      payout.status === "pending" ? "processing" : payout.status;

    // Update status with payout reference
    // 🔐 STRICT v4.1: Include orgId in update filter for tenant isolation
    await withdrawalsCollection.updateOne(
      { requestId, orgId: orgObjectId },
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
    const orgObjectId = ObjectId.isValid(orgId) ? new ObjectId(orgId) : orgId;
    const connection = await connectDb();
    const db = connection.connection.db!;
    const withdrawalsCollection = db.collection("souq_withdrawal_requests");

    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const request = (await withdrawalsCollection.findOne({
      requestId,
      orgId: orgObjectId,
    })) as WithdrawalRequest | null;
    if (!request) {
      throw new Error("Withdrawal request not found");
    }

    if (request.status !== "pending") {
      throw new Error(`Withdrawal is already ${request.status}`);
    }

    // Update status
    // 🔐 STRICT v4.1: Include orgId in update filter for tenant isolation
    await withdrawalsCollection.updateOne(
      { requestId, orgId: orgObjectId },
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

    const orgFilter = ObjectId.isValid(orgId) ? new ObjectId(orgId) : orgId;
    const sellerFilter = ObjectId.isValid(sellerId)
      ? new ObjectId(sellerId)
      : sellerId;

    const connection = await connectDb();
    const db = connection.connection.db!;
    const transactionsCollection = db.collection("souq_transactions");

    const query: Record<string, unknown> = { sellerId: sellerFilter, orgId: orgFilter };

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
    const orgFilter = ObjectId.isValid(orgId) ? new ObjectId(orgId) : orgId;
    const sellerFilter = ObjectId.isValid(sellerId)
      ? new ObjectId(sellerId)
      : sellerId;
    const connection = await connectDb();
    const db = connection.connection.db!;
    const withdrawalsCollection = db.collection("souq_withdrawal_requests");

    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const query: Record<string, unknown> = { sellerId: sellerFilter, orgId: orgFilter };
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
