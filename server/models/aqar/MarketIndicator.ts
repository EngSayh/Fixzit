/**
 * MarketIndicator Model - Real estate price intelligence
 * 
 * @module server/models/aqar/MarketIndicator
 * @description Historical price data for market analysis and trends.
 * Powers the price indicators feature for real estate market intelligence.
 * 
 * @features
 * - Location-based price tracking (city/district/neighborhood)
 * - Property type segmentation
 * - Transaction type (sale/rent)
 * - Room count filtering
 * - Semi-annual price data
 * - Trend calculation
 * 
 * @indexes
 * - Compound index for location + property + transaction queries
 * - Period index for time-series queries
 */

import { Schema, model, models, Types, Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const PropertyType = {
  APARTMENT: "apartment",
  VILLA: "villa",
  LAND: "land",
  FLOOR: "floor",
  BUILDING: "building",
  OFFICE: "office",
  SHOP: "shop",
  WAREHOUSE: "warehouse",
} as const;

export const TransactionType = {
  SALE: "sale",
  RENT: "rent",
} as const;

export type PropertyTypeValue = (typeof PropertyType)[keyof typeof PropertyType];
export type TransactionTypeValue = (typeof TransactionType)[keyof typeof TransactionType];

// ============================================================================
// INTERFACES
// ============================================================================

export interface IMarketIndicator extends Document {
  // Location
  city: string;
  city_ar: string;
  district?: string;
  district_ar?: string;
  neighborhood?: string;
  neighborhood_ar?: string;
  
  // Property Criteria
  property_type: PropertyTypeValue;
  transaction_type: TransactionTypeValue;
  rooms?: number; // null for land
  
  // Price Data
  period: string; // "H1 2025", "H2 2024", etc.
  period_start: Date;
  period_end: Date;
  average_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  sample_size: number;
  price_change_pct: number; // vs previous period
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const MarketIndicatorSchema = new Schema<IMarketIndicator>(
  {
    // Location
    city: {
      type: String,
      required: true,
      trim: true,
    },
    city_ar: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    district_ar: {
      type: String,
      trim: true,
    },
    neighborhood: {
      type: String,
      trim: true,
    },
    neighborhood_ar: {
      type: String,
      trim: true,
    },
    
    // Property Criteria
    property_type: {
      type: String,
      required: true,
      enum: Object.values(PropertyType),
    },
    transaction_type: {
      type: String,
      required: true,
      enum: Object.values(TransactionType),
    },
    rooms: {
      type: Number,
      min: 0,
    },
    
    // Price Data
    period: {
      type: String,
      required: true,
      match: [/^H[12] \d{4}$/, "Period must be in format 'H1 2025' or 'H2 2024'"],
    },
    period_start: {
      type: Date,
      required: true,
    },
    period_end: {
      type: Date,
      required: true,
    },
    average_price: {
      type: Number,
      required: true,
      min: 0,
    },
    median_price: {
      type: Number,
      required: true,
      min: 0,
    },
    min_price: {
      type: Number,
      required: true,
      min: 0,
    },
    max_price: {
      type: Number,
      required: true,
      min: 0,
    },
    sample_size: {
      type: Number,
      required: true,
      min: 0,
    },
    price_change_pct: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "market_indicators",
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Main query index
MarketIndicatorSchema.index({
  city: 1,
  district: 1,
  neighborhood: 1,
  property_type: 1,
  transaction_type: 1,
  rooms: 1,
  period: -1,
});

// Time-series queries
MarketIndicatorSchema.index({ period_start: -1 });
MarketIndicatorSchema.index({ period: -1 });

// City-level aggregations
MarketIndicatorSchema.index({ city: 1, property_type: 1, transaction_type: 1 });

// ============================================================================
// STATICS
// ============================================================================

/**
 * Get price history for a location/property combo
 */
MarketIndicatorSchema.statics.getPriceHistory = async function (
  query: {
    city: string;
    district?: string;
    neighborhood?: string;
    property_type: PropertyTypeValue;
    transaction_type: TransactionTypeValue;
    rooms?: number;
  },
  limit: number = 8
): Promise<IMarketIndicator[]> {
  const filter: Record<string, unknown> = {
    city: query.city,
    property_type: query.property_type,
    transaction_type: query.transaction_type,
  };
  
  if (query.district) filter.district = query.district;
  if (query.neighborhood) filter.neighborhood = query.neighborhood;
  if (query.rooms !== undefined) filter.rooms = query.rooms;
  
  return this.find(filter)
    .sort({ period_start: -1 })
    .limit(limit);
};

/**
 * Get available locations for dropdown
 */
MarketIndicatorSchema.statics.getLocations = async function (
  city?: string
): Promise<{ cities: string[]; districts: string[]; neighborhoods: string[] }> {
  const cities = await this.distinct("city");
  
  let districts: string[] = [];
  let neighborhoods: string[] = [];
  
  if (city) {
    districts = await this.distinct("district", { city });
    neighborhoods = await this.distinct("neighborhood", { city });
  }
  
  return {
    cities: cities.filter(Boolean),
    districts: districts.filter(Boolean),
    neighborhoods: neighborhoods.filter(Boolean),
  };
};

/**
 * Calculate trend direction
 */
MarketIndicatorSchema.statics.getTrend = function (
  currentPrice: number,
  previousPrice: number
): { direction: "up" | "down" | "stable"; change_pct: number } {
  if (!previousPrice || previousPrice === 0) {
    return { direction: "stable", change_pct: 0 };
  }
  
  const change_pct = ((currentPrice - previousPrice) / previousPrice) * 100;
  
  if (change_pct > 2) {
    return { direction: "up", change_pct: Math.round(change_pct * 10) / 10 };
  } else if (change_pct < -2) {
    return { direction: "down", change_pct: Math.round(change_pct * 10) / 10 };
  } else {
    return { direction: "stable", change_pct: Math.round(change_pct * 10) / 10 };
  }
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

export const MarketIndicator = getModel<IMarketIndicator>(
  "MarketIndicator",
  MarketIndicatorSchema
);
export default MarketIndicator;
