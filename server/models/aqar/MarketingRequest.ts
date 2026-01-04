/**
 * Aqar Souq - MarketingRequest Model
 *
 * Property owners requesting brokers to market their property
 * Broker receives lead, negotiates commission, posts listing
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";

export enum MarketingRequestStatus {
  PENDING = "PENDING", // Awaiting broker response
  ACCEPTED = "ACCEPTED", // Broker accepted
  LISTING_CREATED = "LISTING_CREATED", // Broker posted listing
  REJECTED = "REJECTED", // Broker rejected
  EXPIRED = "EXPIRED", // Request expired (30 days)
}

export interface IMarketingRequest extends Document {
  // Owner
  ownerId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;

  // Property details
  intent: "BUY" | "RENT" | "DAILY";
  propertyType: string;
  city: string;
  neighborhood?: string;
  address?: string;
  geo?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };

  // Specifications
  areaSqm: number;
  beds?: number;
  baths?: number;
  price: number;
  description?: string;

  // Owner contact
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;

  // Broker
  brokerId?: mongoose.Types.ObjectId;
  proposedCommissionPercent?: number;

  // Status
  status: MarketingRequestStatus;

  // Outcome
  listingId?: mongoose.Types.ObjectId; // Created listing
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  expiresAt: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const MarketingRequestSchema = new Schema<IMarketingRequest>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    intent: {
      type: String,
      enum: ["BUY", "RENT", "DAILY"],
      required: true,
      index: true,
    },
    propertyType: { type: String, required: true },
    city: { type: String, required: true, index: true },
    neighborhood: { type: String },
    address: { type: String, maxlength: 500 },
    geo: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] },
    },

    areaSqm: { type: Number, required: true, min: 0 },
    beds: { type: Number, min: 0 },
    baths: { type: Number, min: 0 },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, maxlength: 2000 },

    ownerName: { type: String, required: true, maxlength: 200 },
    ownerPhone: { type: String, required: true },
    ownerEmail: { type: String, maxlength: 200 },

    brokerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    proposedCommissionPercent: { type: Number, min: 0, max: 100 },

    status: {
      type: String,
      enum: Object.values(MarketingRequestStatus),
      default: MarketingRequestStatus.PENDING,
      required: true,
      index: true,
    },

    listingId: { type: Schema.Types.ObjectId, ref: "AqarListing" },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, maxlength: 500 },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    collection: "aqar_marketing_requests",
  },
);

// Indexes
MarketingRequestSchema.index({ brokerId: 1, status: 1, createdAt: -1 });
MarketingRequestSchema.index({ city: 1, status: 1 });
MarketingRequestSchema.index({ geo: "2dsphere" });

// Pre-save: Set expiration (30 days)
MarketingRequestSchema.pre("save", function (next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  next();
});

// Methods
MarketingRequestSchema.methods.accept = async function (
  this: IMarketingRequest,
  brokerId: mongoose.Types.ObjectId,
  commissionPercent: number,
) {
  if (commissionPercent < 0 || commissionPercent > 100) {
    throw new Error("Commission percentage must be between 0 and 100");
  }

  // Use atomic update with status filter to prevent race conditions
  const result = await (
    this.constructor as typeof import("mongoose").Model
  ).findOneAndUpdate(
    {
      _id: this._id,
      status: MarketingRequestStatus.PENDING,
    },
    {
      $set: {
        brokerId,
        proposedCommissionPercent: commissionPercent,
        status: MarketingRequestStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    },
    { new: true },
  );

  if (!result) {
    throw new Error("Only pending requests can be accepted");
  }

  // Update this instance with new values
  Object.assign(this, result.toObject());
};

MarketingRequestSchema.methods.reject = async function (
  this: IMarketingRequest,
  reason?: string,
) {
  if (this.status !== MarketingRequestStatus.PENDING) {
    throw new Error("Only pending requests can be rejected");
  }
  this.status = MarketingRequestStatus.REJECTED;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  await this.save();
};

MarketingRequestSchema.methods.linkListing = async function (
  this: IMarketingRequest,
  listingId: mongoose.Types.ObjectId,
) {
  // Validate listing exists
  const Listing = mongoose.model("AqarListing");
  // eslint-disable-next-line local/require-lean -- NO_LEAN: validation check only
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }

  // Use atomic update with status filter
  const result = await (
    this.constructor as typeof import("mongoose").Model
  ).findOneAndUpdate(
    {
      _id: this._id,
      status: MarketingRequestStatus.ACCEPTED,
    },
    {
      $set: {
        listingId,
        status: MarketingRequestStatus.LISTING_CREATED,
      },
    },
    { new: true },
  );

  if (!result) {
    throw new Error("Can only link listing to accepted requests");
  }

  // Update this instance
  Object.assign(this, result.toObject());
};

// =============================================================================
// DATA-001 FIX: Apply tenantIsolationPlugin for multi-tenant data isolation
// CRITICAL: Prevents cross-tenant data access in Aqar marketing requests
// =============================================================================
MarketingRequestSchema.plugin(tenantIsolationPlugin);

const MarketingRequest = getModel<IMarketingRequest>(
  "AqarMarketingRequest",
  MarketingRequestSchema,
);

export default MarketingRequest;
