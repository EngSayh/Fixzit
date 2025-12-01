/**
 * Souq Seller Model - Seller/Vendor accounts for marketplace
 * @module server/models/souq/Seller
 */

import mongoose, { Schema, type Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";

export interface ISellerPolicyViolation {
  type:
    | "restricted_product"
    | "fake_review"
    | "price_gouging"
    | "counterfeit"
    | "late_shipment"
    | "high_odr"
    | "other";
  severity: "warning" | "minor" | "major" | "critical";
  description: string;
  occurredAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
  action:
    | "warning"
    | "listing_suppression"
    | "account_suspension"
    | "permanent_deactivation"
    | "none";
}

export interface IAutoRepricerRule {
  enabled: boolean;
  minPrice: number;
  maxPrice: number;
  targetPosition: "win" | "competitive";
  undercut: number;
  protectMargin: boolean;
}

export interface IKYCDocumentEntry {
  type:
    | "cr"
    | "vat_certificate"
    | "bank_letter"
    | "id"
    | "authorization"
    | "other";
  url: string;
  uploadedAt: Date;
  expiresAt?: Date;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface IKYCWorkflow {
  status:
    | "pending"
    | "in_review"
    | "under_review"
    | "approved"
    | "rejected"
    | "suspended";
  step: "company_info" | "documents" | "bank_details" | "verification";
  companyInfoComplete: boolean;
  documentsComplete: boolean;
  bankDetailsComplete: boolean;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
}

export interface ISeller extends Document {
  _id: mongoose.Types.ObjectId;
  sellerId: string; // SEL-{UUID}

  // Legal Entity
  legalName: string;
  tradeName?: string;
  registrationType: "individual" | "company" | "partnership";
  registrationNumber?: string; // CR number
  vatNumber?: string;
  country: string;
  city: string;
  address: string;
  businessName?: string;
  businessNameArabic?: string;
  industry?: string;
  description?: string;
  website?: string;
  businessAddress?: {
    street: string;
    city: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };

  // Contact
  contactEmail: string;
  contactPhone: string;
  contactPerson?: string;

  // KYC Status
  kycStatus: IKYCWorkflow;
  kycSubmittedAt?: Date;
  kycApprovedAt?: Date;
  kycRejectionReason?: string;

  // KYC Documents
  documents: IKYCDocumentEntry[];

  // Bank Details
  bankAccount?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban: string;
    swiftCode?: string;
  };

  // Account Health Metrics
  accountHealth: {
    orderDefectRate: number; // % (target < 1%)
    lateShipmentRate: number; // % (target < 4%)
    cancellationRate: number; // % (target < 2.5%)
    validTrackingRate: number; // % (target > 95%)
    onTimeDeliveryRate: number; // % (target > 97%)
    score: number; // 0-100
    status: "excellent" | "good" | "fair" | "poor" | "critical";
    lastCalculated: Date;
  };

  // Violations & Suspensions
  violations: {
    type: "policy" | "quality" | "shipping" | "communication" | "ip" | "other";
    description: string;
    severity: "minor" | "moderate" | "major" | "critical";
    occurredAt: Date;
    resolvedAt?: Date;
    action: "warning" | "fee" | "suspension" | "removal";
  }[];
  policyViolations?: ISellerPolicyViolation[];

  // Seller Tier (for fee schedules)
  tier: "individual" | "professional" | "enterprise";
  tierEffectiveFrom: Date;

  // Fulfillment Settings
  fulfillmentMethod: {
    fbf: boolean; // Fulfillment by Fixzit
    fbm: boolean; // Fulfillment by Merchant
  };

  // Return Settings
  returnPolicy?: {
    acceptsReturns: boolean;
    returnWindow: number; // days
    restockingFee?: number; // %
    customPolicy?: string;
  };

  // Settlement Settings
  settlementCycle: 7 | 14 | 30; // days
  holdPeriod: number; // days to hold funds for claims

  // Status
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  suspendedAt?: Date;

  // Feature Access
  features: {
    sponsored_ads: boolean;
    auto_repricer: boolean;
    bulk_upload: boolean;
    api_access: boolean;
    dedicated_support: boolean;
  };

  // Methods
  canCompeteInBuyBox(): boolean;

  autoRepricerSettings?: {
    enabled: boolean;
    rules: Record<string, IAutoRepricerRule>;
    defaultRule?: IAutoRepricerRule;
  } | null;

  // Performance Stats (cached)
  stats?: {
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
  };

  // Linked User Account
  userId?: mongoose.Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const SellerSchema = new Schema<ISeller>(
  {
    sellerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    legalName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    tradeName: {
      type: String,
      trim: true,
    },
    registrationType: {
      type: String,
      enum: ["individual", "company", "partnership"],
      required: true,
    },
    registrationNumber: {
      type: String,
      sparse: true,
      index: true,
    },
    vatNumber: {
      type: String,
      sparse: true,
      index: true,
    },
    country: {
      type: String,
      required: true,
      default: "SA",
    },
    city: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    businessName: {
      type: String,
      trim: true,
    },
    businessNameArabic: {
      type: String,
      trim: true,
    },
    industry: String,
    description: String,
    website: String,
    businessAddress: {
      street: String,
      city: String,
      region: String,
      postalCode: String,
      country: String,
    },
    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    contactPhone: {
      type: String,
      required: true,
    },
    contactPerson: String,
    kycStatus: {
      status: {
        type: String,
        enum: [
          "pending",
          "in_review",
          "under_review",
          "approved",
          "rejected",
          "suspended",
        ],
        default: "pending",
        index: true,
      },
      step: {
        type: String,
        enum: ["company_info", "documents", "bank_details", "verification"],
        default: "company_info",
      },
      companyInfoComplete: { type: Boolean, default: false },
      documentsComplete: { type: Boolean, default: false },
      bankDetailsComplete: { type: Boolean, default: false },
      submittedAt: Date,
      approvedAt: Date,
      approvedBy: String,
      rejectedAt: Date,
      rejectedBy: String,
      rejectionReason: String,
    },
    kycSubmittedAt: Date,
    kycApprovedAt: Date,
    kycRejectionReason: String,
    documents: [
      {
        type: {
          type: String,
          enum: [
            "cr",
            "vat_certificate",
            "bank_letter",
            "id",
            "authorization",
            "other",
          ],
          required: true,
        },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
        expiresAt: Date,
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        verifiedBy: String,
        rejectionReason: String,
      },
    ],
    bankAccount: {
      bankName: String,
      accountName: String,
      accountNumber: String,
      iban: String,
      swiftCode: String,
    },
    accountHealth: {
      orderDefectRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      lateShipmentRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      cancellationRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      validTrackingRate: {
        type: Number,
        default: 100,
        min: 0,
        max: 100,
      },
      onTimeDeliveryRate: {
        type: Number,
        default: 100,
        min: 0,
        max: 100,
      },
      score: {
        type: Number,
        default: 100,
        min: 0,
        max: 100,
      },
      status: {
        type: String,
        enum: ["excellent", "good", "fair", "poor", "critical"],
        default: "excellent",
      },
      lastCalculated: {
        type: Date,
        default: Date.now,
      },
    },
    violations: [
      {
        type: {
          type: String,
          enum: [
            "policy",
            "quality",
            "shipping",
            "communication",
            "ip",
            "other",
          ],
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        severity: {
          type: String,
          enum: ["minor", "moderate", "major", "critical"],
          required: true,
        },
        occurredAt: {
          type: Date,
          default: Date.now,
        },
        resolvedAt: Date,
        action: {
          type: String,
          enum: ["warning", "fee", "suspension", "removal"],
          required: true,
        },
      },
    ],
    policyViolations: [
      {
        type: {
          type: String,
          enum: [
            "restricted_product",
            "fake_review",
            "price_gouging",
            "counterfeit",
            "late_shipment",
            "high_odr",
            "other",
          ],
          required: true,
        },
        severity: {
          type: String,
          enum: ["warning", "minor", "major", "critical"],
          default: "warning",
        },
        description: {
          type: String,
          required: true,
        },
        occurredAt: {
          type: Date,
          default: Date.now,
        },
        resolved: {
          type: Boolean,
          default: false,
        },
        resolvedAt: Date,
        action: {
          type: String,
          enum: [
            "warning",
            "listing_suppression",
            "account_suspension",
            "permanent_deactivation",
            "none",
          ],
          default: "warning",
        },
      },
    ],
    tier: {
      type: String,
      enum: ["individual", "professional", "enterprise"],
      default: "individual",
      index: true,
    },
    tierEffectiveFrom: {
      type: Date,
      default: Date.now,
    },
    fulfillmentMethod: {
      fbf: {
        type: Boolean,
        default: false,
      },
      fbm: {
        type: Boolean,
        default: true,
      },
    },
    returnPolicy: {
      acceptsReturns: {
        type: Boolean,
        default: true,
      },
      returnWindow: {
        type: Number,
        default: 30,
        min: 0,
        max: 90,
      },
      restockingFee: {
        type: Number,
        min: 0,
        max: 100,
      },
      customPolicy: String,
    },
    settlementCycle: {
      type: Number,
      enum: [7, 14, 30],
      default: 14,
    },
    holdPeriod: {
      type: Number,
      default: 7,
      min: 0,
      max: 30,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },
    suspensionReason: String,
    suspendedAt: Date,
    features: {
      sponsored_ads: {
        type: Boolean,
        default: false,
      },
      auto_repricer: {
        type: Boolean,
        default: false,
      },
      bulk_upload: {
        type: Boolean,
        default: true,
      },
      api_access: {
        type: Boolean,
        default: false,
      },
      dedicated_support: {
        type: Boolean,
        default: false,
      },
    },
    autoRepricerSettings: {
      type: Schema.Types.Mixed,
      default: null,
    },
    stats: {
      totalProducts: {
        type: Number,
        default: 0,
      },
      activeProducts: {
        type: Number,
        default: 0,
      },
      totalOrders: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "souq_sellers",
  },
);

// Indexes
SellerSchema.index({ "kycStatus.status": 1, isActive: 1 });
SellerSchema.index({ "accountHealth.status": 1 });
SellerSchema.index({ tier: 1, isActive: 1 });
SellerSchema.index({ legalName: "text", tradeName: "text" });

// Method: Calculate account health score
SellerSchema.methods.calculateAccountHealth = function (): number {
  const {
    orderDefectRate,
    lateShipmentRate,
    cancellationRate,
    validTrackingRate,
    onTimeDeliveryRate,
  } = this.accountHealth;

  // Weighted scoring
  const score =
    100 -
    orderDefectRate * 30 - // Most important
    lateShipmentRate * 20 -
    cancellationRate * 20 -
    (100 - validTrackingRate) * 15 -
    (100 - onTimeDeliveryRate) * 15;

  return Math.max(0, Math.min(100, score));
};

// Method: Update account health status
SellerSchema.methods.updateAccountHealthStatus = function (): void {
  const score = this.calculateAccountHealth();
  this.accountHealth.score = score;

  if (score >= 90) {
    this.accountHealth.status = "excellent";
  } else if (score >= 75) {
    this.accountHealth.status = "good";
  } else if (score >= 60) {
    this.accountHealth.status = "fair";
  } else if (score >= 40) {
    this.accountHealth.status = "poor";
  } else {
    this.accountHealth.status = "critical";
  }

  this.accountHealth.lastCalculated = new Date();
};

// Method: Check if seller can create listings
SellerSchema.methods.canCreateListings = function (): boolean {
  return (
    this.isActive &&
    !this.isSuspended &&
    this.kycStatus?.status === "approved" &&
    this.accountHealth.status !== "critical"
  );
};

// Method: Check if seller can participate in Buy Box
SellerSchema.methods.canCompeteInBuyBox = function (): boolean {
  return (
    this.canCreateListings() &&
    this.accountHealth.score >= 60 &&
    this.accountHealth.orderDefectRate < 2
  );
};

// Static: Get pending KYC approvals
SellerSchema.statics.getPendingKYC = async function () {
  return this.find({
    "kycStatus.status": "in_review",
    isActive: true,
  }).sort({ "kycStatus.submittedAt": 1 });
};

// Static: Get sellers with critical health
SellerSchema.statics.getCriticalHealthSellers = async function () {
  return this.find({
    isActive: true,
    "accountHealth.status": "critical",
  });
};

export const SouqSeller = getModel<ISeller>("SouqSeller", SellerSchema);

export default SouqSeller;
