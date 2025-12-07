import { ObjectId as MongoObjectId, type Filter, type Document } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { createRequire } from 'module';
import { createRefund, queryRefundStatus } from '@/lib/paytabs';
import { validatePayTabsConfig } from '@/config/paytabs.config';
import { logger } from '@/lib/logger';
import { ClaimService } from './claim-service';
import type { Claim as ClaimModel } from './claim-service';
import { buildSouqOrgFilter } from '@/services/souq/org-scope';

// Vitest globals are available in test runtime; safely access via globalThis to avoid ReferenceError in production
type ViTestGlobal = { importMock?: <T>(path: string) => Promise<T> } | undefined;
const getViGlobal = (): ViTestGlobal => {
  try {
    // Access via globalThis to avoid ReferenceError in non-test environments
    return (globalThis as unknown as Record<string, unknown>).vi as ViTestGlobal;
  } catch {
    return undefined;
  }
};

// 🔐 STRICT v4.1: Use shared org filter helper for consistency
const buildOrgScope = (orgId: string, options?: { allowOrgless?: boolean }): Filter<Document> => {
  return buildSouqOrgFilter(orgId, { allowOrgless: options?.allowOrgless });
};

const toIdString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toString' in value && typeof (value as { toString: () => string }).toString === 'function') {
    return (value as { toString: () => string }).toString();
  }
  return String(value ?? '');
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
  statusCheckCount?: number;
  nextStatusCheckAt?: Date;
  
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
    let resolvedModule = (await import('@/lib/queues/setup')) as QueueModule;
    const viGlobal = getViGlobal();
    if (
      viGlobal?.importMock &&
      (!('addJob' in resolvedModule) ||
        !(resolvedModule as { addJob?: { mock?: unknown } }).addJob?.mock)
    ) {
      try {
        const mockedModule = await viGlobal.importMock<QueueModule>('@/lib/queues/setup');
        if (mockedModule) {
          resolvedModule = mockedModule;
        }
      } catch {
        // ignore and fall back to resolvedModule
      }
    }
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
  private static MAX_STATUS_POLLS = 5;
  // 🔐 Production-appropriate delay: 30 seconds base delay for payment gateway retries
  // PayTabs and similar gateways need time to process and may rate-limit rapid retries
  private static RETRY_DELAY_MS = 30_000;
  private static indexesReady: Promise<void> | null = null;
  private static async collection() {
    const db = await getDatabase();
    const collection = db.collection<Refund>(this.COLLECTION);
    if (!this.indexesReady) {
      this.indexesReady = (async () => {
        if (typeof collection.createIndex !== 'function') return;
        try {
          await Promise.all([
            // Primary indexes for orgId (current standard)
            collection.createIndex({ orgId: 1, claimId: 1 }, { unique: true, name: 'refund_org_claim_unique', background: true }),
            collection.createIndex({ orgId: 1, refundId: 1 }, { name: 'refund_org_refundId', background: true }),
            collection.createIndex({ orgId: 1, status: 1, createdAt: -1 }, { name: 'refund_org_status_createdAt', background: true }),
            collection.createIndex({ orgId: 1, transactionId: 1 }, { name: 'refund_org_txn', background: true }),
            // 🔐 STRICT v4.1: Legacy org_id indexes to support dual-field org scoping
            // These ensure queries using $or: [{ orgId }, { org_id }] remain performant
            collection.createIndex({ org_id: 1, claimId: 1 }, { unique: true, name: 'refund_org_id_claim_unique', sparse: true, background: true }),
            collection.createIndex({ org_id: 1, refundId: 1 }, { name: 'refund_org_id_refundId', sparse: true, background: true }),
            collection.createIndex({ org_id: 1, status: 1, createdAt: -1 }, { name: 'refund_org_id_status_createdAt', sparse: true, background: true }),
            collection.createIndex({ org_id: 1, transactionId: 1 }, { name: 'refund_org_id_txn', sparse: true, background: true }),
          ]);
        } catch (error) {
          logger.error('[Refunds] Failed to ensure refund indexes', { error });
          // Allow retry on next access instead of staying stuck with missing indexes
          this.indexesReady = null;
          throw error;
        }
      })();
    }
    await this.indexesReady;
    return collection;
  }

  /**
   * Process refund for approved claim
   * 🔐 Service-level safeguards:
   *   1. Validates claim exists, is approved, and belongs to orgId
   *   2. Validates refund amount against order total (prevent over-refund)
   *   3. Idempotency guard to prevent duplicate refunds
   */
  static async processRefund(request: RefundRequest): Promise<RefundResult> {
    if (!request.orgId) {
      throw new Error("orgId is required to process claim refund");
    }

    const db = await getDatabase();
    const collection = await this.collection();

    // 🔐 BLOCKER FIX: Validate claim exists, is approved, and belongs to this org
    const claim = await ClaimService.getClaim(request.claimId, request.orgId);
    if (!claim) {
      throw new Error(`Claim not found or does not belong to org: ${request.claimId}`);
    }
    const eligibleStatuses: ClaimModel['status'][] = [
      'approved',
      'resolved_refund_full',
      'resolved_refund_partial',
      'resolved_replacement',
    ];
    if (!eligibleStatuses.includes(claim.status)) {
      throw new Error(`Claim must be approved/resolved for refund. Current status: ${claim.status}`);
    }
    // Validate claim/order/buyer/seller match
    const claimOrderId = toIdString(claim.orderId);
    const requestOrderId = toIdString(request.orderId);
    if (claimOrderId !== requestOrderId) {
      throw new Error('Claim orderId does not match refund request orderId');
    }
    if (toIdString(claim.buyerId) !== toIdString(request.buyerId)) {
      throw new Error('Claim buyer does not match refund request buyer');
    }
    if (toIdString(claim.sellerId) !== toIdString(request.sellerId)) {
      throw new Error('Claim seller does not match refund request seller');
    }

    // 🔐 BLOCKER FIX: Idempotency guard - check for existing active/completed refund
    const existingRefund = await collection.findOne({
      claimId: request.claimId,
      ...buildOrgScope(request.orgId),
      status: { $in: ['initiated', 'processing', 'completed', 'failed'] },
    });
    if (existingRefund) {
      if (existingRefund.amount !== request.amount) {
        throw new Error('Refund already exists for claim with a different amount');
      }
      if (existingRefund.status === 'completed') {
        logger.info('[Refunds] Refund already completed for claim', { claimId: request.claimId, refundId: existingRefund.refundId });
        return {
          refundId: existingRefund.refundId,
          status: 'completed',
          amount: existingRefund.amount,
          transactionId: existingRefund.transactionId,
          completedAt: existingRefund.completedAt,
        };
      }
      if (existingRefund.status === 'failed') {
        if ((existingRefund.retryCount ?? 0) < this.MAX_RETRIES) {
          await this.scheduleRetry(existingRefund);
          return {
            refundId: existingRefund.refundId,
            status: 'processing',
            amount: existingRefund.amount,
            failureReason: existingRefund.failureReason,
          };
        }
        return {
          refundId: existingRefund.refundId,
          status: 'failed',
          amount: existingRefund.amount,
          failureReason: existingRefund.failureReason,
        };
      }
      logger.info('[Refunds] Refund already in progress for claim', { claimId: request.claimId, refundId: existingRefund.refundId });
      return {
        refundId: existingRefund.refundId,
        status: existingRefund.status as 'initiated' | 'processing',
        amount: existingRefund.amount,
      };
    }
    
    // 🔐 SAFETY: Validate refund amount against order total (prevent over-refund)
    const orderIdFilters: Array<Record<string, unknown>> = [{ orderId: request.orderId }];
    if (MongoObjectId.isValid(request.orderId)) {
      orderIdFilters.push({ _id: new MongoObjectId(request.orderId) });
    }
    // 🔐 CRITICAL: Use $and to combine org scope with order filters - prevents $or key collision
    const order = await db.collection('souq_orders').findOne({
      $and: [
        buildOrgScope(request.orgId),
        { $or: orderIdFilters },
      ],
    }) as { pricing?: { total?: number }; payment?: { transactionId?: string; method?: string; amount?: number } } | null;

    if (!order) {
      throw new Error(`Order not found for refund: ${request.orderId}`);
    }

    const orderTotal = order.pricing?.total ?? order.payment?.amount ?? null;
    if (request.amount <= 0) {
      throw new Error("Refund amount must be greater than 0");
    }
    if (orderTotal !== null && request.amount > orderTotal) {
      throw new Error(`Refund amount (${request.amount}) exceeds order total (${orderTotal})`);
    }
    // 🔐 Additional guard: Refund cannot exceed claim's requested amount
    const claimRequestedAmount = claim.requestedAmount ?? claim.orderAmount ?? orderTotal;
    if (claimRequestedAmount !== null && request.amount > claimRequestedAmount) {
      throw new Error(`Refund amount (${request.amount}) exceeds claim requested amount (${claimRequestedAmount})`);
    }

    // 🔐 Validate payment details exist for gateway call
    if (!order.payment?.transactionId) {
      throw new Error("Order payment transactionId missing - cannot process refund");
    }
    if (!order.payment?.method) {
      throw new Error("Order payment method missing - cannot process refund");
    }
    if (request.originalPaymentMethod && request.originalPaymentMethod !== order.payment.method) {
      throw new Error("Payment method mismatch between request and order");
    }
    if (request.originalTransactionId && request.originalTransactionId !== order.payment.transactionId) {
      throw new Error("Payment transactionId mismatch between request and order");
    }

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
      paymentMethod: order.payment.method,
      originalTransactionId: order.payment.transactionId,
      status: 'initiated',
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      statusCheckCount: 0,
    };

    // 🔐 Atomic insert with idempotency key (claimId + orgId unique constraint)
    // Use findOneAndUpdate with upsert to prevent race conditions
    const insertResult = await collection.findOneAndUpdate(
      {
        claimId: request.claimId,
        ...buildOrgScope(request.orgId),
      },
      { $setOnInsert: refund },
      { upsert: true, returnDocument: 'after', includeResultMetadata: true }
    );

    const upsertedRefund = insertResult.value;
    const wasInserted = Boolean(insertResult.lastErrorObject?.upserted);

    // If we matched an existing refund (race condition), return its current state to avoid double-processing
    if (!wasInserted && upsertedRefund) {
      if (upsertedRefund.status === 'completed') {
        return {
          refundId: upsertedRefund.refundId,
          status: 'completed',
          amount: upsertedRefund.amount,
          transactionId: upsertedRefund.transactionId,
          completedAt: upsertedRefund.completedAt,
        };
      }
      if (upsertedRefund.status === 'failed') {
        if ((upsertedRefund.retryCount ?? 0) < this.MAX_RETRIES) {
          await this.scheduleRetry(upsertedRefund);
          return {
            refundId: upsertedRefund.refundId,
            status: 'processing',
            amount: upsertedRefund.amount,
            failureReason: upsertedRefund.failureReason,
          };
        }
        return {
          refundId: upsertedRefund.refundId,
          status: 'failed',
          amount: upsertedRefund.amount,
          failureReason: upsertedRefund.failureReason,
        };
      }
      return {
        refundId: upsertedRefund.refundId,
        status: upsertedRefund.status as 'initiated' | 'processing',
        amount: upsertedRefund.amount,
        transactionId: upsertedRefund.transactionId,
        failureReason: upsertedRefund.failureReason,
      };
    }

    const refundDoc = upsertedRefund ?? refund;

    // Attempt to process refund
    try {
      const result = await this.executeRefund(refundDoc);
      
      // Update refund status
      await this.updateRefundStatus(refundDoc.refundId, request.orgId, result.status, {
        transactionId: result.transactionId,
        completedAt: result.completedAt,
        failureReason: result.failureReason,
      });

      // 🔐 Only update order and notify when truly completed
      if (result.status === 'completed') {
        await this.updateOrderStatus({
          orderId: request.orderId,
          orgId: request.orgId,
          status: 'refunded',
        });
        // Only notify on final completion
        await this.notifyRefundStatus(refundDoc, result);
      } else if (result.status === 'processing') {
        // For pending/processing, send a "processing" notification and schedule a retry to check status
        await this.notifyRefundStatus(refundDoc, { ...result, status: 'processing' });
        // Use scheduleRetry to check status later
        await this.scheduleRetry(refundDoc);
      }

      return result;
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error));
      void error;
      await this.updateRefundStatus(refundDoc.refundId, request.orgId, 'failed', {
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
        ...buildOrgScope(refund.orgId),
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

      // Clear processing lock on success/pending
      await collection.updateOne(
        { refundId: refund.refundId, ...buildOrgScope(refund.orgId) },
        { $unset: { processingLock: '' } }
      );

      // 🔐 MAJOR FIX: Handle PayTabs pending correctly - don't treat as completed
      if (gatewayResult.status === 'PENDING') {
        // Schedule a status check instead of re-calling the refund endpoint
        await this.scheduleStatusCheck({ ...refund, transactionId: gatewayResult.transactionId });
        return {
          refundId: refund.refundId,
          status: 'processing', // Keep as processing, not completed
          amount: refund.amount,
          transactionId: gatewayResult.transactionId,
        };
      }

      // Only return completed when gateway confirms approved
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
          { refundId: refund.refundId, ...buildOrgScope(refund.orgId) },
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
        { refundId: refund.refundId, ...buildOrgScope(refund.orgId) },
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
    status: 'SUCCEEDED' | 'PENDING';
  }> {
    if (!refund.originalTransactionId) {
      throw new Error('Missing original transaction reference for refund');
    }

    // 🔐 Use shared PayTabs config validation (ensures both profileId and serverKey)
    validatePayTabsConfig();

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
      { refundId: refund.refundId, ...buildOrgScope(refund.orgId) },
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
      // Mark refund as failed to avoid silent hang; surface operational signal
      await this.updateRefundStatus(refund.refundId, refund.orgId, 'failed', {
        failureReason: 'Queue unavailable for retry scheduling',
      });
      await this.notifyRefundStatus(refund, {
        refundId: refund.refundId,
        status: 'failed',
        amount: refund.amount,
        failureReason: 'Queue unavailable for retry scheduling',
      });
    }
  }

  /**
   * Schedule a status check for refunds that are pending at the gateway
   */
  private static async scheduleStatusCheck(refund: Refund): Promise<void> {
    const currentCount = refund.statusCheckCount ?? 0;
    if (currentCount >= this.MAX_STATUS_POLLS) {
      const failureReason = 'Refund remained pending after multiple status checks';
      await this.updateRefundStatus(refund.refundId, refund.orgId, 'failed', {
        failureReason,
      });
      // 🔐 MAJOR FIX: Notify parties about the failed refund (no silent failures)
      await this.notifyRefundStatus(refund, {
        refundId: refund.refundId,
        status: 'failed',
        amount: refund.amount,
        failureReason,
      });
      return;
    }

    const nextCount = currentCount + 1;
    const delayMs = this.RETRY_DELAY_MS * nextCount;
    const nextStatusCheckAt = new Date(Date.now() + delayMs);

    const collection = await this.collection();
    await collection.updateOne(
      { refundId: refund.refundId, ...buildOrgScope(refund.orgId) },
      {
        $inc: { statusCheckCount: 1 },
        $set: { status: 'processing', nextStatusCheckAt, updatedAt: new Date() },
      }
    );

    try {
      const queue = await getQueueModule();
      await queue.addJob(
        queue.QUEUE_NAMES.REFUNDS,
        'souq-claim-refund-status-check',
        { refundId: refund.refundId, orgId: refund.orgId },
        {
          delay: delayMs,
          jobId: `refund-status-${refund.refundId}-${nextCount}`,
          priority: 1,
        }
      );
      logger.info('[Refunds] Status check scheduled via queue', {
        refundId: refund.refundId,
        attempt: nextCount,
        delayMs,
      });
      return;
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error));
      logger.warn('[Refunds] Queue unavailable, using in-process status check fallback', {
        refundId: refund.refundId,
        attempt: nextCount,
        delayMs,
        error: error.message,
      });
      await this.updateRefundStatus(refund.refundId, refund.orgId, 'failed', {
        failureReason: 'Queue unavailable for status check scheduling',
      });
      await this.notifyRefundStatus(refund, {
        refundId: refund.refundId,
        status: 'failed',
        amount: refund.amount,
        failureReason: 'Queue unavailable for status check scheduling',
      });
    }
  }

  static async processRetryJob(refundId: string, orgId: string): Promise<void> {
    const latestCollection = await this.collection();
    const updatedRefund = await latestCollection.findOne({ refundId, ...buildOrgScope(orgId) });

    if (updatedRefund && updatedRefund.status === 'processing') {
      // If we already have a transactionId, perform a status check instead of re-calling PayTabs refund API
      if (updatedRefund.transactionId) {
        await this.processStatusCheckJob(refundId, orgId);
        return;
      }

      // Otherwise attempt refund execution (initial call likely failed)
      const result = await this.executeRefund(updatedRefund);

      await this.updateRefundStatus(refundId, orgId, result.status, {
        transactionId: result.transactionId,
        completedAt: result.status === 'completed' ? new Date() : undefined,
        failureReason: result.failureReason,
      });

      if (result.status === 'completed') {
        await this.updateOrderStatus({
          orderId: updatedRefund.orderId,
          orgId,
          status: 'refunded',
        });
      }

      await this.notifyRefundStatus(updatedRefund, result);
      if (result.status === 'processing') {
        await this.scheduleStatusCheck(updatedRefund);
      }

      logger.info('[Refunds] Retry job processed and persisted', {
        refundId,
        status: result.status,
        transactionId: result.transactionId,
      });
    } else {
      logger.info('[Refunds] Skipping retry; refund no longer processing', {
        refundId,
        status: updatedRefund?.status,
      });
    }
  }

  /**
   * Process a status check job for pending refunds
   */
  static async processStatusCheckJob(refundId: string, orgId: string): Promise<void> {
    const collection = await this.collection();
    const refund = await collection.findOne({ refundId, ...buildOrgScope(orgId) });

    if (!refund) {
      logger.warn('[Refunds] Status check skipped - refund not found', { refundId, orgId });
      return;
    }

    if (refund.status !== 'processing') {
      logger.info('[Refunds] Status check skipped - refund not processing', {
        refundId,
        status: refund.status,
      });
      return;
    }

    if (!refund.transactionId) {
      await this.updateRefundStatus(refundId, orgId, 'failed', {
        failureReason: 'Missing transactionId for PayTabs status check',
      });
      return;
    }

    try {
      const statusData = await queryRefundStatus(refund.transactionId);
      const rawStatus =
        (statusData as { payment_result?: { response_status?: string } }).payment_result
          ?.response_status ?? (statusData as { status?: string }).status ?? 'P';
      const normalizedStatus = typeof rawStatus === 'string' ? rawStatus.toUpperCase() : 'P';
      const message =
        (statusData as { payment_result?: { response_message?: string } }).payment_result
          ?.response_message ?? (statusData as { message?: string }).message;

      if (normalizedStatus === 'A') {
        const completedAt = new Date();
        await this.updateRefundStatus(refundId, orgId, 'completed', {
          transactionId: refund.transactionId,
          completedAt,
        });
        await this.updateOrderStatus({
          orderId: refund.orderId,
          orgId: refund.orgId,
          status: 'refunded',
        });
        await this.notifyRefundStatus(refund, {
          refundId,
          status: 'completed',
          amount: refund.amount,
          transactionId: refund.transactionId,
          completedAt,
        });
        return;
      }

      if (normalizedStatus === 'P') {
        await this.scheduleStatusCheck(refund);
        return;
      }

      await this.updateRefundStatus(refundId, orgId, 'failed', {
        transactionId: refund.transactionId,
        failureReason: message || `Refund declined with status ${normalizedStatus}`,
      });
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error));
      logger.error('[Refunds] Status check error', { refundId, error: error.message });
      // Retry status check with backoff
      await this.scheduleStatusCheck(refund);
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
    await collection.updateOne({ refundId, ...buildOrgScope(orgId) }, { $set: update });
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
    // Use $and to combine org filter (which has $or) with orderId filter (which also uses $or).
    // This prevents the second $or from overwriting the first one.
    const orgFilter = buildOrgScope(orgId);
    await db.collection('souq_orders').updateOne(
      { $and: [orgFilter, { $or: orderIdFilters }] },
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
          const viTestGlobal = getViGlobal();
          if (viTestGlobal?.importMock) {
            const viMockedQueue = await viTestGlobal.importMock<QueueModule>('@/lib/queues/setup');
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
      const orgId = orgIdMaybe?.trim?.();
      if (!orgId) {
        throw new Error('orgId is required for refund notifications (legacy signature)');
      }
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
    return collection.findOne({ refundId, ...buildOrgScope(orgId) });
  }

  /**
   * List refunds with filters
   * 🔐 MAJOR FIX: Caps limit to 200 to prevent unbounded queries
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

    const query: Record<string, unknown> = { ...buildOrgScope(filters.orgId) };
    if (filters.buyerId) query.buyerId = filters.buyerId;
    if (filters.sellerId) query.sellerId = filters.sellerId;
    if (filters.claimId) query.claimId = filters.claimId;
    if (filters.status) query.status = filters.status;

    // 🔐 Cap limit to 200 to prevent unbounded queries
    const MAX_LIMIT = 200;
    const limit = Math.min(filters.limit ?? 20, MAX_LIMIT);
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
   * 🔐 MAJOR FIX: Uses bounded cursor to prevent OOM on large datasets
   */
  static async retryFailedRefunds(orgId: string, batchLimit = 100): Promise<number> {
    if (!orgId) {
      throw new Error('orgId is required to retry failed refunds');
    }
    const collection = await this.collection();
    // 🔐 Use cursor with limit to prevent loading all failed refunds into memory
    const cursor = collection
      .find({
        status: 'failed',
        retryCount: { $lt: this.MAX_RETRIES },
        ...buildOrgScope(orgId),
      })
      .sort({ updatedAt: -1 })
      .limit(batchLimit);

    let retriedCount = 0;

    for await (const refund of cursor) {
      try {
        const result = await this.executeRefund(refund);

        await this.updateRefundStatus(refund.refundId, refund.orgId, result.status, {
          transactionId: result.transactionId,
          completedAt: result.completedAt ?? (result.status === 'completed' ? new Date() : undefined),
          failureReason: result.failureReason,
        });

        if (result.status === 'completed') {
          await this.updateOrderStatus({
            orderId: refund.orderId,
            orgId: refund.orgId,
            status: 'refunded',
          });
          await this.notifyRefundStatus(refund, result);
        } else if (result.status === 'processing') {
          await this.notifyRefundStatus(refund, { ...result, status: 'processing' });
        }

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
   * 🔐 MAJOR FIX: Uses MongoDB aggregation pipeline instead of unbounded in-memory scan
   * Recommended index: { orgId: 1, createdAt: -1, sellerId: 1, status: 1 }
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

    // Build match stage with org filter
    const matchStage: Record<string, unknown> = { ...buildOrgScope(filters.orgId) };
    if (filters.sellerId) matchStage.sellerId = filters.sellerId;
    if (filters.startDate || filters.endDate) {
      matchStage.createdAt = {} as { $gte?: Date; $lte?: Date };
      if (filters.startDate) (matchStage.createdAt as { $gte?: Date }).$gte = filters.startDate;
      if (filters.endDate) (matchStage.createdAt as { $lte?: Date }).$lte = filters.endDate;
    }

    // 🔐 Use aggregation pipeline for efficient server-side computation
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          // Calculate processing time only for completed refunds
          processingTimeSum: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'completed'] }, { $ne: ['$completedAt', null] }] },
                { $subtract: ['$completedAt', '$createdAt'] },
                0,
              ],
            },
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          processedCount: {
            $sum: { $cond: [{ $in: ['$status', ['completed', 'failed']] }, 1, 0] },
          },
        },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();

    // Aggregate results from all status groups
    const byStatus: Record<string, number> = {};
    let totalRefunds = 0;
    let totalAmount = 0;
    let totalProcessingTime = 0;
    let processedCount = 0;
    let successCount = 0;

    for (const group of results) {
      const status = group._id as string;
      byStatus[status] = group.count;
      totalRefunds += group.count;
      totalAmount += group.totalAmount;
      totalProcessingTime += group.processingTimeSum;
      processedCount += group.processedCount;
      successCount += group.completedCount;
    }

    return {
      totalRefunds,
      totalAmount,
      byStatus: byStatus as Record<Refund['status'], number>,
      avgProcessingTime: successCount > 0 ? totalProcessingTime / successCount : 0,
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
   * @param amount - Amount to deduct (must be positive)
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
    
    // 🔐 MAJOR FIX: Validate positive amount to prevent balance inflation
    if (amount <= 0) {
      throw new Error("Deduction amount must be positive to prevent balance inflation");
    }
    
    const balances = (await getDatabase()).collection<SellerBalanceDocument>('souq_seller_balances');
    const newTransaction: SellerBalanceDocument['transactions'][number] = {
      transactionId: `TXN-${Date.now()}`,
      type: 'deduction',
      amount: -amount,
      reason,
      createdAt: new Date(),
    };

    // 🔐 RACE-SAFE FIX: Use atomic updateOne with upsert to prevent read-modify-write races.
    // $inc treats missing field as 0, and $push creates the transactions array on insert.
    // $setOnInsert only sets identity fields (sellerId, orgId) which don't conflict with $inc/$push/$set.
    // Note: Concurrent upserts may still trigger duplicate-key errors; caller should retry if needed.
    await balances.updateOne(
      { sellerId, ...buildOrgScope(orgId) },
      {
        $inc: { availableBalance: -amount },
        $push: { transactions: newTransaction },
        $setOnInsert: { sellerId, orgId },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );
  }
}

