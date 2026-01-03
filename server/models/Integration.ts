/**
 * @fileoverview Integration MongoDB Model
 * @description Manages third-party service integrations for the platform
 * @module server/models/Integration
 * @agent [AGENT-0001]
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { auditPlugin } from "../plugins/auditPlugin";
// Note: Integration credentials should be encrypted at application level

export interface IIntegration extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: "payment" | "sms" | "email" | "storage" | "analytics" | "erp" | "zatca" | "maps" | "auth" | "notification" | "custom";
  provider: string; // e.g., "stripe", "twilio", "sendgrid", "aws-s3", "google-analytics"
  enabled: boolean;
  status: "active" | "inactive" | "error" | "pending_setup" | "deprecated";
  config: Record<string, unknown>;
  credentials: Record<string, string>; // Encrypted
  webhookUrl?: string;
  webhookSecret?: string; // Encrypted
  environment: "production" | "sandbox" | "development";
  version?: string;
  lastSync?: Date;
  lastError?: string;
  healthCheck?: {
    enabled: boolean;
    interval: number; // minutes
    lastCheck?: Date;
    lastStatus?: "healthy" | "unhealthy" | "unknown";
  };
  rateLimits?: {
    requestsPerMinute?: number;
    requestsPerDay?: number;
    currentUsage?: number;
  };
  features?: string[];
  metadata?: Record<string, unknown>;
  isSystem: boolean; // System integrations cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}

const HealthCheckSchema = new Schema({
  enabled: { type: Boolean, default: true },
  interval: { type: Number, default: 60 }, // 1 hour
  lastCheck: Date,
  lastStatus: { type: String, enum: ["healthy", "unhealthy", "unknown"] },
}, { _id: false });

const RateLimitsSchema = new Schema({
  requestsPerMinute: Number,
  requestsPerDay: Number,
  currentUsage: { type: Number, default: 0 },
}, { _id: false });

const IntegrationSchema = new Schema<IIntegration>(
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
    type: {
      type: String,
      enum: ["payment", "sms", "email", "storage", "analytics", "erp", "zatca", "maps", "auth", "notification", "custom"],
      required: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "error", "pending_setup", "deprecated"],
      default: "pending_setup",
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    credentials: {
      type: Schema.Types.Mixed,
      default: {},
    },
    webhookUrl: {
      type: String,
      maxlength: 500,
    },
    webhookSecret: {
      type: String,
    },
    environment: {
      type: String,
      enum: ["production", "sandbox", "development"],
      default: "sandbox",
    },
    version: {
      type: String,
      maxlength: 50,
    },
    lastSync: {
      type: Date,
    },
    lastError: {
      type: String,
      maxlength: 5000,
    },
    healthCheck: HealthCheckSchema,
    rateLimits: RateLimitsSchema,
    features: [{
      type: String,
      maxlength: 100,
    }],
    metadata: {
      type: Schema.Types.Mixed,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "integrations",
  }
);

// Indexes
IntegrationSchema.index({ type: 1, provider: 1 }, { unique: true });
IntegrationSchema.index({ enabled: 1, status: 1 });
IntegrationSchema.index({ type: 1 });
IntegrationSchema.index({ environment: 1 });

// Audit plugin for tracking changes
IntegrationSchema.plugin(auditPlugin);

// Note: Credentials encryption should be handled at application level
// using crypto.createCipheriv/createDecipheriv before save/after load

// Export model
export const Integration: Model<IIntegration> =
  mongoose.models.Integration ||
  mongoose.model<IIntegration>("Integration", IntegrationSchema);
