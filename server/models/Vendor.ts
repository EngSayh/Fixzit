import { Schema, model, models, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const VendorStatus = ["PENDING", "APPROVED", "SUSPENDED", "REJECTED", "BLACKLISTED"] as const;
const VendorType = ["SUPPLIER", "CONTRACTOR", "SERVICE_PROVIDER", "CONSULTANT"] as const;

const VendorSchema = new Schema({
  // tenantId REMOVED - plugin will add orgId

  // Basic Information
  code: { type: String, required: true }, // unique removed - will be tenant-scoped
  name: { type: String, required: true },
  type: { type: String, enum: VendorType, required: true },

  // Contact Information
  contact: {
    primary: {
      name: String,
      title: String,
      email: String,
      phone: String,
      mobile: String
    },
    secondary: {
      name: String,
      email: String,
      phone: String
    },
    address: {
      street: String,
      city: String,
      region: String,
      postalCode: String,
      country: { type: String, default: "SA" }
    }
  },

  // Business Information
  business: {
    registrationNumber: String,
    taxId: String,
    licenseNumber: String,
    establishedDate: Date,
    employees: Number,
    annualRevenue: Number,
    specializations: [String], // Areas of expertise
    certifications: [{
      name: String,
      issuer: String,
      issued: Date,
      expires: Date,
      status: String // VALID, EXPIRED, PENDING
    }]
  },

  // Approval Status
  status: { type: String, enum: VendorStatus, default: "PENDING" },
  approval: {
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectionReason: String,
    suspensionReason: String,
    reviewNotes: String
  },

  // Performance Metrics
  performance: {
    rating: { type: Number, min: 0, max: 5 },
    completedProjects: Number,
    ongoingProjects: Number,
    successRate: Number, // percentage
    averageResponseTime: Number, // hours
    complianceRate: Number, // percentage
    reviews: [{
      clientId: { type: Schema.Types.ObjectId, ref: 'Organization' },
      rating: Number,
      comment: String,
      date: Date,
      projectId: { type: Schema.Types.ObjectId, ref: 'Project' }
    }]
  },

  // Financial Information
  financial: {
    bankDetails: {
      accountNumber: String,
      bankName: String,
      iban: String
    },
    creditLimit: Number,
    paymentTerms: Number, // days
    outstandingBalance: Number,
    paymentHistory: [{
      date: Date,
      amount: Number,
      invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
      status: String, // PAID, PENDING, OVERDUE
      method: String
    }]
  },

  // Services & Products
  catalog: [{
    category: String,
    subcategory: String,
    products: [{
      code: String,
      name: String,
      description: String,
      unitPrice: Number,
      currency: { type: String, default: "SAR" },
      leadTime: Number, // days
      availability: String, // IN_STOCK, OUT_OF_STOCK, DISCONTINUED
      specifications: Schema.Types.Mixed
    }]
  }],

  // Work History
  projects: [{
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    name: String,
    type: String,
    startDate: Date,
    endDate: Date,
    value: Number,
    status: String, // COMPLETED, ONGOING, CANCELLED
    clientId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    rating: Number,
    feedback: String
  }],

  // Compliance
  compliance: {
    insurance: {
      provider: String,
      policyNumber: String,
      coverage: Number,
      expiry: Date,
      status: String // VALID, EXPIRED, PENDING
    },
    licenses: [{
      type: String, // Business License, Trade License, etc.
      number: String,
      issued: Date,
      expires: Date,
      status: String
    }],
    certifications: [{
      type: String, // ISO, OSHA, etc.
      number: String,
      issued: Date,
      expires: Date,
      status: String
    }],
    backgroundCheck: Boolean,
    references: [{
      company: String,
      contact: String,
      phone: String,
      email: String,
      verified: Boolean
    }]
  },

  // Contracts & Agreements
  contracts: [{
    contractId: { type: Schema.Types.ObjectId, ref: 'Contract' },
    type: String, // MASTER, PROJECT_SPECIFIC, NDA, etc.
    startDate: Date,
    endDate: Date,
    value: Number,
    terms: String,
    status: String, // ACTIVE, EXPIRED, TERMINATED
    signed: Date,
    signedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  }],

  // Preferences
  preferences: {
    notification: {
      email: Boolean,
      sms: Boolean,
      app: Boolean
    },
    communication: {
      preferredMethod: String, // EMAIL, PHONE, APP
      preferredLanguage: { type: String, default: "ar" }
    }
  },

  // Metadata
  tags: [String],
  customFields: Schema.Types.Mixed

  // createdBy/updatedBy will be added by auditPlugin
}, {
  timestamps: true
});

// APPLY PLUGINS (BEFORE INDEXES)
VendorSchema.plugin(tenantIsolationPlugin);
VendorSchema.plugin(auditPlugin);

// INDEXES (AFTER PLUGINS)
// CRITICAL FIX: Tenant-scoped unique index for 'code'
VendorSchema.index({ orgId: 1, code: 1 }, { unique: true });

// FIXED: Tenant-scoped indexes
VendorSchema.index({ orgId: 1, status: 1 });
VendorSchema.index({ orgId: 1, type: 1 });
VendorSchema.index({ orgId: 1, 'performance.rating': -1 });
VendorSchema.index({ orgId: 1, 'business.specializations': 1 });

export type VendorDoc = InferSchemaType<typeof VendorSchema>;

let VendorModel: ReturnType<typeof model<VendorDoc>>;
if (typeof models !== 'undefined' && models.Vendor) {
  VendorModel = models.Vendor as ReturnType<typeof model<VendorDoc>>;
} else {
  VendorModel = model<VendorDoc>("Vendor", VendorSchema);
}
export const Vendor = VendorModel;
