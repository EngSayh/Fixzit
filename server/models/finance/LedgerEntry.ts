/**
 * LedgerEntry Model
 * 
 * Individual ledger postings derived from journal entries.
 * Each journal line creates one ledger entry.
 * Used for account balance calculations and financial reporting.
 * 
 * Features:
 * - Multi-tenant isolation (orgId)
 * - Linked to journal entries (immutable)
 * - Fast balance queries per account
 * - Property/owner/tenant/vendor tracking
 * - Audit trail
 */

import { Schema, model, models, Types, Model } from 'mongoose';
import { tenantIsolationPlugin } from '../../plugins/tenantIsolation';
import { auditPlugin } from '../../plugins/auditPlugin';

export interface ILedgerEntry {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  journalId: Types.ObjectId;
  journalNumber: string;
  journalDate: Date;
  postingDate: Date;
  accountId: Types.ObjectId;
  accountCode: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  description: string;
  debit: number;
  credit: number;
  balance: number; // Running balance for this account
  propertyId?: Types.ObjectId;
  unitId?: Types.ObjectId;
  ownerId?: Types.ObjectId;
  tenantId?: Types.ObjectId;
  vendorId?: Types.ObjectId;
  fiscalYear: number;
  fiscalPeriod: number;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrialBalanceEntry {
  accountId: Types.ObjectId;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface AccountActivityEntry extends Omit<ILedgerEntry, 'journalId' | 'createdAt' | 'updatedAt'> {
  journalId?: {
    journalNumber: string;
    sourceType: string;
    sourceNumber: string;
  } | Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

/* eslint-disable no-unused-vars */
export interface ILedgerEntryModel  {
  getAccountBalance(orgId: Types.ObjectId, accountId: Types.ObjectId, asOfDate?: Date): Promise<number>;
  getTrialBalance(orgId: Types.ObjectId, fiscalYear: number, fiscalPeriod: number): Promise<TrialBalanceEntry[]>;
  getAccountActivity(orgId: Types.ObjectId, accountId: Types.ObjectId, startDate: Date, endDate: Date): Promise<AccountActivityEntry[]>;
}
/* eslint-enable no-unused-vars */

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    // orgId will be added by tenantIsolationPlugin
    journalId: { type: Schema.Types.ObjectId, required: true, ref: 'Journal', index: true },
    journalNumber: { type: String, required: true, trim: true },
    journalDate: { type: Date, required: true, index: true },
    postingDate: { type: Date, required: true, index: true },
    accountId: { type: Schema.Types.ObjectId, required: true, ref: 'ChartAccount', index: true },
    accountCode: { type: String, required: true, trim: true, uppercase: true },
    accountName: { type: String, required: true, trim: true },
    accountType: { 
      type: String, 
      required: true,
      enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'],
      index: true
    },
    description: { type: String, required: true, trim: true },
    debit: { type: Number, required: true, default: 0, min: 0 },
    credit: { type: Number, required: true, default: 0, min: 0 },
    balance: { type: Number, required: true, default: 0 },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', index: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'Owner', index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', index: true },
    fiscalYear: { type: Number, required: true, index: true },
    fiscalPeriod: { type: Number, required: true, min: 1, max: 12, index: true }
  },
  { timestamps: true }
);

// Apply plugins BEFORE indexes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
LedgerEntrySchema.plugin(tenantIsolationPlugin);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
LedgerEntrySchema.plugin(auditPlugin);

// All indexes MUST be tenant-scoped
LedgerEntrySchema.index({ orgId: 1, accountId: 1, postingDate: -1 }); // For account history
LedgerEntrySchema.index({ orgId: 1, accountId: 1, fiscalYear: 1, fiscalPeriod: 1 }); // For period balances
LedgerEntrySchema.index({ orgId: 1, journalId: 1 }); // For journal lookup
LedgerEntrySchema.index({ orgId: 1, propertyId: 1, postingDate: -1 }); // For property reports
LedgerEntrySchema.index({ orgId: 1, ownerId: 1, postingDate: -1 }); // For owner statements
LedgerEntrySchema.index({ orgId: 1, fiscalYear: 1, fiscalPeriod: 1, accountType: 1 }); // For financial statements

// Pre-save: Validate debit/credit exclusivity
LedgerEntrySchema.pre('save', function(next) {
  if ((this.debit > 0 && this.credit > 0) || (this.debit === 0 && this.credit === 0)) {
    return next(new Error('Ledger entry must have either debit OR credit (not both or neither)'));
  }
  next();
});

// Static: Get account balance at date
LedgerEntrySchema.statics.getAccountBalance = async function(
  orgId: Types.ObjectId,
  accountId: Types.ObjectId,
  asOfDate?: Date
): Promise<number> {
  interface FilterQuery {
    orgId: Types.ObjectId;
    accountId: Types.ObjectId;
    postingDate?: { $lte: Date };
  }
  
  const filter: FilterQuery = { orgId, accountId };
  if (asOfDate) {
    filter.postingDate = { $lte: asOfDate };
  }
  
  const result = await this.aggregate([
    { $match: filter },
    { 
      $group: { 
        _id: null, 
        totalDebit: { $sum: '$debit' }, 
        totalCredit: { $sum: '$credit' } 
      } 
    }
  ]);
  
  if (result.length === 0) return 0;
  
  return result[0].totalDebit - result[0].totalCredit;
};

// Static: Get account balances for period (for trial balance)
LedgerEntrySchema.statics.getTrialBalance = async function(
  orgId: Types.ObjectId,
  fiscalYear: number,
  fiscalPeriod: number
) {
  return this.aggregate([
    { 
      $match: { 
        orgId, 
        fiscalYear, 
        fiscalPeriod: { $lte: fiscalPeriod } 
      } 
    },
    { 
      $group: { 
        _id: { 
          accountId: '$accountId', 
          accountCode: '$accountCode', 
          accountName: '$accountName',
          accountType: '$accountType'
        }, 
        totalDebit: { $sum: '$debit' }, 
        totalCredit: { $sum: '$credit' } 
      } 
    },
    { 
      $project: { 
        _id: 0,
        accountId: '$_id.accountId',
        accountCode: '$_id.accountCode',
        accountName: '$_id.accountName',
        accountType: '$_id.accountType',
        debit: '$totalDebit',
        credit: '$totalCredit',
        balance: { $subtract: ['$totalDebit', '$totalCredit'] }
      } 
    },
    { $sort: { accountCode: 1 } }
  ]);
};

// Static: Get account activity for period
LedgerEntrySchema.statics.getAccountActivity = async function(
  orgId: Types.ObjectId,
  accountId: Types.ObjectId,
  startDate: Date,
  endDate: Date
) {
  return this.find({
    orgId,
    accountId,
    postingDate: { $gte: startDate, $lte: endDate }
  })
  .sort({ postingDate: -1, createdAt: -1 })
  .populate('journalId', 'journalNumber sourceType sourceNumber')
  .lean();
};

const LedgerEntryModel = (models.LedgerEntry || model<ILedgerEntry, ILedgerEntryModel>('LedgerEntry', LedgerEntrySchema)) as ILedgerEntryModel;

export default LedgerEntryModel;
