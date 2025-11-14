/**
 * Souq Seller Model - Seller/Vendor accounts for marketplace
 * @module server/models/souq/Seller
 */

import mongoose, { Schema, type Document } from 'mongoose';

export interface ISeller extends Document {
  _id: mongoose.Types.ObjectId;
  sellerId: string; // SEL-{UUID}
  
  // Legal Entity
  legalName: string;
  tradeName?: string;
  registrationType: 'individual' | 'company' | 'partnership';
  registrationNumber?: string; // CR number
  vatNumber?: string;
  country: string;
  city: string;
  address: string;
  
  // Contact
  contactEmail: string;
  contactPhone: string;
  contactPerson?: string;
  
  // KYC Status
  kycStatus: 'pending' | 'in_review' | 'approved' | 'rejected' | 'suspended';
  kycSubmittedAt?: Date;
  kycApprovedAt?: Date;
  kycRejectionReason?: string;
  
  // KYC Documents
  documents: {
    type: 'cr' | 'vat_certificate' | 'bank_letter' | 'id' | 'authorization' | 'other';
    url: string;
    uploadedAt: Date;
    expiresAt?: Date;
    verified: boolean;
  }[];
  
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
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    lastCalculated: Date;
  };
  
  // Violations & Suspensions
  violations: {
    type: 'policy' | 'quality' | 'shipping' | 'communication' | 'ip' | 'other';
    description: string;
    severity: 'minor' | 'moderate' | 'major' | 'critical';
    occurredAt: Date;
    resolvedAt?: Date;
    action: 'warning' | 'fee' | 'suspension' | 'removal';
  }[];
  
  // Seller Tier (for fee schedules)
  tier: 'individual' | 'professional' | 'enterprise';
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
      enum: ['individual', 'company', 'partnership'],
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
      default: 'SA',
    },
    city: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
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
      type: String,
      enum: ['pending', 'in_review', 'approved', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    kycSubmittedAt: Date,
    kycApprovedAt: Date,
    kycRejectionReason: String,
    documents: [
      {
        type: {
          type: String,
          enum: ['cr', 'vat_certificate', 'bank_letter', 'id', 'authorization', 'other'],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: Date,
        verified: {
          type: Boolean,
          default: false,
        },
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
        enum: ['excellent', 'good', 'fair', 'poor', 'critical'],
        default: 'excellent',
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
          enum: ['policy', 'quality', 'shipping', 'communication', 'ip', 'other'],
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        severity: {
          type: String,
          enum: ['minor', 'moderate', 'major', 'critical'],
          required: true,
        },
        occurredAt: {
          type: Date,
          default: Date.now,
        },
        resolvedAt: Date,
        action: {
          type: String,
          enum: ['warning', 'fee', 'suspension', 'removal'],
          required: true,
        },
      },
    ],
    tier: {
      type: String,
      enum: ['individual', 'professional', 'enterprise'],
      default: 'individual',
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
      ref: 'User',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'souq_sellers',
  }
);

// Indexes
SellerSchema.index({ kycStatus: 1, isActive: 1 });
SellerSchema.index({ 'accountHealth.status': 1 });
SellerSchema.index({ tier: 1, isActive: 1 });
SellerSchema.index({ legalName: 'text', tradeName: 'text' });

// Method: Calculate account health score
SellerSchema.methods.calculateAccountHealth = function (): number {
  const { orderDefectRate, lateShipmentRate, cancellationRate, validTrackingRate, onTimeDeliveryRate } =
    this.accountHealth;

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
    this.accountHealth.status = 'excellent';
  } else if (score >= 75) {
    this.accountHealth.status = 'good';
  } else if (score >= 60) {
    this.accountHealth.status = 'fair';
  } else if (score >= 40) {
    this.accountHealth.status = 'poor';
  } else {
    this.accountHealth.status = 'critical';
  }

  this.accountHealth.lastCalculated = new Date();
};

// Method: Check if seller can create listings
SellerSchema.methods.canCreateListings = function (): boolean {
  return (
    this.isActive &&
    !this.isSuspended &&
    this.kycStatus === 'approved' &&
    this.accountHealth.status !== 'critical'
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
    kycStatus: 'in_review',
    isActive: true,
  }).sort({ kycSubmittedAt: 1 });
};

// Static: Get sellers with critical health
SellerSchema.statics.getCriticalHealthSellers = async function () {
  return this.find({
    isActive: true,
    'accountHealth.status': 'critical',
  });
};

export const SouqSeller =
  mongoose.models.SouqSeller || mongoose.model<ISeller>('SouqSeller', SellerSchema);

export default SouqSeller;
