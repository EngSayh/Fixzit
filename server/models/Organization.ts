import { Schema, model, models, InferSchemaType } from "mongoose";

// Organization Types and Status
const OrganizationType = ["CORPORATE", "GOVERNMENT", "INDIVIDUAL", "NONPROFIT", "STARTUP"] as const;
const SubscriptionStatus = ["ACTIVE", "SUSPENDED", "CANCELLED", "TRIAL", "EXPIRED"] as const;
const ComplianceStatus = ["COMPLIANT", "NON_COMPLIANT", "PENDING_REVIEW", "UNDER_AUDIT"] as const;

const OrganizationSchema = new Schema({
  // Primary identifier for multi-tenancy
  orgId: { type: String, required: true, unique: true },

  // Basic Information
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true }, // Short code for organization
  type: { type: String, enum: OrganizationType, required: true },
  description: String,
  website: String,
  logo: String, // URL to logo image

  // Contact Information
  contact: {
    primary: {
      name: { type: String, required: true },
      title: String,
      email: { type: String, required: true },
      phone: String,
      mobile: String
    },
    billing: {
      name: String,
      email: String,
      phone: String,
      address: {
        street: String,
        city: String,
        region: String,
        postalCode: String,
        country: { type: String, default: "SA" }
      }
    },
    technical: {
      name: String,
      email: String,
      phone: String
    }
  },

  // Address Information
  address: {
    headquarters: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      region: String,
      postalCode: String,
      country: { type: String, default: "SA", required: true }
    },
    branches: [{
      name: String,
      street: String,
      city: String,
      region: String,
      postalCode: String,
      country: String,
      isActive: { type: Boolean, default: true }
    }]
  },

  // Legal and Compliance Information
  legal: {
    registrationNumber: String, // Commercial registration
    taxId: String, // VAT registration
    licenseNumber: String,
    documents: [{
      type: String, // Commercial Registration, VAT Certificate, etc.
      number: String,
      issuedBy: String,
      issuedDate: Date,
      expiryDate: Date,
      url: String, // Document file URL
      verified: { type: Boolean, default: false }
    }]
  },

  // Subscription and Billing
  subscription: {
    plan: { type: String, required: true, default: "BASIC" }, // BASIC, STANDARD, PREMIUM, ENTERPRISE
    status: { type: String, enum: SubscriptionStatus, default: "TRIAL" },
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    trialEndsAt: Date,
    billingCycle: { type: String, enum: ["MONTHLY", "QUARTERLY", "YEARLY"], default: "MONTHLY" },
    price: {
      amount: Number,
      currency: { type: String, default: "SAR" }
    },
    features: {
      maxUsers: { type: Number, default: 10 },
      maxProperties: { type: Number, default: 5 },
      maxWorkOrders: { type: Number, default: 100 },
      advancedReporting: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      ssoIntegration: { type: Boolean, default: false },
      mobileApp: { type: Boolean, default: true },
      supportLevel: { type: String, enum: ["BASIC", "PRIORITY", "DEDICATED"], default: "BASIC" }
    },
    usage: {
      currentUsers: { type: Number, default: 0 },
      currentProperties: { type: Number, default: 0 },
      currentWorkOrders: { type: Number, default: 0 },
      apiCalls: { type: Number, default: 0 },
      storageUsed: { type: Number, default: 0 } // in MB
    },
    limits: {
      exceeded: { type: Boolean, default: false },
      warnings: [String]
    }
  },

  // System Configuration
  settings: {
    // Localization
    locale: { type: String, default: "ar" },
    timezone: { type: String, default: "Asia/Riyadh" },
    currency: { type: String, default: "SAR" },
    dateFormat: { type: String, default: "DD/MM/YYYY" },
    numberFormat: { type: String, default: "1,234.56" },

    // Business Rules
    businessHours: {
      workdays: [{ type: String, enum: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] }],
      startTime: { type: String, default: "09:00" },
      endTime: { type: String, default: "17:00" },
      breakTime: {
        enabled: { type: Boolean, default: true },
        start: { type: String, default: "12:00" },
        end: { type: String, default: "13:00" }
      }
    },

    // Work Order Configuration
    workOrders: {
      autoAssignment: { type: Boolean, default: false },
      requireApproval: { type: Boolean, default: true },
      defaultPriority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], default: "MEDIUM" },
      slaDefaults: {
        low: { hours: 72 },
        medium: { hours: 48 },
        high: { hours: 24 },
        urgent: { hours: 4 }
      },
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true }
      }
    },

    // Financial Settings
    financial: {
      invoiceNumberFormat: { type: String, default: "INV-{YYYY}-{MM}-{####}" },
      paymentTerms: { type: Number, default: 30 }, // days
      lateFeePercentage: { type: Number, default: 2.5 },
      taxRate: { type: Number, default: 15 }, // VAT percentage
      approvalLimits: {
        workOrder: { type: Number, default: 1000 },
        purchase: { type: Number, default: 5000 },
        invoice: { type: Number, default: 10000 }
      }
    },

    // Security Settings
    security: {
      passwordPolicy: {
        minLength: { type: Number, default: 8 },
        requireUppercase: { type: Boolean, default: true },
        requireNumbers: { type: Boolean, default: true },
        requireSpecialChars: { type: Boolean, default: false },
        expiryDays: { type: Number, default: 90 }
      },
      sessionTimeout: { type: Number, default: 480 }, // minutes
      maxLoginAttempts: { type: Number, default: 5 },
      twoFactorRequired: { type: Boolean, default: false },
      ipWhitelist: [String],
      auditLogRetention: { type: Number, default: 365 } // days
    },

    // Integration Settings
    integrations: {
      emailProvider: {
        provider: { type: String, enum: ["SMTP", "SENDGRID", "AWS_SES"], default: "SMTP" },
        settings: Schema.Types.Mixed
      },
      smsProvider: {
        provider: { type: String, enum: ["TWILIO", "AWS_SNS", "LOCAL"], default: "LOCAL" },
        settings: Schema.Types.Mixed
      },
      paymentGateway: {
        provider: { type: String, enum: ["PAYTABS", "STRIPE", "PAYPAL"], default: "PAYTABS" },
        settings: Schema.Types.Mixed
      },
      sso: {
        enabled: { type: Boolean, default: false },
        provider: { type: String, enum: ["AZURE_AD", "GOOGLE", "OKTA"] },
        settings: Schema.Types.Mixed
      }
    }
  },

  // Compliance and Audit
  compliance: {
    status: { type: String, enum: ComplianceStatus, default: "PENDING_REVIEW" },
    certifications: [{
      name: String, // ISO 27001, SOC 2, etc.
      number: String,
      issuedBy: String,
      issuedDate: Date,
      expiryDate: Date,
      url: String,
      verified: { type: Boolean, default: false }
    }],
    policies: [{
      name: String,
      version: String,
      approvedBy: String,
      approvedDate: Date,
      url: String
    }],
    auditTrail: {
      enabled: { type: Boolean, default: true },
      retentionPeriod: { type: Number, default: 2555 }, // days (7 years)
      externalAuditor: String,
      lastAuditDate: Date,
      nextAuditDate: Date
    },
    dataPrivacy: {
      gdprCompliant: { type: Boolean, default: false },
      dataRetentionPeriod: { type: Number, default: 2555 }, // days
      anonymizationEnabled: { type: Boolean, default: false },
      rightToForget: { type: Boolean, default: false }
    }
  },

  // Status and Health
  status: {
    isActive: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },
    suspensionReason: String,
    maintenanceMode: { type: Boolean, default: false },
    lastHealthCheck: Date,
    healthStatus: { type: String, enum: ["HEALTHY", "WARNING", "CRITICAL"], default: "HEALTHY" },
    healthDetails: Schema.Types.Mixed
  },

  // Custom Fields and Metadata
  customFields: Schema.Types.Mixed,
  tags: [String],
  notes: String,

  // Audit Fields
  createdBy: { type: String, required: true },
  updatedBy: String,
  version: { type: Number, default: 1 }
}, {
  timestamps: true
});

// Indexes for performance
OrganizationSchema.index({ orgId: 1 });
OrganizationSchema.index({ code: 1 });
OrganizationSchema.index({ "subscription.status": 1 });
OrganizationSchema.index({ "status.isActive": 1 });
OrganizationSchema.index({ createdAt: -1 });

// Pre-save middleware to generate orgId if not provided
OrganizationSchema.pre('save', function(next) {
  if (this.isNew && !this.orgId) {
    this.orgId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  next();
});

// Virtual for subscription days remaining
OrganizationSchema.virtual('subscriptionDaysRemaining').get(function() {
  if (!this.subscription?.endDate) return null;
  const now = new Date();
  const endDate = new Date(this.subscription.endDate);
  const diffTime = endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to check if feature is enabled
OrganizationSchema.methods.hasFeature = function(featureName: string): boolean {
  return this.subscription?.features?.[featureName] === true;
};

// Method to check usage limits
OrganizationSchema.methods.checkUsageLimits = function() {
  const usage = this.subscription.usage;
  const features = this.subscription.features;
  const warnings = [];

  if (usage.currentUsers >= features.maxUsers) {
    warnings.push(`User limit reached (${usage.currentUsers}/${features.maxUsers})`);
  }
  if (usage.currentProperties >= features.maxProperties) {
    warnings.push(`Property limit reached (${usage.currentProperties}/${features.maxProperties})`);
  }
  if (usage.currentWorkOrders >= features.maxWorkOrders) {
    warnings.push(`Work order limit reached (${usage.currentWorkOrders}/${features.maxWorkOrders})`);
  }

  this.subscription.limits.warnings = warnings;
  this.subscription.limits.exceeded = warnings.length > 0;
  
  return warnings;
};

export type OrganizationDoc = InferSchemaType<typeof OrganizationSchema>;

export const Organization = models.Organization || model("Organization", OrganizationSchema);
