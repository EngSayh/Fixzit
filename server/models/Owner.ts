import { Schema, model, models, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const OwnerType = ["INDIVIDUAL", "COMPANY", "TRUST", "GOVERNMENT"] as const;
const OwnerStatus = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

const OwnerSchema = new Schema({
  // Multi-tenancy - will be added by plugin
  // orgId: { type: String, required: true, index: true },

  // Basic Information
  code: { type: String, required: true }, // ⚡ Removed unique: true - enforced via compound index below
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Link to auth user (using ObjectId for consistency)
  type: { type: String, enum: OwnerType, required: true },
  
  // Personal/Company Information
  name: {
    first: String,
    middle: String,
    last: String,
    full: { type: String, required: true }
  },
  companyName: String, // If type is COMPANY
  nationalId: { type: String }, // ⚡ Iqama/ID number - uniqueness enforced via compound index below for tenant-scoped uniqueness
  commercialRegistration: String, // For companies
  taxNumber: String,

  // Contact Information
  contact: {
    email: { type: String, required: true },
    phone: { type: String, required: true },
    mobile: String,
    whatsapp: String,
    preferredMethod: { type: String, enum: ["EMAIL", "PHONE", "WHATSAPP"], default: "EMAIL" }
  },

  // Address
  address: {
    street: String,
    city: String,
    region: String,
    postalCode: String,
    country: { type: String, default: "SA" },
    nationalAddress: String // SPL National Address
  },

  // Financial Information
  financial: {
    bankAccounts: [{
      bankName: String,
      accountNumber: String,
      iban: String,
      swiftCode: String,
      isPrimary: Boolean
    }],
    paymentTerms: { type: String, default: "NET_30" }, // NET_15, NET_30, NET_60
    creditLimit: Number,
    currency: { type: String, default: "SAR" }
  },

  // Properties Owned
  properties: [{
    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
    ownershipType: { type: String, enum: ["FULL", "PARTIAL", "MANAGEMENT"] },
    ownershipPercentage: { type: Number, min: 0, max: 100 },
    startDate: Date,
    endDate: Date, // Null if current owner
    documents: [{
      type: String, // DEED, TITLE, POA, etc.
      url: String,
      uploadedAt: Date
    }]
  }],

  // Portfolio Summary (simplified - only store directly derivable count)
  // ⚡ Other metrics (totalUnits, totalArea, occupancyRate, revenue, expenses) should be calculated
  // dynamically via aggregation or virtuals to avoid data inconsistency
  portfolio: {
    totalProperties: { type: Number, default: 0 }
  },

  // Preferences
  preferences: {
    language: { type: String, enum: ["en", "ar"], default: "ar" },
    autoApproveMaintenanceUnder: Number, // Auto-approve maintenance under this amount
    receiveReports: { type: Boolean, default: true },
    reportFrequency: { type: String, enum: ["DAILY", "WEEKLY", "MONTHLY"], default: "MONTHLY" },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false }
    }
  },

  // Owner Portal - Subscription
  subscription: {
    plan: { type: String, enum: ["BASIC", "PRO", "ENTERPRISE"], default: "BASIC" },
    startDate: Date,
    endDate: Date, // Null for active indefinite
    activeUntil: { type: Date, index: true }, // ⚡ Use this for expiry checks, NOT createdAt
    autoRenew: { type: Boolean, default: false },
    billingCycle: { type: String, enum: ["MONTHLY", "QUARTERLY", "ANNUALLY"] },
    
    // Feature Access
    features: {
      maxProperties: { type: Number, default: 1 }, // BASIC: 1, PRO: 5, ENTERPRISE: unlimited
      utilitiesTracking: { type: Boolean, default: false },
      roiAnalytics: { type: Boolean, default: false },
      customReports: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      dedicatedSupport: { type: Boolean, default: false },
      multiUserAccess: { type: Boolean, default: false },
      advancedDelegation: { type: Boolean, default: false }
    },
    
    // Payment
    lastPaymentDate: Date,
    lastPaymentAmount: Number,
    nextBillingDate: Date,
    paymentMethod: String,
    invoiceId: { type: Schema.Types.ObjectId, ref: "SubscriptionInvoice" }
  },

  // Owner Portal - Nickname
  nickname: String, // Friendly identifier for the owner (e.g., "Mr. Ahmad's Portfolio")

  // Documents
  documents: [{
    type: String, // ID_COPY, CR_COPY, VAT_CERTIFICATE, etc.
    name: String,
    url: String,
    uploadedAt: Date,
    expiresAt: Date,
    status: { type: String, enum: ["PENDING", "VERIFIED", "EXPIRED", "REJECTED"] }
  }],

  // Status
  status: { type: String, enum: OwnerStatus, default: "ACTIVE" },
  statusReason: String,
  
  // Metadata
  notes: String,
  tags: [String],
  rating: { type: Number, min: 0, max: 5 }, // Internal rating
  lastContactDate: Date,
  
  // Timestamps managed by plugin
}, {
  timestamps: true
});

// Plugins (apply BEFORE indexes so orgId field exists)
OwnerSchema.plugin(tenantIsolationPlugin);
OwnerSchema.plugin(auditPlugin);

// Indexes (after plugins to ensure orgId exists)
OwnerSchema.index({ orgId: 1, code: 1 }, { unique: true }); // ⚡ Tenant-scoped uniqueness for code
OwnerSchema.index({ orgId: 1, userId: 1 });
OwnerSchema.index({ orgId: 1, status: 1 });
OwnerSchema.index({ orgId: 1, "contact.email": 1 });
OwnerSchema.index({ orgId: 1, nationalId: 1 }, { unique: true, sparse: true }); // ⚡ Tenant-scoped uniqueness for nationalId
OwnerSchema.index({ orgId: 1, "properties.propertyId": 1 });

// Pre-save hook to update portfolio summary (simplified)
OwnerSchema.pre('save', async function(next) {
  if (this.isModified('properties')) {
    // Get active properties (those without endDate)
    const activeProperties = this.properties.filter(p => !p.endDate);
    
    // Ensure portfolio exists
    if (!this.portfolio) {
      this.portfolio = { totalProperties: 0 };
    }
    
    // ⚡ Only update directly derivable count - avoid storing stale aggregated data
    // Other metrics (totalUnits, totalArea, occupancyRate, revenue, expenses) should be
    // calculated dynamically via aggregation pipelines or service methods to ensure accuracy
    this.portfolio.totalProperties = activeProperties.length;
  }
  next();
});

// Virtual for full name
OwnerSchema.virtual('displayName').get(function() {
  return this.companyName || this.name?.full || 'Unknown Owner';
});

// Export type and model
export type Owner = InferSchemaType<typeof OwnerSchema>;
let OwnerModelVar: ReturnType<typeof model>;
if (typeof models !== 'undefined' && models.Owner) {
  OwnerModelVar = models.Owner as ReturnType<typeof model>;
} else {
  OwnerModelVar = model("Owner", OwnerSchema);
}
export const OwnerModel = OwnerModelVar;
