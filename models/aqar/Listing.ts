/**
 * Aqar Souq - Listing Model
 * 
 * Property listing for buy/rent/daily stays matching sa.aqar.fm functionality
 * Includes KSA compliance (REGA/FAL), geo-spatial indexing, and analytics
 */

import mongoose, { Schema, Document, Model } from 'mongoose'
import { getModel, MModel } from '@/src/types/mongoose-compat';;

// Enums
/* eslint-disable no-unused-vars */
export enum ListingIntent {
  BUY = 'BUY',
  RENT = 'RENT',
  DAILY = 'DAILY',
}

export enum PropertyType {
  APARTMENT = 'APARTMENT',
  VILLA = 'VILLA',
  LAND = 'LAND',
  BUILDING = 'BUILDING',
  FLOOR = 'FLOOR',
  ROOM = 'ROOM',
  SHOP = 'SHOP',
  OFFICE = 'OFFICE',
  WAREHOUSE = 'WAREHOUSE',
  REST_HOUSE = 'REST_HOUSE',
  CHALET = 'CHALET',
  FARM = 'FARM',
  OTHER = 'OTHER',
}

export enum FurnishingStatus {
  FURNISHED = 'FURNISHED',
  UNFURNISHED = 'UNFURNISHED',
  PARTLY = 'PARTLY',
}

export enum ListerType {
  OWNER = 'OWNER',
  AGENT = 'AGENT',
  DEVELOPER = 'DEVELOPER',
}

export enum ListingStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REJECTED = 'REJECTED',
  SOLD = 'SOLD',
  RENTED = 'RENTED',
}

export enum RentFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}
/* eslint-enable no-unused-vars */

// Interfaces
export interface IListingMedia {
  url: string;
  kind: 'IMAGE' | 'VIDEO' | 'VR';
  order: number;
}

export interface IListingCompliance {
  falLicenseNo?: string;       // FAL broker license (وسيط)
  adPermitNo?: string;          // REGA ad permit (mandatory per listing)
  brokerageContractId?: string; // Contract reference
  verifiedOwner?: boolean;      // Owner identity verified
}

export interface IListingAnalytics {
  views: number;
  favorites: number;
  inquiries: number;
  lastViewedAt?: Date;
}

export interface IListingModeration {
  riskFlags: string[];
  lastReviewAt?: Date;
  reviewerId?: mongoose.Types.ObjectId;
}

export interface IListing extends Document {
  // Organization & ownership
  orgId: mongoose.Types.ObjectId;
  listerId: mongoose.Types.ObjectId;
  propertyRef?: mongoose.Types.ObjectId; // Link to Fixzit Property/Unit
  
  // Core details
  intent: ListingIntent;
  propertyType: PropertyType;
  title?: string;
  description?: string;
  
  // Location
  address: string;
  city: string;
  neighborhood?: string;
  geo: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  
  // Specifications
  areaSqm?: number;
  beds?: number;
  baths?: number;
  kitchens?: number;
  ageYears?: number;
  furnishing?: FurnishingStatus;
  amenities: string[];
  streetWidthM?: number;
  facing?: 'N' | 'S' | 'E' | 'W';
  
  // Media
  media: IListingMedia[];
  
  // Pricing
  price: number;
  rentFrequency?: RentFrequency;
  
  // Source
  source: ListerType;
  
  // Compliance (KSA)
  compliance: IListingCompliance;
  
  // Visibility
  status: ListingStatus;
  featuredLevel?: number;
  pinnedUntil?: Date;
  
  // Analytics
  analytics: IListingAnalytics;
  
  // Moderation
  moderation: IListingModeration;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

// Schema
const ListingSchema = new Schema<IListing>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    listerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    propertyRef: { type: Schema.Types.ObjectId, ref: 'Property' },
    
    intent: { type: String, enum: Object.values(ListingIntent), required: true, index: true },
    propertyType: { type: String, enum: Object.values(PropertyType), required: true, index: true },
    title: { type: String, maxlength: 200 },
    description: { type: String, maxlength: 5000 },
    
    address: { type: String, required: true },
    city: { type: String, required: true, index: true },
    neighborhood: { type: String, index: true },
    geo: {
      type: { type: String, enum: ['Point'], default: 'Point', required: true },
      coordinates: { type: [Number], required: true },
    },
    
    areaSqm: { type: Number, min: 0 },
    beds: { type: Number, min: 0, index: true },
    baths: { type: Number, min: 0, index: true },
    kitchens: { type: Number, min: 0 },
    ageYears: { type: Number, min: 0 },
    furnishing: { type: String, enum: Object.values(FurnishingStatus) },
    amenities: { type: [String], default: [] },
    streetWidthM: { type: Number, min: 0 },
    facing: { type: String, enum: ['N', 'S', 'E', 'W'] },
    
    media: [
      {
        url: { type: String, required: true },
        kind: { type: String, enum: ['IMAGE', 'VIDEO', 'VR'], required: true },
        order: { type: Number, required: true },
      },
    ],
    
    price: { type: Number, required: true, min: 0, index: true },
    rentFrequency: { type: String, enum: Object.values(RentFrequency) },
    
    source: { type: String, enum: Object.values(ListerType), required: true, index: true },
    
    compliance: {
      falLicenseNo: { type: String },
      adPermitNo: { type: String },
      brokerageContractId: { type: String },
      verifiedOwner: { type: Boolean, default: false },
    },
    
    status: {
      type: String,
      enum: Object.values(ListingStatus),
      default: ListingStatus.DRAFT,
      required: true,
      index: true,
    },
    featuredLevel: { type: Number, default: 0, index: true },
    pinnedUntil: { type: Date },
    
    analytics: {
      views: { type: Number, default: 0 },
      favorites: { type: Number, default: 0 },
      inquiries: { type: Number, default: 0 },
      lastViewedAt: { type: Date },
    },
    
    moderation: {
      riskFlags: { type: [String], default: [] },
      lastReviewAt: { type: Date },
      reviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    
    publishedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'aqar_listings',
  }
);

// Indexes
ListingSchema.index({ geo: '2dsphere' }); // Geo-spatial queries
ListingSchema.index({
  city: 1,
  neighborhood: 1,
  intent: 1,
  propertyType: 1,
  price: 1,
  status: 1,
}); // Compound search index
ListingSchema.index({ 'compliance.adPermitNo': 1 }, { sparse: true }); // Compliance queries
ListingSchema.index({ createdAt: -1 }); // Recency sort
ListingSchema.index({ publishedAt: -1 }); // Published sort
ListingSchema.index({ featuredLevel: -1, publishedAt: -1 }); // Featured first

// Virtual for Atlas Search (if enabled)
// eslint-disable-next-line no-unused-vars
ListingSchema.virtual('searchText').get(function (this: IListing) {
  return `${this.title || ''} ${this.description || ''} ${this.amenities.join(' ')}`;
});

// Methods - using atomic updates to prevent race conditions
// eslint-disable-next-line no-unused-vars
ListingSchema.methods.incrementViews = async function (this: IListing) {
  await (this.constructor as typeof import('mongoose').Model).updateOne(
    { _id: this._id },
    { 
      $inc: { 'analytics.views': 1 },
      $set: { 'analytics.lastViewedAt': new Date() }
    }
  );
};

// eslint-disable-next-line no-unused-vars
ListingSchema.methods.incrementFavorites = async function (this: IListing) {
  await (this.constructor as typeof import('mongoose').Model).updateOne(
    { _id: this._id },
    { $inc: { 'analytics.favorites': 1 } }
  );
};

// eslint-disable-next-line no-unused-vars
ListingSchema.methods.incrementInquiries = async function (this: IListing) {
  await (this.constructor as typeof import('mongoose').Model).updateOne(
    { _id: this._id },
    { $inc: { 'analytics.inquiries': 1 } }
  );
};

// Pre-save hook: Validate compliance for AGENT listings
ListingSchema.pre('save', function (this: IListing, next) {
  if (this.source === ListerType.AGENT) {
    // Validate non-empty strings for licenses
    const hasFalLicense = 
      this.compliance?.falLicenseNo && 
      typeof this.compliance.falLicenseNo === 'string' && 
      this.compliance.falLicenseNo.trim().length > 0;
    
    const hasAdPermit = 
      this.compliance?.adPermitNo && 
      typeof this.compliance.adPermitNo === 'string' && 
      this.compliance.adPermitNo.trim().length > 0;
    
    if (!hasFalLicense || !hasAdPermit) {
      const err = new Error(
        'Broker ads require valid FAL license and per-ad permit (REGA requirement)'
      );
      err.name = 'ValidationError';
      return next(err);
    }
  }
  next();
});

// Model
const Listing =
  getModel<any>('AqarListing', ListingSchema);

export default Listing;
