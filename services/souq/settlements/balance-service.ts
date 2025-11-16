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

import { ObjectId } from 'mongodb';
import { connectDb } from '@/lib/mongodb-unified';
import { createClient } from 'redis';

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
    | 'sale' 
    | 'refund' 
    | 'commission' 
    | 'gateway_fee' 
    | 'vat' 
    | 'reserve_hold' 
    | 'reserve_release' 
    | 'withdrawal' 
    | 'adjustment'
    | 'chargeback';
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
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  rejectionReason?: string;
  bankAccount: {
    iban: string;
    accountHolderName: string;
  };
  payoutId?: string; // Reference to payout request
  notes?: string;
}

/**
 * Balance adjustment
 */
interface BalanceAdjustment {
  sellerId: string;
  amount: number; // Positive to add, negative to deduct
  reason: string;
  type: 'manual' | 'system';
  adminId?: string;
  reference?: string; // Order ID or other reference
}

/**
 * Redis client setup
 */
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    await redisClient.connect();
  }
  return redisClient;
}

/**
 * Seller Balance Service
 */
export class SellerBalanceService {
  /**
   * Get seller balance (real-time from Redis)
   */
  static async getBalance(sellerId: string): Promise<SellerBalance> {
    const redis = await getRedisClient();
    const key = `seller:${sellerId}:balance`;

    // Try to get from Redis cache
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as SellerBalance;
    }

    // Calculate from database if not cached
    const balance = await this.calculateBalance(sellerId);

    // Cache for 5 minutes
    await redis.setEx(key, 300, JSON.stringify(balance));

    return balance;
  }

  /**
   * Calculate balance from database
   */
  private static async calculateBalance(sellerId: string): Promise<SellerBalance> {
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const transactionsCollection = db.collection('souq_transactions');

    // Get all transactions
    const transactions = await transactionsCollection
      .find({ sellerId })
      .sort({ createdAt: 1 })
      .toArray() as Transaction[];

    let available = 0;
    let reserved = 0;
    let pending = 0;
    let totalEarnings = 0;

    for (const txn of transactions) {
      switch (txn.type) {
        case 'sale':
          totalEarnings += txn.amount;
          available += txn.amount;
          break;
        case 'refund':
        case 'chargeback':
          available += txn.amount; // Negative amount
          break;
        case 'commission':
        case 'gateway_fee':
        case 'vat':
          available += txn.amount; // Negative amount
          break;
        case 'reserve_hold':
          available += txn.amount; // Negative amount
          reserved -= txn.amount; // Convert to positive
          break;
        case 'reserve_release':
          reserved += txn.amount; // Negative amount
          available -= txn.amount; // Convert to positive
          break;
        case 'withdrawal':
          available += txn.amount; // Negative amount
          break;
        case 'adjustment':
          available += txn.amount;
          break;
      }
    }

    // Get pending balance (orders not yet delivered)
    const ordersCollection = db.collection('souq_orders');
    const pendingOrders = await ordersCollection
      .find({
        sellerId: new ObjectId(sellerId),
        status: { $in: ['pending', 'processing', 'shipped'] },
      })
      .toArray();

    for (const order of pendingOrders) {
      pending += order.totalAmount || 0;
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
   */
  static async recordTransaction(transaction: Omit<Transaction, '_id' | 'transactionId' | 'balanceBefore' | 'balanceAfter' | 'createdAt'>): Promise<Transaction> {
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const transactionsCollection = db.collection('souq_transactions');

    // Get current balance
    const balance = await this.getBalance(transaction.sellerId);

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
    await this.invalidateBalanceCache(transaction.sellerId);

    return txn;
  }

  /**
   * Request withdrawal
   */
  static async requestWithdrawal(
    sellerId: string,
    amount: number,
    bankAccount: WithdrawalRequest['bankAccount']
  ): Promise<WithdrawalRequest> {
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const withdrawalsCollection = db.collection('souq_withdrawal_requests');

    // Get current balance
    const balance = await this.getBalance(sellerId);

    // Validate withdrawal amount
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be positive');
    }

    if (amount > balance.available) {
      throw new Error(`Insufficient balance. Available: ${balance.available} SAR`);
    }

    const minimumWithdrawal = 500; // SAR
    if (amount < minimumWithdrawal) {
      throw new Error(`Minimum withdrawal amount is ${minimumWithdrawal} SAR`);
    }

    // Check for pending withdrawal
    const pendingWithdrawal = await withdrawalsCollection.findOne({
      sellerId,
      status: 'pending',
    });

    if (pendingWithdrawal) {
      throw new Error('You already have a pending withdrawal request');
    }

    // Generate request ID
    const requestId = `WDR-${Date.now()}-${sellerId.slice(-6).toUpperCase()}`;

    // Create withdrawal request
    const request: WithdrawalRequest = {
      requestId,
      sellerId,
      amount,
      status: 'pending',
      requestedAt: new Date(),
      bankAccount,
    };

    // Save to database
    await withdrawalsCollection.insertOne(request);

    // Record transaction (hold funds)
    await this.recordTransaction({
      sellerId,
      type: 'withdrawal',
      amount: -amount,
      description: `Withdrawal request: ${requestId}`,
      metadata: { requestId },
    });

    return request;
  }

  /**
   * Approve withdrawal request (admin)
   */
  static async approveWithdrawal(
    requestId: string,
    adminId: string
  ): Promise<WithdrawalRequest> {
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const withdrawalsCollection = db.collection('souq_withdrawal_requests');

    const request = await withdrawalsCollection.findOne({ requestId }) as WithdrawalRequest | null;
    if (!request) {
      throw new Error('Withdrawal request not found');
    }

    if (request.status !== 'pending') {
      throw new Error(`Withdrawal is already ${request.status}`);
    }

    // Update status
    await withdrawalsCollection.updateOne(
      { requestId },
      {
        $set: {
          status: 'approved',
          processedAt: new Date(),
          notes: `Approved by admin ${adminId}`,
        },
      }
    );

    // Initiate payout (call PayoutProcessorService)
    // TODO: Integrate with PayoutProcessorService.requestPayout()

    return {
      ...request,
      status: 'approved',
      processedAt: new Date(),
    };
  }

  /**
   * Reject withdrawal request (admin)
   */
  static async rejectWithdrawal(
    requestId: string,
    adminId: string,
    reason: string
  ): Promise<WithdrawalRequest> {
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const withdrawalsCollection = db.collection('souq_withdrawal_requests');

    const request = await withdrawalsCollection.findOne({ requestId }) as WithdrawalRequest | null;
    if (!request) {
      throw new Error('Withdrawal request not found');
    }

    if (request.status !== 'pending') {
      throw new Error(`Withdrawal is already ${request.status}`);
    }

    // Update status
    await withdrawalsCollection.updateOne(
      { requestId },
      {
        $set: {
          status: 'rejected',
          processedAt: new Date(),
          rejectionReason: reason,
          notes: `Rejected by admin ${adminId}`,
        },
      }
    );

    // Refund the withdrawal amount (reverse transaction)
    await this.recordTransaction({
      sellerId: request.sellerId,
      type: 'adjustment',
      amount: request.amount, // Positive to add back
      description: `Withdrawal rejected: ${reason}`,
      metadata: { requestId },
      createdBy: adminId,
    });

    return {
      ...request,
      status: 'rejected',
      processedAt: new Date(),
      rejectionReason: reason,
    };
  }

  /**
   * Apply balance adjustment (admin)
   */
  static async applyAdjustment(
    adjustment: BalanceAdjustment
  ): Promise<Transaction> {
    if (!adjustment.adminId && adjustment.type === 'manual') {
      throw new Error('Admin ID required for manual adjustments');
    }

    return await this.recordTransaction({
      sellerId: adjustment.sellerId,
      type: 'adjustment',
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
    filters?: {
      type?: Transaction['type'];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ transactions: Transaction[]; total: number }> {
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const transactionsCollection = db.collection('souq_transactions');

    const query: Record<string, unknown> = { sellerId };

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
    const transactions = await transactionsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(filters?.offset || 0)
      .limit(filters?.limit || 50)
      .toArray() as Transaction[];

    return { transactions, total };
  }

  /**
   * Get withdrawal requests
   */
  static async getWithdrawalRequests(
    sellerId: string,
    status?: WithdrawalRequest['status']
  ): Promise<WithdrawalRequest[]> {
    await connectDb();
    const db = (await connectDb()).connection.db!;
    const withdrawalsCollection = db.collection('souq_withdrawal_requests');

    const query: Record<string, unknown> = { sellerId };
    if (status) {
      query.status = status;
    }

    const requests = await withdrawalsCollection
      .find(query)
      .sort({ requestedAt: -1 })
      .toArray() as WithdrawalRequest[];

    return requests;
  }

  /**
   * Hold funds in reserve
   */
  static async holdReserve(
    sellerId: string,
    orderId: string,
    amount: number
  ): Promise<Transaction> {
    return await this.recordTransaction({
      sellerId,
      orderId,
      type: 'reserve_hold',
      amount: -amount, // Deduct from available
      description: `Reserve held for order ${orderId}`,
      metadata: { orderId },
    });
  }

  /**
   * Release reserve funds
   */
  static async releaseReserve(
    sellerId: string,
    orderId: string,
    amount: number
  ): Promise<Transaction> {
    return await this.recordTransaction({
      sellerId,
      orderId,
      type: 'reserve_release',
      amount: amount, // Add to available
      description: `Reserve released for order ${orderId}`,
      metadata: { orderId },
    });
  }

  /**
   * Invalidate Redis cache for seller balance
   */
  private static async invalidateBalanceCache(sellerId: string): Promise<void> {
    const redis = await getRedisClient();
    const key = `seller:${sellerId}:balance`;
    await redis.del(key);
  }

  /**
   * Get balance summary for multiple sellers (admin)
   */
  static async getBulkBalances(sellerIds: string[]): Promise<Map<string, SellerBalance>> {
    const balances = new Map<string, SellerBalance>();

    await Promise.all(
      sellerIds.map(async (sellerId) => {
        const balance = await this.getBalance(sellerId);
        balances.set(sellerId, balance);
      })
    );

    return balances;
  }
}

export type { 
  SellerBalance, 
  Transaction, 
  WithdrawalRequest, 
  BalanceAdjustment 
};
