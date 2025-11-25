/**
 * Aqar Souq - Project Model
 *
 * Off-plan / new development projects for developers
 * Matches sa.aqar.fm Projects functionality
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { getModel, MModel } from "@/src/types/mongoose-compat";

export enum ProjectStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  COMPLETED = "COMPLETED",
}

export interface IUnitType {
  name: string; // e.g., "2 Bedroom Apartment"
  minArea: number; // sqm
  minPrice: number; // SAR
  description?: string;
}

export interface IPaymentPlanStep {
  name: string; // e.g., "Down Payment"
  percent: number; // 10, 20, etc.
  dueDate?: Date;
}

export interface IPaymentPlan {
  title: string; // e.g., "Standard Payment Plan"
  steps: IPaymentPlanStep[];
}

export interface IProject extends Document {
  // Developer
  developerId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;

  // Project details
  name: string;
  city: string;
  neighborhood?: string;
  geo: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  overview: string;

  // Units
  unitTypes: IUnitType[];

  // Media
  brochures: Array<{ url: string; label?: string }>;
  videos: Array<{ url: string; label?: string }>;
  masterPlanImage?: string;

  // Payment plans
  paymentPlans: IPaymentPlan[];

  // Status
  status: ProjectStatus;
  handoverDate?: Date;

  // Analytics
  views: number;
  inquiries: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    developerId: {
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

    name: { type: String, required: true, maxlength: 200 },
    city: { type: String, required: true, index: true },
    neighborhood: { type: String, index: true },
    geo: {
      type: { type: String, enum: ["Point"], default: "Point", required: true },
      coordinates: { type: [Number], required: true },
    },
    overview: { type: String, required: true, maxlength: 5000 },

    unitTypes: [
      {
        name: { type: String, required: true },
        minArea: { type: Number, required: true, min: 0 },
        minPrice: { type: Number, required: true, min: 0 },
        description: { type: String },
      },
    ],

    brochures: [
      {
        url: { type: String, required: true },
        label: { type: String },
      },
    ],
    videos: [
      {
        url: { type: String, required: true },
        label: { type: String },
      },
    ],
    masterPlanImage: { type: String },

    paymentPlans: [
      {
        title: { type: String, required: true },
        steps: [
          {
            name: { type: String, required: true },
            percent: { type: Number, required: true, min: 0, max: 100 },
            dueDate: { type: Date },
          },
        ],
      },
    ],

    status: {
      type: String,
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.DRAFT,
      required: true,
      index: true,
    },
    handoverDate: { type: Date },

    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: "aqar_projects",
  },
);

// Indexes
ProjectSchema.index({ geo: "2dsphere" });
ProjectSchema.index({ city: 1, status: 1, handoverDate: 1 });
ProjectSchema.index({ createdAt: -1 });

// Methods
ProjectSchema.methods.incrementViews = async function (this: IProject) {
  await (this.constructor as typeof import("mongoose").Model).updateOne(
    { _id: this._id },
    { $inc: { views: 1 } },
  );
};

ProjectSchema.methods.incrementInquiries = async function (this: IProject) {
  await (this.constructor as typeof import("mongoose").Model).updateOne(
    { _id: this._id },
    { $inc: { inquiries: 1 } },
  );
};

const Project = getModel<IProject>("AqarProject", ProjectSchema);

export default Project;
