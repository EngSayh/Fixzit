/**
 * Aqar Souq - Listing Model (2025 enhancements)
 *
 * Supports auctions, RNPL, VR media, compliance (FAL/Nafath/foreign ownership),
 * boost forecasting, analytics, and geospatial search.
 */

import mongoose, { Schema, Document } from 'mongoose';
import { getModel } from '@/src/types/mongoose-compat';

// Enums
/* eslint-disable no-unused-vars */
export enum ListingIntent {
  BUY = 'BUY',
  RENT = 'RENT',
  DAILY = 'DAILY',
  AUCTION = 'AUCTION',
}

export enum PropertyType {
  APARTMENT = 'APARTMENT',
  VILLA = 'VILLA',
  LAND = 'LAND',
  COMMERCIAL = 'COMMERCIAL',
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
  kind: 'IMAGE' | 'VIDEO' | 'TOUR' | 'VR';
  order: number;
}

export interface IListingCompliance {
  falLicenseNo?: string;
  adPermitNo?: string;
  brokerageContractId?: string;
  verifiedOwner?: boolean;
  nafathVerified?: boolean;
  foreignOwnerCompliant?: boolean;
  verifiedAt?: Date;
}

export interface IListingAnalytics {
  views: number;
  favorites: number;
  inquiries: number;
  lastViewedAt?: Date;
  ctr?: number;
}

export interface IListingModeration {
  riskFlags: string[];
  lastReviewAt?: Date;
  reviewerId?: mongoose.Types.ObjectId;
  notes?: string;
}

export interface IListing extends Document {
  orgId: mongoose.Types.ObjectId;
  listerId: mongoose.Types.ObjectId;
  propertyRef?: mongoose.Types.ObjectId;
  intent: ListingIntent;
  propertyType: PropertyType;
  title?: string;
  description?: string;
  address: string;
  city: string;
  neighborhood?: string;
  location: {
    addressLine?: string;
    cityId?: string;
    neighborhoodId?: string;
    geo: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  areaSqm?: number;
  beds?: number;
  baths?: number;
  kitchens?: number;
  ageYears?: number;
  furnishing?: FurnishingStatus;
  amenities: string[];
  streetWidthM?: number;
  facing?: 'N' | 'S' | 'E' | 'W';
  media: IListingMedia[];
  price: {
    amount: number;
    currency: string;
    frequency?: RentFrequency | null;
  };
  vatRate?: number;
  source: ListerType;
  compliance: IListingCompliance;
  status: ListingStatus;
  featuredLevel?: number;
  pinnedUntil?: Date;
  analytics: IListingAnalytics;
  moderation: IListingModeration;
  boost?: {
    dailyBudget?: number;
    startAt?: Date;
    endAt?: Date;
    impressionsForecast?: number;
  };
  ratings?: {
    average?: number;
    count?: number;
  };
  auction?: {
    isAuction?: boolean;
    startAt?: Date;
    endAt?: Date;
    reserve?: number;
    deposit?: number;
    externalLink?: string;
  };
  rnplEligible?: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

const GeoPointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coords: number[]) => Array.isArray(coords) && coords.length === 2,
        message: 'Geo coordinates must be [lng, lat]',
      },
    },
  },
  { _id: false }
);

const MediaSchema = new Schema(
  {
    url: { type: String, required: true },
    kind: { type: String, enum: ['IMAGE', 'VIDEO', 'TOUR', 'VR'], required: true },
    order: { type: Number, required: true },
  },
  { _id: false }
);

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
    location: {
      addressLine: { type: String },
      cityId: { type: String, index: true },
      neighborhoodId: { type: String, index: true },
      geo: { type: GeoPointSchema, required: true },
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
    media: { type: [MediaSchema], default: [] },
    price: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'SAR' },
      frequency: { type: String, enum: [...Object.values(RentFrequency), null], default: null },
    },
    vatRate: { type: Number, default: 15 },
    source: { type: String, enum: Object.values(ListerType), required: true, index: true },
    compliance: {
      falLicenseNo: { type: String },
      adPermitNo: { type: String },
      brokerageContractId: { type: String },
      verifiedOwner: { type: Boolean, default: false },
      nafathVerified: { type: Boolean, default: false },
      foreignOwnerCompliant: { type: Boolean, default: false },
      verifiedAt: { type: Date },
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
      ctr: { type: Number, default: 0 },
    },
    moderation: {
      riskFlags: { type: [String], default: [] },
      lastReviewAt: { type: Date },
      reviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
      notes: { type: String },
    },
    boost: {
      dailyBudget: { type: Number, min: 0 },
      startAt: { type: Date },
      endAt: { type: Date },
      impressionsForecast: { type: Number, min: 0 },
    },
    ratings: {
      average: { type: Number, min: 0, max: 5 },
      count: { type: Number, min: 0 },
    },
    auction: {
      isAuction: { type: Boolean, default: false },
      startAt: { type: Date },
      endAt: { type: Date },
      reserve: { type: Number, min: 0 },
      deposit: { type: Number, min: 0 },
      externalLink: { type: String },
    },
    rnplEligible: { type: Boolean, default: false },
    publishedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'aqar_listings',
  }
);

// Indexes
ListingSchema.index({ 'location.geo': '2dsphere' });
ListingSchema.index({
  city: 1,
  neighborhood: 1,
  intent: 1,
  propertyType: 1,
  'price.amount': 1,
  status: 1,
});
ListingSchema.index({ 'compliance.adPermitNo': 1 }, { sparse: true });
ListingSchema.index({ 'compliance.nafathVerified': 1 }, { sparse: true });
ListingSchema.index({ 'auction.isAuction': 1, status: 1 });
ListingSchema.index({ rnplEligible: 1, status: 1 });
ListingSchema.index({ createdAt: -1 });
ListingSchema.index({ publishedAt: -1 });
ListingSchema.index({ featuredLevel: -1, publishedAt: -1 });

// Virtual text for Atlas Search
ListingSchema.virtual('searchText').get(function (this: IListing) {
  return `${this.title || ''} ${this.description || ''} ${this.amenities.join(' ')}`;
});

// Methods
ListingSchema.methods.incrementViews = async function (this: IListing) {
  await (this.constructor as typeof mongoose.Model).updateOne(
    { _id: this._id },
    {
      $inc: { 'analytics.views': 1 },
      $set: { 'analytics.lastViewedAt': new Date() },
    }
  );
};

ListingSchema.methods.incrementFavorites = async function (this: IListing) {
  await (this.constructor as typeof mongoose.Model).updateOne(
    { _id: this._id },
    { $inc: { 'analytics.favorites': 1 } }
  );
};

ListingSchema.methods.incrementInquiries = async function (this: IListing) {
  await (this.constructor as typeof mongoose.Model).updateOne(
    { _id: this._id },
    { $inc: { 'analytics.inquiries': 1 } }
  );
};

// Compliance guard for agents
ListingSchema.pre('save', function (this: IListing, next) {
  if (this.source === ListerType.AGENT) {
    const hasFal = typeof this.compliance?.falLicenseNo === 'string' && this.compliance.falLicenseNo.trim().length > 0;
    const hasAdPermit =
      typeof this.compliance?.adPermitNo === 'string' && this.compliance.adPermitNo.trim().length > 0;
    if (!hasFal || !hasAdPermit || !this.compliance?.nafathVerified) {
      const err = new Error('Broker ads require valid FAL license, ad permit, and Nafath verification');
      err.name = 'ValidationError';
      return next(err);
    }
  }
  next();
});

export const Listing =
  getModel<IListing>('AqarListing', ListingSchema);

export default Listing;
