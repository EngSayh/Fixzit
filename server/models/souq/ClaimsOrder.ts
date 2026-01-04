/**
 * ClaimsOrder - Compatibility Mongoose model for Claims routes
 * Collection: orders (NOT souq_orders)
 *
 * PURPOSE:
 * This model provides Mongoose access to the "orders" collection used by
 * Souq Claims routes. It intentionally uses a minimal schema with only
 * the fields that Claims routes actually read.
 *
 * ARCHITECTURE NOTE:
 * - "orders" collection = legacy/general orders (used by Claims)
 * - "souq_orders" collection = marketplace-specific orders (SouqOrder model)
 * These are separate collections with different schemas. Do NOT consolidate
 * without explicit architecture decision and data migration plan.
 *
 * // BLOCKED-001: Souq Orders mismatch (orders vs souq_orders)
 * // Do not proceed with collection migration. Await explicit directive from Eng. Sultan.
 * // File: server/models/souq/ClaimsOrder.ts
 * // Related: server/models/souq/SouqOrder.ts uses "souq_orders" collection
 * // Status: BLOCKED per STRICT v4.1 Recovery Plan
 *
 * SCHEMA STRATEGY:
 * - Uses { strict: false } to preserve unknown fields on reads
 * - Only defines fields actively used by Claims routes
 * - Preserves existing data shape without validation side effects
 *
 * Used by:
 * - app/api/souq/claims/route.ts
 * - app/api/souq/claims/[id]/route.ts
 * - app/api/souq/claims/[id]/decision/route.ts
 *
 * Created as part of TD-001: Remove db.collection calls via compatibility model
 * @see TD-001-2 assessment (schema validation follow-up)
 */

import type { Document, Model, Types } from "mongoose";
import { Schema, model, models } from "mongoose";

import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IClaimsOrderItem {
  productId?: string | Types.ObjectId;
  name?: string;
  quantity?: number;
  price?: number;
}

export interface IClaimsOrder {
  orgId?: string;
  orderId?: string;
  orderNumber?: string;
  buyerId?: string | Types.ObjectId;
  sellerId?: string | Types.ObjectId;
  total?: number;
  deliveredAt?: Date;
  items?: IClaimsOrderItem[];
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IClaimsOrderDocument extends IClaimsOrder, Document {
  _id: Types.ObjectId;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

/**
 * Minimal schema for Claims order lookups.
 * Uses strict: false to preserve all existing fields in the collection.
 */
const ClaimsOrderSchema = new Schema<IClaimsOrderDocument>(
  {
    // orgId is injected by tenantIsolationPlugin but may exist in legacy docs
    orderId: { type: String, index: true },
    orderNumber: { type: String },
    buyerId: { type: Schema.Types.Mixed }, // String or ObjectId in existing data
    sellerId: { type: Schema.Types.Mixed }, // String or ObjectId in existing data
    total: { type: Number },
    deliveredAt: { type: Date },
    items: [
      {
        productId: { type: Schema.Types.Mixed },
        name: { type: String },
        quantity: { type: Number },
        price: { type: Number },
      },
    ],
    status: { type: String },
  },
  {
    timestamps: true,
    collection: "orders", // CRITICAL: Must match COLLECTIONS.ORDERS
    strict: false, // Preserve unknown fields - do not drop existing data
  },
);

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

ClaimsOrderSchema.plugin(tenantIsolationPlugin);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Primary lookup patterns used by Claims routes
ClaimsOrderSchema.index({ orgId: 1, _id: 1 });
ClaimsOrderSchema.index({ orgId: 1, orderId: 1 });
ClaimsOrderSchema.index({ orgId: 1, buyerId: 1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ClaimsOrder: Model<IClaimsOrderDocument> =
  models.ClaimsOrder ||
  model<IClaimsOrderDocument>("ClaimsOrder", ClaimsOrderSchema);
