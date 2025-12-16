/**
 * Order Model - Fixzit Souq B2B orders and fulfillment
 * 
 * @module server/models/marketplace/Order
 * @description Manages purchase orders from cart to delivery for Fixzit Souq marketplace.
 * Tracks order lifecycle, line items, totals, shipping, and payment status.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Order workflow (CART → PENDING → APPROVAL → CONFIRMED → FULFILLED → DELIVERED)
 * - Line item management with pricing snapshots
 * - VAT calculation (15% for Saudi Arabia)
 * - Shipping address and delivery tracking
 * - Payment terms and status
 * - Multi-currency support
 * - Approval workflow for corporate buyers
 * 
 * @statuses
 * - CART: Shopping cart (not yet submitted)
 * - PENDING: Order submitted, awaiting review
 * - APPROVAL: Requires manager approval (large orders)
 * - CONFIRMED: Approved, ready for fulfillment
 * - FULFILLED: Items picked and shipped
 * - DELIVERED: Received by customer
 * - CANCELLED: Order cancelled
 * 
 * @indexes
 * - Unique: { orgId, orderNumber } - Tenant-scoped order numbers
 * - Compound: { customerId, status } for customer order history
 * - Index: { status, createdAt } for order queue management
 * - Index: { buyerId } for buyer lookups
 * 
 * @relationships
 * - customerId → Customer._id (buyer organization)
 * - buyerId → User._id (individual buyer)
 * - lines[].productId → Product._id (product references)
 * - Invoice records reference orderId
 * 
 * @types
 * - MarketplaceOrderLine: Individual order line items
 * - MarketplaceOrderTotals: Subtotal, VAT, grand total
 * - MarketplaceShipTo: Shipping address
 * 
 * @audit
 * - Order status changes logged
 * - Price modifications tracked
 * - Fulfillment updates recorded
 * 
 * @compliance
 * - VAT calculation for ZATCA compliance
 * - Audit trail for financial records
 */

import { Schema, model, models, Types, Model } from "mongoose";
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";
import { auditPlugin } from "../../plugins/auditPlugin";

export type MarketplaceOrderStatus =
  | "CART"
  | "PENDING"
  | "APPROVAL"
  | "CONFIRMED"
  | "FULFILLED"
  | "DELIVERED"
  | "CANCELLED";

export interface MarketplaceOrderLine {
  productId: Types.ObjectId;
  qty: number;
  price: number;
  currency: string;
  uom: string;
  total: number;
}

export interface MarketplaceOrderTotals {
  subtotal: number;
  vat: number;
  grand: number;
}

export interface MarketplaceShipTo {
  address: string;
  contact: string;
  phone?: string;
}

export interface MarketplaceOrderSource {
  workOrderId?: Types.ObjectId;
}

export interface MarketplaceOrder {
  _id: Types.ObjectId;
  orgId: Types.ObjectId; // This will be managed by tenantIsolationPlugin
  buyerUserId: Types.ObjectId;
  vendorId?: Types.ObjectId;
  status: MarketplaceOrderStatus;
  lines: MarketplaceOrderLine[];
  totals: MarketplaceOrderTotals;
  currency: string;
  shipTo?: MarketplaceShipTo;
  source?: MarketplaceOrderSource;
  approvals?: {
    required: boolean;
    status: "PENDING" | "APPROVED" | "REJECTED";
    approverIds?: Types.ObjectId[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<MarketplaceOrder>(
  {
    // orgId will be added by tenantIsolationPlugin
    buyerUserId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    status: {
      type: String,
      enum: [
        "CART",
        "PENDING",
        "APPROVAL",
        "CONFIRMED",
        "FULFILLED",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "CART",
    },
    lines: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: "MarketplaceProduct",
        },
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
        currency: { type: String, required: true },
        uom: { type: String, required: true },
        total: { type: Number, required: true },
      },
    ],
    totals: {
      subtotal: { type: Number, default: 0 },
      vat: { type: Number, default: 0 },
      grand: { type: Number, default: 0 },
    },
    currency: { type: String, default: "SAR" },
    shipTo: {
      address: { type: String },
      contact: { type: String },
      phone: { type: String },
    },
    source: {
      workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder" },
    },
    approvals: {
      required: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING",
      },
      approverIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
  },
  {
    timestamps: true,
    collection: "orders",
    // Indexes are managed centrally in lib/db/collections.ts
    autoIndex: false,
  },
);

// Apply plugins BEFORE indexes for proper tenant isolation
OrderSchema.plugin(tenantIsolationPlugin);
OrderSchema.plugin(auditPlugin);

// Schema-level indexes to mirror centralized createIndexes() definitions
OrderSchema.index(
  { orgId: 1, orderNumber: 1 },
  {
    unique: true,
    name: "orders_orgId_orderNumber_unique",
    partialFilterExpression: { orgId: { $exists: true }, orderNumber: { $exists: true } },
  },
);
OrderSchema.index({ orgId: 1, userId: 1 }, { name: "orders_orgId_userId" });
OrderSchema.index({ orgId: 1, status: 1 }, { name: "orders_orgId_status" });
OrderSchema.index({ orgId: 1, createdAt: -1 }, { name: "orders_orgId_createdAt_desc" });

const OrderModel =
  (models.MarketplaceOrder as Model<MarketplaceOrder> | undefined) ||
  model<MarketplaceOrder>("MarketplaceOrder", OrderSchema);

export default OrderModel;
