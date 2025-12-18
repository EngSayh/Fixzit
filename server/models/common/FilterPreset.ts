/**
 * Filter Preset Model
 * 
 * Allows users to save filter configurations for quick access.
 * Supports all list modules: Work Orders, Users, Employees, Invoices, Audit Logs, Properties, Products.
 * 
 * @module server/models/common/FilterPreset
 */

import mongoose, { Schema, Document } from "mongoose";

export interface IFilterPreset extends Document {
  user_id: string; // User who owns this preset
  org_id: string; // Organization context (tenant isolation)
  entity_type: "work_orders" | "users" | "employees" | "invoices" | "audit_logs" | "properties" | "products";
  name: string; // User-defined preset name ("Overdue High Priority", "Last 30 Days", etc.)
  filters: Record<string, unknown>; // JSON serialized filters (status, priority, date ranges, etc.)
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
  is_default?: boolean; // Auto-apply on list load
  created_at: Date;
  updated_at: Date;
}

const FilterPresetSchema = new Schema<IFilterPreset>(
  {
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    org_id: {
      type: String,
      required: true,
      index: true,
    },
    entity_type: {
      type: String,
      required: true,
      enum: ["work_orders", "users", "employees", "invoices", "audit_logs", "properties", "products"],
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    filters: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    sort: {
      type: {
        field: {
          type: String,
          required: true,
        },
        direction: {
          type: String,
          required: true,
          enum: ["asc", "desc"],
        },
      },
      required: false,
    },
    is_default: {
      type: Boolean,
      default: false,
    },
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
    collection: "filter_presets",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Compound index for efficient tenant + user + entity queries
FilterPresetSchema.index({ org_id: 1, user_id: 1, entity_type: 1 });

// Enforce only ONE default preset per user per entity type
FilterPresetSchema.index(
  { org_id: 1, user_id: 1, entity_type: 1, is_default: 1 },
  {
    unique: true,
    partialFilterExpression: { is_default: true },
  }
);

// Pre-save hook to unset other defaults when setting a new default
FilterPresetSchema.pre("save", async function (next) {
  if (this.is_default && this.isModified("is_default")) {
    // Unset all other defaults for this user + entity type
    await mongoose.models.FilterPreset.updateMany(
      {
        org_id: this.org_id,
        user_id: this.user_id,
        entity_type: this.entity_type,
        _id: { $ne: this._id },
      },
      { $set: { is_default: false } }
    );
  }
  next();
});

export const FilterPreset =
  (mongoose.models.FilterPreset as mongoose.Model<IFilterPreset>) ||
  mongoose.model<IFilterPreset>("FilterPreset", FilterPresetSchema);
