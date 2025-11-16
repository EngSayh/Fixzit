/**
 * Souq Price History Model - Tracks price changes for listings
 * @module server/models/souq/PriceHistory
 */

import mongoose, { Schema, type Document } from 'mongoose';
import { getModel } from '@/src/types/mongoose-compat';

export interface IPriceHistory extends Document {
  _id: mongoose.Types.ObjectId;
  listingId: string;
  sellerId: string;
  productId: string;
  
  // Price changes
  oldPrice: number;
  newPrice: number;
  change: number; // Calculated: newPrice - oldPrice
  changePercent: number; // Calculated: (change / oldPrice) * 100
  
  // Context
  reason: 'manual' | 'auto_repricer' | 'competitor_match' | 'promotion' | 'cost_change' | 'demand_adjustment';
  competitorPrice?: number; // If triggered by competitor
  
  // Metadata
  createdAt: Date;
  createdBy?: string; // userId if manual
  
  // Auto-repricer metadata
  autoRepricerRule?: string; // Rule ID that triggered change
  competitorListingId?: string; // Competitor that triggered change
  
  // Methods
  calculateImpact(): number | null;
  
  // Impact tracking
  salesBefore?: number; // 7-day avg before change (filled later by analytics job)
  salesAfter?: number; // 7-day avg after change (filled later by analytics job)
  impactAnalyzedAt?: Date;
}

const PriceHistorySchema = new Schema<IPriceHistory>(
  {
    listingId: {
      type: String,
      required: true,
      index: true,
    },
    sellerId: {
      type: String,
      required: true,
      index: true,
    },
    productId: {
      type: String,
      required: true,
      index: true,
    },
    oldPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    newPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    change: {
      type: Number,
      required: true,
    },
    changePercent: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      enum: ['manual', 'auto_repricer', 'competitor_match', 'promotion', 'cost_change', 'demand_adjustment'],
      required: true,
      index: true,
    },
    competitorPrice: {
      type: Number,
      min: 0,
    },
    createdBy: {
      type: String,
    },
    autoRepricerRule: {
      type: String,
      index: true,
    },
    competitorListingId: {
      type: String,
    },
    salesBefore: {
      type: Number,
      min: 0,
    },
    salesAfter: {
      type: Number,
      min: 0,
    },
    impactAnalyzedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'souq_price_history',
  }
);

// Indexes for efficient queries
PriceHistorySchema.index({ listingId: 1, createdAt: -1 });
PriceHistorySchema.index({ sellerId: 1, createdAt: -1 });
PriceHistorySchema.index({ productId: 1, createdAt: -1 });
PriceHistorySchema.index({ reason: 1, createdAt: -1 });
PriceHistorySchema.index({ autoRepricerRule: 1, createdAt: -1 });

// Method: Calculate impact percentage
PriceHistorySchema.methods.calculateImpact = function (): number | null {
  if (this.salesBefore && this.salesAfter) {
    return ((this.salesAfter - this.salesBefore) / this.salesBefore) * 100;
  }
  return null;
};

// Static: Get price history for listing
PriceHistorySchema.statics.getListingHistory = async function (
  listingId: string,
  limit: number = 50
) {
  return this.find({ listingId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static: Get seller price changes
PriceHistorySchema.statics.getSellerHistory = async function (
  sellerId: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100
) {
  const query: {
    sellerId: string;
    createdAt?: { $gte?: Date; $lte?: Date };
  } = { sellerId };
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static: Get auto-repricer performance
PriceHistorySchema.statics.getRepricerPerformance = async function (
  sellerId: string,
  days: number = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const changes = await this.find({
    sellerId,
    reason: 'auto_repricer',
    createdAt: { $gte: startDate },
    impactAnalyzedAt: { $exists: true }, // Only analyzed changes
  });
  
  const totalChanges = changes.length;
  const positiveImpact = changes.filter((c: IPriceHistory) => {
    const impact = c.calculateImpact();
    return impact !== null && impact > 0;
  }).length;
  
  const avgPriceChange = changes.reduce((sum: number, c: IPriceHistory) => sum + c.changePercent, 0) / totalChanges;
  
  return {
    totalChanges,
    positiveImpact,
    negativeImpact: totalChanges - positiveImpact,
    successRate: (positiveImpact / totalChanges) * 100,
    avgPriceChange,
  };
};

export const PriceHistory = getModel<IPriceHistory>('PriceHistory', PriceHistorySchema);

export default PriceHistory;
