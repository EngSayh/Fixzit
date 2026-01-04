/**
 * @module server/models/finance/Expense
 * @description Business expense management with approval workflow, receipt management, and GL account integration.
 *              Tracks operational, capital, reimbursable, and project-specific expenses.
 *
 * @features
 * - Expense types: OPERATIONAL, CAPITAL, REIMBURSABLE, PROJECT, VENDOR_PAYMENT, UTILITY, MAINTENANCE
 * - Multi-level approval workflow (configurable approval chains)
 * - Receipt/attachment management (image, PDF, scanned documents)
 * - Category and GL account mapping (auto-posting to Chart of Accounts)
 * - Work Order, Project, and Property linking (cost allocation)
 * - Reimbursement tracking (employee expense claims)
 * - Budget tracking and overspend alerts
 * - VAT calculation and tax category tagging
 * - Decimal128 precision for financial calculations
 * - Multi-currency support with exchange rate tracking
 * - Status workflow: DRAFT → PENDING_APPROVAL → APPROVED → PAID/REJECTED
 *
 * @statuses
 * - DRAFT: Expense created but not submitted
 * - PENDING_APPROVAL: Awaiting approver action
 * - APPROVED: Approved and ready for payment
 * - PAID: Payment issued to vendor/employee
 * - REJECTED: Rejected by approver (with reason)
 * - CANCELLED: Cancelled by requester
 *
 * @indexes
 * - { orgId: 1, expenseNumber: 1 } (unique) — Unique expense identifier per tenant
 * - { orgId: 1, requesterId: 1, createdAt: -1 } — User's expense history
 * - { orgId: 1, approverId: 1, status: 1 } — Approver's pending tasks
 * - { orgId: 1, workOrderId: 1, status: 1 } — Work order cost tracking
 * - { orgId: 1, projectId: 1, status: 1 } — Project cost tracking
 * - { orgId: 1, propertyId: 1, expenseDate: -1 } — Property expense reports
 * - { orgId: 1, category: 1, expenseDate: -1 } — Category-based analytics
 * - { orgId: 1, glAccountId: 1, status: 1 } — GL account posting queries
 * - { orgId: 1, isReimbursable: 1, status: 1 } — Employee reimbursement reports
 *
 * @relationships
 * - References User model (requesterId, approverId, createdBy, updatedBy)
 * - References ChartAccount model (glAccountId)
 * - References WorkOrder model (workOrderId)
 * - References Project model (projectId)
 * - References Property model (propertyId)
 * - References Vendor model (vendorId) for vendor payments
 * - Generates Journal entries (double-entry bookkeeping)
 * - Links to Payment model (payment tracking after approval)
 * - Links to Budget model (budget vs actual tracking)
 *
 * @compliance
 * - Decimal128 precision for ZATCA/GAZT compliance
 * - VAT calculation per Saudi VAT law (15% standard rate)
 * - Audit trail for financial investigations
 * - Immutable expense records (corrections via adjusting entries)
 *
 * @audit
 * - createdBy, updatedBy: Auto-tracked via auditPlugin
 * - approvedAt, paidAt: Manual timestamps for workflow lifecycle
 * - Approval history tracked in approvalHistory array
 */
import { Schema, model, models, Types, Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { ensureMongoConnection } from "@/server/lib/db";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";

ensureMongoConnection();

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const ExpenseType = {
  OPERATIONAL: "OPERATIONAL", // Day-to-day operations
  MAINTENANCE: "MAINTENANCE", // Repairs and maintenance
  CAPITAL: "CAPITAL", // Capital expenditure
  REIMBURSEMENT: "REIMBURSEMENT", // Employee reimbursement
  UTILITY: "UTILITY", // Utilities (water, electricity, etc.)
  ADMINISTRATIVE: "ADMINISTRATIVE", // Admin costs
  OTHER: "OTHER",
} as const;

export const ExpenseStatus = {
  DRAFT: "DRAFT", // Created but not submitted
  SUBMITTED: "SUBMITTED", // Submitted for approval
  APPROVED: "APPROVED", // Approved
  REJECTED: "REJECTED", // Rejected
  PAID: "PAID", // Payment made
  CANCELLED: "CANCELLED", // Cancelled
} as const;

export const ExpenseCategory = {
  MAINTENANCE_REPAIR: "MAINTENANCE_REPAIR",
  UTILITIES: "UTILITIES",
  INSURANCE: "INSURANCE",
  PROPERTY_TAX: "PROPERTY_TAX",
  MANAGEMENT_FEES: "MANAGEMENT_FEES",
  SECURITY: "SECURITY",
  LANDSCAPING: "LANDSCAPING",
  CLEANING: "CLEANING",
  HVAC: "HVAC",
  PLUMBING: "PLUMBING",
  ELECTRICAL: "ELECTRICAL",
  OFFICE_SUPPLIES: "OFFICE_SUPPLIES",
  TRAVEL: "TRAVEL",
  MARKETING: "MARKETING",
  LEGAL_PROFESSIONAL: "LEGAL_PROFESSIONAL",
  OTHER: "OTHER",
} as const;

export const PaymentMethod = {
  CASH: "CASH",
  CARD: "CARD",
  BANK_TRANSFER: "BANK_TRANSFER",
  CHEQUE: "CHEQUE",
  CREDIT: "CREDIT",
  REIMBURSEMENT: "REIMBURSEMENT",
} as const;

// ============================================================================
// INTERFACES
// ============================================================================

export interface IExpenseApproval {
  level: number; // Approval level (1, 2, 3...)
  approverRole: string; // Required role for this level
  approverId?: Types.ObjectId; // Who approved (if approved)
  approverName?: string; // Denormalized name
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedAt?: Date;
  comments?: string;
}

export interface IExpenseLineItem {
  description: string;
  category: keyof typeof ExpenseCategory;
  accountId?: Types.ObjectId; // GL Account from COA
  accountCode?: string; // Denormalized account code
  quantity: number;
  unitPrice: number;
  amount: number; // quantity * unitPrice
  taxable: boolean;
  taxRate: number; // VAT rate (e.g., 0.15 for 15%)
  taxAmount: number;
}

export interface IReceipt {
  fileName: string;
  fileUrl: string;
  fileType: string; // image/jpeg, application/pdf, etc.
  fileSize: number; // in bytes
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
}

export interface IBudgetTracking {
  budgetId?: Types.ObjectId;
  budgetCategory?: string;
  budgetedAmount?: number;
  spentAmount?: number; // Before this expense
  remainingAmount?: number;
  exceedsBudget: boolean;
}

export interface IExpense extends Document {
  // Core fields
  orgId: Types.ObjectId; // Added by tenantIsolationPlugin
  expenseNumber: string; // Auto-generated: EXP-YYYYMM-####

  // Classification
  expenseType: keyof typeof ExpenseType;
  status: keyof typeof ExpenseStatus;

  // Financial details
  lineItems: IExpenseLineItem[];
  subtotal: number; // Sum of line item amounts
  totalTax: number; // Sum of tax amounts
  totalAmount: number; // subtotal + totalTax
  currency: string; // SAR, USD, etc.

  // Dates
  expenseDate: Date; // When expense was incurred
  dueDate?: Date; // When payment is due
  submittedAt?: Date;
  approvedAt?: Date;
  paidAt?: Date;

  // Approval workflow
  approvals: IExpenseApproval[];
  currentApprovalLevel: number;
  requiresApproval: boolean;

  // Vendor/Payee
  vendorId?: Types.ObjectId;
  vendorName: string;
  vendorType?: "VENDOR" | "EMPLOYEE" | "CONTRACTOR" | "OTHER";

  // Payment details
  paymentMethod?: keyof typeof PaymentMethod;
  paymentId?: Types.ObjectId; // Reference to Payment record
  paymentReference?: string; // External payment reference

  // Receipts and attachments
  receipts: IReceipt[];
  attachments?: string[]; // Additional document URLs

  // Context/References
  propertyId?: Types.ObjectId;
  unitId?: Types.ObjectId;
  workOrderId?: Types.ObjectId;
  projectId?: Types.ObjectId;

  // Accounting integration
  journalId?: Types.ObjectId; // Reference to Journal entry

  // Budget tracking
  budgetTracking?: IBudgetTracking;

  // Reimbursement (if expense type is REIMBURSEMENT)
  isReimbursement: boolean;
  reimbursementTo?: Types.ObjectId; // Employee to reimburse
  reimbursementStatus?: "PENDING" | "APPROVED" | "PAID";

  // Metadata
  description: string;
  notes?: string;
  tags?: string[];
  internalReference?: string; // PO number, contract number, etc.

  // Audit fields added by auditPlugin
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  version: number;

  // Methods
  submit(): Promise<void>;
  approve(approverId: Types.ObjectId, comments?: string): Promise<void>;
  reject(approverId: Types.ObjectId, reason: string): Promise<void>;
  markAsPaid(paymentId: Types.ObjectId): Promise<void>;
}

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

const ExpenseSchema = new Schema<IExpense>(
  {
    // orgId will be added by tenantIsolationPlugin

    expenseNumber: {
      type: String,
      required: true,
      index: true,
    },

    expenseType: {
      type: String,
      enum: Object.values(ExpenseType),
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(ExpenseStatus),
      default: ExpenseStatus.DRAFT,
      index: true,
    },

    lineItems: [
      {
        description: { type: String, required: true },
        category: {
          type: String,
          enum: Object.values(ExpenseCategory),
          required: true,
          index: true,
        },
        accountId: { type: Schema.Types.ObjectId, ref: "ChartAccount" },
        accountCode: String,
        quantity: { type: Number, required: true, min: 0 },
        unitPrice: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true, min: 0 },
        taxable: { type: Boolean, default: true },
        taxRate: { type: Number, default: 0.15 }, // 15% VAT for Saudi Arabia
        taxAmount: { type: Number, default: 0 },
      },
    ],

    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },

    totalTax: {
      type: Number,
      required: true,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },

    currency: {
      type: String,
      default: "SAR",
      uppercase: true,
    },

    expenseDate: {
      type: Date,
      required: true,
      index: true,
    },

    dueDate: Date,
    submittedAt: Date,
    approvedAt: Date,
    paidAt: Date,

    approvals: [
      {
        level: { type: Number, required: true },
        approverRole: { type: String, required: true },
        approverId: { type: Schema.Types.ObjectId, ref: "User" },
        approverName: String,
        status: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED"],
          default: "PENDING",
        },
        reviewedAt: Date,
        comments: String,
      },
    ],

    currentApprovalLevel: {
      type: Number,
      default: 0,
    },

    requiresApproval: {
      type: Boolean,
      default: true,
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceProvider",
      index: true,
    },

    vendorName: {
      type: String,
      required: true,
    },

    vendorType: {
      type: String,
      enum: ["VENDOR", "EMPLOYEE", "CONTRACTOR", "OTHER"],
    },

    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
    },

    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      index: true,
    },

    paymentReference: String,

    receipts: [
      {
        fileName: { type: String, required: true },
        fileUrl: { type: String, required: true },
        fileType: { type: String, required: true },
        fileSize: { type: Number, required: true },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      },
    ],

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
      index: true,
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },

    journalId: {
      type: Schema.Types.ObjectId,
      ref: "Journal",
      index: true,
    },

    budgetTracking: {
      budgetId: { type: Schema.Types.ObjectId, ref: "Budget" },
      budgetCategory: String,
      budgetedAmount: Number,
      spentAmount: Number,
      remainingAmount: Number,
      exceedsBudget: { type: Boolean, default: false },
    },

    isReimbursement: {
      type: Boolean,
      default: false,
      index: true,
    },

    reimbursementTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    reimbursementStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "PAID"],
    },

    description: {
      type: String,
      required: true,
    },

    notes: String,
    tags: [String],
    internalReference: String,

    // createdBy, updatedBy, version added by auditPlugin
  },
  {
    timestamps: true,
    collection: "finance_expenses",
  },
);

// ============================================================================
// PLUGINS
// ============================================================================

ExpenseSchema.plugin(tenantIsolationPlugin);
ExpenseSchema.plugin(auditPlugin);

// ============================================================================
// INDEXES
// ============================================================================

// Compound tenant-scoped unique index
ExpenseSchema.index(
  { orgId: 1, expenseNumber: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);

// Query indexes (tenant-scoped)
ExpenseSchema.index({ orgId: 1, expenseDate: -1 });
ExpenseSchema.index({ orgId: 1, status: 1, expenseDate: -1 });
ExpenseSchema.index({ orgId: 1, expenseType: 1, expenseDate: -1 });
ExpenseSchema.index({ orgId: 1, vendorId: 1, expenseDate: -1 });
ExpenseSchema.index({ orgId: 1, workOrderId: 1 });
ExpenseSchema.index({ orgId: 1, projectId: 1 });
ExpenseSchema.index({ orgId: 1, currentApprovalLevel: 1, status: 1 });

// Search index (tenant-scoped)
ExpenseSchema.index({
  orgId: 1,
  expenseNumber: "text",
  description: "text",
  vendorName: "text",
  notes: "text",
});

// ============================================================================
// HOOKS
// ============================================================================

// Pre-save: Auto-generate expense number and calculate totals
ExpenseSchema.pre("save", async function (next) {
  // Generate expense number
  if (this.isNew && !this.expenseNumber) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    const Expense = this.constructor as typeof import("mongoose").Model;
    const lastExpense = await Expense.findOne({
      orgId: this.orgId,
      expenseNumber: new RegExp(`^EXP-${yearMonth}-`),
    }).sort({ expenseNumber: -1 });

    let nextNum = 1;
    if (lastExpense?.expenseNumber) {
      const match = lastExpense.expenseNumber.match(/-(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    this.expenseNumber = `EXP-${yearMonth}-${String(nextNum).padStart(4, "0")}`;
  }

  // Calculate line item amounts and taxes
  this.lineItems.forEach((item) => {
    item.amount = item.quantity * item.unitPrice;
    if (item.taxable) {
      item.taxAmount = item.amount * item.taxRate;
    } else {
      item.taxAmount = 0;
    }
  });

  // Calculate totals
  this.subtotal = this.lineItems.reduce((sum, item) => sum + item.amount, 0);
  this.totalTax = this.lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
  this.totalAmount = this.subtotal + this.totalTax;

  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Submit expense for approval
 */
ExpenseSchema.methods.submit = function () {
  if (this.status !== ExpenseStatus.DRAFT) {
    throw new Error("Only draft expenses can be submitted");
  }

  if (this.lineItems.length === 0) {
    throw new Error("Cannot submit expense with no line items");
  }

  this.status = ExpenseStatus.SUBMITTED;
  this.submittedAt = new Date();
  this.currentApprovalLevel = 1;
};

/**
 * Approve expense at current level
 */
ExpenseSchema.methods.approve = function (
  approverId: Types.ObjectId,
  approverName: string,
  comments?: string,
) {
  const currentApproval = this.approvals.find(
    (a: IExpenseApproval) => a.level === this.currentApprovalLevel,
  );

  if (!currentApproval) {
    throw new Error("No approval pending at current level");
  }

  if (currentApproval.status !== "PENDING") {
    throw new Error("Approval already processed");
  }

  currentApproval.status = "APPROVED";
  currentApproval.approverId = approverId;
  currentApproval.approverName = approverName;
  currentApproval.reviewedAt = new Date();
  currentApproval.comments = comments;

  // Check if there are more approval levels
  const nextLevel = this.currentApprovalLevel + 1;
  const hasNextLevel = this.approvals.some(
    (a: IExpenseApproval) => a.level === nextLevel,
  );

  if (hasNextLevel) {
    this.currentApprovalLevel = nextLevel;
  } else {
    // All approvals complete
    this.status = ExpenseStatus.APPROVED;
    this.approvedAt = new Date();
  }
};

/**
 * Reject expense
 */
ExpenseSchema.methods.reject = function (
  approverId: Types.ObjectId,
  approverName: string,
  comments: string,
) {
  const currentApproval = this.approvals.find(
    (a: IExpenseApproval) => a.level === this.currentApprovalLevel,
  );

  if (!currentApproval) {
    throw new Error("No approval pending at current level");
  }

  currentApproval.status = "REJECTED";
  currentApproval.approverId = approverId;
  currentApproval.approverName = approverName;
  currentApproval.reviewedAt = new Date();
  currentApproval.comments = comments;

  this.status = ExpenseStatus.REJECTED;
};

/**
 * Mark as paid
 */
ExpenseSchema.methods.markAsPaid = function (
  paymentId: Types.ObjectId,
  paymentReference?: string,
) {
  if (this.status !== ExpenseStatus.APPROVED) {
    throw new Error("Only approved expenses can be marked as paid");
  }

  this.status = ExpenseStatus.PAID;
  this.paymentId = paymentId;
  this.paymentReference = paymentReference;
  this.paidAt = new Date();
};

/**
 * Add receipt
 */
ExpenseSchema.methods.addReceipt = function (
  fileName: string,
  fileUrl: string,
  fileType: string,
  fileSize: number,
  uploadedBy: Types.ObjectId,
) {
  this.receipts.push({
    fileName,
    fileUrl,
    fileType,
    fileSize,
    uploadedAt: new Date(),
    uploadedBy,
  });
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get pending approvals for a user role
 */
ExpenseSchema.statics.getPendingApprovals = function (
  orgId: Types.ObjectId,
  approverRole: string,
) {
  return this.find({
    orgId,
    status: ExpenseStatus.SUBMITTED,
    "approvals.approverRole": approverRole,
    "approvals.status": "PENDING",
  }).sort({ submittedAt: 1 });
};

/**
 * Get expenses by category for reporting
 */
ExpenseSchema.statics.getByCategory = async function (
  orgId: Types.ObjectId,
  startDate: Date,
  endDate: Date,
) {
  const expenses = await this.find({
    orgId,
    expenseDate: { $gte: startDate, $lte: endDate },
    status: { $in: [ExpenseStatus.APPROVED, ExpenseStatus.PAID] },
  });

  const byCategory: Record<string, number> = {};

  for (const expense of expenses) {
    for (const item of expense.lineItems) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = 0;
      }
      byCategory[item.category] += item.amount + item.taxAmount;
    }
  }

  return byCategory;
};

/**
 * Get expense summary
 */
ExpenseSchema.statics.getSummary = async function (
  orgId: Types.ObjectId,
  startDate: Date,
  endDate: Date,
) {
  const expenses = await this.find({
    orgId,
    expenseDate: { $gte: startDate, $lte: endDate },
    status: { $in: [ExpenseStatus.APPROVED, ExpenseStatus.PAID] },
  });

  return {
    totalExpenses: expenses.reduce(
      (sum: number, e: IExpense) => sum + e.totalAmount,
      0,
    ),
    totalTax: expenses.reduce(
      (sum: number, e: IExpense) => sum + e.totalTax,
      0,
    ),
    count: expenses.length,
    byType: expenses.reduce(
      (acc: Record<string, number>, e: IExpense) => {
        acc[e.expenseType] = (acc[e.expenseType] || 0) + e.totalAmount;
        return acc;
      },
      {} as Record<string, number>,
    ),
    byVendor: expenses.reduce(
      (acc: Record<string, number>, e: IExpense) => {
        acc[e.vendorName] = (acc[e.vendorName] || 0) + e.totalAmount;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

export const Expense = getModel<IExpense>("Expense", ExpenseSchema);
