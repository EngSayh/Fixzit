import { Schema, model, models, InferSchemaType, Types } from "mongoose";
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";
import { auditPlugin } from "../../plugins/auditPlugin";

const BillStatus = ["PENDING", "ISSUED", "PAID", "OVERDUE", "DISPUTED", "CANCELLED", "REFUNDED"] as const;
const PaymentStatus = ["UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"] as const;

const UtilityBillSchema = new Schema({
  // Multi-tenancy - added by plugin
  // orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

  // Bill Identification
  billNumber: { type: String, required: true },
  providerBillNumber: String, // Bill number from utility provider
  
  // Related Meter
  meterId: { type: Schema.Types.ObjectId, ref: "UtilityMeter", required: true, index: true },
  propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true, index: true },
  unitNumber: String,
  
  // Bill Period
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    daysInPeriod: Number,
    month: Number, // 1-12
    year: Number // For easy querying
  },

  // Reading Information
  readings: {
    previous: {
      value: Number,
      date: Date
    },
    current: {
      value: Number,
      date: Date
    },
    consumption: Number, // current - previous
    unit: String // kWh, m³, etc.
  },

  // Charges Breakdown
  charges: {
    consumption: {
      amount: Number,
      rate: Number,
      unit: String
    },
    fixedCharges: Number,
    demandCharges: Number,
    fuelAdjustment: Number,
    subsidies: Number, // Negative value
    governmentTax: Number,
    vat: {
      rate: Number, // Percentage
      amount: Number
    },
    otherCharges: [{
      description: String,
      amount: Number
    }],
    totalBeforeTax: Number,
    totalAmount: { type: Number, required: true }
  },

  // Payment Information
  payment: {
    status: { type: String, enum: PaymentStatus, default: "UNPAID", index: true },
    dueDate: { type: Date, required: true, index: true },
    paidAmount: { type: Number, default: 0 },
    paidDate: Date,
    paidBy: { type: Schema.Types.ObjectId, ref: "User" },
    paymentMethod: String, // BANK_TRANSFER, CREDIT_CARD, SADAD, etc.
    transactionReference: String,
    latePaymentFee: Number,
    remainingBalance: Number
  },

  // Responsible Party (who should pay)
  responsibility: {
    type: { type: String, enum: ["OWNER", "TENANT", "SHARED"], required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "Owner" },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant" },
    ownerPercentage: { type: Number, min: 0, max: 100 },
    tenantPercentage: { type: Number, min: 0, max: 100 },
    splitReason: String // E.g., "Vacant during period", "Shared facilities"
  },

  // OCR Processing (if bill was scanned)
  ocr: {
    processed: { type: Boolean, default: false },
    processedDate: Date,
    confidence: Number, // 0-100
    provider: String,
    originalFileUrl: String,
    extractedData: Schema.Types.Mixed,
    manuallyVerified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedDate: Date,
    corrections: [{
      field: String,
      ocrValue: Schema.Types.Mixed,
      correctedValue: Schema.Types.Mixed,
      correctedBy: { type: Schema.Types.ObjectId, ref: "User" },
      correctedDate: Date
    }]
  },

  // IoT Data (if from smart meter)
  iot: {
    fromSmartMeter: { type: Boolean, default: false },
    deviceId: String,
    syncDate: Date,
    dataPoints: Number, // Number of readings averaged
    rawData: Schema.Types.Mixed
  },

  // Comparison and Analytics
  analytics: {
    averageConsumptionPast3Months: Number,
    averageConsumptionPast12Months: Number,
    percentageChange: Number, // vs previous bill
    isAnomaly: { type: Boolean, default: false },
    anomalyReason: String,
    costPerUnit: Number
  },

  // Documents
  documents: [{
    type: String, // BILL_PDF, PAYMENT_RECEIPT, etc.
    name: String,
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" }
  }],

  // Status
  status: { type: String, enum: BillStatus, default: "ISSUED", index: true },
  statusHistory: [{
    status: { type: String, enum: BillStatus },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reason: String,
    notes: String
  }],

  // Dispute Information
  dispute: {
    isDisputed: { type: Boolean, default: false },
    disputeDate: Date,
    disputeReason: String,
    disputeAmount: Number,
    disputeStatus: String, // PENDING, RESOLVED, REJECTED
    resolution: String,
    resolvedDate: Date,
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },

  // Notifications
  notifications: {
    dueDateReminderSent: { type: Boolean, default: false },
    dueDateReminderDate: Date,
    overdueNoticeSent: { type: Boolean, default: false },
    overdueNoticeDate: Date,
    highConsumptionAlertSent: { type: Boolean, default: false }
  },

  // Integration with Finance Module
  finance: {
    posted: { type: Boolean, default: false },
    journalEntryId: { type: Schema.Types.ObjectId, ref: "Journal" },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    postedDate: Date,
    postedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },

  // Metadata
  notes: String,
  tags: [String],
  customFields: Schema.Types.Mixed

  // createdBy, updatedBy, createdAt, updatedAt added by auditPlugin
}, {
  timestamps: true
});

// Apply plugins
UtilityBillSchema.plugin(tenantIsolationPlugin);
UtilityBillSchema.plugin(auditPlugin);

// Indexes
UtilityBillSchema.index({ orgId: 1, billNumber: 1 }, { unique: true });
UtilityBillSchema.index({ orgId: 1, meterId: 1, "period.year": 1, "period.month": 1 });
UtilityBillSchema.index({ orgId: 1, propertyId: 1, status: 1 });
UtilityBillSchema.index({ orgId: 1, "payment.status": 1, "payment.dueDate": 1 });
UtilityBillSchema.index({ orgId: 1, "responsibility.ownerId": 1 });
UtilityBillSchema.index({ orgId: 1, "responsibility.tenantId": 1 });

// Pre-save hook for calculations
UtilityBillSchema.pre('save', function(next) {
  // Calculate days in period
  if (this.isModified('period') && this.period?.startDate && this.period?.endDate) {
    const start = new Date(this.period.startDate);
    const end = new Date(this.period.endDate);
    this.period.daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    this.period.month = end.getMonth() + 1;
    this.period.year = end.getFullYear();
  }

  // Calculate consumption
  if (this.isModified('readings') && this.readings?.current?.value && this.readings?.previous?.value) {
    this.readings.consumption = this.readings.current.value - this.readings.previous.value;
  }

  // Calculate remaining balance
  if ((this.isModified('charges') || this.isModified('payment')) && this.charges?.totalAmount !== undefined && this.payment?.paidAmount !== undefined) {
    this.payment.remainingBalance = this.charges.totalAmount - this.payment.paidAmount;
  }

  // Update payment status
  if (this.isModified('payment.paidAmount') && this.charges?.totalAmount !== undefined && this.payment?.paidAmount !== undefined) {
    const total = this.charges.totalAmount;
    const paid = this.payment.paidAmount;
    
    if (paid === 0) {
      this.payment.status = 'UNPAID';
    } else if (paid < total) {
      this.payment.status = 'PARTIALLY_PAID';
    } else if (paid === total) {
      this.payment.status = 'PAID';
    } else {
      this.payment.status = 'OVERPAID';
    }
  }

  // Check overdue status
  const now = new Date();
  if (this.payment?.status === 'UNPAID' && this.payment?.dueDate && now > this.payment.dueDate && this.status === 'ISSUED') {
    this.status = 'OVERDUE';
  }

  next();
});

// Virtual for days overdue
UtilityBillSchema.virtual('daysOverdue').get(function() {
  if (this.payment?.status === 'PAID' || !this.payment?.dueDate) return 0;
  const now = new Date();
  if (now <= this.payment.dueDate) return 0;
  const diff = now.getTime() - this.payment.dueDate.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Method to record payment
UtilityBillSchema.methods.recordPayment = function(
  amount: number, 
  paymentMethod: string, 
  transactionRef: string,
  paidBy: Types.ObjectId
) {
  this.payment.paidAmount = (this.payment.paidAmount || 0) + amount;
  this.payment.paidDate = new Date();
  this.payment.paidBy = paidBy;
  this.payment.paymentMethod = paymentMethod;
  this.payment.transactionReference = transactionRef;
  
  if (this.payment.paidAmount >= this.charges.totalAmount) {
    this.status = 'PAID';
  }
  
  return this.save();
};

// Export type and model
export type UtilityBill = InferSchemaType<typeof UtilityBillSchema>;
export const UtilityBillModel = models.UtilityBill || model("UtilityBill", UtilityBillSchema);
