import mongoose, { Schema, Document } from "mongoose";
import { FILTER_ENTITY_TYPES, type FilterEntityType } from "@/lib/filters/entities";

export type ExportJobStatus = "queued" | "processing" | "completed" | "failed";

export interface IExportJob extends Document {
  org_id: string;
  user_id: string;
  entity_type: FilterEntityType;
  format: "csv" | "xlsx";
  filters?: Record<string, unknown>;
  search?: string;
  ids?: string[];
  columns?: string[];
  status: ExportJobStatus;
  file_url?: string;
  error_message?: string;
  row_count?: number;
  created_at: Date;
  updated_at: Date;
}

const ExportJobSchema = new Schema<IExportJob>(
  {
    org_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    entity_type: {
      type: String,
      required: true,
      enum: FILTER_ENTITY_TYPES,
      index: true,
    },
    format: { type: String, required: true, enum: ["csv", "xlsx"] },
    filters: { type: Schema.Types.Mixed, required: false, default: {} },
    search: { type: String, required: false, maxlength: 500, default: "" },
    ids: { type: [String], required: false, default: [] },
    columns: { type: [String], required: false, default: [] },
    status: {
      type: String,
      required: true,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
      index: true,
    },
    file_url: { type: String },
    error_message: { type: String },
    row_count: { type: Number },
    created_at: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "export_jobs",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

ExportJobSchema.index({ org_id: 1, user_id: 1, entity_type: 1, status: 1 });

export const ExportJob =
  (mongoose.models.ExportJob as mongoose.Model<IExportJob>) ||
  mongoose.model<IExportJob>("ExportJob", ExportJobSchema);
