/**
 * Souq Deal Model - Lightning deals, coupons, promotions
 * @module server/models/souq/Deal
 */

import mongoose, { Schema, type Document } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";

export interface IDeal extends Document {
  _id: mongoose.Types.ObjectId;
  dealId: string;

  type:
    | "lightning_deal"
    | "coupon"
    | "bundle"
    | "bogo"
    | "percentage_off"
    | "amount_off";

  title: string;
  description: string;

  sellerId?: mongoose.Types.ObjectId;

  applicableProducts?: Array<{
    productId: mongoose.Types.ObjectId;
    fsin: string;
  }>;
  applicableCategories?: mongoose.Types.ObjectId[];
  allProducts: boolean;

  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  maxDiscountAmount?: number;

  minPurchaseAmount?: number;
  maxUsagePerCustomer: number;
  totalUsageLimit?: number;
  currentUsageCount: number;

  couponCode?: string;

  startDate: Date;
  endDate: Date;

  status: "draft" | "scheduled" | "active" | "expired" | "paused";

  priority: number;

  createdAt: Date;
  updatedAt: Date;
}

const DealSchema = new Schema<IDeal>(
  {
    dealId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "lightning_deal",
        "coupon",
        "bundle",
        "bogo",
        "percentage_off",
        "amount_off",
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "SouqSeller",
      index: true,
    },
    applicableProducts: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "SouqProduct",
        },
        fsin: String,
      },
    ],
    applicableCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: "SouqCategory",
      },
    ],
    allProducts: {
      type: Boolean,
      default: false,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed_amount"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (this: IDeal, value: number) {
          if (this.discountType === "percentage") {
            return value <= 100;
          }
          return true;
        },
        message: "Percentage discount cannot exceed 100",
      },
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
    },
    minPurchaseAmount: {
      type: Number,
      min: 0,
    },
    maxUsagePerCustomer: {
      type: Number,
      default: 1,
      min: 1,
    },
    totalUsageLimit: {
      type: Number,
      min: 1,
    },
    currentUsageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: {
      type: String,
      sparse: true,
      uppercase: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "active", "expired", "paused"],
      default: "draft",
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "souq_deals",
  },
);

DealSchema.index({ status: 1, startDate: 1, endDate: 1 });
DealSchema.index({ "applicableProducts.fsin": 1, status: 1 });

export const SouqDeal = getModel<IDeal>("SouqDeal", DealSchema);

export default SouqDeal;
