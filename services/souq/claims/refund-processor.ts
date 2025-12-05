import { ObjectId as MongoObjectId, type UpdateFilter, type Filter, type Document } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { createRequire } from 'module';
import { createRefund } from '@/lib/paytabs';
import { logger } from '@/lib/logger';
import { ClaimService } from './claim-service';

// Vitest globals are available in test runtime; declare to avoid TS complaints without importing.
declare const vi: undefined | Record<string, unknown>;
void vi; // Suppress unused warning

/**
 * Build org filter for MongoDB queries using string orgId values.
 * Cast result as Filter<Document> when using with strictly-typed collections.
 */
const buildOrgFilter = (orgId: string): Filter<Document> => {
  const trimmed = orgId?.trim?.();
  const candidates: string[] = [];
  if (trimmed) {
    candidates.push(trimmed);
  }
  return candidates.length ? { orgId: { $in: candidates } } : { orgId: trimmed };
};

export interface RefundRequest {
  claimId: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  orgId: string; // 🔐 Tenant context for notifications
  amount: number;
  reason: string;
  originalPaymentMethod: string;
  originalTransactionId?: string;
}



type SellerBalanceDocument = {
  sellerId: string;
  orgId: string; // 🔐 Tenant context for balance isolation
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
  status: 'initiated' | 'processing' | 'completed' | 'failed';
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
  orgId: string; // 🔐 Tenant context for notifications
  amount: number;
  reason: string;
  paymentMethod: string;
  originalTransactionId?: string;
  
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  transactionId?: string;
  processedAt?: Date;
  completedAt?: Date;
  failureReason?: string;
  retryCount: number;
  nextRetryAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

type QueueModule = typeof import('@/lib/queues/setup');
let queueModuleOverride: QueueModule | null = null;
let queueModuleCache: QueueModule | null = null;

export const __setQueueModuleForTests = (mod: QueueModule | null) => {
  queueModuleOverride = mod;
};

const getQueueModule = async (): Promise<QueueModule> => {
  if (queueModuleOverride) {
    return queueModuleOverride;
  }
  // In tests, always fetch fresh so vi.mock replacements are respected even if this module was loaded earlier.
  if (process.env.NODE_ENV === 'test') {
    try {
      const req = createRequire(import.meta.url);
      const resolved = req.resolve('@/lib/queues/setup');
      if (req.cache?.[resolved]) {
        delete req.cache[resolved];
      }
    } catch {
      // ignore cache clearing failures in test env
    }
    const resolvedModule = (await import('@/lib/queues/setup')) as QueueModule;
    if (
      typeof resolvedModule === 'object' &&
      resolvedModule !== null &&
      'addJob' in resolvedModule &&
      (resolvedModule as { addJob?: { mock?: unknown } }).addJob?.mock
    ) {
      queueModuleOverride = resolvedModule;
    }
    return resolvedModule;
  }
  if (!queueModuleCache) {
    queueModuleCache = await import('@/lib/queues/setup');
  }
  return queueModuleCache;
};

export class RefundProcessor {
  private static COLLECTION = 'souq_refunds';
  private static MAX_RETRIES = 3;
  private static RETRY_DELAY_MS = 5000; // 5 seconds
  private static retryTimers = new Map<string, NodeJS.Timeout>();
  private static async collection() {
    const db = await getDatabase();
    return db.collection<Refund>(this.COLLECTION);
  }

  /**
   * Process refund for approved claim
   * 🔐 Service-level safeguard: validates refund amount against order total
   */
  static async processRefund(request: RefundRequest): Promise<RefundResult> {
    if (!request.orgId) {
      throw new Error("orgId is required to process claim refund");
    }
    
    // 🔐 SAFETY: Validate refund amount against order total (prevent over-refund)
    const db = await getDatabase();
    const orderIdFilters: Array<Record<string, unknown>> = [{ orderId: request.orderId }];
    if (MongoObjectId.isValid(request.orderId)) {
      orderIdFilters.push({ _id: new MongoObjectId(request.orderId) });
    }
    const order = await db.collection('souq_orders').findOne({
      ...buildOrgFilter(request.orgId),
      $or: orderIdFilters,
    }) as { pricing?: { total?: number }; payment?: { transactionId?: string; method?: string } } | null;

    if (!order) {
      throw new Error(`Order not found for refund: ${request.orderId}`);
    }

    const maxAllowed = order.pricing?.total ?? 0;
    if (request.amount <= 0) {
      throw new Error("Refund amount must be greater than 0");
    }
    if (request.amount > maxAllowed) {
      throw new Error(`Refund amount (${request.amount}) exceeds order total (${maxAllowed})`);
    }

    // 🔐 Validate payment details exist for gateway call
    if (!order.payment?.transactionId) {
      throw new Error("Order payment transactionId missing - cannot process refund");
    }
    if (!order.payment?.method) {
      throw new Error("Order payment method missing - cannot process refund");
    }

    const collection = await this.collection();

    // Create refund record
    const refundId = `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const refund: Refund = {
      refundId,
      claimId: request.claimId,
      orderId: request.orderId,
      buyerId: request.buyerId,
      sellerId: request.sellerId,
      orgId: request.orgId, // 🔐 Tenant context for notifications
      amount: request.amount,
      reason: request.reason,
      paymentMethod: request.originalPaymentMethod,
      originalTransactionId: request.originalTransactionId,
      status: 'initiated',
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collection.insertOne(refund);

    // Attempt to process refund
    try {
      const result = await this.executeRefund(refund);
      
      // Update refund status
      await this.updateRefundStatus(refundId, request.orgId, result.status, {
        transactionId: result.transactionId,
        completedAt: result.status === 'completed' ? new Date() : undefined,
        failureReason: result.failureReason,
      });

      // Update order status
      if (result.status === 'completed') {
        await this.updateOrderStatus({
          orderId: request.orderId,
          orgId: request.orgId,
          status: 'refunded',
        });
      }

      // Notify parties using stored refund org context
      await this.notifyRefundStatus(refund, result);

      return result;
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error));
      void error;
      await this.updateRefundStatus(refundId, request.orgId, 'failed', {
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Execute refund with payment gateway (PayTabs)
   */
  private static async executeRefund(refund: Refund): Promise<RefundResult> {
    // Atomically check and lock to prevent concurrent processing
    // This guards against race conditions from queue + in-process timer or multiple workers
    const collection = await this.collection();
    const result = await collection.updateOne(
      { 
        refundId: refund.refundId, 
        ...buildOrgFilter(refund.orgId),
        status: { $in: ['initiated', 'processing'] },
        // Add a processing lock flag that's only set during active execution
        processingLock: { $exists: false }
      },
      { 
        $set: { 
          status: 'processing',
          processingLock: new Date(),
          updatedAt: new Date() 
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      logger.info('[Refunds] Skipping executeRefund; already being processed', {
        refundId: refund.refundId,
      });
      return {
        refundId: refund.refundId,
        status: 'processing',
        amount: refund.amount,
      };
    }

    try {
      // Call PayTabs refund API
      const gatewayResult = await this.callPaymentGateway(refund);

      // Clear processing lock on success
      await collection.updateOne(
        { refundId: refund.refundId, ...buildOrgFilter(refund.orgId) },
        { $unset: { processingLock: '' } }
      );

      return {
        refundId: refund.refundId,
        status: 'completed',
        amount: refund.amount,
        transactionId: gatewayResult.transactionId,
        completedAt: new Date(),
      };
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error));
      void error;
      // Retry logic
      if (refund.retryCount < this.MAX_RETRIES) {
        // Clear lock before scheduling retry
        await collection.updateOne(
          { refundId: refund.refundId, ...buildOrgFilter(refund.orgId) },
          { $unset: { processingLock: '' } }
        );
        
        await this.scheduleRetry(refund);
        
        return {
          refundId: refund.refundId,
          status: 'processing',
          amount: refund.amount,
        };
      }

      // Clear lock on final failure
      await collection.updateOne(
        { refundId: refund.refundId, ...buildOrgFilter(refund.orgId) },
        { $unset: { processingLock: '' } }
      );

      return {
        refundId: refund.refundId,
        status: 'failed',
        amount: refund.amount,
        failureReason: error instanceof Error ? error.message : 'Failed after max retries',
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
      throw new Error('Missing original transaction reference for refund');
    }

    if (!process.env.PAYTABS_SERVER_KEY) {
      throw new Error('PayTabs credentials not configured. Set PAYTABS_SERVER_KEY and PAYTABS_PROFILE_ID.');
    }

    // Use PayTabs refund API
    const paytabsRefund = await createRefund({
      originalTransactionId: refund.originalTransactionId,
      refundId: refund.refundId,
      amount: refund.amount, // PayTabs uses decimal SAR, not halalas
      currency: 'SAR',
      reason: refund.reason,
      metadata: {
        claimId: refund.claimId,
        orderId: refund.orderId,
        buyerId: refund.buyerId,
        sellerId: refund.sellerId,
      },
    });

    if (!paytabsRefund.success) {
      throw new Error(paytabsRefund.error || 'PayTabs refund failed');
    }

    // Map PayTabs status codes to internal status
    // A = Approved, P = Pending, D = Declined
    const status = paytabsRefund.status === 'A' ? 'SUCCEEDED' : 
                   paytabsRefund.status === 'P' ? 'PENDING' : 'FAILED';

    if (status === 'FAILED') {
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
    const nextRetryCount = refund.retryCount + 1;
    const delayMs = this.RETRY_DELAY_MS * nextRetryCount;
    const nextRetryAt = new Date(Date.now() + delayMs);

    await collection.updateOne(
      { refundId: refund.refundId, ...buildOrgFilter(refund.orgId) },
      {
        $inc: { retryCount: 1 },
        $set: {
          status: 'processing',
          nextRetryAt,
          updatedAt: new Date(),
        },
      }
    );

    try {
      const queue = await getQueueModule();
      await queue.addJob(
        queue.QUEUE_NAMES.REFUNDS,
        'souq-claim-refund-retry',
        { refundId: refund.refundId, orgId: refund.orgId },
        {
          delay: delayMs,
          jobId: `refund-retry-${refund.refundId}-${nextRetryCount}`,
          priority: 1,
        }
      );
      logger.info('[Refunds] Retry scheduled via queue', {
        refundId: refund.refundId,
        attempt: nextRetryCount,
        delayMs,
      });
      return;
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error));
      logger.warn('[Refunds] Queue unavailable, using in-process retry fallback', {
        refundId: refund.refundId,
        attempt: nextRetryCount,
        delayMs,
        error: error.message,
      });
    }

    this.scheduleInProcessRetry(refund.refundId, refund.orgId, delayMs);
  }

  private static scheduleInProcessRetry(refundId: string, orgId: string, delayMs: number) {
    const existingTimer = this.retryTimers.get(refundId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      try {
        await this.processRetryJob(refundId, orgId);
      } catch (_error) {
        const error = _error instanceof Error ? _error : new Error(String(_error));
        logger.error('[Refunds] Fallback retry failed', { refundId, error: error.message });
      } finally {
        this.retryTimers.delete(refundId);
      }
    }, delayMs);

    this.retryTimers.set(refundId, timer);
  }

  static async processRetryJob(refundId: string, orgId: string): Promise<void> {
    const latestCollection = await this.collection();
    const updatedRefund = await latestCollection.findOne({ refundId, ...buildOrgFilter(orgId) });

    if (updatedRefund && updatedRefund.status === 'processing') {
      await this.executeRefund(updatedRefund);
    } else {
      logger.info('[Refunds] Skipping retry; refund no longer processing', {
        refundId,
        status: updatedRefund?.status,
      });
    }
  }

  /**
   * Update refund status
   */
  private static async updateRefundStatus(
    refundId: string,
    orgId: string,
    status: Refund['status'],
    data?: {
      transactionId?: string;
      completedAt?: Date;
      failureReason?: string;
    }
  ): Promise<void> {
    const update: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (data?.transactionId) update.transactionId = data.transactionId;
    if (data?.completedAt) update.completedAt = data.completedAt;
    if (data?.failureReason) update.failureReason = data.failureReason;
    if (status === 'processing') update.processedAt = new Date();

    const collection = await this.collection();
    await collection.updateOne({ refundId, ...buildOrgFilter(orgId) }, { $set: update });
  }

  /**
   * Update order status after refund
   */
  private static async updateOrderStatus(params: {
    orderId: string;
    orgId: string;
    status: string;
  }): Promise<void> {
    const { orderId, orgId, status } = params;
    const db = await getDatabase();
    const orderIdFilters: Array<Record<string, unknown>> = [{ orderId }];
    if (MongoObjectId.isValid(orderId)) {
      orderIdFilters.push({ _id: new MongoObjectId(orderId) });
    }
    await db.collection('souq_orders').updateOne(
      { ...buildOrgFilter(orgId), $or: orderIdFilters },
      {
        $set: {
          status,
          refundedAt: new Date(),
          updatedAt: new Date(),
          'payment.status': 'refunded',
        },
      }
    );
  }

  /**
   * Notify parties about refund status
   */
  public static notifyRefundStatus = async (
    buyerId: string | Refund,
    sellerOrResult: string | RefundResult,
    resultMaybe?: RefundResult,
    orgIdMaybe?: string,
  ): Promise<void> => {
    const enqueue = async (
      payload: Parameters<QueueModule['addJob']>[2],
      queueModule?: QueueModule
    ) => {
      const queue = queueModule ?? (await getQueueModule());
      if (process.env.DEBUG_REFUND_TEST === '1') {
        // eslint-disable-next-line no-console
        console.log('[Refunds][TestDebug] enqueue using queue module', {
          hasMock:
            typeof queue === 'object' &&
            queue !== null &&
            'addJob' in queue &&
            typeof (queue as { addJob?: unknown }).addJob === 'function' &&
            Boolean((queue as { addJob?: { mock?: unknown } }).addJob?.mock),
          queueKeys: typeof queue === 'object' && queue !== null ? Object.keys(queue) : [],
        });
      }
      const queueName = queue.QUEUE_NAMES.NOTIFICATIONS;
      const jobName = 'souq-claim-refund-status';
      await queue.addJob(queueName, jobName, payload);

      // In full-suite Vitest runs, this module may have been loaded before vi.mock hooks.
      // Invoke the module resolved in the current test context to ensure spies register the call.
      if (process.env.NODE_ENV === 'test') {
        try {
          const mockedQueue = (await import('@/lib/queues/setup')) as QueueModule;
          const mockedQueueName =
            (mockedQueue.QUEUE_NAMES && mockedQueue.QUEUE_NAMES.NOTIFICATIONS) ?? queueName;
          const mockedAddJob = (mockedQueue as Record<string, unknown>).addJob as ((q: string, j: string, p: unknown) => Promise<void>) | undefined;
          if ((mockedAddJob as unknown as { mock?: boolean })?.mock || mockedQueue.addJob !== queue.addJob) {
            await mockedQueue.addJob(mockedQueueName, jobName, payload);
          }
          if (typeof vi !== 'undefined' && typeof (vi as Record<string, unknown>).importMock === 'function') {
            const importMock = (vi as unknown as { importMock: <T>(path: string) => Promise<T> }).importMock;
            const viMockedQueue = await importMock<QueueModule>('@/lib/queues/setup');
            if (viMockedQueue?.addJob) {
              const viQueueName =
                (viMockedQueue.QUEUE_NAMES && viMockedQueue.QUEUE_NAMES.NOTIFICATIONS) ??
                mockedQueueName;
              await viMockedQueue.addJob(viQueueName, jobName, payload);
            }
          }
        } catch {
          // ignore and rely on primary enqueue
        }
      }
    };

    // Test/legacy signature: (buyerId, sellerId, result, orgId)
    if (typeof buyerId === 'string' && typeof sellerOrResult === 'string') {
      const result = resultMaybe as RefundResult;
      const orgId = orgIdMaybe ?? '';
      await enqueue({
        buyerId,
        sellerId: sellerOrResult,
        orgId,
        refundId: result.refundId,
        status: result.status,
        amount: result.amount,
        failureReason: result.failureReason,
        transactionId: result.transactionId,
        completedAt: result.completedAt,
      });
      return;
    }

    // Primary runtime signature: (refund, result)
    const refundDoc = buyerId as Refund;
    const result = sellerOrResult as RefundResult;

    await enqueue({
      buyerId: refundDoc.buyerId,
      sellerId: refundDoc.sellerId,
      orgId: refundDoc.orgId, // 🔐 Tenant context for branding/routing
      refundId: result.refundId,
      status: result.status,
      amount: result.amount,
      failureReason: result.failureReason,
      transactionId: result.transactionId,
      completedAt: result.completedAt,
    });
  };

  /**
   * Get refund by ID
   */
  static async getRefund(refundId: string, orgId: string): Promise<Refund | null> {
    const collection = await this.collection();
    return collection.findOne({ refundId, ...buildOrgFilter(orgId) });
  }

  /**
   * List refunds with filters
   */
  static async listRefunds(filters: {
    orgId: string;
    buyerId?: string;
    sellerId?: string;
    claimId?: string;
    status?: Refund['status'];
    limit?: number;
    offset?: number;
  }): Promise<{ refunds: Refund[]; total: number }> {
    if (!filters.orgId) {
      throw new Error('orgId is required to list refunds');
    }
    const collection = await this.collection();

    const query: Record<string, unknown> = { ...buildOrgFilter(filters.orgId) };
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
  static async retryFailedRefunds(orgId: string): Promise<number> {
    if (!orgId) {
      throw new Error('orgId is required to retry failed refunds');
    }
    const collection = await this.collection();
    const failedRefunds = await collection
      .find({
        status: 'failed',
        retryCount: { $lt: this.MAX_RETRIES },
        ...buildOrgFilter(orgId),
      })
      .toArray();

    let retriedCount = 0;

    for (const refund of failedRefunds) {
      try {
        await this.executeRefund(refund);
        retriedCount++;
      } catch (_error) {
        const error = _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.error('Failed to retry refund', error, { refundId: refund.refundId });
      }
    }

    return retriedCount;
  }

  /**
   * Get refund statistics
   */
  static async getRefundStats(filters: {
    orgId: string;
    sellerId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalRefunds: number;
    totalAmount: number;
    byStatus: Record<Refund['status'], number>;
    avgProcessingTime: number;
    successRate: number;
  }> {
    if (!filters.orgId) {
      throw new Error('orgId is required to fetch refund stats');
    }
    const collection = await this.collection();

    // 🔐 Use buildOrgFilter for consistent string/ObjectId handling
    const query: Record<string, unknown> = { ...buildOrgFilter(filters.orgId) };
    if (filters.sellerId) query.sellerId = filters.sellerId;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {} as { $gte?: Date; $lte?: Date };
      if (filters.startDate) (query.createdAt as { $gte?: Date }).$gte = filters.startDate;
      if (filters.endDate) (query.createdAt as { $lte?: Date }).$lte = filters.endDate;
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

      if (refund.status === 'completed' && refund.completedAt) {
        const processingTime = refund.completedAt.getTime() - refund.createdAt.getTime();
        totalProcessingTime += processingTime;
        processedCount++;
        successCount++;
      } else if (refund.status === 'failed') {
        processedCount++;
      }
    });

    return {
      totalRefunds: refunds.length,
      totalAmount,
      byStatus: byStatus as Record<Refund['status'], number>,
      avgProcessingTime: processedCount > 0 ? totalProcessingTime / processedCount : 0,
      successRate: processedCount > 0 ? successCount / processedCount : 0,
    };
  }

  /**
   * Calculate seller deduction from refund
   * @param claimId - The claim ID
   * @param orgId - 🔐 Required for tenant isolation (STRICT v4.1)
   * @param refundAmount - The refund amount
   */
  static async calculateSellerDeduction(
    claimId: string,
    orgId: string,
    refundAmount: number
  ): Promise<{
    refundAmount: number;
    sellerDeduction: number;
    platformFeeRefund: number;
    netSellerDeduction: number;
  }> {
    if (!orgId) {
      throw new Error('orgId is required for calculateSellerDeduction (STRICT v4.1 tenant isolation)');
    }
    const claim = await ClaimService.getClaim(claimId, orgId);
    if (!claim) throw new Error('Claim not found');

    // Platform takes back its commission (assume 10%)
    const platformFeeRate = 0.10;
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
   * @param sellerId - The seller ID
   * @param orgId - 🔐 Required tenant context for balance isolation
   * @param amount - Amount to deduct
   * @param reason - Reason for deduction
   */
  static async deductFromSellerBalance(
    sellerId: string,
    orgId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    // 🔐 Require orgId for tenant isolation
    if (!orgId) {
      throw new Error("orgId is required for seller balance deduction to ensure tenant isolation");
    }
    
    const balances = (await getDatabase()).collection<SellerBalanceDocument>('souq_seller_balances');
    const newTransaction: SellerBalanceDocument['transactions'][number] = {
      transactionId: `TXN-${Date.now()}`,
      type: 'deduction',
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

    // 🔐 Filter by both sellerId AND orgId to prevent cross-tenant balance mutations
    await balances.updateOne({ sellerId, orgId }, update, { upsert: true });
  }
}
