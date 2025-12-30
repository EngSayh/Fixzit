/**
 * @fileoverview TaskExecution MongoDB Model
 * @description Tracks individual execution records of scheduled tasks
 * @module server/models/TaskExecution
 * @agent [AGENT-001-A]
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITaskExecution extends Document {
  _id: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  taskName: string;
  handler: string;
  status: "pending" | "running" | "success" | "failure" | "timeout" | "cancelled";
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  errorStack?: string;
  retryCount: number;
  triggeredBy: "schedule" | "manual" | "retry";
  triggeredByUser?: string;
  logs: Array<{
    timestamp: Date;
    level: "info" | "warn" | "error" | "debug";
    message: string;
  }>;
  metrics?: {
    memoryUsage?: number;
    cpuTime?: number;
    itemsProcessed?: number;
  };
  createdAt: Date;
}

const TaskExecutionSchema = new Schema<ITaskExecution>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "ScheduledTask",
      required: true,
    },
    taskName: {
      type: String,
      required: true,
    },
    handler: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "running", "success", "failure", "timeout", "cancelled"],
      default: "pending",
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    duration: {
      type: Number,
    },
    input: {
      type: Schema.Types.Mixed,
    },
    output: {
      type: Schema.Types.Mixed,
    },
    error: {
      type: String,
      maxlength: 10000,
    },
    errorStack: {
      type: String,
      maxlength: 20000,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    triggeredBy: {
      type: String,
      enum: ["schedule", "manual", "retry"],
      required: true,
    },
    triggeredByUser: {
      type: String,
    },
    logs: [{
      timestamp: { type: Date, default: Date.now },
      level: { type: String, enum: ["info", "warn", "error", "debug"] },
      message: { type: String, maxlength: 2000 },
    }],
    metrics: {
      memoryUsage: Number,
      cpuTime: Number,
      itemsProcessed: Number,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "task_executions",
  }
);

// Indexes
TaskExecutionSchema.index({ taskId: 1, startedAt: -1 });
TaskExecutionSchema.index({ status: 1, startedAt: -1 });
TaskExecutionSchema.index({ handler: 1, startedAt: -1 });
TaskExecutionSchema.index({ startedAt: -1 });
TaskExecutionSchema.index({ completedAt: -1 });
// TTL index - auto-delete executions after 90 days
TaskExecutionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Export model
export const TaskExecution: Model<ITaskExecution> =
  mongoose.models.TaskExecution ||
  mongoose.model<ITaskExecution>("TaskExecution", TaskExecutionSchema);
