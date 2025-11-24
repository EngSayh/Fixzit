/**
 * Payment Model - Finance Pack Phase 2
 *
 * Tracks payments received from tenants/customers and payments made to vendors/suppliers.
 * Integrates with Journal/Ledger for double-entry bookkeeping.
 *
 * Features:
 * - Multi-method support (cash, card, bank transfer, cheque)
 * - Bank reconciliation tracking
 * - Receipt generation and attachment
 * - Payment splitting across multiple invoices
 * - Refund and reversal support
 * - Integration with Chart of Accounts
 */

import { Schema, model, models, Types, Document } from "mongoose";
import { getModel, MModel } from "@/src/types/mongoose-compat";
import Decimal from "decimal.js";
import { ensureMongoConnection } from "@/server/lib/db";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";

ensureMongoConnection();

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const PaymentType = {
  RECEIVED: "RECEIVED", // Payment received from customer/tenant
  MADE: "MADE", // Payment made to vendor/supplier
} as const;

export const PaymentMethod = {
  CASH: "CASH",
  CARD: "CARD",
  BANK_TRANSFER: "BANK_TRANSFER",
  CHEQUE: "CHEQUE",
  ONLINE: "ONLINE",
  OTHER: "OTHER",
} as const;

export const PaymentStatus = {
  DRAFT: "DRAFT", // Created but not posted
  POSTED: "POSTED", // Posted to ledger
  CLEARED: "CLEARED", // Cleared in bank (reconciled)
  BOUNCED: "BOUNCED", // Cheque bounced
  CANCELLED: "CANCELLED", // Cancelled before posting
  REFUNDED: "REFUNDED", // Payment refunded
} as const;

// ============================================================================
// INTERFACES
// ============================================================================

export interface IPaymentAllocation {
  invoiceId: Types.ObjectId; // Reference to Invoice
  invoiceNumber: string; // Denormalized for reporting
  amount: number; // Amount allocated to this invoice
  appliedAt: Date; // When allocation was applied
}

export interface IBankDetails {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  swiftCode?: string;
  iban?: string;
}

export interface IChequeDetails {
  chequeNumber: string;
  chequeDate: Date;
  bankName: string;
  drawerName?: string; // Name on cheque
}

export interface ICardDetails {
  cardType?: string; // Visa, Mastercard, etc.
  last4Digits?: string;
  transactionId?: string;
  authorizationCode?: string;
}

export interface IReconciliation {
  isReconciled: boolean;
  reconciledAt?: Date;
  reconciledBy?: Types.ObjectId; // User who reconciled
  bankStatementDate?: Date;
  bankStatementReference?: string;
  notes?: string;
}

export interface IPayment extends Document {
  // Core fields
  orgId: Types.ObjectId; // Added by tenantIsolationPlugin
  paymentNumber: string; // Auto-generated: PAY-YYYYMM-####
  paymentType: keyof typeof PaymentType;

  // Financial details
  amount: number; // Total payment amount
  currency: string; // SAR, USD, etc.
  exchangeRate?: number; // If different from base currency

  // Payment method
  paymentMethod: keyof typeof PaymentMethod;
  paymentDate: Date; // Date payment was made/received

  // Status
  status: keyof typeof PaymentStatus;

  // Party details
  partyType: "TENANT" | "CUSTOMER" | "VENDOR" | "SUPPLIER" | "OWNER" | "OTHER";
  partyId?: Types.ObjectId; // Reference to party (if applicable)
  partyName: string; // Denormalized party name

  // Allocation to invoices
  allocations: IPaymentAllocation[];
  unallocatedAmount: number; // Amount not yet allocated

  // Method-specific details
  bankDetails?: IBankDetails;
  chequeDetails?: IChequeDetails;
  cardDetails?: ICardDetails;

  // Bank reconciliation
  reconciliation: IReconciliation;

  // Accounting integration
  journalId?: Types.ObjectId; // Reference to Journal entry
  cashAccountId?: Types.ObjectId; // Which cash/bank account was used

  // Reference documents
  referenceNumber?: string; // External reference (PO, invoice, etc.)
  receiptUrl?: string; // Link to receipt/proof
  attachments?: string[]; // Additional documents

  // Context
  propertyId?: Types.ObjectId;
  unitId?: Types.ObjectId;
  workOrderId?: Types.ObjectId;

  // Refund tracking
  isRefund: boolean;
  originalPaymentId?: Types.ObjectId; // If this is a refund
  refundReason?: string;

  // Metadata
  notes?: string;
  tags?: string[];

  // Audit fields added by auditPlugin
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  // Instance methods
  allocateToInvoice(
    invoiceId: Types.ObjectId | string,
    invoiceNumber: string,
    amount: number,
  ): void;
  reconcile(
    reconciledBy: Types.ObjectId,
    bankStatementDate: Date,
    bankStatementReference: string,
    notes?: string,
  ): void;
  reverse(reversedBy: Types.ObjectId, reason: string): Promise<IPayment>;
  version: number;
}

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

const PaymentSchema = new Schema<IPayment>(
  {
    // orgId will be added by tenantIsolationPlugin

    paymentNumber: {
      type: String,
      required: true,
      index: true,
    },

    paymentType: {
      type: String,
      enum: Object.values(PaymentType),
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "SAR",
      uppercase: true,
    },

    exchangeRate: {
      type: Number,
      default: 1,
    },

    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
      index: true,
    },

    paymentDate: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.DRAFT,
      index: true,
    },

    partyType: {
      type: String,
      enum: ["TENANT", "CUSTOMER", "VENDOR", "SUPPLIER", "OWNER", "OTHER"],
      required: true,
      index: true,
    },

    partyId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    partyName: {
      type: String,
      required: true,
    },

    allocations: [
      {
        invoiceId: { type: Schema.Types.ObjectId, required: true, index: true },
        invoiceNumber: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        appliedAt: { type: Date, default: Date.now },
      },
    ],

    unallocatedAmount: {
      type: Number,
      default: 0,
    },

    bankDetails: {
      bankName: String,
      accountNumber: String,
      accountHolder: String,
      swiftCode: String,
      iban: String,
    },

    chequeDetails: {
      chequeNumber: String,
      chequeDate: Date,
      bankName: String,
      drawerName: String,
    },

    cardDetails: {
      cardType: String,
      last4Digits: String,
      transactionId: String,
      authorizationCode: String,
    },

    reconciliation: {
      isReconciled: { type: Boolean, default: false },
      reconciledAt: Date,
      reconciledBy: { type: Schema.Types.ObjectId, ref: "User" },
      bankStatementDate: Date,
      bankStatementReference: String,
      notes: String,
    },

    journalId: {
      type: Schema.Types.ObjectId,
      ref: "Journal",
      index: true,
    },

    cashAccountId: {
      type: Schema.Types.ObjectId,
      ref: "ChartAccount",
      index: true,
    },

    referenceNumber: {
      type: String,
      index: true,
    },

    receiptUrl: String,
    attachments: [String],

    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      index: true,
    },

    unitId: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
    },

    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: "WorkOrder",
    },

    isRefund: {
      type: Boolean,
      default: false,
      index: true,
    },

    originalPaymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },

    refundReason: String,

    notes: String,
    tags: [String],

    // createdBy, updatedBy, version added by auditPlugin
  },
  {
    timestamps: true,
    collection: "finance_payments",
  },
);

// ============================================================================
// PLUGINS
// ============================================================================

PaymentSchema.plugin(tenantIsolationPlugin);
PaymentSchema.plugin(auditPlugin);

// ============================================================================
// INDEXES
// ============================================================================

// Compound tenant-scoped unique index for payment number
PaymentSchema.index({ orgId: 1, paymentNumber: 1 }, { unique: true });

// Query indexes (tenant-scoped)
PaymentSchema.index({ orgId: 1, paymentDate: -1 });
PaymentSchema.index({ orgId: 1, status: 1, paymentDate: -1 });
PaymentSchema.index({ orgId: 1, paymentType: 1, paymentDate: -1 });
PaymentSchema.index({ orgId: 1, partyId: 1, paymentDate: -1 });
PaymentSchema.index({ orgId: 1, "reconciliation.isReconciled": 1 });
PaymentSchema.index({ orgId: 1, journalId: 1 });

// Search index (tenant-scoped)
PaymentSchema.index({
  orgId: 1,
  paymentNumber: "text",
  partyName: "text",
  referenceNumber: "text",
  notes: "text",
});

// ============================================================================
// HOOKS
// ============================================================================

// Pre-save: Auto-generate payment number
PaymentSchema.pre("save", async function (next) {
  if (this.isNew && !this.paymentNumber) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Find highest number for this month
    const Payment = this.constructor as typeof import("mongoose").Model;
    const lastPayment = await Payment.findOne({
      orgId: this.orgId,
      paymentNumber: new RegExp(`^PAY-${yearMonth}-`),
    }).sort({ paymentNumber: -1 });

    let nextNum = 1;
    if (lastPayment?.paymentNumber) {
      const match = lastPayment.paymentNumber.match(/-(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    this.paymentNumber = `PAY-${yearMonth}-${String(nextNum).padStart(4, "0")}`;
  }

  // Calculate unallocated amount
  const totalAllocated = Decimal.sum(
    ...this.allocations.map((a: { amount?: number }) => a.amount || 0),
  );
  this.unallocatedAmount = new Decimal(this.amount || 0)
    .minus(totalAllocated)
    .toDP(2)
    .toNumber();

  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Allocate payment to an invoice
 */
PaymentSchema.methods.allocateToInvoice = function (
  invoiceId: Types.ObjectId,
  invoiceNumber: string,
  amount: number,
) {
  if (amount <= 0) {
    throw new Error("Allocation amount must be positive");
  }

  if (amount > this.unallocatedAmount) {
    throw new Error(
      `Cannot allocate ${amount}. Only ${this.unallocatedAmount} unallocated.`,
    );
  }

  this.allocations.push({
    invoiceId,
    invoiceNumber,
    amount,
    appliedAt: new Date(),
  });

  const totalAllocated = Decimal.sum(
    ...this.allocations.map((a: { amount?: number }) => a.amount || 0),
  );
  this.unallocatedAmount = new Decimal(this.amount || 0)
    .minus(totalAllocated)
    .toDP(2)
    .toNumber();
};

/**
 * Mark payment as reconciled
 */
PaymentSchema.methods.reconcile = function (
  reconciledBy: Types.ObjectId,
  bankStatementDate: Date,
  bankStatementReference: string,
  notes?: string,
) {
  this.reconciliation = {
    isReconciled: true,
    reconciledAt: new Date(),
    reconciledBy,
    bankStatementDate,
    bankStatementReference,
    notes,
  };

  if (this.status === PaymentStatus.POSTED) {
    this.status = PaymentStatus.CLEARED;
  }
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get unreconciled payments
 */
PaymentSchema.statics.getUnreconciled = function (
  orgId: Types.ObjectId,
  paymentMethod?: keyof typeof PaymentMethod,
) {
  const query: Record<string, unknown> = {
    orgId,
    "reconciliation.isReconciled": false,
    status: PaymentStatus.POSTED,
  };

  if (paymentMethod) {
    query.paymentMethod = paymentMethod;
  }

  return this.find(query).sort({ paymentDate: 1 });
};

/**
 * Get payments by party
 */
PaymentSchema.statics.getByParty = function (
  orgId: Types.ObjectId,
  partyId: Types.ObjectId,
  startDate?: Date,
  endDate?: Date,
) {
  const query: Record<string, unknown> = { orgId, partyId };

  if (startDate || endDate) {
    query.paymentDate = {};
    if (startDate) (query.paymentDate as Record<string, Date>).$gte = startDate;
    if (endDate) (query.paymentDate as Record<string, Date>).$lte = endDate;
  }

  return this.find(query).sort({ paymentDate: -1 });
};

/**
 * Get cash flow summary
 */
PaymentSchema.statics.getCashFlowSummary = async function (
  orgId: Types.ObjectId,
  startDate: Date,
  endDate: Date,
) {
  const payments = await this.find({
    orgId,
    paymentDate: { $gte: startDate, $lte: endDate },
    status: { $in: [PaymentStatus.POSTED, PaymentStatus.CLEARED] },
  });

  const summary = {
    received: 0,
    made: 0,
    net: 0,
    byMethod: {} as Record<string, { received: number; made: number }>,
  };

  for (const payment of payments) {
    const amount = payment.amount;

    if (payment.paymentType === PaymentType.RECEIVED) {
      summary.received += amount;
    } else {
      summary.made += amount;
    }

    if (!summary.byMethod[payment.paymentMethod]) {
      summary.byMethod[payment.paymentMethod] = { received: 0, made: 0 };
    }

    if (payment.paymentType === PaymentType.RECEIVED) {
      summary.byMethod[payment.paymentMethod].received += amount;
    } else {
      summary.byMethod[payment.paymentMethod].made += amount;
    }
  }

  summary.net = summary.received - summary.made;

  return summary;
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

export const Payment = getModel<IPayment>("Payment", PaymentSchema);
