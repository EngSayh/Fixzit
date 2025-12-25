/**
 * ClaimsOrder - Mongoose model for Souq Claims routes
 * Collection: souq_orders (unified marketplace orders)
 *
 * PURPOSE:
 * This model provides Mongoose access to the "souq_orders" collection used by
 * Souq Claims routes. It intentionally uses a minimal schema with only
 * the fields that Claims routes actually read.
 *
 * ARCHITECTURE NOTE (RESOLVED per STRICT v4.1):
 * - "souq_orders" collection = unified marketplace orders (Order model)
 * - ClaimsOrder is a read-optimized view of the same collection
 * - Both Order.ts and ClaimsOrder.ts now point to "souq_orders"
 * - TODO-001 RESOLVED: Collection name mismatch fixed per Eng. Sultan directive
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
 * @see TODO-2 in TD-001 assessment
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
    collection: "souq_orders", // RESOLVED: Now aligned with Order.ts per TODO-001
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
