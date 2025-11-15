import { Schema, model, models, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

const InvoiceStatus = ["DRAFT", "SENT", "VIEWED", "APPROVED", "REJECTED", "PAID", "OVERDUE", "CANCELLED"] as const;
const InvoiceType = ["SALES", "PURCHASE", "RENTAL", "SERVICE", "MAINTENANCE"] as const;

const InvoiceSchema = new Schema({
  // Basic Information
  number: { type: String, required: true },
  type: { type: String, enum: InvoiceType, required: true },
  status: { type: String, enum: InvoiceStatus, default: "DRAFT" },

  // Parties
  issuer: {
    name: String,
    taxId: String,
    address: String,
    phone: String,
    email: String,
    registration: String, // Company registration number
    license: String // Business license
  },
  recipient: {
    name: String,
    taxId: String,
    address: String,
    phone: String,
    email: String,
    nationalId: String, // For individuals
    customerId: String // Reference to Customer/Tenant model
  },

  // Invoice Details
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  description: String,

  // Line Items
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    discount: Number,
    tax: {
      type: String, // VAT, EXCISE, etc.
      rate: Number,
      amount: Number
    },
    total: Number,
    category: String, // Goods, Services, etc.
    specifications: Schema.Types.Mixed
  }],

  // Totals
  subtotal: Number,
  discounts: [{
    type: String, // EARLY_PAYMENT, VOLUME, etc.
    amount: Number,
    description: String
  }],
  taxes: [{
    type: String, // VAT, EXCISE, etc.
    rate: Number,
    amount: Number,
    category: String
  }],
  total: Number,
  currency: { type: String, default: "SAR" },

  // Payment Information
  payment: {
    method: String, // CASH, BANK_TRANSFER, CARD, CHEQUE, etc.
    terms: String, // "Net 30", "Due on Receipt", etc.
    instructions: String,
    account: {
      bank: String,
      accountNumber: String,
      iban: String,
      swift: String
    }
  },

  // ZATCA Integration
  zatca: {
    uuid: String, // Unique invoice identifier
    hash: String, // Invoice hash for chaining
    qrCode: String, // Base64 encoded QR code
    status: {
      type: String,
      enum: ["PENDING", "GENERATED", "SIGNED", "CLEARED", "REPORTED"],
      default: "PENDING"
    },
    phase: Number, // ZATCA phase (1 or 2)
    xml: String, // XML content
    signedXml: String, // Signed XML content
    clearedAt: Date,
    reportedAt: Date,
    clearance: {
      requestId: String,
      responseId: String,
      status: String,
      errors: [String]
    }
  },

  // Approval Workflow
  approval: {
    required: Boolean,
    levels: [{
      level: Number,
      approver: String, // user ID
      status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"] },
      approvedAt: Date,
      comments: String
    }],
    finalApprover: String,
    finalApprovedAt: Date,
    rejectionReason: String
  },

  // Related Documents
  related: {
    workOrderId: String, // Reference to WorkOrder
    projectId: String, // Reference to Project
    contractId: String, // Reference to Contract
    purchaseOrderId: String, // Reference to Purchase Order
    receiptId: String // Reference to Receipt
  },

  // Payment Tracking
  payments: [{
    date: Date,
    amount: Number,
    method: String,
    reference: String,
    status: String, // PENDING, COMPLETED, FAILED
    transactionId: String,
    notes: String
  }],

  // Attachments
  attachments: [{
    type: String, // CONTRACT, RECEIPT, PROOF, etc.
    name: String,
    url: String,
    uploaded: Date,
    uploadedBy: String
  }],

  // Audit Trail
  history: [{
    action: String, // CREATED, SENT, VIEWED, APPROVED, PAID, etc.
    performedBy: String,
    performedAt: Date,
    details: String,
    ipAddress: String,
    userAgent: String
  }],

  // Compliance
  compliance: {
    taxCompliant: Boolean,
    regulation: String, // ZATCA, VAT, etc.
    version: String, // Compliance version
    certifiedAt: Date,
    certificateNumber: String
  },

  // Metadata
  tags: [String],
  customFields: Schema.Types.Mixed
}, {
  timestamps: true
});

// Apply plugins BEFORE indexes for proper tenant isolation and audit tracking
InvoiceSchema.plugin(tenantIsolationPlugin);
InvoiceSchema.plugin(auditPlugin);

// Tenant-scoped indexes for performance and data isolation
InvoiceSchema.index({ orgId: 1, number: 1 }, { unique: true });
InvoiceSchema.index({ orgId: 1, status: 1 });
InvoiceSchema.index({ orgId: 1, 'recipient.customerId': 1 });
InvoiceSchema.index({ orgId: 1, issueDate: -1 });
InvoiceSchema.index({ orgId: 1, dueDate: 1 });
InvoiceSchema.index({ orgId: 1, 'zatca.status': 1 });
InvoiceSchema.index({ orgId: 1, type: 1, status: 1 });

export type InvoiceDoc = InferSchemaType<typeof InvoiceSchema>;

// Edge Runtime compatible export - use conditional to avoid union type issues
let InvoiceModel: ReturnType<typeof model<InvoiceDoc>>;
if (typeof models !== 'undefined' && models.Invoice) {
  InvoiceModel = models.Invoice as ReturnType<typeof model<InvoiceDoc>>;
} else {
  InvoiceModel = model<InvoiceDoc>("Invoice", InvoiceSchema);
}

export const Invoice = InvoiceModel;
