/**
 * FMReportSchedule - Mongoose model for FM report schedules
 * Collection: fm_report_schedules
 *
 * Used by: app/api/fm/reports/schedules/route.ts
 * Created as part of TD-001 migration from db.collection to Mongoose models
 */

import type { Document, Model, Types } from "mongoose";
import { Schema, model, models } from "mongoose";

import { tenantIsolationPlugin } from "../plugins/tenantIsolation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IFMReportSchedule {
  orgId: string;
  name: string;
  type: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  format: "pdf" | "excel" | "csv";
  recipients: string[];
  startDate: string;
  status: "active" | "paused";
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFMReportScheduleDocument extends IFMReportSchedule, Document {
  _id: Types.ObjectId;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const FMReportScheduleSchema = new Schema<IFMReportScheduleDocument>(
  {
    // orgId is injected by tenantIsolationPlugin
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    frequency: {
      type: String,
      required: true,
      enum: ["daily", "weekly", "monthly", "quarterly"],
      default: "monthly",
    },
    format: {
      type: String,
      required: true,
      enum: ["pdf", "excel", "csv"],
      default: "pdf",
    },
    recipients: [{ type: String, trim: true }],
    startDate: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["active", "paused"],
      default: "active",
    },
    createdBy: { type: String },
  },
  {
    timestamps: true,
    collection: "fm_report_schedules",
  },
);

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

FMReportScheduleSchema.plugin(tenantIsolationPlugin);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Query by org + status
FMReportScheduleSchema.index({ orgId: 1, status: 1 });

// Query by org + type
FMReportScheduleSchema.index({ orgId: 1, type: 1 });

// Sort by creation date (descending) - used in GET handler
FMReportScheduleSchema.index({ orgId: 1, createdAt: -1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const FMReportSchedule: Model<IFMReportScheduleDocument> =
  models.FMReportSchedule ||
  model<IFMReportScheduleDocument>("FMReportSchedule", FMReportScheduleSchema);
