/**
 * Souq Review Model - Product reviews and ratings
 * @module server/models/souq/Review
 */

import mongoose, { Schema, type Document } from 'mongoose'
import { getModel, MModel } from '@/src/types/mongoose-compat';;

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  reviewId: string;
  
  org_id: mongoose.Types.ObjectId;
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
  
  sellerResponse?: {
    content: string;
    respondedAt: Date;
    respondedBy: mongoose.Types.ObjectId;
  };
  
  status: 'pending' | 'published' | 'rejected' | 'flagged';
  moderationNotes?: string;
  
  reportedCount: number;
  reportReasons?: string[];
  
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
    org_id: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'SouqProduct',
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
      ref: 'User',
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
      ref: 'SouqOrder',
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
    sellerResponse: {
      content: {
        type: String,
        maxlength: 2000,
      },
      respondedAt: Date,
      respondedBy: {
        type: Schema.Types.ObjectId,
        ref: 'SouqSeller',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'published', 'rejected', 'flagged'],
      default: 'pending',
      index: true,
    },
    moderationNotes: String,
    reportedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reportReasons: [String],
    publishedAt: Date,
  },
  {
    timestamps: true,
    collection: 'souq_reviews',
  }
);

ReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ productId: 1, rating: 1, createdAt: -1 });
ReviewSchema.index({ customerId: 1, productId: 1 }, { unique: true });
ReviewSchema.index({ rating: 1, status: 1 });
ReviewSchema.index({ helpful: -1, status: 1 });

export const SouqReview = getModel<IReview>('SouqReview', ReviewSchema);

export default SouqReview;
