/**
 * Webhook Model - Platform webhook configurations
 * 
 * @module server/models/Webhook
 * @description Webhook endpoint configurations for event delivery.
 * Superadmin can configure webhooks to receive platform events.
 * 
 * @features
 * - Webhook endpoint configuration
 * - Event subscription management
 * - Retry policy configuration
 * - Delivery statistics tracking
 * - Secret signing for payload verification
 */

import { Schema, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { auditPlugin } from "../plugins/auditPlugin";
import { encryptionPlugin } from "../plugins/encryptionPlugin";

const WEBHOOK_EVENTS = [
  "tenant.created",
  "tenant.updated", 
  "tenant.deleted",
  "user.created",
  "user.updated",
  "user.deleted",
  "subscription.created",
  "subscription.cancelled",
  "subscription.renewed",
  "payment.completed",
  "payment.failed",
  "invoice.generated",
  "invoice.paid",
  "workorder.created",
  "workorder.completed",
  "workorder.cancelled",
] as const;

const RETRY_POLICIES = ["none", "linear", "exponential"] as const;
const WEBHOOK_STATUSES = ["active", "paused", "failing"] as const;

const WebhookSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true,
      match: [/^https?:\/\/.+/, "Must be a valid HTTP(S) URL"],
    },
    secret: {
      type: String,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    events: [{
      type: String,
      enum: WEBHOOK_EVENTS,
    }],
    retryPolicy: {
      type: String,
      enum: RETRY_POLICIES,
      default: "exponential",
    },
    maxRetries: {
      type: Number,
      min: 0,
      max: 10,
      default: 3,
    },
    status: {
      type: String,
      enum: WEBHOOK_STATUSES,
      default: "active",
    },
    lastTriggered: {
      type: Date,
      default: null,
    },
    successCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    headers: {
      type: Map,
      of: String,
      default: {},
    },
    timeout: {
      type: Number,
      min: 1000,
      max: 30000,
      default: 10000,
    },
  },
  {
    timestamps: true,
    collection: "webhooks",
  }
);

// Encrypt the secret field
WebhookSchema.plugin(encryptionPlugin, { 
  fields: { secret: "Webhook Secret" } 
});

// Audit tracking
WebhookSchema.plugin(auditPlugin);

// Indexes
WebhookSchema.index({ enabled: 1, status: 1 });
WebhookSchema.index({ events: 1 });
WebhookSchema.index({ createdAt: -1 });

export type WebhookDoc = InferSchemaType<typeof WebhookSchema>;

export const Webhook = getModel<WebhookDoc>("Webhook", WebhookSchema);
export default Webhook;
