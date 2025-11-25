/**
 * Campaign, AdGroup, Ad, and AdTarget Models - Advertising system
 * @module server/models/souq/Advertising
 */

import mongoose, { Schema, type Document } from "mongoose";
import { getModel } from "@/src/types/mongoose-compat";

// Campaign Model
export interface ICampaign extends Document {
  _id: mongoose.Types.ObjectId;
  campaignId: string;

  // Ownership
  sellerId: mongoose.Types.ObjectId;

  // Campaign Details
  name: string;
  type: "sponsored_products" | "sponsored_brands" | "sponsored_display";
  status: "draft" | "active" | "paused" | "completed" | "archived";

  // Budget
  budgetType: "daily" | "lifetime";
  budgetAmount: number;
  budgetSpent: number;
  currency: string;

  // Schedule
  startAt: Date;
  endAt?: Date;

  // Performance (cached)
  stats: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    revenue: number;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Ad Group Model
export interface IAdGroup extends Document {
  _id: mongoose.Types.ObjectId;
  adGroupId: string;

  // Campaign reference
  campaignId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;

  // Details
  name: string;
  status: "active" | "paused" | "archived";

  // Bidding
  defaultBid: number; // CPC bid in currency
  maxBid?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Ad Model
export interface IAd extends Document {
  _id: mongoose.Types.ObjectId;
  adId: string;

  // References
  adGroupId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;

  // Product reference
  productId: mongoose.Types.ObjectId;
  fsin: string;

  // Creative
  headline?: string;
  image?: string;

  // Status
  status: "active" | "paused" | "rejected" | "archived";
  rejectionReason?: string;

  // Quality Score (0-10, higher is better)
  qualityScore: number;

  // Performance (cached)
  stats: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    revenue: number;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Ad Target Model (keywords, categories, products)
export interface IAdTarget extends Document {
  _id: mongoose.Types.ObjectId;
  targetId: string;

  // References
  adGroupId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;

  // Target Type
  targetType: "keyword" | "category" | "product" | "audience";

  // Target Value
  keyword?: string;
  matchType?: "exact" | "phrase" | "broad"; // For keywords
  categoryId?: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  audienceSegment?: string;

  // Bid Override (if different from ad group default)
  bid?: number;

  // Negative targeting
  isNegative: boolean;

  // Status
  status: "active" | "paused" | "archived";

  // Performance (cached)
  stats: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Campaign Schema
const CampaignSchema = new Schema<ICampaign>(
  {
    campaignId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "SouqSeller",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ["sponsored_products", "sponsored_brands", "sponsored_display"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "completed", "archived"],
      default: "draft",
      index: true,
    },
    budgetType: {
      type: String,
      enum: ["daily", "lifetime"],
      required: true,
    },
    budgetAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    budgetSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "SAR",
    },
    startAt: {
      type: Date,
      required: true,
      index: true,
    },
    endAt: {
      type: Date,
      index: true,
    },
    stats: {
      impressions: { type: Number, default: 0, min: 0 },
      clicks: { type: Number, default: 0, min: 0 },
      spend: { type: Number, default: 0, min: 0 },
      conversions: { type: Number, default: 0, min: 0 },
      revenue: { type: Number, default: 0, min: 0 },
    },
  },
  {
    timestamps: true,
    collection: "souq_campaigns",
  },
);

// Ad Group Schema
const AdGroupSchema = new Schema<IAdGroup>(
  {
    adGroupId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "SouqCampaign",
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "SouqSeller",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: ["active", "paused", "archived"],
      default: "active",
      index: true,
    },
    defaultBid: {
      type: Number,
      required: true,
      min: 0,
    },
    maxBid: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: "souq_ad_groups",
  },
);

// Ad Schema
const AdSchema = new Schema<IAd>(
  {
    adId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    adGroupId: {
      type: Schema.Types.ObjectId,
      ref: "SouqAdGroup",
      required: true,
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "SouqCampaign",
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "SouqSeller",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "SouqProduct",
      required: true,
      index: true,
    },
    fsin: {
      type: String,
      required: true,
      index: true,
    },
    headline: {
      type: String,
      maxlength: 100,
    },
    image: String,
    status: {
      type: String,
      enum: ["active", "paused", "rejected", "archived"],
      default: "active",
      index: true,
    },
    rejectionReason: String,
    qualityScore: {
      type: Number,
      default: 5,
      min: 0,
      max: 10,
    },
    stats: {
      impressions: { type: Number, default: 0, min: 0 },
      clicks: { type: Number, default: 0, min: 0 },
      spend: { type: Number, default: 0, min: 0 },
      conversions: { type: Number, default: 0, min: 0 },
      revenue: { type: Number, default: 0, min: 0 },
    },
  },
  {
    timestamps: true,
    collection: "souq_ads",
  },
);

// Ad Target Schema
const AdTargetSchema = new Schema<IAdTarget>(
  {
    targetId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    adGroupId: {
      type: Schema.Types.ObjectId,
      ref: "SouqAdGroup",
      required: true,
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "SouqCampaign",
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "SouqSeller",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["keyword", "category", "product", "audience"],
      required: true,
      index: true,
    },
    keyword: {
      type: String,
      lowercase: true,
      trim: true,
    },
    matchType: {
      type: String,
      enum: ["exact", "phrase", "broad"],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "SouqCategory",
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "SouqProduct",
    },
    audienceSegment: String,
    bid: {
      type: Number,
      min: 0,
    },
    isNegative: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "paused", "archived"],
      default: "active",
      index: true,
    },
    stats: {
      impressions: { type: Number, default: 0, min: 0 },
      clicks: { type: Number, default: 0, min: 0 },
      spend: { type: Number, default: 0, min: 0 },
      conversions: { type: Number, default: 0, min: 0 },
    },
  },
  {
    timestamps: true,
    collection: "souq_ad_targets",
  },
);

// Indexes
CampaignSchema.index({ sellerId: 1, status: 1 });
CampaignSchema.index({ startAt: 1, endAt: 1 });
CampaignSchema.index({ "stats.spend": -1 });

AdGroupSchema.index({ campaignId: 1, status: 1 });

AdSchema.index({ adGroupId: 1, status: 1 });
AdSchema.index({ productId: 1, status: 1 });
AdSchema.index({ qualityScore: -1 });

AdTargetSchema.index({ adGroupId: 1, status: 1, isNegative: 1 });
AdTargetSchema.index({ targetType: 1, status: 1 });
AdTargetSchema.index({ keyword: 1, matchType: 1 }, { sparse: true });

// Methods
CampaignSchema.methods.getRemainingBudget = function (): number {
  if (this.budgetType === "daily") {
    // Reset daily budget tracking would be handled separately
    return Math.max(0, this.budgetAmount - this.budgetSpent);
  }
  return Math.max(0, this.budgetAmount - this.budgetSpent);
};

CampaignSchema.methods.canServeAds = function (): boolean {
  const now = new Date();
  return (
    this.status === "active" &&
    this.startAt <= now &&
    (!this.endAt || this.endAt >= now) &&
    this.getRemainingBudget() > 0
  );
};

AdSchema.methods.getCTR = function (): number {
  return this.stats.impressions > 0
    ? (this.stats.clicks / this.stats.impressions) * 100
    : 0;
};

AdSchema.methods.getCPC = function (): number {
  return this.stats.clicks > 0 ? this.stats.spend / this.stats.clicks : 0;
};

AdSchema.methods.getACOS = function (): number {
  return this.stats.revenue > 0
    ? (this.stats.spend / this.stats.revenue) * 100
    : 0;
};

AdSchema.methods.getROAS = function (): number {
  return this.stats.spend > 0 ? this.stats.revenue / this.stats.spend : 0;
};

export const SouqCampaign = getModel<ICampaign>("SouqCampaign", CampaignSchema);
export const SouqAdGroup = getModel<IAdGroup>("SouqAdGroup", AdGroupSchema);
export const SouqAd = getModel<IAd>("SouqAd", AdSchema);
export const SouqAdTarget = getModel<IAdTarget>("SouqAdTarget", AdTargetSchema);

export default { SouqCampaign, SouqAdGroup, SouqAd, SouqAdTarget };
