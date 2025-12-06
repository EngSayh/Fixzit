/**
 * Souq Review Model - Product reviews and ratings
 * @module server/models/souq/Review
 */

import mongoose, { Schema, type Document } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  reviewId: string;

  orgId: mongoose.Types.ObjectId; // AUDIT-2025-11-29: Changed from org_id to orgId
  productId: mongoose.Types.ObjectId;
  fsin: string;

  customerId: mongoose.Types.ObjectId;
  customerName: string;
  isVerifiedPurchase: boolean;
  orderId?: mongoose.Types.ObjectId;

  rating: number;
  title: string;
  content: string;

  pros?: string[];
  cons?: string[];

  images?: Array<{
    url: string;
    caption?: string;
    uploadedAt: Date;
  }>;

  helpful: number;
  notHelpful: number;
  helpfulVoters?: mongoose.Types.ObjectId[];
  notHelpfulVoters?: mongoose.Types.ObjectId[];

  sellerResponse?: {
    content: string;
    respondedAt: Date;
    respondedBy: mongoose.Types.ObjectId;
  };

  status: "pending" | "published" | "rejected" | "flagged";
  moderationNotes?: string;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;

  reportedCount: number;
  reportReasons?: string[];
  reporters?: mongoose.Types.ObjectId[]; // 🔐 Track who reported to prevent duplicates

  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    reviewId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orgId: { // AUDIT-2025-11-29: Changed from org_id
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
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
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "SouqOrder",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    pros: [String],
    cons: [String],
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        caption: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    helpful: {
      type: Number,
      default: 0,
      min: 0,
    },
    notHelpful: {
      type: Number,
      default: 0,
      min: 0,
    },
    helpfulVoters: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
      select: false,
    },
    notHelpfulVoters: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
      select: false,
    },
    sellerResponse: {
      content: {
        type: String,
        maxlength: 2000,
      },
      respondedAt: Date,
      respondedBy: {
        type: Schema.Types.ObjectId,
        ref: "SouqSeller",
      },
    },
    status: {
      type: String,
      enum: ["pending", "published", "rejected", "flagged"],
      default: "pending",
      index: true,
    },
    moderationNotes: String,
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      select: false, // hide reviewer identity by default
    },
    moderatedAt: {
      type: Date,
      select: false,
    },
    reportedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reportReasons: [String],
    reporters: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
      select: false, // Hide from normal queries for privacy
    },
    publishedAt: Date,
  },
  {
    timestamps: true,
    collection: "souq_reviews",
  },
);

ReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ productId: 1, rating: 1, createdAt: -1 });
// 🔐 STRICT v4.1: Unique index must be org-scoped to prevent cross-tenant collisions
ReviewSchema.index({ orgId: 1, customerId: 1, productId: 1 }, { unique: true });
ReviewSchema.index({ rating: 1, status: 1 });
ReviewSchema.index({ helpful: -1, status: 1 });
// 🚀 PERF: Compound indexes for high-traffic query patterns (ISSUE-SOUQ-012)
ReviewSchema.index({ orgId: 1, productId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ orgId: 1, productId: 1 });

export const SouqReview = getModel<IReview>("SouqReview", ReviewSchema);

export default SouqReview;
