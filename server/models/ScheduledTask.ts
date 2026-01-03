/**
 * @fileoverview ScheduledTask MongoDB Model
 * @description Manages scheduled/cron jobs for the platform
 * @module server/models/ScheduledTask
 * @agent [AGENT-0001]
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { auditPlugin } from "../plugins/auditPlugin";

export interface IScheduledTask extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  schedule: string; // Cron expression
  handler: string; // Handler function/job key
  enabled: boolean;
  category: "system" | "billing" | "notification" | "cleanup" | "sync" | "report" | "custom";
  priority: "low" | "normal" | "high" | "critical";
  config?: Record<string, unknown>;
  status: "idle" | "running" | "paused" | "error" | "disabled";
  lastRunAt?: Date;
  lastRunDuration?: number; // milliseconds
  lastRunResult?: "success" | "failure" | "partial";
  lastError?: string;
  nextRunAt?: Date;
  runCount: number;
  successCount: number;
  failureCount: number;
  timeout: number; // milliseconds
  retryOnFailure: boolean;
  maxRetries: number;
  isSystem: boolean; // System tasks cannot be deleted
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledTaskSchema = new Schema<IScheduledTask>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    schedule: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function(v: string) {
          // Basic cron validation (5 or 6 fields)
          const parts = v.trim().split(/\s+/);
          return parts.length >= 5 && parts.length <= 6;
        },
        message: "Invalid cron expression",
      },
    },
    handler: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      enum: ["system", "billing", "notification", "cleanup", "sync", "report", "custom"],
      default: "custom",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },
    config: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ["idle", "running", "paused", "error", "disabled"],
      default: "idle",
    },
    lastRunAt: {
      type: Date,
    },
    lastRunDuration: {
      type: Number,
    },
    lastRunResult: {
      type: String,
      enum: ["success", "failure", "partial"],
    },
    lastError: {
      type: String,
      maxlength: 5000,
    },
    nextRunAt: {
      type: Date,
    },
    runCount: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    timeout: {
      type: Number,
      default: 300000, // 5 minutes
    },
    retryOnFailure: {
      type: Boolean,
      default: false,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
  },
  {
    timestamps: true,
    collection: "scheduled_tasks",
  }
);

// Indexes
ScheduledTaskSchema.index({ handler: 1 }, { unique: true });
ScheduledTaskSchema.index({ enabled: 1, nextRunAt: 1 });
ScheduledTaskSchema.index({ status: 1 });
ScheduledTaskSchema.index({ category: 1 });
ScheduledTaskSchema.index({ priority: -1, nextRunAt: 1 });
ScheduledTaskSchema.index({ tags: 1 });

// Audit plugin
ScheduledTaskSchema.plugin(auditPlugin);

// Export model
export const ScheduledTask: Model<IScheduledTask> =
  mongoose.models.ScheduledTask ||
  mongoose.model<IScheduledTask>("ScheduledTask", ScheduledTaskSchema);
