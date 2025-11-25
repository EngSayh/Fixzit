/**
 * Seller Metrics Model - Analytics snapshots
 * @module server/models/souq/SellerMetrics
 */

import mongoose, { Schema, type Document } from "mongoose";
import { getModel, MModel } from "@/src/types/mongoose-compat";

export interface ISellerMetrics extends Document {
  _id: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  date: Date; // Snapshot date
  period: "daily" | "weekly" | "monthly";

  sales: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    conversionRate: number;
  };

  products: {
    topProductIds: string[];
    lowStockCount: number;
    underperformingCount: number;
  };

  customers: {
    newCustomers: number;
    repeatCustomerRate: number;
    lifetimeValue: number;
  };

  traffic: {
    pageViews: number;
    uniqueVisitors: number;
    bounceRate: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

const SellerMetricsSchema = new Schema<ISellerMetrics>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "SouqSeller",
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },
    sales: {
      revenue: { type: Number, required: true, default: 0 },
      orders: { type: Number, required: true, default: 0 },
      averageOrderValue: { type: Number, required: true, default: 0 },
      conversionRate: { type: Number, required: true, default: 0 },
    },
    products: {
      topProductIds: [{ type: String }],
      lowStockCount: { type: Number, default: 0 },
      underperformingCount: { type: Number, default: 0 },
    },
    customers: {
      newCustomers: { type: Number, default: 0 },
      repeatCustomerRate: { type: Number, default: 0 },
      lifetimeValue: { type: Number, default: 0 },
    },
    traffic: {
      pageViews: { type: Number, default: 0 },
      uniqueVisitors: { type: Number, default: 0 },
      bounceRate: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    collection: "souq_seller_metrics",
  },
);

// Indexes
SellerMetricsSchema.index({ sellerId: 1, date: -1 });
SellerMetricsSchema.index({ sellerId: 1, period: 1, date: -1 });

export const SellerMetrics: MModel<ISellerMetrics> = getModel<ISellerMetrics>(
  "SellerMetrics",
  SellerMetricsSchema,
);
export type { ISellerMetrics as SellerMetricsType };
