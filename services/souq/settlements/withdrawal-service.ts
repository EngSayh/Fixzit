// import * as paytabs from '@/lib/paytabs'; // Reserved for future payout API integration
import { logger } from '@/lib/logger';
import { getDatabase } from '@/lib/mongodb-unified';

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
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionId?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * Withdrawal Service for Seller Payouts
 */
export class WithdrawalService {
  private static COLLECTION = 'souq_withdrawals';

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
        return { success: false, error: 'Invalid IBAN format' };
      }

      // Validate amount
      if (request.amount <= 0) {
        return { success: false, error: 'Invalid withdrawal amount' };
      }

      // Check seller balance
      const hasBalance = await this.checkSellerBalance(request.sellerId, request.amount);
      if (!hasBalance) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Generate withdrawal ID
      const withdrawalId = `WD-${Date.now()}-${request.sellerId.slice(0, 8)}`;

      // Create withdrawal record
      await this.createWithdrawalRecord({
        withdrawalId,
        sellerId: request.sellerId,
        statementId: request.statementId,
        amount: request.amount,
        currency: 'SAR',
        bankAccount: request.bankAccount,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // TODO: Implement PayTabs payout API when available
      // For now, create a refund-like transaction or use bank transfer flow
      // PayTabs may require different API endpoint for payouts vs refunds
      
      logger.info('[Withdrawal] Withdrawal initiated', {
        withdrawalId,
        sellerId: request.sellerId,
        amount: request.amount,
      });

      // Update status to processing
      await this.updateWithdrawalStatus(withdrawalId, 'processing');

      // In production, this would call PayTabs payout API
      // For now, mark as completed (manual processing required)
      await this.updateWithdrawalStatus(withdrawalId, 'completed', {
        completedAt: new Date(),
        transactionId: `PT-${withdrawalId}`,
      });

      return {
        success: true,
        withdrawalId,
      };
    } catch (error) {
      logger.error('[Withdrawal] Error processing withdrawal', { error, request });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate Saudi IBAN format
   */
  private static isValidIBAN(iban: string): boolean {
    // Remove spaces and convert to uppercase
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
    
    // Saudi IBAN format: SA + 22 digits (24 characters total)
    if (!cleanIBAN.startsWith('SA') || cleanIBAN.length !== 24) {
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
        (char.charCodeAt(0) - 55).toString()
      );
      
      // Calculate MOD-97
      let remainder = '';
      for (let i = 0; i < numeric.length; i++) {
        remainder += numeric[i];
        if (remainder.length >= 9) {
          remainder = (parseInt(remainder, 10) % 97).toString();
        }
      }
      
      // Valid IBAN has remainder of 1
      return parseInt(remainder, 10) === 1;
    } catch (error) {
      logger.error('[Withdrawal] IBAN checksum validation error', { error, iban });
      return false;
    }
  }

  /**
   * Check if seller has sufficient balance
   */
  private static async checkSellerBalance(sellerId: string, amount: number): Promise<boolean> {
    try {
      const db = await getDatabase();
      
      // Get latest settlement statement
      const statement = await db.collection('souq_settlement_statements').findOne(
        { sellerId, status: 'approved' },
        { sort: { statementDate: -1 } }
      );

      if (!statement) {
        return false;
      }

      // Check available balance
      const availableBalance = statement.netAmount - (statement.withdrawnAmount || 0);
      return availableBalance >= amount;
    } catch (error) {
      logger.error('[Withdrawal] Balance check error', { error, sellerId, amount });
      return false;
    }
  }

  /**
   * Create withdrawal record in database
   */
  private static async createWithdrawalRecord(withdrawal: Withdrawal): Promise<void> {
    const db = await getDatabase();
    await db.collection(this.COLLECTION).insertOne(withdrawal);
  }

  /**
   * Update withdrawal status
   */
  private static async updateWithdrawalStatus(
    withdrawalId: string,
    status: Withdrawal['status'],
    updates: Partial<Withdrawal> = {}
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
      }
    );
  }

  /**
   * Get withdrawal by ID
   */
  static async getWithdrawal(withdrawalId: string): Promise<Withdrawal | null> {
    const db = await getDatabase();
    return await db.collection(this.COLLECTION).findOne({ withdrawalId }) as Withdrawal | null;
  }

  /**
   * Get withdrawals for seller
   */
  static async getSellerWithdrawals(
    sellerId: string,
    limit: number = 20
  ): Promise<Withdrawal[]> {
    const db = await getDatabase();
    const withdrawals = await db
      .collection(this.COLLECTION)
      .find({ sellerId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return withdrawals as unknown as Withdrawal[];
  }
}
