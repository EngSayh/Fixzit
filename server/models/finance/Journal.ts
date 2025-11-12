/**
 * Journal Model
 * 
 * Records all financial journal entries in the general ledger.
 * Each journal entry represents a financial transaction with balanced debits and credits.
 * 
 * Journal Entry Structure:
 * - Header: journalNumber, date, description, source
 * - Lines: Multiple debit/credit entries that must balance
 * - Status: DRAFT, POSTED, VOID
 * 
 * Features:
 * - Multi-tenant isolation (orgId)
 * - Immutable once posted (can only void)
 * - Automatic balance validation (debits = credits)
 * - Source tracking (WO, Invoice, Payment, Manual)
 * - Audit trail
 */

import { Schema, model, models, Types } from 'mongoose';
import Decimal from 'decimal.js';
import { tenantIsolationPlugin } from '../../plugins/tenantIsolation';
import { auditPlugin } from '../../plugins/auditPlugin';

export interface IJournalLine {
  lineNumber: number;
  accountId: Types.ObjectId;
  accountCode?: string; // Denormalized for reporting
  accountName?: string; // Denormalized for reporting
  description?: string;
  debit: number;
  credit: number;
  propertyId?: Types.ObjectId;
  unitId?: Types.ObjectId;
  ownerId?: Types.ObjectId;
  tenantId?: Types.ObjectId;
  vendorId?: Types.ObjectId;
}

export interface IJournal {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  journalNumber: string; // e.g., "JE-2025-001"
  journalDate: Date;
  postingDate?: Date;
  description: string;
  sourceType: 'WORK_ORDER' | 'INVOICE' | 'PAYMENT' | 'RENT' | 'EXPENSE' | 'ADJUSTMENT' | 'MANUAL';
  sourceId?: Types.ObjectId; // Reference to source document
  sourceNumber?: string; // Denormalized for reporting
  status: 'DRAFT' | 'POSTED' | 'VOID';
  lines: IJournalLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  voidedAt?: Date;
  voidedBy?: Types.ObjectId;
  voidReason?: string;
  fiscalYear: number;
  fiscalPeriod: number; // 1-12 for months
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JournalLineSchema = new Schema<IJournalLine>(
  {
    lineNumber: { type: Number, required: true },
    accountId: { type: Schema.Types.ObjectId, required: true, ref: 'ChartAccount', index: true },
    accountCode: { type: String },
    accountName: { type: String },
    description: { type: String, trim: true },
    debit: { type: Number, required: true, default: 0, min: 0 },
    credit: { type: Number, required: true, default: 0, min: 0 },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'Owner' },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant' },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' }
  },
  { _id: false }
);

const JournalSchema = new Schema<IJournal>(
  {
    // orgId will be added by tenantIsolationPlugin
    journalNumber: { 
      type: String, 
      required: true,
      trim: true,
      uppercase: true
      // Unique per org - see compound index below
    },
    journalDate: { type: Date, required: true, index: true },
    postingDate: { type: Date },
    description: { type: String, required: true, trim: true },
    sourceType: { 
      type: String, 
      required: true,
      enum: ['WORK_ORDER', 'INVOICE', 'PAYMENT', 'RENT', 'EXPENSE', 'ADJUSTMENT', 'MANUAL'],
      index: true
    },
    sourceId: { type: Schema.Types.ObjectId, index: true },
    sourceNumber: { type: String, trim: true },
    status: { 
      type: String, 
      required: true,
      enum: ['DRAFT', 'POSTED', 'VOID'],
      default: 'DRAFT',
      index: true
    },
    lines: { 
      type: [JournalLineSchema], 
      required: true,
      validate: {
        validator: function(lines: IJournalLine[]) {
          return lines.length >= 2; // Minimum 2 lines (debit + credit)
        },
        message: 'Journal entry must have at least 2 lines'
      }
    },
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
    isBalanced: { type: Boolean, default: false, index: true },
    voidedAt: { type: Date },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidReason: { type: String, trim: true },
    fiscalYear: { type: Number, required: true, index: true },
    fiscalPeriod: { type: Number, required: true, min: 1, max: 12, index: true }
  },
  { timestamps: true }
);

// Apply plugins BEFORE indexes
JournalSchema.plugin(tenantIsolationPlugin);
JournalSchema.plugin(auditPlugin);

// All indexes MUST be tenant-scoped
JournalSchema.index({ orgId: 1, journalNumber: 1 }, { unique: true });
JournalSchema.index({ orgId: 1, journalDate: -1, status: 1 });
JournalSchema.index({ orgId: 1, sourceType: 1, sourceId: 1 });
JournalSchema.index({ orgId: 1, fiscalYear: 1, fiscalPeriod: 1, status: 1 });
JournalSchema.index({ orgId: 1, status: 1, isBalanced: 1 });

// Pre-save: Calculate totals and validate balance
JournalSchema.pre('save', function(next) {
  /**
   * @warning PRECISION RISK: Double-entry bookkeeping with floating-point arithmetic.
   * Journal entries MUST balance exactly (debits = credits).
   * Current tolerance of 0.01 is a workaround for floating-point errors.
   * 
   * Example of precision error:
   * Debit:  $100.33 + $200.67 + $300.00 = 601.0000000000001
   * Credit: $601.00
   * Difference: 0.0000000000001 (false unbalanced)
   * 
   * TODO: Use Decimal.js for exact arithmetic:
   * - const totalDebit = Decimal.sum(this.lines.map(l => l.debit))
   * - const totalCredit = Decimal.sum(this.lines.map(l => l.credit))
   * - this.isBalanced = totalDebit.equals(totalCredit) // Exact comparison
   * 
   * Impact: Accounting system integrity. Unbalanced journals corrupt financial reports.
   * Priority: P0 (CRITICAL) - Violates fundamental accounting principle
   * Related: PENDING_TASKS_5_DAYS.md Category 3 (Finance Precision)
   * 
   * @see https://en.wikipedia.org/wiki/Double-entry_bookkeeping
   */
  // Calculate totals
  // Calculate totals using Decimal.js for precision
  this.totalDebit = this.lines.reduce((sum, line) => new Decimal(sum).plus(line.debit).toNumber(), 0);
  this.totalCredit = this.lines.reduce((sum, line) => new Decimal(sum).plus(line.credit).toNumber(), 0);
  
  // Check balance (allow 0.01 rounding difference)
  const diff = new Decimal(this.totalDebit).minus(this.totalCredit).abs().toNumber();
  this.isBalanced = diff < 0.01;
  
  // Each line must have either debit OR credit (not both)
  const invalidLines = this.lines.filter(line => 
    (line.debit > 0 && line.credit > 0) || (line.debit === 0 && line.credit === 0)
  );
  
  if (invalidLines.length > 0) {
    return next(new Error('Each journal line must have either debit OR credit (not both or neither)'));
  }
  
  // Set fiscal year/period from journal date if not set
  if (!this.fiscalYear || !this.fiscalPeriod) {
    const date = this.journalDate || new Date();
    this.fiscalYear = date.getFullYear();
    this.fiscalPeriod = date.getMonth() + 1;
  }
  
  next();
});

// Pre-save: Generate journal number if new
JournalSchema.pre('save', async function(next) {
  if (this.isNew && !this.journalNumber) {
    const year = this.journalDate.getFullYear();
    const month = String(this.journalDate.getMonth() + 1).padStart(2, '0');
    
    // Count existing journals for this org/year
    const count = await model('Journal').countDocuments({
      orgId: this.orgId,
      journalDate: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${year + 1}-01-01`)
      }
    });
    
    const sequence = String(count + 1).padStart(4, '0');
    this.journalNumber = `JE-${year}${month}-${sequence}`;
  }
  
  next();
});

// Pre-save: Prevent modification of posted journals
JournalSchema.pre('save', function(next) {
  if (!this.isNew && this.isModified('lines') && this.status === 'POSTED') {
    return next(new Error('Cannot modify posted journal entry. Use void and create new entry.'));
  }
  next();
});

// Method: Post journal entry (mark as posted and ready for ledger processing)
JournalSchema.methods.post = async function(): Promise<IJournal> {
  if (this.status !== 'DRAFT') {
    throw new TypeError('Only draft journals can be posted');
  }
  
  if (!this.isBalanced) {
    throw new RangeError('Cannot post unbalanced journal entry');
  }
  
  this.status = 'POSTED';
  this.postingDate = new Date();
  
  await this.save();
  
  // TODO: Update ChartAccount balances via LedgerEntry model
  
  return this as unknown as IJournal;
};

// Method: Void journal entry
JournalSchema.methods.void = async function(userId: Types.ObjectId, reason: string): Promise<IJournal> {
  if (this.status !== 'POSTED') {
    throw new TypeError('Only posted journals can be voided');
  }
  
  this.status = 'VOID';
  this.voidedAt = new Date();
  this.voidedBy = userId;
  this.voidReason = reason;
  
  await this.save();
  
  // Note: Reversing journal entry is created by the postingService.voidJournal method
  
  return this as unknown as IJournal;
};

// Static: Get unbalanced journals
JournalSchema.statics.getUnbalanced = async function(orgId: Types.ObjectId) {
  return this.find({ orgId, status: 'DRAFT', isBalanced: false }).sort({ journalDate: -1 });
};

// Static: Get posted journals for period
JournalSchema.statics.getForPeriod = async function(
  orgId: Types.ObjectId, 
  year: number, 
  period: number
) {
  return this.find({ 
    orgId, 
    fiscalYear: year, 
    fiscalPeriod: period, 
    status: 'POSTED' 
  }).sort({ journalDate: -1 });
};

const JournalModel = models.Journal || model<IJournal>('Journal', JournalSchema);

export default JournalModel;
