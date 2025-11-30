/**
 * Coupon Model - Promotional coupons for marketplace
 * @module server/models/souq/Coupon
 */

import mongoose, { Schema, type Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";

export interface ICoupon extends Document {
  _id: mongoose.Types.ObjectId;
  couponId: string; // CPN-{UUID}

  // Ownership
  sellerId?: mongoose.Types.ObjectId; // If seller-specific, null for admin coupons

  // Coupon Details
  code: string; // Unique code (e.g., SAVE20, WELCOME10)
  type: "percent" | "amount";
  value: number; // Percentage (1-100) or fixed amount
  currency: string;

  // Eligibility
  minBasketAmount?: number; // Minimum purchase required
  maxDiscountAmount?: number; // Cap on discount for percent coupons
  applicableCategories?: mongoose.Types.ObjectId[]; // Restrict to categories
  applicableProducts?: mongoose.Types.ObjectId[]; // Restrict to products
  excludeCategories?: mongoose.Types.ObjectId[];
  excludeProducts?: mongoose.Types.ObjectId[];

  // Usage Limits
  maxRedemptions?: number; // Total times can be used
  redemptionsUsed: number;
  maxRedemptionsPerUser?: number; // Per-user limit

  // Time Window
  startAt: Date;
  endAt: Date;

  // Conditions
  firstPurchaseOnly?: boolean;
  requiresPrime?: boolean; // Future feature

  // Status
  isActive: boolean;

  // Metadata
  description?: string;
  internalNotes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    couponId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "SouqSeller",
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["percent", "amount"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "SAR",
    },
    minBasketAmount: {
      type: Number,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
    },
    applicableCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: "SouqCategory",
      },
    ],
    applicableProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: "SouqProduct",
      },
    ],
    excludeCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: "SouqCategory",
      },
    ],
    excludeProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: "SouqProduct",
      },
    ],
    maxRedemptions: {
      type: Number,
      min: 1,
    },
    redemptionsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxRedemptionsPerUser: {
      type: Number,
      min: 1,
    },
    startAt: {
      type: Date,
      required: true,
      index: true,
    },
    endAt: {
      type: Date,
      required: true,
      index: true,
    },
    firstPurchaseOnly: {
      type: Boolean,
      default: false,
    },
    requiresPrime: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    description: String,
    internalNotes: String,
  },
  {
    timestamps: true,
    collection: "souq_coupons",
  },
);

// Indexes
CouponSchema.index({ code: 1, isActive: 1 });
CouponSchema.index({ sellerId: 1, isActive: 1 });
CouponSchema.index({ startAt: 1, endAt: 1, isActive: 1 });

// Methods
CouponSchema.methods.isValid = function (): boolean {
  const now = new Date();
  return (
    this.isActive &&
    this.startAt <= now &&
    this.endAt >= now &&
    (this.maxRedemptions === undefined ||
      this.redemptionsUsed < this.maxRedemptions)
  );
};

CouponSchema.methods.canRedeem = function (): boolean {
  if (!this.isValid()) return false;
  if (this.maxRedemptions && this.redemptionsUsed >= this.maxRedemptions)
    return false;
  return true;
};

CouponSchema.methods.calculateDiscount = function (
  basketAmount: number,
): number {
  if (!this.canRedeem()) return 0;
  if (this.minBasketAmount && basketAmount < this.minBasketAmount) return 0;

  let discount = 0;

  if (this.type === "percent") {
    discount = (basketAmount * this.value) / 100;
    if (this.maxDiscountAmount) {
      discount = Math.min(discount, this.maxDiscountAmount);
    }
  } else {
    discount = this.value;
  }

  return Math.min(discount, basketAmount);
};

export const SouqCoupon = getModel<ICoupon>("SouqCoupon", CouponSchema);

export default SouqCoupon;
