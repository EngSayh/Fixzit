/**
 * @module server/models/finance/Journal
 * @description General ledger journal entries for double-entry bookkeeping.
 *              Records all financial transactions with balanced debits and credits.
 *
 * @features
 * - Journal entry structure: Header (metadata) + Lines (debit/credit entries)
 * - Status workflow: DRAFT → POSTED → VOID
 * - Automatic balance validation (total debits = total credits)
 * - Source tracking: WO (Work Order), INVOICE, PAYMENT, MANUAL, ADJUSTMENT
 * - Immutable once posted (can only void with reversing entry)
 * - Multi-dimensional tracking (property, owner, tenant, vendor per line)
 * - Decimal128 precision for financial calculations
 * - Multi-currency support (SAR default)
 * - Reversal/correction support (void + create reversing entry)
 *
 * @statuses
 * - DRAFT: Editable, not affecting GL balances
 * - POSTED: Finalized, affecting GL balances (immutable)
 * - VOID: Voided (reversing entry created)
 *
 * @indexes
 * - { orgId: 1, journalNumber: 1 } (unique) — Unique journal number per tenant
 * - { orgId: 1, status: 1, journalDate: -1 } — Posted journals for period reports
 * - { orgId: 1, source: 1, sourceId: 1 } — Link to source transaction (WO, Invoice, Payment)
 * - { orgId: 1, journalDate: 1, status: 1 } — Date-range queries
 *
 * @relationships
 * - Generates LedgerEntry records (one per journal line)
 * - References ChartAccount model (journal line accounts)
 * - Links to WorkOrder model (source: WO)
 * - Links to Invoice model (source: INVOICE)
 * - Links to Payment model (source: PAYMENT)
 * - Links to Property, Owner, Tenant models (multi-dimensional tracking)
 *
 * @compliance
 * - Decimal128 precision for ZATCA/GAZT compliance
 * - Immutable posted entries (audit trail integrity)
 * - Balanced entries enforced (debits = credits)
 * - Source traceability for financial audits
 *
 * @audit
 * - createdBy, updatedBy: Auto-tracked via auditPlugin
 * - postedAt, voidedAt: Manual timestamps for lifecycle tracking
 * - All journal modifications logged in AuditLog
 */

import { Schema, model, models, Types } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import Decimal from "decimal.js";
import { ensureMongoConnection } from "@/server/lib/db";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";

ensureMongoConnection();

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

export interface IJournalPosting {
  accountId: Types.ObjectId;
  debitMinor?: Types.Decimal128;
  creditMinor?: Types.Decimal128;
  currency: string;
  fxRate?: number;
  memo?: string;
  dimensions?: Record<string, unknown>;
}

export interface IJournal {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  journalNumber: string; // e.g., "JE-2025-001"
  number?: string; // Alias for journalNumber (finance pack)
  journalDate: Date;
  date?: Date; // Alias for journalDate
  postingDate?: Date;
  description: string;
  sourceType:
    | "WORK_ORDER"
    | "INVOICE"
    | "PAYMENT"
    | "RENT"
    | "EXPENSE"
    | "ADJUSTMENT"
    | "MANUAL";
  sourceId?: Types.ObjectId; // Reference to source document
  sourceNumber?: string; // Denormalized for reporting
  status: "DRAFT" | "POSTED" | "VOID";
  lines: IJournalLine[];
  postings?: IJournalPosting[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  voidedAt?: Date;
  voidedBy?: Types.ObjectId;
  voidReason?: string;
  type?: "STANDARD" | "ADJUSTMENT" | "REVERSAL" | "CLOSING";
  postedBy?: Types.ObjectId;
  postedAt?: Date;
  reversalOf?: Types.ObjectId;
  reversedBy?: Types.ObjectId;
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
    accountId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "ChartAccount",
      index: true,
    },
    accountCode: { type: String },
    accountName: { type: String },
    description: { type: String, trim: true },
    debit: { type: Number, required: true, default: 0, min: 0 },
    credit: { type: Number, required: true, default: 0, min: 0 },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit" },
    ownerId: { type: Schema.Types.ObjectId, ref: "Owner" },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant" },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
  },
  { _id: false },
);

const JournalPostingSchema = new Schema<IJournalPosting>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "ChartAccount",
      required: true,
    },
    debitMinor: {
      type: Schema.Types.Decimal128,
      default: () => Types.Decimal128.fromString("0"),
    },
    creditMinor: {
      type: Schema.Types.Decimal128,
      default: () => Types.Decimal128.fromString("0"),
    },
    currency: { type: String, required: true },
    fxRate: { type: Number, default: 1 },
    memo: { type: String },
    dimensions: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const JournalSchema = new Schema<IJournal>(
  {
    // orgId will be added by tenantIsolationPlugin
    journalNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      alias: "number",
      // Unique per org - see compound index below
    },
    journalDate: { type: Date, required: true, index: true, alias: "date" },
    postingDate: { type: Date },
    type: {
      type: String,
      enum: ["STANDARD", "ADJUSTMENT", "REVERSAL", "CLOSING"],
      default: "STANDARD",
    },
    description: { type: String, required: true, trim: true },
    sourceType: {
      type: String,
      required: true,
      enum: [
        "WORK_ORDER",
        "INVOICE",
        "PAYMENT",
        "RENT",
        "EXPENSE",
        "ADJUSTMENT",
        "MANUAL",
      ],
      index: true,
    },
    sourceId: { type: Schema.Types.ObjectId, index: true },
    sourceNumber: { type: String, trim: true },
    status: {
      type: String,
      required: true,
      enum: ["DRAFT", "POSTED", "VOID"],
      default: "DRAFT",
      index: true,
    },
    postings: { type: [JournalPostingSchema], default: [] },
    lines: {
      type: [JournalLineSchema],
      required: false,
      default: [],
      validate: {
        validator: function (lines: IJournalLine[]) {
          if (!lines || lines.length === 0) return true;
          return lines.length >= 2; // Minimum 2 lines (debit + credit)
        },
        message: "Journal entry must have at least 2 lines",
      },
    },
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
    isBalanced: { type: Boolean, default: false, index: true },
    voidedAt: { type: Date },
    voidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    voidReason: { type: String, trim: true },
    reversalOf: { type: Schema.Types.ObjectId, ref: "Journal" },
    reversedBy: { type: Schema.Types.ObjectId, ref: "Journal" },
    postedBy: { type: Schema.Types.ObjectId, ref: "User" },
    postedAt: { type: Date },
    fiscalYear: { type: Number, required: true, index: true },
    fiscalPeriod: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true,
    },
  },
  { timestamps: true },
);

// Apply plugins BEFORE indexes
JournalSchema.plugin(tenantIsolationPlugin);
JournalSchema.plugin(auditPlugin);

// All indexes MUST be tenant-scoped
JournalSchema.index(
  { orgId: 1, journalNumber: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);
JournalSchema.index({ orgId: 1, journalDate: -1, status: 1 });
JournalSchema.index({ orgId: 1, sourceType: 1, sourceId: 1 });
JournalSchema.index({ orgId: 1, fiscalYear: 1, fiscalPeriod: 1, status: 1 });
JournalSchema.index({ orgId: 1, status: 1, isBalanced: 1 });
JournalSchema.index({ orgId: 1, reversalOf: 1 });

// Pre-save: Calculate totals and validate balance
JournalSchema.pre("save", function (next) {
  /**
   * PRECISION FIX: Use Decimal.js for exact double-entry bookkeeping
   *
   * Problem: JavaScript floating-point arithmetic can cause rounding errors:
   * Example: 100.33 + 200.67 + 300.00 = 601.0000000000001 (not 601.00)
   *
   * Solution: Use Decimal.js for exact arithmetic, then convert to number for storage
   *
   * Critical: Accounting integrity requires EXACT balance (debits = credits)
   * The old tolerance check (diff < 0.01) was a workaround for precision bugs
   *
   * @see https://github.com/MikeMcl/decimal.js
   * @see PR #283 qodo-merge-pro review
   */

  // Calculate totals with Decimal.js (exact precision)
  const debitValues = this.lines.length
    ? this.lines.map((l: { debit?: number }) => l.debit || 0)
    : [0];
  const creditValues = this.lines.length
    ? this.lines.map((l: { credit?: number }) => l.credit || 0)
    : [0];
  const totalDebit = Decimal.sum(...debitValues);
  const totalCredit = Decimal.sum(...creditValues);

  // Convert to number for storage (rounded to 2 decimal places)
  this.totalDebit = totalDebit.toDP(2).toNumber();
  this.totalCredit = totalCredit.toDP(2).toNumber();

  // Check balance with EXACT comparison (no tolerance needed)
  this.isBalanced = totalDebit.equals(totalCredit);

  // Each line must have either debit OR credit (not both)
  const invalidLines = this.lines.filter(
    (line) =>
      (line.debit > 0 && line.credit > 0) ||
      (line.debit === 0 && line.credit === 0),
  );

  if (invalidLines.length > 0) {
    return next(
      new Error(
        "Each journal line must have either debit OR credit (not both or neither)",
      ),
    );
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
JournalSchema.pre("save", async function (next) {
  if (this.isNew && !this.journalNumber) {
    const year = this.journalDate.getFullYear();
    const month = String(this.journalDate.getMonth() + 1).padStart(2, "0");

    // Count existing journals for this org/year
    const count = await model("Journal").countDocuments({
      orgId: this.orgId,
      journalDate: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${year + 1}-01-01`),
      },
    });

    const sequence = String(count + 1).padStart(4, "0");
    this.journalNumber = `JE-${year}${month}-${sequence}`;
  }

  next();
});

// Pre-save: Prevent modification of posted journals
JournalSchema.pre("save", async function (next) {
  if (this.isNew) return next();

  // Use the registered model to avoid type narrowing on the document instance
  const JournalModel = model<IJournal>("Journal");
  const existing = await JournalModel.findById(this._id)
    .select("status")
    .lean();
  if (existing?.status === "POSTED" && this.isModified()) {
    if (this.status === "VOID") {
      return next();
    }
    return next(new Error("Posted journals cannot be modified"));
  }

  next();
});

// Method: Post journal entry (mark as posted and ready for ledger processing)
JournalSchema.methods.post = async function (): Promise<IJournal> {
  if (this.status !== "DRAFT") {
    throw new Error("Only draft journals can be posted");
  }

  if (!this.isBalanced) {
    throw new Error("Cannot post unbalanced journal entry");
  }

  this.status = "POSTED";
  this.postingDate = new Date();

  await this.save();

  // FUTURE: Update ChartAccount balances via LedgerEntry model
  // This will be implemented when the full double-entry accounting system is activated.
  // Currently handled by postingService.ts which creates LedgerEntry records.

  return this as unknown as IJournal;
};

// Method: Void journal entry
JournalSchema.methods.void = async function (
  userId: Types.ObjectId,
  reason: string,
): Promise<IJournal> {
  if (this.status !== "POSTED") {
    throw new Error("Only posted journals can be voided");
  }

  this.status = "VOID";
  this.voidedAt = new Date();
  this.voidedBy = userId;
  this.voidReason = reason;

  await this.save();

  // Note: Reversing journal entry is created by the postingService.voidJournal method

  return this as unknown as IJournal;
};

// Static: Get unbalanced journals
JournalSchema.statics.getUnbalanced = async function (orgId: Types.ObjectId) {
  return this.find({ orgId, status: "DRAFT", isBalanced: false }).sort({
    journalDate: -1,
  });
};

// Static: Get posted journals for period
JournalSchema.statics.getForPeriod = async function (
  orgId: Types.ObjectId,
  year: number,
  period: number,
) {
  return this.find({
    orgId,
    fiscalYear: year,
    fiscalPeriod: period,
    status: "POSTED",
  }).sort({ journalDate: -1 });
};

const JournalModel = getModel<IJournal>("Journal", JournalSchema);

export default JournalModel;
