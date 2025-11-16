import { Schema, model, models, InferSchemaType, Types } from "mongoose";
import { getModel, MModel } from '@/src/types/mongoose-compat';
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";
import { auditPlugin } from "../../plugins/auditPlugin";

const ContractStatus = ["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED", "RENEWED"] as const;
const PaymentFrequency = ["MONTHLY", "QUARTERLY", "ANNUALLY", "PER_TRANSACTION"] as const;

const AgentContractSchema = new Schema({
  // Multi-tenancy - added by plugin
  // orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

  // Contract Number (auto-generated)
  contractNumber: { type: String, required: true },
  
  // Parties
  ownerId: { type: Schema.Types.ObjectId, ref: "Owner", required: true, index: true },
  agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, // Real estate agent user
  agentName: { type: String, required: true },
  agentLicenseNumber: String,
  
  // Properties covered by this contract
  properties: [{
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    propertyName: String,
    propertyCode: String,
    includeAllUnits: { type: Boolean, default: true },
    specificUnits: [String] // Unit numbers if not all units
  }],

  // Contract Terms
  terms: {
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    autoRenew: { type: Boolean, default: false },
    renewalNoticeDays: { type: Number, default: 60 }, // Days before expiry to notify
    terminationNoticeDays: { type: Number, default: 30 }
  },

  // Commission Structure
  commission: {
    type: { type: String, enum: ["PERCENTAGE", "FIXED_AMOUNT", "HYBRID"], required: true },
    percentage: Number, // For percentage type (e.g., 5% of rent)
    fixedAmount: Number, // For fixed amount type
    applyTo: { 
      type: String, 
      enum: ["MONTHLY_RENT", "ANNUAL_RENT", "FIRST_MONTH_ONLY", "PER_TRANSACTION"],
      default: "MONTHLY_RENT" 
    },
    paymentFrequency: { type: String, enum: PaymentFrequency, default: "MONTHLY" },
    vatIncluded: { type: Boolean, default: false }
  },

  // Agent Responsibilities
  responsibilities: {
    tenantAcquisition: { type: Boolean, default: true },
    rentCollection: { type: Boolean, default: true },
    maintenanceCoordination: { type: Boolean, default: true },
    inspections: { type: Boolean, default: true },
    legalCompliance: { type: Boolean, default: false },
    marketing: { type: Boolean, default: true },
    financialReporting: { type: Boolean, default: true },
    customResponsibilities: [String]
  },

  // Financial Terms
  financial: {
    currency: { type: String, default: "SAR" },
    estimatedMonthlyCommission: Number,
    estimatedAnnualCommission: Number,
    securityDeposit: Number, // From agent to owner
    insuranceRequired: { type: Boolean, default: false },
    insuranceAmount: Number
  },

  // Performance Metrics
  performance: {
    minimumOccupancy: Number, // Percentage
    maximumVacancyDays: Number,
    minimumRentCollection: Number, // Percentage
    penaltyForNonPerformance: Number
  },

  // Contract Documents
  documents: [{
    type: { type: String, required: true }, // CONTRACT, LICENSE_COPY, INSURANCE, AMENDMENT, etc.
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
    expiresAt: Date,
    verified: { type: Boolean, default: false }
  }],

  // Status and History
  status: { type: String, enum: ContractStatus, default: "DRAFT", index: true },
  statusHistory: [{
    status: { type: String, enum: ContractStatus },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reason: String,
    notes: String
  }],

  // Termination Details
  termination: {
    terminatedAt: Date,
    terminatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reason: String,
    noticePeriodServed: Boolean,
    penaltyAmount: Number,
    settlementAmount: Number,
    settlementPaid: { type: Boolean, default: false }
  },

  // Renewal Details
  renewal: {
    renewedFrom: { type: Schema.Types.ObjectId, ref: "AgentContract" }, // Previous contract
    renewedTo: { type: Schema.Types.ObjectId, ref: "AgentContract" }, // New contract
    renewalDate: Date,
    changesFromPrevious: [String]
  },

  // Notifications
  notifications: {
    expiryNotificationSent: { type: Boolean, default: false },
    expiryNotificationDate: Date,
    renewalReminderSent: { type: Boolean, default: false },
    renewalReminderDate: Date
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
AgentContractSchema.plugin(tenantIsolationPlugin);
AgentContractSchema.plugin(auditPlugin);

// Indexes
AgentContractSchema.index({ orgId: 1, contractNumber: 1 }, { unique: true });
AgentContractSchema.index({ orgId: 1, ownerId: 1, status: 1 });
AgentContractSchema.index({ orgId: 1, agentId: 1, status: 1 });
AgentContractSchema.index({ orgId: 1, "properties.propertyId": 1 });
AgentContractSchema.index({ orgId: 1, "terms.endDate": 1 }); // For expiry notifications

// Virtual for contract duration in days
AgentContractSchema.virtual('durationDays').get(function() {
  if (!this.terms?.startDate || !this.terms?.endDate) return 0;
  const diff = this.terms.endDate.getTime() - this.terms.startDate.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for days until expiry
AgentContractSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.terms?.endDate) return null;
  const now = new Date();
  const diff = this.terms.endDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for contract active status
AgentContractSchema.virtual('isActive').get(function() {
  if (this.status !== 'ACTIVE') return false;
  if (!this.terms?.startDate || !this.terms?.endDate) return false;
  const now = new Date();
  return now >= this.terms.startDate && now <= this.terms.endDate;
});

// Pre-save: Update status based on dates
AgentContractSchema.pre('save', function(next) {
  const now = new Date();
  
  // Auto-transition ACTIVE -> EXPIRED
  if (this.status === 'ACTIVE' && this.terms?.endDate && now > this.terms.endDate) {
    this.status = 'EXPIRED';
  }
  
  next();
});

// Export type and model
export type AgentContract = InferSchemaType<typeof AgentContractSchema>;
export const AgentContractModel = getModel<any>("AgentContract", AgentContractSchema);
