import mongoose, { Schema, type Document } from "mongoose";
import { getModel } from "@/src/types/mongoose-compat";

/**
 * Fee Schedule Model
 * Defines commission structure, FBF fees, and other charges per category
 */

export interface ICategoryFee {
  categoryId: string;
  categoryName: string;
  referralFeePercent: number; // e.g., 15% = 15.0
  minimumReferralFee: number; // Minimum commission in SAR
  closingFee?: number; // Fixed fee per item sold
}

export interface IFBFFee {
  categoryId: string;
  weightTier: "standard" | "small_standard" | "large_standard" | "oversize"; // Size tier
  fulfillmentFee: number; // Fee per unit
  storageFeePerCubicMeter: number; // Monthly storage fee
  pickPackFee: number; // Pick and pack fee
}

export interface IAdvertisingFee {
  cpcMinimum: number; // Minimum CPC bid in SAR
  cpcMaximum: number; // Maximum CPC bid in SAR
  platformFeePercent: number; // Platform's cut of ad spend (e.g., 20%)
}

export interface IPaymentProcessingFee {
  percentageFee: number; // e.g., 2.9%
  fixedFee: number; // e.g., 1 SAR per transaction
  method: "mada" | "visa" | "mastercard" | "stc_pay" | "apple_pay";
}

export interface IRefundFee {
  adminFee: number; // Fixed fee charged to seller for buyer-initiated returns
  restockingFee: number; // Percentage charged to buyer for non-defective returns
}

export interface IHighVolumeDiscount {
  minimumMonthlyGMV: number; // Minimum monthly sales to qualify
  discountPercent: number; // Discount on referral fee
  fbfDiscountPercent?: number; // Additional discount on FBF fees
}

export interface IFeeSchedule extends Document {
  feeScheduleId: string;
  version: string; // e.g., "2025-Q1"
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;

  // Category-based fees
  categoryFees: ICategoryFee[];

  // FBF (Fulfillment by Fixzit) fees
  fbfFees: IFBFFee[];

  // Advertising fees
  advertisingFees: IAdvertisingFee;

  // Payment processing fees
  paymentProcessingFees: IPaymentProcessingFee[];

  // Refund/Return fees
  refundFees: IRefundFee;

  // High-volume seller discounts
  highVolumeDiscounts: IHighVolumeDiscount[];

  // Other fees
  subscriptionFee?: number; // Monthly seller subscription (if any)
  setupFee?: number; // One-time seller onboarding fee

  // VAT
  vatPercent: number; // e.g., 15% in Saudi Arabia

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

const CategoryFeeSchema = new Schema<ICategoryFee>(
  {
    categoryId: { type: String, required: true },
    categoryName: { type: String, required: true },
    referralFeePercent: { type: Number, required: true, min: 0, max: 100 },
    minimumReferralFee: { type: Number, default: 0 },
    closingFee: Number,
  },
  { _id: false },
);

const FBFFeeSchema = new Schema<IFBFFee>(
  {
    categoryId: { type: String, required: true },
    weightTier: {
      type: String,
      enum: ["standard", "small_standard", "large_standard", "oversize"],
      required: true,
    },
    fulfillmentFee: { type: Number, required: true },
    storageFeePerCubicMeter: { type: Number, required: true },
    pickPackFee: { type: Number, required: true },
  },
  { _id: false },
);

const AdvertisingFeeSchema = new Schema<IAdvertisingFee>(
  {
    cpcMinimum: { type: Number, required: true, default: 0.5 }, // 0.50 SAR minimum
    cpcMaximum: { type: Number, required: true, default: 50.0 }, // 50 SAR maximum
    platformFeePercent: { type: Number, required: true, default: 20 }, // Platform takes 20% of ad spend
  },
  { _id: false },
);

const PaymentProcessingFeeSchema = new Schema<IPaymentProcessingFee>(
  {
    percentageFee: { type: Number, required: true },
    fixedFee: { type: Number, required: true },
    method: {
      type: String,
      enum: ["mada", "visa", "mastercard", "stc_pay", "apple_pay"],
      required: true,
    },
  },
  { _id: false },
);

const RefundFeeSchema = new Schema<IRefundFee>(
  {
    adminFee: { type: Number, default: 10 }, // 10 SAR admin fee for returns
    restockingFee: { type: Number, default: 0 }, // Percentage charged to buyer
  },
  { _id: false },
);

const HighVolumeDiscountSchema = new Schema<IHighVolumeDiscount>(
  {
    minimumMonthlyGMV: { type: Number, required: true },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    fbfDiscountPercent: Number,
  },
  { _id: false },
);

const FeeScheduleSchema = new Schema<IFeeSchedule>(
  {
    feeScheduleId: { type: String, required: true, unique: true, index: true },
    version: { type: String, required: true, index: true },
    effectiveFrom: { type: Date, required: true, index: true },
    effectiveTo: Date,
    isActive: { type: Boolean, default: true, index: true },

    categoryFees: [CategoryFeeSchema],
    fbfFees: [FBFFeeSchema],
    advertisingFees: { type: AdvertisingFeeSchema, required: true },
    paymentProcessingFees: [PaymentProcessingFeeSchema],
    refundFees: { type: RefundFeeSchema, required: true },
    highVolumeDiscounts: [HighVolumeDiscountSchema],

    subscriptionFee: Number,
    setupFee: Number,

    vatPercent: { type: Number, required: true, default: 15 }, // Saudi VAT

    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: "souq_fee_schedules",
  },
);

// Indexes
FeeScheduleSchema.index({ isActive: 1, effectiveFrom: -1 });
FeeScheduleSchema.index({ version: 1 });

// Methods

/**
 * Get referral fee for a category
 */
FeeScheduleSchema.methods.getReferralFee = function (
  categoryId: string,
  salePrice: number,
): number {
  const categoryFee = this.categoryFees.find(
    (f: ICategoryFee) => f.categoryId === categoryId,
  );

  if (!categoryFee) {
    // Default fee if category not found
    return Math.max(salePrice * 0.15, 1.0); // 15% or 1 SAR minimum
  }

  const calculatedFee = salePrice * (categoryFee.referralFeePercent / 100);
  return Math.max(calculatedFee, categoryFee.minimumReferralFee || 0);
};

/**
 * Get closing fee
 */
FeeScheduleSchema.methods.getClosingFee = function (
  categoryId: string,
): number {
  const categoryFee = this.categoryFees.find(
    (f: ICategoryFee) => f.categoryId === categoryId,
  );
  return categoryFee?.closingFee || 0;
};

/**
 * Get FBF fulfillment fee
 */
FeeScheduleSchema.methods.getFBFFee = function (
  categoryId: string,
  weightTier: string,
): number {
  const fbfFee = this.fbfFees.find(
    (f: IFBFFee) => f.categoryId === categoryId && f.weightTier === weightTier,
  );

  return fbfFee?.fulfillmentFee || 5.0; // Default 5 SAR
};

/**
 * Get FBF storage fee
 */
FeeScheduleSchema.methods.getStorageFee = function (
  categoryId: string,
  weightTier: string,
  cubicMeters: number,
): number {
  const fbfFee = this.fbfFees.find(
    (f: IFBFFee) => f.categoryId === categoryId && f.weightTier === weightTier,
  );

  const feePerCubicMeter = fbfFee?.storageFeePerCubicMeter || 20.0; // Default 20 SAR per cubic meter
  return feePerCubicMeter * cubicMeters;
};

/**
 * Get payment processing fee
 */
FeeScheduleSchema.methods.getPaymentProcessingFee = function (
  method: string,
  transactionAmount: number,
): number {
  const paymentFee = this.paymentProcessingFees.find(
    (f: IPaymentProcessingFee) => f.method === method,
  );

  if (!paymentFee) {
    // Default fee (similar to Stripe/Hyperpay)
    return transactionAmount * 0.029 + 1.0; // 2.9% + 1 SAR
  }

  return (
    transactionAmount * (paymentFee.percentageFee / 100) + paymentFee.fixedFee
  );
};

/**
 * Get high-volume discount
 */
FeeScheduleSchema.methods.getHighVolumeDiscount = function (
  monthlyGMV: number,
): IHighVolumeDiscount | null {
  // Find highest discount tier the seller qualifies for
  const qualifiedDiscounts = this.highVolumeDiscounts.filter(
    (d: IHighVolumeDiscount) => monthlyGMV >= d.minimumMonthlyGMV,
  );

  if (qualifiedDiscounts.length === 0) {
    return null;
  }

  // Return the best discount (highest GMV threshold)
  return qualifiedDiscounts.sort(
    (a: IHighVolumeDiscount, b: IHighVolumeDiscount) =>
      b.minimumMonthlyGMV - a.minimumMonthlyGMV,
  )[0];
};

/**
 * Calculate total fees for a sale
 */
FeeScheduleSchema.methods.calculateTotalFees = function (
  categoryId: string,
  salePrice: number,
  isFBF: boolean = false,
  weightTier?: string,
  paymentMethod: string = "mada",
  monthlyGMV?: number,
): {
  referralFee: number;
  closingFee: number;
  fbfFee: number;
  paymentProcessingFee: number;
  vatAmount: number;
  totalFees: number;
  netProceeds: number;
  discount?: number;
} {
  let referralFee = this.getReferralFee(categoryId, salePrice);
  const closingFee = this.getClosingFee(categoryId);
  let fbfFee = 0;

  if (isFBF && weightTier) {
    fbfFee = this.getFBFFee(categoryId, weightTier);
  }

  const paymentProcessingFee = this.getPaymentProcessingFee(
    paymentMethod,
    salePrice,
  );

  // Apply high-volume discount if applicable
  let discount = 0;
  if (monthlyGMV) {
    const volumeDiscount = this.getHighVolumeDiscount(monthlyGMV);
    if (volumeDiscount) {
      discount = referralFee * (volumeDiscount.discountPercent / 100);
      referralFee -= discount;

      if (volumeDiscount.fbfDiscountPercent && isFBF) {
        const fbfDiscount = fbfFee * (volumeDiscount.fbfDiscountPercent / 100);
        fbfFee -= fbfDiscount;
        discount += fbfDiscount;
      }
    }
  }

  const totalFeesBeforeVAT =
    referralFee + closingFee + fbfFee + paymentProcessingFee;
  const vatAmount = totalFeesBeforeVAT * (this.vatPercent / 100);
  const totalFees = totalFeesBeforeVAT + vatAmount;
  const netProceeds = salePrice - totalFees;

  return {
    referralFee,
    closingFee,
    fbfFee,
    paymentProcessingFee,
    vatAmount,
    totalFees,
    netProceeds,
    discount,
  };
};

/**
 * Validate CPC bid amount
 */
FeeScheduleSchema.methods.isValidCPCBid = function (
  bidAmount: number,
): boolean {
  return (
    bidAmount >= this.advertisingFees.cpcMinimum &&
    bidAmount <= this.advertisingFees.cpcMaximum
  );
};

/**
 * Calculate platform's cut from ad spend
 */
FeeScheduleSchema.methods.calculateAdPlatformFee = function (
  adSpend: number,
): number {
  return adSpend * (this.advertisingFees.platformFeePercent / 100);
};

export const SouqFeeSchedule = getModel<IFeeSchedule>(
  "SouqFeeSchedule",
  FeeScheduleSchema,
);
