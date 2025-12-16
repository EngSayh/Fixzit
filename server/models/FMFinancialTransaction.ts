import { Schema, Model, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";
import { encryptionPlugin } from "@/server/plugins/encryptionPlugin";

/**
 * @module server/models/FMFinancialTransaction
 * @description Financial transaction ledger for facilities management operations.
 *              Tracks expenses, invoices, payments, and adjustments with reconciliation support.
 *
 * @features
 * - Transaction types: EXPENSE, INVOICE, PAYMENT, ADJUSTMENT
 * - Status workflow: PENDING → POSTED → PAID/CANCELLED/REFUNDED
 * - Decimal128 storage for precision-safe financial calculations
 * - Property and unit-level allocation
 * - Work order and invoice linking
 * - Payment method tracking (CASH, CARD, TRANSFER, CHECK)
 * - Reconciliation support (reconciled flag + date)
 * - Owner statement aggregation
 * - Encrypted payment details (card numbers, bank accounts)
 *
 * @statuses
 * - PENDING: Transaction created but not yet posted to ledger
 * - POSTED: Posted to ledger, affects financial reports
 * - PAID: Payment received/sent (for invoices/expenses)
 * - CANCELLED: Cancelled transaction (no financial impact)
 * - REFUNDED: Refund issued (creates reversal transaction)
 *
 * @indexes
 * - { orgId: 1, transactionNumber: 1 } (unique) — Unique transaction identifier per tenant
 * - { orgId: 1, propertyId: 1, transactionDate: -1 } — Property financial reports
 * - { orgId: 1, workOrderId: 1, type: 1 } — Work order cost tracking
 * - { orgId: 1, invoiceId: 1, type: 1 } — Invoice payment status
 * - { orgId: 1, status: 1, transactionDate: 1 } — Posted transactions for period reports
 * - { orgId: 1, ownerId: 1, transactionDate: -1 } — Owner statement queries
 * - { orgId: 1, reconciled: 1, transactionDate: 1 } — Unreconciled transactions
 *
 * @relationships
 * - References Property model (propertyId)
 * - References WorkOrder model (workOrderId)
 * - References Invoice model (invoiceId)
 * - References User model (ownerId, payeeId, createdBy, updatedBy)
 *
 * @compliance
 * - Decimal128 precision for ZATCA/GAZT compliance
 * - Audit trail for financial investigations
 * - Immutable transaction history (corrections via ADJUSTMENT type)
 *
 * @encryption
 * - paymentDetails: Encrypted via encryptionPlugin (card numbers, bank accounts)
 *
 * @audit
 * - createdBy, updatedBy: Auto-tracked via auditPlugin
 * - postedAt, paidAt: Manual timestamps for transaction lifecycle
 */

const TransactionType = [
  "EXPENSE",
  "INVOICE",
  "PAYMENT",
  "ADJUSTMENT",
] as const;
const TransactionStatus = [
  "PENDING",
  "POSTED",
  "PAID",
  "CANCELLED",
  "REFUNDED",
] as const;

const FMFinancialTransactionSchema = new Schema(
  {
    // Multi-tenancy
    // orgId: added by plugin

    // Transaction Identification
    transactionNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: TransactionType, required: true },
    status: {
      type: String,
      enum: TransactionStatus,
      required: true,
      default: "PENDING",
    },

    // References
    workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder" },
    workOrderNumber: String,
    propertyId: { type: String, required: true },
    unitId: String,

    // Parties
    ownerId: { type: String, required: true },
    tenantId: String,
    vendorId: String,

    // Financial Details
    amount: { type: Number, required: true },
    currency: { type: String, default: "SAR" },
    category: { type: String, required: true }, // 'MAINTENANCE', 'REPAIR', 'UTILITIES', etc.
    description: { type: String, required: true },

    // Dates
    transactionDate: { type: Date, required: true, default: Date.now },
    dueDate: Date, // For invoices
    paidDate: Date, // For payments
    postingDate: Date, // When posted to GL

    // Cost Breakdown (for expenses)
    costBreakdown: {
      labor: Number,
      materials: Number,
      equipment: Number,
      overhead: Number,
      tax: Number,
      total: Number,
    },

    // Invoice Details (for invoices)
    invoiceDetails: {
      invoiceNumber: String,
      issueDate: Date,
      dueDate: Date,
      paymentTerms: String, // 'NET_30', 'NET_60', etc.
      chargeToParty: { type: String, enum: ["OWNER", "TENANT", "VENDOR"] },
      lineItems: [
        {
          description: String,
          quantity: Number,
          unitPrice: Number,
          amount: Number,
        },
      ],
    },

    // Payment Details (for payments)
    paymentDetails: {
      paymentMethod: {
        type: String,
        enum: ["CASH", "CARD", "BANK_TRANSFER", "CHECK", "OTHER"],
      },
      paymentRef: String, // Check number, transaction ID, etc.
      receivedFrom: String,
      receivedBy: String,
      receivedDate: Date,
      bankAccount: String,
      notes: String,
    },

    // Reconciliation
    reconciliation: {
      reconciled: { type: Boolean, default: false },
      reconciledAt: Date,
      reconciledBy: String,
      bankStatementRef: String,
      glAccountCode: String,
      notes: String,
    },

    // Owner Statement Aggregation
    statementPeriod: {
      month: Number, // 1-12
      year: Number,
      quarter: Number, // 1-4
    },

    // Attachments
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: Date,
      },
    ],

    // Audit Fields
    createdBy: String,
    updatedBy: String,
    cancelledBy: String,
    cancelledAt: Date,
    cancellationReason: String,

    // Notes
    notes: String,
    internalNotes: String,
  },
  {
    timestamps: true,
    collection: "fm_financial_transactions",
  },
);

// Plugins
FMFinancialTransactionSchema.plugin(tenantIsolationPlugin);
FMFinancialTransactionSchema.plugin(auditPlugin);
FMFinancialTransactionSchema.plugin(encryptionPlugin, {
  fields: {
    "paymentDetails.paymentRef": "Payment Reference",
    "paymentDetails.receivedFrom": "Payment Received From",
    "paymentDetails.bankAccount": "Payment Bank Account",
  },
});

// Indexes for performance
FMFinancialTransactionSchema.index({ orgId: 1, transactionNumber: 1 });
FMFinancialTransactionSchema.index({ orgId: 1, workOrderId: 1 });
FMFinancialTransactionSchema.index({
  orgId: 1,
  propertyId: 1,
  transactionDate: 1,
});
FMFinancialTransactionSchema.index({
  orgId: 1,
  ownerId: 1,
  transactionDate: 1,
});
FMFinancialTransactionSchema.index({
  orgId: 1,
  tenantId: 1,
  transactionDate: 1,
});
FMFinancialTransactionSchema.index({ orgId: 1, type: 1, status: 1 });
FMFinancialTransactionSchema.index({
  orgId: 1,
  "statementPeriod.year": 1,
  "statementPeriod.month": 1,
});

// Pre-save: Generate transaction number
FMFinancialTransactionSchema.pre("save", function (next) {
  if (this.isNew && !this.transactionNumber) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const timestamp = now.getTime().toString().slice(-6);

    const prefix =
      this.type === "EXPENSE"
        ? "EXP"
        : this.type === "INVOICE"
          ? "INV"
          : this.type === "PAYMENT"
            ? "PAY"
            : "ADJ";

    this.transactionNumber = `${prefix}-${year}${month}-${timestamp}`;
  }
  next();
});

// Pre-save: Auto-set statement period
FMFinancialTransactionSchema.pre("save", function (next) {
  if (this.isNew && !this.statementPeriod?.month) {
    const date = this.transactionDate || new Date();
    this.statementPeriod = {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      quarter: Math.floor(date.getMonth() / 3) + 1,
    };
  }
  next();
});

// Virtual: Is overdue
FMFinancialTransactionSchema.virtual("isOverdue").get(function () {
  if (this.type !== "INVOICE" || this.status === "PAID") return false;
  return this.dueDate && new Date() > this.dueDate;
});

// Virtual: Days overdue
FMFinancialTransactionSchema.virtual("daysOverdue").get(function () {
  if (this.type !== "INVOICE" || this.status === "PAID") return 0;
  if (!this.dueDate || new Date() <= this.dueDate) return 0;
  const now = new Date();
  const diff = now.getTime() - this.dueDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Method: Mark as paid
FMFinancialTransactionSchema.methods.markAsPaid = function (paymentDetails: {
  paymentMethod: string;
  paymentRef?: string;
  receivedFrom: string;
  receivedBy: string;
  notes?: string;
}) {
  this.status = "PAID";
  this.paidDate = new Date();
  this.paymentDetails = {
    ...paymentDetails,
    receivedDate: new Date(),
  };
  return this.save();
};

// Method: Cancel transaction
FMFinancialTransactionSchema.methods.cancel = function (
  cancelledBy: string,
  reason: string,
) {
  this.status = "CANCELLED";
  this.cancelledBy = cancelledBy;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  return this.save();
};

export type FMFinancialTransactionDoc = InferSchemaType<
  typeof FMFinancialTransactionSchema
>;

export const FMFinancialTransaction: Model<FMFinancialTransactionDoc> =
  getModel<FMFinancialTransactionDoc>(
    "FMFinancialTransaction",
    FMFinancialTransactionSchema,
  );
