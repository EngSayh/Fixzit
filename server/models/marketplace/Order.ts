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
