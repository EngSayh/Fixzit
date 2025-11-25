/**
 * Souq Brand Model - Brand registry & verification
 * @module server/models/souq/Brand
 */

import mongoose, { Schema, type Document } from "mongoose";
import { getModel, MModel } from "@/src/types/mongoose-compat";

export interface IBrand extends Document {
  _id: mongoose.Types.ObjectId;
  brandId: string; // BRD-{UUID}
  name: string;
  slug: string;
  description?: Record<string, string>; // { en: '...', ar: '...' }
  logo?: string; // URL

  // Brand Registry
  isVerified: boolean;
  isGated: boolean; // Requires authorization to sell

  // Owner/Applicant
  ownerId?: mongoose.Types.ObjectId; // Seller who registered
  contactEmail?: string;

  // Verification Documents
  verificationDocuments: {
    type: "trademark" | "authorization_letter" | "invoice" | "other";
    url: string;
    uploadedAt: Date;
    expiresAt?: Date;
  }[];

  // Verification Status
  verificationStatus: "pending" | "approved" | "rejected" | "expired";
  verificationNotes?: string;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId; // Admin user ID

  // IP Protection
  authorizedSellers: mongoose.Types.ObjectId[]; // Seller IDs allowed to sell

  // Metadata
  website?: string;
  country?: string;
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    brandId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: Map,
      of: String,
    },
    logo: String,
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isGated: {
      type: Boolean,
      default: false,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "SouqSeller",
      index: true,
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    verificationDocuments: [
      {
        type: {
          type: String,
          enum: ["trademark", "authorization_letter", "invoice", "other"],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: Date,
      },
    ],
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
      index: true,
    },
    verificationNotes: String,
    verifiedAt: Date,
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    authorizedSellers: [
      {
        type: Schema.Types.ObjectId,
        ref: "SouqSeller",
      },
    ],
    website: String,
    country: String,
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "souq_brands",
  },
);

// Indexes
BrandSchema.index({ name: "text" });
BrandSchema.index({ verificationStatus: 1, isVerified: 1 });

// Method: Check if seller is authorized
BrandSchema.methods.isSellerAuthorized = function (
  sellerId: mongoose.Types.ObjectId,
): boolean {
  if (!this.isGated) return true;
  if (!this.isVerified) return false;
  return this.authorizedSellers.some((id: mongoose.Types.ObjectId) =>
    id.equals(sellerId),
  );
};

// Static: Get pending verifications
BrandSchema.statics.getPendingVerifications = async function () {
  return this.find({
    verificationStatus: "pending",
    isActive: true,
  }).populate("ownerId", "legalName contactEmail");
};

// Pre-save: Auto-generate slug
BrandSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

export const SouqBrand = getModel<IBrand>("SouqBrand", BrandSchema);

export default SouqBrand;
