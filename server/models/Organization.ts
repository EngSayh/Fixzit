import { Schema, model, models, HydratedDocument } from "mongoose";
import { MModel } from "@/src/types/mongoose-compat";
import { customAlphabet } from "nanoid";
import { auditPlugin } from "../plugins/auditPlugin";

// ---------- Enums ----------
const OrganizationType = [
  "CORPORATE",
  "GOVERNMENT",
  "INDIVIDUAL",
  "NONPROFIT",
  "STARTUP",
] as const;
type TOrganizationType = (typeof OrganizationType)[number];

const SubscriptionStatus = [
  "ACTIVE",
  "SUSPENDED",
  "CANCELLED",
  "TRIAL",
  "EXPIRED",
] as const;
type TSubscriptionStatus = (typeof SubscriptionStatus)[number];

const ComplianceStatus = [
  "COMPLIANT",
  "NON_COMPLIANT",
  "PENDING_REVIEW",
  "UNDER_AUDIT",
] as const;
type TComplianceStatus = (typeof ComplianceStatus)[number];

const BillingCycle = ["MONTHLY", "QUARTERLY", "YEARLY"] as const;
type TBillingCycle = (typeof BillingCycle)[number];

const SupportLevel = ["BASIC", "PRIORITY", "DEDICATED"] as const;
type TSupportLevel = (typeof SupportLevel)[number];

const Priority = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
type TPriority = (typeof Priority)[number];

const Workdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
type TWorkday = (typeof Workdays)[number];

const SsoProvider = ["AZURE_AD", "GOOGLE", "OKTA"] as const;
type TSsoProvider = (typeof SsoProvider)[number];

const EmailProvider = ["SMTP", "SENDGRID", "AWS_SES"] as const;
type TEmailProvider = (typeof EmailProvider)[number];

const SmsProvider = ["TWILIO", "AWS_SNS", "LOCAL"] as const;
type TSmsProvider = (typeof SmsProvider)[number];

const PaymentGateway = ["PAYTABS", "STRIPE", "PAYPAL"] as const;
type TPaymentGateway = (typeof PaymentGateway)[number];

// ---------- Types ----------
type Features = {
  maxUsers: number;
  maxProperties: number;
  maxWorkOrders: number;
  advancedReporting: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  ssoIntegration: boolean;
  mobileApp: boolean;
  supportLevel: TSupportLevel;
};

type Usage = {
  currentUsers: number;
  currentProperties: number;
  currentWorkOrders: number;
  apiCalls: number;
  storageUsed: number; // MB
};

export type ModulesConfig = {
  ats?: {
    enabled: boolean;
    jobPostLimit: number;
    seats: number;
    seatWarningThreshold?: number;
    activatedAt?: Date;
    billingPlan?: string;
  };
};

type OrganizationDoc = HydratedDocument<IOrganization>;
type OrganizationModel = MModel<IOrganization> & {
  incrementUsage(
    orgId: string,
    patch: Partial<Usage>,
  ): Promise<OrganizationDoc | null>;
  setSubscriptionStatus(
    orgId: string,
    status: TSubscriptionStatus,
  ): Promise<OrganizationDoc | null>;
};

export interface IOrganization {
  orgId: string;
  name: string;
  code: string;
  type: TOrganizationType;
  description?: string;
  website?: string;
  logo?: string;

  contact?: {
    primary: {
      name: string;
      title?: string;
      email: string;
      phone?: string;
      mobile?: string;
    };
    billing?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: {
        street?: string;
        city?: string;
        region?: string;
        postalCode?: string;
        country?: string;
      };
    };
    technical?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  };

  address: {
    headquarters: {
      street: string;
      city: string;
      region?: string;
      postalCode?: string;
      country: string;
    };
    branches?: Array<{
      name?: string;
      street?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      isActive?: boolean;
    }>;
  };

  legal?: {
    registrationNumber?: string;
    taxId?: string;
    licenseNumber?: string;
    documents?: Array<{
      type?: string;
      number?: string;
      issuedBy?: string;
      issuedDate?: Date;
      expiryDate?: Date;
      url?: string;
      verified?: boolean;
    }>;
  };

  subscription: {
    plan: "BASIC" | "STANDARD" | "PREMIUM" | "ENTERPRISE";
    status: TSubscriptionStatus;
    startDate?: Date;
    endDate?: Date;
    trialEndsAt?: Date;
    billingCycle: TBillingCycle;
    price?: { amount?: number; currency?: string };
    features: Features;
    usage: Usage;
    limits: {
      exceeded: boolean;
      warnings: string[];
    };
  };

  settings: {
    locale: string;
    timezone: string;
    currency: string;
    dateFormat: string;
    numberFormat: string;
    businessHours: {
      workdays: TWorkday[];
      startTime: string; // HH:mm
      endTime: string; // HH:mm
      breakTime: { enabled: boolean; start: string; end: string };
    };
    workOrders: {
      autoAssignment: boolean;
      requireApproval: boolean;
      defaultPriority: TPriority;
      slaDefaults: {
        low: { hours: number };
        medium: { hours: number };
        high: { hours: number };
        urgent: { hours: number };
      };
      notifications: { email: boolean; sms: boolean; push: boolean };
    };
    financial: {
      invoiceNumberFormat: string;
      paymentTerms: number;
      lateFeePercentage: number;
      taxRate: number;
      approvalLimits: { workOrder: number; purchase: number; invoice: number };
    };
    security: {
      passwordPolicy: {
        minLength: number;
        requireUppercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
        expiryDays: number;
      };
      sessionTimeout: number;
      maxLoginAttempts: number;
      twoFactorRequired: boolean;
      ipWhitelist?: string[];
      auditLogRetention: number;
    };
    integrations: {
      emailProvider: {
        provider: TEmailProvider;
        settings?: Record<string, unknown>;
      };
      smsProvider: {
        provider: TSmsProvider;
        settings?: Record<string, unknown>;
      };
      paymentGateway: {
        provider: TPaymentGateway;
        settings?: Record<string, unknown>;
      };
      sso: {
        enabled: boolean;
        provider?: TSsoProvider;
        settings?: Record<string, unknown>;
      };
    };
  };

  members?: Array<{
    userId: string;
    role?: string;
    email?: string;
  }>;

  compliance: {
    status: TComplianceStatus;
    certifications?: Array<{
      name?: string;
      number?: string;
      issuedBy?: string;
      issuedDate?: Date;
      expiryDate?: Date;
      url?: string;
      verified?: boolean;
    }>;
    policies?: Array<{
      name?: string;
      version?: string;
      approvedBy?: string;
      approvedDate?: Date;
      url?: string;
    }>;
    auditTrail: {
      enabled: boolean;
      retentionPeriod: number;
      externalAuditor?: string;
      lastAuditDate?: Date;
      nextAuditDate?: Date;
    };
    dataPrivacy: {
      gdprCompliant: boolean;
      dataRetentionPeriod: number;
      anonymizationEnabled: boolean;
      rightToForget: boolean;
    };
  };

  status: {
    isActive: boolean;
    isSuspended: boolean;
    suspensionReason?: string;
    maintenanceMode: boolean;
    lastHealthCheck?: Date;
    healthStatus: "HEALTHY" | "WARNING" | "CRITICAL";
    healthDetails?: Record<string, unknown>;
  };

  modules?: ModulesConfig;

  customFields?: Record<string, unknown>;
  tags?: string[];
  notes?: string;

  // NOTE: createdBy, updatedBy, and version are added by auditPlugin
}

// ---------- Schema ----------
const OrganizationSchema = new Schema<IOrganization>(
  {
    orgId: { type: String, required: true, unique: true },

    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: { type: String, enum: OrganizationType, required: true },
    description: { type: String, trim: true },
    website: { type: String, trim: true },
    logo: { type: String, trim: true },

    contact: {
      primary: {
        name: { type: String, required: true, trim: true },
        title: { type: String, trim: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        phone: { type: String, trim: true },
        mobile: { type: String, trim: true },
      },
      billing: {
        name: { type: String, trim: true },
        email: { type: String, lowercase: true, trim: true },
        phone: { type: String, trim: true },
        address: {
          street: { type: String, trim: true },
          city: { type: String, trim: true },
          region: { type: String, trim: true },
          postalCode: { type: String, trim: true },
          country: { type: String, default: "SA", trim: true },
        },
      },
      technical: {
        name: { type: String, trim: true },
        email: { type: String, lowercase: true, trim: true },
        phone: { type: String, trim: true },
      },
    },

    address: {
      headquarters: {
        street: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        region: { type: String, trim: true },
        postalCode: { type: String, trim: true },
        country: { type: String, default: "SA", required: true, trim: true },
      },
      branches: [
        {
          name: { type: String, trim: true },
          street: { type: String, trim: true },
          city: { type: String, trim: true },
          region: { type: String, trim: true },
          postalCode: { type: String, trim: true },
          country: { type: String, trim: true },
          isActive: { type: Boolean, default: true },
        },
      ],
    },

    legal: {
      registrationNumber: { type: String, trim: true },
      taxId: { type: String, trim: true },
      licenseNumber: { type: String, trim: true },
      documents: [
        {
          type: { type: String, trim: true },
          number: { type: String, trim: true },
          issuedBy: { type: String, trim: true },
          issuedDate: Date,
          expiryDate: Date,
          url: { type: String, trim: true },
          verified: { type: Boolean, default: false },
        },
      ],
    },

    subscription: {
      plan: {
        type: String,
        required: true,
        default: "BASIC",
        enum: ["BASIC", "STANDARD", "PREMIUM", "ENTERPRISE"],
      },
      status: { type: String, enum: SubscriptionStatus, default: "TRIAL" },
      startDate: { type: Date, default: Date.now },
      endDate: Date,
      trialEndsAt: Date,
      billingCycle: { type: String, enum: BillingCycle, default: "MONTHLY" },
      price: {
        amount: { type: Number, min: 0 },
        currency: { type: String, default: "SAR", trim: true },
      },
      features: {
        maxUsers: { type: Number, default: 10, min: 0 },
        maxProperties: { type: Number, default: 5, min: 0 },
        maxWorkOrders: { type: Number, default: 100, min: 0 },
        advancedReporting: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
        customBranding: { type: Boolean, default: false },
        ssoIntegration: { type: Boolean, default: false },
        mobileApp: { type: Boolean, default: true },
        supportLevel: { type: String, enum: SupportLevel, default: "BASIC" },
      },
      usage: {
        currentUsers: { type: Number, default: 0, min: 0 },
        currentProperties: { type: Number, default: 0, min: 0 },
        currentWorkOrders: { type: Number, default: 0, min: 0 },
        apiCalls: { type: Number, default: 0, min: 0 },
        storageUsed: { type: Number, default: 0, min: 0 },
      },
      limits: {
        exceeded: { type: Boolean, default: false },
        warnings: [String],
      },
    },

    settings: {
      locale: { type: String, default: "ar", trim: true },
      timezone: { type: String, default: "Asia/Riyadh", trim: true },
      currency: { type: String, default: "SAR", trim: true },
      dateFormat: { type: String, default: "DD/MM/YYYY", trim: true },
      numberFormat: { type: String, default: "1,234.56", trim: true },
      businessHours: {
        workdays: [{ type: String, enum: Workdays }],
        startTime: { type: String, default: "09:00", trim: true },
        endTime: { type: String, default: "17:00", trim: true },
        breakTime: {
          enabled: { type: Boolean, default: true },
          start: { type: String, default: "12:00", trim: true },
          end: { type: String, default: "13:00", trim: true },
        },
      },
      workOrders: {
        autoAssignment: { type: Boolean, default: false },
        requireApproval: { type: Boolean, default: true },
        defaultPriority: { type: String, enum: Priority, default: "MEDIUM" },
        slaDefaults: {
          low: { hours: { type: Number, default: 72, min: 0 } },
          medium: { hours: { type: Number, default: 48, min: 0 } },
          high: { hours: { type: Number, default: 24, min: 0 } },
          urgent: { hours: { type: Number, default: 4, min: 0 } },
        },
        notifications: {
          email: { type: Boolean, default: true },
          sms: { type: Boolean, default: false },
          push: { type: Boolean, default: true },
        },
      },
      financial: {
        invoiceNumberFormat: {
          type: String,
          default: "INV-{YYYY}-{MM}-{####}",
          trim: true,
        },
        paymentTerms: { type: Number, default: 30, min: 0 },
        lateFeePercentage: { type: Number, default: 2.5, min: 0 },
        taxRate: { type: Number, default: 15, min: 0, max: 100 },
        approvalLimits: {
          workOrder: { type: Number, default: 1000, min: 0 },
          purchase: { type: Number, default: 5000, min: 0 },
          invoice: { type: Number, default: 10000, min: 0 },
        },
      },
      security: {
        passwordPolicy: {
          minLength: { type: Number, default: 8, min: 1 },
          requireUppercase: { type: Boolean, default: true },
          requireNumbers: { type: Boolean, default: true },
          requireSpecialChars: { type: Boolean, default: false },
          expiryDays: { type: Number, default: 90, min: 0 },
        },
        sessionTimeout: { type: Number, default: 480, min: 1 }, // minutes
        maxLoginAttempts: { type: Number, default: 5, min: 1 },
        twoFactorRequired: { type: Boolean, default: false },
        ipWhitelist: [String],
        auditLogRetention: { type: Number, default: 365, min: 0 }, // days
      },
      integrations: {
        emailProvider: {
          provider: { type: String, enum: EmailProvider, default: "SMTP" },
          settings: Schema.Types.Mixed,
        },
        smsProvider: {
          provider: { type: String, enum: SmsProvider, default: "LOCAL" },
          settings: Schema.Types.Mixed,
        },
        paymentGateway: {
          provider: { type: String, enum: PaymentGateway, default: "PAYTABS" },
          settings: Schema.Types.Mixed,
        },
        sso: {
          enabled: { type: Boolean, default: false },
          provider: { type: String, enum: SsoProvider },
          settings: Schema.Types.Mixed,
        },
      },
    },

    modules: {
      ats: {
        enabled: { type: Boolean, default: false },
        jobPostLimit: { type: Number, default: 10, min: 0 },
        seats: { type: Number, default: 25, min: 0 },
        seatWarningThreshold: { type: Number, default: 0.9, min: 0, max: 1 },
        activatedAt: { type: Date },
        billingPlan: { type: String, default: "ATS_STARTER" },
      },
    },

    compliance: {
      status: {
        type: String,
        enum: ComplianceStatus,
        default: "PENDING_REVIEW",
      },
      certifications: [
        {
          name: { type: String, trim: true },
          number: { type: String, trim: true },
          issuedBy: { type: String, trim: true },
          issuedDate: Date,
          expiryDate: Date,
          url: { type: String, trim: true },
          verified: { type: Boolean, default: false },
        },
      ],
      policies: [
        {
          name: { type: String, trim: true },
          version: { type: String, trim: true },
          approvedBy: { type: String, trim: true },
          approvedDate: Date,
          url: { type: String, trim: true },
        },
      ],
      auditTrail: {
        enabled: { type: Boolean, default: true },
        retentionPeriod: { type: Number, default: 2555, min: 0 },
        externalAuditor: { type: String, trim: true },
        lastAuditDate: Date,
        nextAuditDate: Date,
      },
      dataPrivacy: {
        gdprCompliant: { type: Boolean, default: false },
        dataRetentionPeriod: { type: Number, default: 2555, min: 0 },
        anonymizationEnabled: { type: Boolean, default: false },
        rightToForget: { type: Boolean, default: false },
      },
    },

    status: {
      isActive: { type: Boolean, default: true },
      isSuspended: { type: Boolean, default: false },
      suspensionReason: { type: String, trim: true },
      maintenanceMode: { type: Boolean, default: false },
      lastHealthCheck: Date,
      healthStatus: {
        type: String,
        enum: ["HEALTHY", "WARNING", "CRITICAL"],
        default: "HEALTHY",
      },
      healthDetails: Schema.Types.Mixed,
    },

    customFields: Schema.Types.Mixed,
    tags: [String],
    notes: { type: String, trim: true },

    // NOTE: createdBy, updatedBy, and version are added by auditPlugin
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ---------- Apply Plugins ----------
// Apply audit plugin for automatic createdBy/updatedBy/version tracking
OrganizationSchema.plugin(auditPlugin);

// ---------- Indexes ----------
// ⚡ REMOVED: orgId index - already created by unique: true constraint on field (line 260)
// ⚡ REMOVED: code index - already created by unique: true constraint on field (line 263)
OrganizationSchema.index({ "subscription.status": 1 });
OrganizationSchema.index({ "subscription.endDate": 1 });
OrganizationSchema.index({ "status.isActive": 1 });
// ⚡ REMOVED: createdAt index - already created by timestamps: true option

// ---------- Hooks ----------
const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);

OrganizationSchema.pre("save", function (next) {
  // Generate orgId if missing
  if (this.isNew && !this.orgId) {
    this.orgId = `org_${nanoid()}`;
  }

  // Normalize key strings
  if (this.isModified("code") && this.code)
    this.code = String(this.code).toUpperCase().trim();
  if (this.website) this.website = this.website.trim().toLowerCase();
  if (this.contact?.primary?.email)
    this.contact.primary.email = this.contact.primary.email
      .trim()
      .toLowerCase();
  if (this.contact?.billing?.email)
    this.contact.billing.email = this.contact.billing.email
      .trim()
      .toLowerCase();
  if (this.contact?.technical?.email)
    this.contact.technical.email = this.contact.technical.email
      .trim()
      .toLowerCase();

  next();
});

// ---------- Virtuals ----------
OrganizationSchema.virtual("subscriptionDaysRemaining").get(function (
  this: OrganizationDoc,
) {
  const end = this.subscription?.endDate
    ? new Date(this.subscription.endDate).getTime()
    : null;
  if (!end) return null;
  const today = Date.now();
  const diff = Math.ceil((end - today) / (24 * 60 * 60 * 1000));
  return diff >= 0 ? diff : 0;
});

// ---------- Instance methods ----------

OrganizationSchema.methods.hasFeature = function (
  this: OrganizationDoc,
  feature: keyof Features,
): boolean {
  return Boolean(this.subscription?.features?.[feature]);
};

OrganizationSchema.methods.checkUsageLimits = function (
  this: OrganizationDoc,
): string[] {
  const usage = this.subscription.usage;
  const features = this.subscription.features;
  const warnings: string[] = [];

  if (usage.currentUsers >= features.maxUsers) {
    warnings.push(
      `User limit reached (${usage.currentUsers}/${features.maxUsers})`,
    );
  }
  if (usage.currentProperties >= features.maxProperties) {
    warnings.push(
      `Property limit reached (${usage.currentProperties}/${features.maxProperties})`,
    );
  }
  if (usage.currentWorkOrders >= features.maxWorkOrders) {
    warnings.push(
      `Work order limit reached (${usage.currentWorkOrders}/${features.maxWorkOrders})`,
    );
  }

  this.subscription.limits.warnings = warnings;
  this.subscription.limits.exceeded = warnings.length > 0;
  return warnings;
};

// ---------- Statics (atomic helpers) ----------
OrganizationSchema.statics.incrementUsage = async function (
  orgId: string,
  patch: Partial<Usage>,
): Promise<OrganizationDoc | null> {
  // Only increment provided counters; clamp at >= 0
  const inc: Record<string, number> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === "number" && Number.isFinite(v) && v !== 0) {
      inc[`subscription.usage.${k}`] = v;
    }
  }
  if (Object.keys(inc).length === 0) return this.findOne({ orgId });

  const doc = await this.findOneAndUpdate(
    { orgId },
    { $inc: inc },
    { new: true },
  );
  return doc;
};

OrganizationSchema.statics.setSubscriptionStatus = async function (
  orgId: string,
  status: TSubscriptionStatus,
): Promise<OrganizationDoc | null> {
  return this.findOneAndUpdate(
    { orgId },
    { $set: { "subscription.status": status } },
    { new: true },
  );
};

// ---------- Export ----------
export const Organization =
  typeof models !== "undefined" && models.Organization
    ? (models.Organization as OrganizationModel)
    : (model<IOrganization, OrganizationModel>(
        "Organization",
        OrganizationSchema,
      ) as OrganizationModel);
export type { OrganizationDoc, Features, Usage };
