/**
 * WebhookDelivery Model - Webhook delivery logs
 * 
 * @module server/models/WebhookDelivery
 * @description Tracks webhook delivery attempts and results.
 * Used for debugging, retry management, and delivery statistics.
 * 
 * @features
 * - Delivery attempt tracking
 * - Response logging
 * - Retry counting
 * - Performance metrics (response time)
 * - Payload/response storage
 */

import { Schema, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";

const DELIVERY_STATUSES = ["success", "failed", "pending", "retrying"] as const;

const WebhookDeliverySchema = new Schema(
  {
    webhookId: {
      type: Schema.Types.ObjectId,
      ref: "Webhook",
      required: true,
    },
    event: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: DELIVERY_STATUSES,
      default: "pending",
    },
    statusCode: {
      type: Number,
      default: null,
    },
    responseTime: {
      type: Number,
      default: null,
    },
    attemptCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    payload: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "webhook_deliveries",
  }
);

// Indexes
WebhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });
WebhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });
WebhookDeliverySchema.index({ event: 1, createdAt: -1 });

export type WebhookDeliveryDoc = InferSchemaType<typeof WebhookDeliverySchema>;

export const WebhookDelivery = getModel<WebhookDeliveryDoc>(
  "WebhookDelivery",
  WebhookDeliverySchema
);
export default WebhookDelivery;
