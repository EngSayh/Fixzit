import { Schema, model, models, Types } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";

export type PropertyType =
  | "APARTMENT"
  | "VILLA"
  | "TOWNHOUSE"
  | "PENTHOUSE"
  | "STUDIO"
  | "LAND"
  | "COMMERCIAL"
  | "WAREHOUSE"
  | "OFFICE";
export type ListingType = "SALE" | "RENT" | "LEASE";
export type PropertyStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "SOLD"
  | "RENTED"
  | "OFF_MARKET";
export type FurnishingStatus =
  | "UNFURNISHED"
  | "SEMI_FURNISHED"
  | "FULLY_FURNISHED";

export interface PropertyLocation {
  address: {
    street: string;
    district: string;
    city: string;
    region: string;
    country: string;
    postalCode?: string;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
  nearby?: {
    schools?: number; // distance in km
    hospitals?: number;
    malls?: number;
    mosques?: number;
    metro?: number;
  };
}

export interface PropertyFeatures {
  bedrooms: number;
  bathrooms: number;
  area: {
    built: number; // sqm
    plot?: number; // sqm (for villas/land)
    unit: "sqm" | "sqft";
  };
  floor?: number;
  totalFloors?: number;
  parking?: number;
  furnished: FurnishingStatus;
  amenities: string[]; // pool, gym, security, garden, balcony, etc.
  yearBuilt?: number;
  lastRenovated?: number;
}

export interface PropertyPricing {
  amount: number;
  currency: string; // SAR, AED, etc.
  period?: "MONTH" | "YEAR" | "ONE_TIME"; // for rent/sale
  negotiable: boolean;
  includesUtilities?: boolean;
  includesMaintenanceFee?: boolean;
  securityDeposit?: number;
  agentCommission?: {
    percentage?: number;
    amount?: number;
    paidBy: "BUYER" | "SELLER" | "SHARED";
  };
}

export interface PropertyMedia {
  url: string;
  type: "IMAGE" | "VIDEO" | "VIRTUAL_TOUR" | "FLOOR_PLAN";
  caption?: string;
  order: number;
  isPrimary?: boolean;
}

export interface PropertyListing {
  _id: Types.ObjectId;
  orgId: Types.ObjectId; // Organization/Company managing this
  agentId?: Types.ObjectId; // Real estate agent
  ownerId?: Types.ObjectId; // Property owner (if different from agent)

  // Basic Info
  title: {
    en: string;
    ar?: string;
  };
  description: {
    en: string;
    ar?: string;
  };
  propertyType: PropertyType;
  listingType: ListingType;
  status: PropertyStatus;

  // Property Details
  location: PropertyLocation;
  features: PropertyFeatures;
  pricing: PropertyPricing;

  // Media
  media: PropertyMedia[];
  virtualTourUrl?: string;

  // Additional Info
  referenceNumber: string; // Unique property reference
  permitNumber?: string; // RERA permit or equivalent
  trakheesiNumber?: string; // Dubai specific

  // Engagement
  views: number;
  favorites: number;
  inquiries: number;
  viewingRequests: Types.ObjectId[]; // Reference to ViewingRequest

  // Metadata
  featured: boolean;
  verified: boolean;
  publishedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PropertyListingSchema = new Schema<PropertyListing>(
  {
    // Note: index: true removed from orgId to avoid duplicate index warning
    // orgId is indexed via composite indexes below (orgId+status, etc.)
    orgId: { type: Schema.Types.ObjectId, required: true },
    agentId: { type: Schema.Types.ObjectId, index: true },
    ownerId: { type: Schema.Types.ObjectId },

    title: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, trim: true },
    },
    description: {
      en: { type: String, required: true },
      ar: { type: String },
    },
    propertyType: {
      type: String,
      enum: [
        "APARTMENT",
        "VILLA",
        "TOWNHOUSE",
        "PENTHOUSE",
        "STUDIO",
        "LAND",
        "COMMERCIAL",
        "WAREHOUSE",
        "OFFICE",
      ],
      required: true,
      index: true,
    },
    listingType: {
      type: String,
      enum: ["SALE", "RENT", "LEASE"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "RESERVED", "SOLD", "RENTED", "OFF_MARKET"],
      default: "AVAILABLE",
      index: true,
    },

    location: {
      address: {
        street: { type: String, required: true },
        district: { type: String, required: true, index: true },
        city: { type: String, required: true, index: true },
        region: { type: String, required: true },
        country: { type: String, default: "Saudi Arabia" },
        postalCode: String,
      },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
      nearby: {
        schools: Number,
        hospitals: Number,
        malls: Number,
        mosques: Number,
        metro: Number,
      },
    },

    features: {
      bedrooms: { type: Number, required: true, min: 0, index: true },
      bathrooms: { type: Number, required: true, min: 0 },
      area: {
        built: { type: Number, required: true, min: 0 },
        plot: { type: Number, min: 0 },
        unit: { type: String, enum: ["sqm", "sqft"], default: "sqm" },
      },
      floor: Number,
      totalFloors: Number,
      parking: { type: Number, default: 0 },
      furnished: {
        type: String,
        enum: ["UNFURNISHED", "SEMI_FURNISHED", "FULLY_FURNISHED"],
        default: "UNFURNISHED",
        index: true,
      },
      amenities: [{ type: String }],
      yearBuilt: Number,
      lastRenovated: Number,
    },

    pricing: {
      amount: { type: Number, required: true, min: 0, index: true },
      currency: { type: String, default: "SAR" },
      period: {
        type: String,
        enum: ["MONTH", "YEAR", "ONE_TIME"],
      },
      negotiable: { type: Boolean, default: false },
      includesUtilities: Boolean,
      includesMaintenanceFee: Boolean,
      securityDeposit: Number,
      agentCommission: {
        percentage: Number,
        amount: Number,
        paidBy: {
          type: String,
          enum: ["BUYER", "SELLER", "SHARED"],
        },
      },
    },

    media: [
      {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ["IMAGE", "VIDEO", "VIRTUAL_TOUR", "FLOOR_PLAN"],
          default: "IMAGE",
        },
        caption: String,
        order: { type: Number, default: 0 },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    virtualTourUrl: String,

    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    permitNumber: String,
    trakheesiNumber: String,

    views: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    viewingRequests: [{ type: Schema.Types.ObjectId, ref: "ViewingRequest" }],

    featured: { type: Boolean, default: false, index: true },
    verified: { type: Boolean, default: false, index: true },
    publishedAt: Date,
    expiresAt: Date,
  },
  {
    timestamps: true,
    collection: "aqar_listings",
  },
);

// Indexes for efficient querying
PropertyListingSchema.index({ orgId: 1, status: 1 });
PropertyListingSchema.index({ "location.coordinates": "2dsphere" }); // Geospatial index
PropertyListingSchema.index({ propertyType: 1, listingType: 1, status: 1 });
PropertyListingSchema.index({ "pricing.amount": 1, listingType: 1 });
PropertyListingSchema.index({
  "features.bedrooms": 1,
  "features.bathrooms": 1,
});
PropertyListingSchema.index({ createdAt: -1 });
PropertyListingSchema.index({ featured: 1, publishedAt: -1 });

// Text index for search
PropertyListingSchema.index({
  "title.en": "text",
  "title.ar": "text",
  "description.en": "text",
  "description.ar": "text",
  "location.address.district": "text",
  "location.address.city": "text",
});

/**
 * Multi-tenancy Plugin - Auto-filters queries by orgId
 * SECURITY: Ensures property listings are isolated per organization
 */
PropertyListingSchema.plugin(tenantIsolationPlugin);

const PropertyListingModel = getModel<PropertyListing>(
  "PropertyListing",
  PropertyListingSchema,
);

export default PropertyListingModel;
