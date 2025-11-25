/**
 * Question & Answer Models - Product Q&A system
 * @module server/models/souq/QA
 */

import mongoose, { Schema, type Document } from "mongoose";
import { getModel } from "@/src/types/mongoose-compat";

export interface IQuestion extends Document {
  _id: mongoose.Types.ObjectId;
  questionId: string;

  // Product reference
  productId: mongoose.Types.ObjectId;
  fsin: string;

  // Author
  userId: mongoose.Types.ObjectId;
  userDisplayName?: string;

  // Content
  question: string;

  // Moderation
  moderationStatus: "pending" | "approved" | "rejected" | "flagged";
  moderationNotes?: string;
  moderatedAt?: Date;
  moderatedBy?: mongoose.Types.ObjectId;

  // Engagement
  answerCount: number;
  upvotes: number;

  // Status
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnswer extends Document {
  _id: mongoose.Types.ObjectId;
  answerId: string;

  // Question reference
  questionId: mongoose.Types.ObjectId;

  // Author
  userId?: mongoose.Types.ObjectId;
  sellerId?: mongoose.Types.ObjectId; // If answered by seller
  userDisplayName?: string;
  isSellerAnswer: boolean;

  // Content
  answer: string;

  // Moderation
  moderationStatus: "pending" | "approved" | "rejected" | "flagged";
  moderationNotes?: string;
  moderatedAt?: Date;
  moderatedBy?: mongoose.Types.ObjectId;

  // Engagement
  upvotes: number;
  downvotes: number;
  isVerifiedPurchase?: boolean;

  // Status
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    questionId: {
      type: String,
      required: true,
      unique: true,
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userDisplayName: String,
    question: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    moderationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "flagged"],
      default: "pending",
      index: true,
    },
    moderationNotes: String,
    moderatedAt: Date,
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    answerCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    upvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "souq_questions",
  },
);

const AnswerSchema = new Schema<IAnswer>(
  {
    answerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "SouqQuestion",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "SouqSeller",
      index: true,
    },
    userDisplayName: String,
    isSellerAnswer: {
      type: Boolean,
      default: false,
      index: true,
    },
    answer: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    moderationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "flagged"],
      default: "pending",
      index: true,
    },
    moderationNotes: String,
    moderatedAt: Date,
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    upvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    downvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "souq_answers",
  },
);

// Indexes
QuestionSchema.index({ productId: 1, moderationStatus: 1, isActive: 1 });
QuestionSchema.index({ userId: 1, isActive: 1 });
QuestionSchema.index({ createdAt: -1 });

AnswerSchema.index({ questionId: 1, moderationStatus: 1, isActive: 1 });
AnswerSchema.index({ sellerId: 1, isActive: 1 });
AnswerSchema.index({ createdAt: -1 });

// Text search
QuestionSchema.index({ question: "text" });
AnswerSchema.index({ answer: "text" });

export const SouqQuestion = getModel<IQuestion>("SouqQuestion", QuestionSchema);
export const SouqAnswer = getModel<IAnswer>("SouqAnswer", AnswerSchema);

export default { SouqQuestion, SouqAnswer };
