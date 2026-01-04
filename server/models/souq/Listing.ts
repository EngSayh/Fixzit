/**
 * Souq Listing Model - Seller offers for products (multi-seller marketplace)
 * @module server/models/souq/Listing
 */

import mongoose, { Schema, type Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";

export interface IListing extends Document {
  _id: mongoose.Types.ObjectId;
  listingId: string;

  productId: mongoose.Types.ObjectId;
  fsin: string;
  variationId?: mongoose.Types.ObjectId;
  sku?: string;

  sellerId: mongoose.Types.ObjectId;
  orgId?: mongoose.Types.ObjectId;

  price: number;
  compareAtPrice?: number;
  currency: string;

  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;

  fulfillmentMethod: "fbf" | "fbm";
  warehouseLocation?: string;
  handlingTime: number;

  shippingOptions: {
    method: "standard" | "express" | "overnight";
    carrier?: string;
    price: number;
    estimatedDays: number;
  }[];
  freeShipping: boolean;

  condition:
    | "new"
    | "refurbished"
    | "used-like-new"
    | "used-good"
    | "used-acceptable";
  conditionNotes?: string;

  buyBoxEligible: boolean;
  buyBoxScore?: number;
  lastBuyBoxWin?: Date;
  badges: string[];
  lastPriceChange?: Date;

  status: "draft" | "active" | "inactive" | "out_of_stock" | "suppressed";
  suppressionReasons?: string[];

  metrics: {
    orderCount: number;
    cancelRate: number;
    defectRate: number;
    onTimeShipRate: number;
    customerRating: number;
    priceCompetitiveness: number;
  };

  isFeatured: boolean;
  isPrime: boolean;
  isSponsored: boolean;

  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  deactivatedAt?: Date;

  // Methods
  checkBuyBoxEligibility(): Promise<boolean>;
}

const ListingSchema = new Schema<IListing>(
  {
    listingId: {
      type: String,
      required: true,
      unique: true,
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
    variationId: {
      type: Schema.Types.ObjectId,
      ref: "SouqVariation",
      index: true,
    },
    sku: {
      type: String,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "SouqSeller",
      required: true,
      index: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    compareAtPrice: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: "SAR",
    },
    stockQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    fulfillmentMethod: {
      type: String,
      enum: ["fbf", "fbm"],
      required: true,
      default: "fbm",
      index: true,
    },
    warehouseLocation: String,
    handlingTime: {
      type: Number,
      required: true,
      default: 2,
      min: 0,
      max: 30,
    },
    shippingOptions: [
      {
        method: {
          type: String,
          enum: ["standard", "express", "overnight"],
          required: true,
        },
        carrier: String,
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        estimatedDays: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    freeShipping: {
      type: Boolean,
      default: false,
      index: true,
    },
    condition: {
      type: String,
      enum: [
        "new",
        "refurbished",
        "used-like-new",
        "used-good",
        "used-acceptable",
      ],
      default: "new",
      index: true,
    },
    conditionNotes: String,
    buyBoxEligible: {
      type: Boolean,
      default: false,
      index: true,
    },
    buyBoxScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    lastBuyBoxWin: Date,
    badges: {
      type: [String],
      default: [],
    },
    lastPriceChange: Date,
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "out_of_stock", "suppressed"],
      default: "draft",
      index: true,
    },
    suppressionReasons: [String],
    metrics: {
      orderCount: {
        type: Number,
        default: 0,
      },
      cancelRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      defectRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      onTimeShipRate: {
        type: Number,
        default: 100,
        min: 0,
        max: 100,
      },
      customerRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      priceCompetitiveness: {
        type: Number,
        default: 50,
        min: 0,
        max: 100,
      },
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPrime: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSponsored: {
      type: Boolean,
      default: false,
      index: true,
    },
    activatedAt: Date,
    deactivatedAt: Date,
  },
  {
    timestamps: true,
    collection: "souq_listings",
  },
);

// Compound indexes for Buy Box queries
ListingSchema.index({ fsin: 1, status: 1, buyBoxEligible: 1 });
ListingSchema.index({ productId: 1, sellerId: 1 }, { unique: true });
ListingSchema.index({ sellerId: 1, status: 1 });
ListingSchema.index({ price: 1, status: 1 });
ListingSchema.index({ orgId: 1, listingId: 1 });
ListingSchema.index({ orgId: 1, sellerId: 1 });
ListingSchema.index({ orgId: 1, status: 1 });

// Pre-save: Calculate available quantity
ListingSchema.pre("save", function (next) {
  this.availableQuantity = Math.max(
    0,
    this.stockQuantity - this.reservedQuantity,
  );

  // Auto-update status based on stock
  if (this.availableQuantity === 0 && this.status === "active") {
    this.status = "out_of_stock";
  } else if (this.availableQuantity > 0 && this.status === "out_of_stock") {
    this.status = "active";
  }

  next();
});

// Method: Calculate Buy Box score
ListingSchema.methods.calculateBuyBoxScore = function (): number {
  const {
    orderCount,
    cancelRate,
    defectRate,
    onTimeShipRate,
    customerRating,
    priceCompetitiveness,
  } = this.metrics;

  // Weighted scoring algorithm
  const priceScore = priceCompetitiveness * 0.35;
  const performanceScore = onTimeShipRate * 0.25;
  const qualityScore = (100 - defectRate) * 0.2;
  const ratingScore = (customerRating / 5) * 100 * 0.1;
  const reliabilityScore = (100 - cancelRate) * 0.1;

  // Boost for order history (experience factor)
  const experienceBoost = Math.min(orderCount / 100, 1) * 5;

  const score =
    priceScore +
    performanceScore +
    qualityScore +
    ratingScore +
    reliabilityScore +
    experienceBoost;

  return Math.round(Math.max(0, Math.min(100, score)));
};

// Method: Check if listing is eligible for Buy Box
ListingSchema.methods.checkBuyBoxEligibility =
  async function (): Promise<boolean> {
    // Must be active with stock
    if (this.status !== "active" || this.availableQuantity === 0) {
      this.buyBoxEligible = false;
      return false;
    }

    // Must have acceptable performance
    if (
      this.metrics.defectRate > 2 ||
      this.metrics.cancelRate > 2.5 ||
      this.metrics.onTimeShipRate < 95
    ) {
      this.buyBoxEligible = false;
      return false;
    }

    // Check seller account health
    const seller = await mongoose.model("SouqSeller").findById(this.sellerId);
    if (!seller || !seller.canCompeteInBuyBox()) {
      this.buyBoxEligible = false;
      return false;
    }

    this.buyBoxEligible = true;
    this.buyBoxScore = this.calculateBuyBoxScore();
    return true;
  };

// Method: Reserve quantity for order
ListingSchema.methods.reserveStock = async function (
  quantity: number,
): Promise<boolean> {
  if (this.availableQuantity < quantity) {
    return false;
  }

  this.reservedQuantity += quantity;
  await this.save();
  return true;
};

// Method: Release reserved quantity
ListingSchema.methods.releaseStock = async function (
  quantity: number,
): Promise<void> {
  this.reservedQuantity = Math.max(0, this.reservedQuantity - quantity);
  await this.save();
};

// Method: Deduct stock after order
ListingSchema.methods.deductStock = async function (
  quantity: number,
): Promise<boolean> {
  if (this.reservedQuantity < quantity) {
    return false;
  }

  this.stockQuantity -= quantity;
  this.reservedQuantity -= quantity;
  await this.save();
  return true;
};

// Static: Get Buy Box winner for a product
ListingSchema.statics.getBuyBoxWinner = async function (fsin: string) {
  const listings = await this.find({
    fsin,
    status: "active",
    buyBoxEligible: true,
    availableQuantity: { $gt: 0 },
  })
    .populate("sellerId")
    .sort({ buyBoxScore: -1, price: 1 })
    .limit(1);

  return listings[0] || null;
};

// Static: Get all offers for a product
ListingSchema.statics.getProductOffers = async function (
  fsin: string,
  options = {},
) {
  const { condition = "new", sort = "price" } = options as {
    condition?: string;
    sort?: string;
  };

  const query: Record<string, unknown> = {
    fsin,
    status: "active",
    availableQuantity: { $gt: 0 },
  };

  if (condition) {
    query.condition = condition;
  }

  const sortOptions: Record<string, number> = {};
  if (sort === "price") {
    sortOptions.price = 1;
  } else if (sort === "rating") {
    sortOptions["metrics.customerRating"] = -1;
  }

  return this.find(query).populate("sellerId").sort(sortOptions);
};

export const SouqListing = getModel<IListing>("SouqListing", ListingSchema);

export default SouqListing;
