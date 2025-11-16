import { Schema, model, models, InferSchemaType, Types } from "mongoose";
import { getModel, MModel } from '@/src/types/mongoose-compat';
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";
import { auditPlugin } from "../../plugins/auditPlugin";

const DelegationStatus = ["ACTIVE", "EXPIRED", "REVOKED", "SUSPENDED"] as const;
const DelegationScope = ["ALL", "APPROVALS", "MAINTENANCE", "FINANCIAL", "CONTRACTS", "INSPECTIONS"] as const;

const DelegationSchema = new Schema({
  // Multi-tenancy - added by plugin
  // orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

  // Delegation Number (auto-generated)
  delegationNumber: { type: String, required: true },
  
  // Parties
  delegator: {
    ownerId: { type: Schema.Types.ObjectId, ref: "Owner", required: true, index: true },
    ownerName: String,
    userId: { type: Schema.Types.ObjectId, ref: "User" }
  },
  
  delegate: {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    relationToOwner: String, // FAMILY, EMPLOYEE, AGENT, ATTORNEY, etc.
    nationalId: String,
    powerOfAttorney: {
      exists: Boolean,
      documentNumber: String,
      issueDate: Date,
      expiryDate: Date,
      documentUrl: String
    }
  },

  // Scope of Delegation
  scope: {
    level: { type: String, enum: DelegationScope, required: true },
    specificPermissions: [{
      module: String, // FM, FINANCE, CONTRACTS, etc.
      actions: [String], // VIEW, APPROVE, REJECT, CREATE, UPDATE, DELETE
      limitations: String
    }],
    
    // Financial limits
    financialLimits: {
      approvalThreshold: Number, // Maximum amount delegate can approve
      currency: { type: String, default: "SAR" },
      dailyLimit: Number,
      monthlyLimit: Number
    },
    
    // Property-specific scope
    properties: [{
      propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
      propertyName: String,
      includeAllUnits: { type: Boolean, default: true },
      specificUnits: [String]
    }],
    
    // Can delegate further?
    canSubDelegate: { type: Boolean, default: false },
    
    // Specific restrictions
    restrictions: [String]
  },

  // Time Period
  period: {
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, index: true }, // Null for indefinite
    indefinite: { type: Boolean, default: false },
    notificationBeforeExpiry: { type: Number, default: 7 } // Days
  },

  // Approval Workflow Settings
  approvalSettings: {
    requiresOwnerNotification: { type: Boolean, default: true },
    notifyOnActions: [String], // APPROVAL, REJECTION, PAYMENT, etc.
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    weeklyDigest: { type: Boolean, default: true }
  },

  // Activity Tracking
  activities: [{
    action: { type: String, required: true }, // APPROVED_INVOICE, REJECTED_WO, etc.
    module: String,
    referenceType: String, // Invoice, WorkOrder, Contract, etc.
    referenceId: { type: Schema.Types.ObjectId },
    referenceNumber: String,
    amount: Number,
    performedAt: { type: Date, default: Date.now },
    details: String,
    ownerNotified: Boolean,
    notificationDate: Date
  }],

  // Status
  status: { type: String, enum: DelegationStatus, default: "ACTIVE", index: true },
  statusHistory: [{
    status: { type: String, enum: DelegationStatus },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reason: String
  }],

  // Revocation Details
  revocation: {
    revokedAt: Date,
    revokedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reason: String,
    effectiveImmediately: Boolean,
    notificationSent: Boolean
  },

  // Suspension Details
  suspension: {
    suspendedAt: Date,
    suspendedBy: { type: Schema.Types.ObjectId, ref: "User" },
    suspendedUntil: Date,
    reason: String,
    resumedAt: Date
  },

  // Security
  security: {
    requiresOTP: { type: Boolean, default: false },
    requires2FA: { type: Boolean, default: false },
    ipRestrictions: [String], // Allowed IP addresses
    allowedDevices: [String], // Device IDs
    lastAccessDate: Date,
    lastAccessIP: String,
    failedAccessAttempts: { type: Number, default: 0 },
    lockedUntil: Date
  },

  // Notifications
  notifications: {
    invitationSent: { type: Boolean, default: false },
    invitationAccepted: { type: Boolean, default: false },
    invitationAcceptedDate: Date,
    expiryReminderSent: { type: Boolean, default: false },
    expiryReminderDate: Date
  },

  // Usage Statistics
  statistics: {
    totalActions: { type: Number, default: 0 },
    approvals: { type: Number, default: 0 },
    rejections: { type: Number, default: 0 },
    totalAmountApproved: { type: Number, default: 0 },
    lastActivityDate: Date,
    averageResponseTime: Number // Hours
  },

  // Documents
  documents: [{
    type: String, // POA, ID_COPY, DELEGATION_LETTER, etc.
    name: String,
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    verified: Boolean
  }],

  // Metadata
  notes: String,
  tags: [String],
  customFields: Schema.Types.Mixed

  // createdBy, updatedBy, createdAt, updatedAt added by auditPlugin
}, {
  timestamps: true
});

// Apply plugins
DelegationSchema.plugin(tenantIsolationPlugin);
DelegationSchema.plugin(auditPlugin);

// Indexes
DelegationSchema.index({ orgId: 1, delegationNumber: 1 }, { unique: true });
DelegationSchema.index({ orgId: 1, "delegator.ownerId": 1, status: 1 });
DelegationSchema.index({ orgId: 1, "delegate.userId": 1, status: 1 });
DelegationSchema.index({ orgId: 1, "period.endDate": 1 }); // For expiry notifications
DelegationSchema.index({ orgId: 1, "scope.properties.propertyId": 1 });

// Pre-save hook for status updates
DelegationSchema.pre('save', async function(next) {
  const now = new Date();
  
  // Auto-expire delegations
  if (this.status === 'ACTIVE' && !this.period?.indefinite && this.period?.endDate && now > this.period.endDate) {
    this.status = 'EXPIRED';
    this.statusHistory.push({
      status: 'EXPIRED',
      changedAt: now,
      reason: 'Delegation period ended',
      changedBy: undefined
    });
  }
  
  // Update statistics
  if (this.isModified('activities') && this.statistics && Array.isArray(this.activities)) {
    this.statistics.totalActions = this.activities.length;
    this.statistics.approvals = this.activities.filter((a: unknown) => {
      const activity = a as { action?: string };
      return activity?.action?.includes('APPROVED');
    }).length;
    this.statistics.rejections = this.activities.filter((a: unknown) => {
      const activity = a as { action?: string };
      return activity?.action?.includes('REJECTED');
    }).length;
    this.statistics.totalAmountApproved = this.activities
      .filter((a: unknown) => {
        const activity = a as { action?: string, amount?: number };
        return activity?.action?.includes('APPROVED') && typeof activity?.amount === 'number';
      })
      .reduce((sum: number, a: unknown) => {
        const activity = a as { amount?: number };
        return sum + (activity?.amount || 0);
      }, 0);
    
    if (this.activities.length > 0) {
      const lastActivity = this.activities[this.activities.length - 1] as { performedAt?: Date };
      if (lastActivity?.performedAt) {
        this.statistics.lastActivityDate = lastActivity.performedAt;
      }
    }
  }
  
  next();
});

// Virtual for is active
DelegationSchema.virtual('isActive').get(function() {
  if (this.status !== 'ACTIVE') return false;
  const now = new Date();
  if (this.period?.indefinite) return true;
  if (!this.period?.endDate) return true;
  if (!this.period?.startDate) return false;
  return now >= this.period.startDate && now <= this.period.endDate;
});

// Virtual for days until expiry
DelegationSchema.virtual('daysUntilExpiry').get(function() {
  if (this.period?.indefinite || !this.period?.endDate) return null;
  if (this.status !== 'ACTIVE') return null;
  const now = new Date();
  const diff = this.period.endDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Method to record activity
DelegationSchema.methods.recordActivity = function(activity: {
  action: string;
  module?: string;
  referenceType?: string;
  referenceId?: Types.ObjectId;
  referenceNumber?: string;
  amount?: number;
  details?: string;
}) {
  if (!this.activities) this.activities = [];
  
  this.activities.push({
    ...activity,
    performedAt: new Date(),
    ownerNotified: this.approvalSettings.requiresOwnerNotification,
    notificationDate: this.approvalSettings.requiresOwnerNotification ? new Date() : undefined
  });
  
  return this.save();
};

// Method to check permission
DelegationSchema.methods.hasPermission = function(module: string, action: string): boolean {
  if (!this.isActive) return false;
  
  if (this.scope.level === 'ALL') return true;
  
  const permission = this.scope.specificPermissions.find((p: { module?: string }) => p.module === module);
  if (!permission) return false;
  
  return permission.actions.includes(action);
};

// Method to check financial limit
DelegationSchema.methods.canApproveAmount = function(amount: number): boolean {
  if (!this.isActive) return false;
  if (!this.scope.financialLimits) return true;
  
  const threshold = this.scope.financialLimits.approvalThreshold;
  return !threshold || amount <= threshold;
};

// Export type and model
export type Delegation = InferSchemaType<typeof DelegationSchema>;
export const DelegationModel = getModel<any>("Delegation", DelegationSchema);
