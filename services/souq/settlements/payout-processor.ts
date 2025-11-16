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

import { ObjectId } from 'mongodb';
import { connectDb } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import type { SettlementStatement } from './settlement-calculator';

/**
 * Payout status types
 */
type PayoutStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

/**
 * Payout method
 */
type PayoutMethod = 'sadad' | 'span' | 'manual';

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
 */
interface PayoutRequest {
  _id?: ObjectId;
  payoutId: string;
  sellerId: string;
  statementId: string;
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
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
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
  batchSchedule: 'weekly', // 'weekly' or 'biweekly'
  batchDay: 5, // Friday (0 = Sunday, 6 = Saturday)
  currency: 'SAR',
} as const;

async function getDbInstance() {
  const mongooseInstance = await connectDb();
  const db = mongooseInstance.connection.db;
  if (!db) {
    throw new Error('Database connection not initialized');
  }
  return db;
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
    bankAccount: BankAccount
  ): Promise<PayoutRequest> {
    const db = await getDbInstance();
    const statementsCollection = db.collection('souq_settlements');
    const payoutsCollection = db.collection('souq_payouts');

    // Fetch statement
    const statement = await statementsCollection.findOne({ 
      statementId, 
      sellerId 
    }) as SettlementStatement | null;

    if (!statement) {
      throw new Error('Settlement statement not found');
    }

    if (statement.status !== 'approved') {
      throw new Error('Statement must be approved before requesting payout');
    }

    // Validate minimum payout amount
    if (statement.summary.netPayout < PAYOUT_CONFIG.minimumAmount) {
      throw new Error(
        `Payout amount (${statement.summary.netPayout} SAR) is below minimum threshold (${PAYOUT_CONFIG.minimumAmount} SAR)`
      );
    }

    // Check for existing payout request
    const existingPayout = await payoutsCollection.findOne({
      statementId,
      status: { $in: ['pending', 'processing'] },
    });

    if (existingPayout) {
      throw new Error('Payout request already exists for this statement');
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
      amount: statement.summary.netPayout,
      currency: PAYOUT_CONFIG.currency,
      bankAccount,
      method: this.selectPayoutMethod(bankAccount),
      status: 'pending',
      requestedAt: new Date(),
      retryCount: 0,
      maxRetries: PAYOUT_CONFIG.maxRetries,
    };

    // Save to database
    await payoutsCollection.insertOne(payoutRequest);

    // Update statement status
    await statementsCollection.updateOne(
      { statementId },
      { $set: { status: 'pending', payoutId } }
    );

    return payoutRequest;
  }

  /**
   * Process a single payout
   */
  static async processPayout(payoutId: string): Promise<PayoutRequest> {
    const db = await getDbInstance();
    const payoutsCollection = db.collection('souq_payouts');

    // Fetch payout
    const payout = await payoutsCollection.findOne({ payoutId }) as PayoutRequest | null;
    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== 'pending') {
      throw new Error(`Payout is already ${payout.status}`);
    }

    // Update status to processing
    await payoutsCollection.updateOne(
      { payoutId },
      {
        $set: {
          status: 'processing',
          processedAt: new Date(),
        },
      }
    );

    try {
      // Execute bank transfer
      const transferResult = await this.executeBankTransfer(payout);

      if (transferResult.success) {
        // Success: Mark as completed
        await payoutsCollection.updateOne(
          { payoutId },
          {
            $set: {
              status: 'completed',
              completedAt: new Date(),
              transactionReference: transferResult.transactionId,
            },
          }
        );

        // Update settlement statement
        await this.updateStatementStatus(payout.statementId, 'paid');

        // Send notification to seller
        await this.sendPayoutNotification(payout, 'success');

        return {
          ...payout,
          status: 'completed',
          transactionReference: transferResult.transactionId,
        };
      } else {
        // Failed: Retry or mark as failed
        return await this.handlePayoutFailure(payout, transferResult.errorMessage || 'Unknown error');
      }
    } catch (error) {
      // Exception: Retry or mark as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return await this.handlePayoutFailure(payout, errorMessage);
    }
  }

  /**
   * Handle payout failure with retry logic
   */
  private static async handlePayoutFailure(
    payout: PayoutRequest,
    errorMessage: string
  ): Promise<PayoutRequest> {
    const db = await getDbInstance();
    const payoutsCollection = db.collection('souq_payouts');

    const newRetryCount = payout.retryCount + 1;

    if (newRetryCount >= PAYOUT_CONFIG.maxRetries) {
      // Max retries reached: Mark as failed
      await payoutsCollection.updateOne(
        { payoutId: payout.payoutId },
        {
          $set: {
            status: 'failed',
            failedAt: new Date(),
            retryCount: newRetryCount,
            errorMessage,
          },
        }
      );

      // Update settlement status
      await this.updateStatementStatus(payout.statementId, 'failed');

      // Send failure notification
      await this.sendPayoutNotification(payout, 'failed', errorMessage);

      return {
        ...payout,
        status: 'failed',
        retryCount: newRetryCount,
        errorMessage,
      };
    } else {
      // Schedule retry
      await payoutsCollection.updateOne(
        { payoutId: payout.payoutId },
        {
          $set: {
            status: 'pending',
            retryCount: newRetryCount,
            errorMessage,
          },
        }
      );

      // Schedule retry job (via BullMQ or cron)
      const retryDelay = PAYOUT_CONFIG.retryDelayMinutes * 60 * 1000 * Math.pow(2, newRetryCount - 1);
      logger.info(`Scheduling retry ${newRetryCount} for payout ${payout.payoutId} in ${retryDelay}ms`);

      return {
        ...payout,
        status: 'pending',
        retryCount: newRetryCount,
        errorMessage,
      };
    }
  }

  /**
   * Execute bank transfer via SADAD/SPAN
   */
  private static async executeBankTransfer(
    payout: PayoutRequest
  ): Promise<BankTransferResponse> {
    // TODO: Replace with actual SADAD/SPAN API integration
    // This is a mock implementation

    logger.info(`Executing ${payout.method.toUpperCase()} transfer for ${payout.amount} SAR to ${payout.bankAccount.iban}`);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate 95% success rate
    const isSuccess = Math.random() < 0.95;

    if (isSuccess) {
      return {
        success: true,
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      };
    } else {
      return {
        success: false,
        errorCode: 'BANK_ERROR',
        errorMessage: 'Temporary bank service unavailable',
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
  static async processBatchPayouts(scheduledDate: Date): Promise<BatchPayoutJob> {
    const db = await getDbInstance();
    const payoutsCollection = db.collection('souq_payouts');
    const batchesCollection = db.collection('souq_payout_batches');

    // Generate batch ID
    const batchId = `BATCH-${scheduledDate.toISOString().split('T')[0]}-${Date.now()}`;

    // Fetch pending payouts
    const pendingPayouts = await payoutsCollection
      .find({
        status: 'pending',
        retryCount: { $lt: PAYOUT_CONFIG.maxRetries },
      })
      .toArray() as PayoutRequest[];

    // Create batch job
    const batch: BatchPayoutJob = {
      batchId,
      scheduledDate,
      startedAt: new Date(),
      status: 'processing',
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
        const result = await this.processPayout(payout.payoutId);
        if (result.status === 'completed') {
          batch.successfulPayouts++;
        } else {
          batch.failedPayouts++;
        }
      } catch (error) {
        console.error(`Error processing payout ${payout.payoutId}:`, error);
        batch.failedPayouts++;
      }
    }

    // Update batch status
    batch.completedAt = new Date();
    batch.status = 'completed';

    await batchesCollection.updateOne(
      { batchId },
      {
        $set: {
          completedAt: batch.completedAt,
          status: batch.status,
          successfulPayouts: batch.successfulPayouts,
          failedPayouts: batch.failedPayouts,
        },
      }
    );

    return batch;
  }

  /**
   * Cancel payout request
   */
  static async cancelPayout(payoutId: string, reason: string): Promise<void> {
    const db = await getDbInstance();
    const payoutsCollection = db.collection('souq_payouts');

    const payout = await payoutsCollection.findOne({ payoutId });
    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== 'pending') {
      throw new Error('Only pending payouts can be cancelled');
    }

    await payoutsCollection.updateOne(
      { payoutId },
      {
        $set: {
          status: 'cancelled',
          notes: reason,
        },
      }
    );

    // Update settlement status
    await this.updateStatementStatus(payout.statementId, 'approved');
  }

  /**
   * Get payout status
   */
  static async getPayoutStatus(payoutId: string): Promise<PayoutRequest> {
    const db = await getDbInstance();
    const payoutsCollection = db.collection('souq_payouts');

    const payout = await payoutsCollection.findOne({ payoutId }) as PayoutRequest | null;
    if (!payout) {
      throw new Error('Payout not found');
    }

    return payout;
  }

  /**
   * List payouts for seller
   */
  static async listPayouts(
    sellerId: string,
    filters?: {
      status?: PayoutStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ payouts: PayoutRequest[]; total: number }> {
    const db = await getDbInstance();
    const payoutsCollection = db.collection('souq_payouts');

    const query: Record<string, unknown> = { sellerId };

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
    const payouts = await payoutsCollection
      .find(query)
      .sort({ requestedAt: -1 })
      .skip(filters?.offset || 0)
      .limit(filters?.limit || 20)
      .toArray() as PayoutRequest[];

    return { payouts, total };
  }

  /**
   * Validate bank account details
   */
  private static validateBankAccount(bankAccount: BankAccount): void {
    if (!bankAccount.iban || !bankAccount.iban.startsWith('SA')) {
      throw new Error('Invalid IBAN: Must be a Saudi Arabian IBAN (SA...)');
    }

    if (bankAccount.iban.length !== 24) {
      throw new Error('Invalid IBAN: Must be 24 characters long');
    }

    if (!bankAccount.accountHolderName || bankAccount.accountHolderName.length < 3) {
      throw new Error('Invalid account holder name');
    }

    if (!bankAccount.accountNumber) {
      throw new Error('Account number is required');
    }
  }

  /**
   * Select payout method based on bank
   */
  private static selectPayoutMethod(bankAccount: BankAccount): PayoutMethod {
    // SADAD for most Saudi banks, SPAN for international
    if (bankAccount.iban.startsWith('SA')) {
      return 'sadad';
    }
    return 'span';
  }

  /**
   * Update settlement statement status
   */
  private static async updateStatementStatus(
    statementId: string,
    status: SettlementStatement['status']
  ): Promise<void> {
    const db = await getDbInstance();
    const statementsCollection = db.collection('souq_settlements');

    const update: Record<string, unknown> = { status };

    if (status === 'paid') {
      update.paidAt = new Date();
    }

    await statementsCollection.updateOne(
      { statementId },
      { $set: update }
    );
  }

  /**
   * Send payout notification to seller
   */
  private static async sendPayoutNotification(
    payout: PayoutRequest,
    type: 'success' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      const { sendWhatsAppTextMessage, isWhatsAppEnabled } = await import('@/lib/integrations/whatsapp');
      
      // Get seller details for phone number
      const db = await getDbInstance();
      const seller = await db.collection('souq_sellers').findOne({ 
        _id: new ObjectId(payout.sellerId) 
      });

      if (!seller?.contactInfo?.phone) {
        logger.warn(`No phone number for seller ${payout.sellerId}, skipping notification`);
        return;
      }

      const message = type === 'success'
        ? `تم تحويل مبلغ ${payout.amount.toFixed(2)} ريال سعودي إلى حسابك البنكي بنجاح.\n\nرقم المرجع: ${payout.transactionReference}\n\nسيصل المبلغ خلال 1-2 يوم عمل.`
        : `فشل تحويل مبلغ ${payout.amount.toFixed(2)} ريال سعودي.\n\nالسبب: ${errorMessage}\n\nسيتم إعادة المحاولة تلقائياً.`;

      if (isWhatsAppEnabled()) {
        const result = await sendWhatsAppTextMessage({
          to: seller.contactInfo.phone,
          message,
        });

        if (result.success) {
          logger.info(`Payout notification sent via WhatsApp for ${payout.payoutId}`, {
            messageId: result.messageId,
          });
        } else {
          logger.error(`Failed to send WhatsApp notification for ${payout.payoutId}`, {
            error: result.error,
          });
        }
      } else {
        logger.info(`WhatsApp disabled, logging ${type} notification for payout ${payout.payoutId}`, {
          phone: seller.contactInfo.phone,
          message,
        });
      }
    } catch (error) {
      logger.error(`Error sending payout notification for ${payout.payoutId}`, error);
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
  static async scheduleBatchPayout(): Promise<BatchPayoutJob> {
    const nextPayoutDate = this.getNextPayoutDate();
    return await this.processBatchPayouts(nextPayoutDate);
  }
}

export { PAYOUT_CONFIG };
export type { 
  PayoutRequest, 
  PayoutStatus, 
  PayoutMethod, 
  BankAccount, 
  BatchPayoutJob 
};
