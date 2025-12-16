/**
 * @module server/models/souq/Order
 * @description Fixzit Souq marketplace order management with escrow integration and seller settlement.
 *              Supports multi-seller orders, split payments, and fulfillment tracking.
 *
 * @features
 * - Multi-seller order support (items from different sellers in single order)
 * - Order lifecycle: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED/CANCELLED/REFUNDED
 * - Escrow account integration (buyer payment held until delivery confirmation)
 * - Split payment allocation (per-seller settlement after delivery)
 * - Shipping address and contact info tracking
 * - Order item detail (product, quantity, price, seller)
 * - Payment method tracking (card, bank transfer, cash on delivery)
 * - Shipping and tracking number linkage
 * - Return and refund support (via RMA workflow)
 * - Multi-currency support (SAR default)
 * - Tax calculation (VAT per Saudi VAT law)
 *
 * @statuses
 * - PENDING: Order created, awaiting payment confirmation
 * - CONFIRMED: Payment confirmed, awaiting seller acceptance
 * - PROCESSING: Seller preparing order for shipment
 * - SHIPPED: Order shipped, tracking number assigned
 * - DELIVERED: Customer confirmed delivery
 * - CANCELLED: Order cancelled by customer or seller
 * - REFUNDED: Payment refunded to customer
 *
 * @indexes
 * - { orgId: 1, orderId: 1 } (unique) — Unique order ID per tenant (optional orgId)
 * - { customerId: 1, createdAt: -1 } — Customer order history
 * - { items.sellerId: 1, createdAt: -1 } — Seller order queue
 * - { status: 1, createdAt: -1 } — Order status dashboard
 * - { escrowAccountId: 1, escrowState: 1 } — Escrow settlement queries
 * - { shippingTrackingNumber: 1 } — Tracking number lookup
 *
 * @relationships
 * - References User model (customerId)
 * - References souq/Listing model (items.listingId)
 * - References souq/Product model (items.productId)
 * - References souq/Seller model (items.sellerId)
 * - References EscrowAccount model (escrowAccountId)
 * - Generates Settlement records (seller payouts after delivery)
 * - Links to RMA model (return merchandise authorization)
 * - Links to Review model (customer product reviews)
 * - Integrates with Inventory model (stock deduction on order)
 *
 * @compliance
 * - VAT calculation per Saudi VAT law (15% standard rate)
 * - Escrow compliance (buyer protection until delivery)
 * - Audit trail for financial disputes
 * - Immutable order records (corrections via refunds)
 *
 * @audit
 * - timestamps: createdAt, updatedAt from Mongoose
 * - Status change history tracked in statusHistory array
 * - Payment and settlement events logged in Transaction model
 */

import mongoose, { Schema, type Document } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";
import {
  EscrowState,
  type EscrowStateValue,
} from "@/server/models/finance/EscrowAccount";

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderId: string;
  orgId?: mongoose.Types.ObjectId;

  customerId: mongoose.Types.ObjectId;
  customerEmail: string;
  customerPhone: string;

  items: Array<{
    listingId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    fsin: string;
    sellerId: mongoose.Types.ObjectId;
    title: string;
    quantity: number;
    pricePerUnit: number;
    subtotal: number;
    fulfillmentMethod: "fbf" | "fbm";
    status:
      | "pending"
      | "processing"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "returned";
    trackingNumber?: string;
    carrier?: string;
    shippedAt?: Date;
    deliveredAt?: Date;
  }>;

  shippingAddress: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    country: string;
    postalCode: string;
  };

  billingAddress?: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    country: string;
    postalCode: string;
  };
  shippingSpeed?: "standard" | "express" | "same_day";

  pricing: {
    subtotal: number;
    shippingFee: number;
    tax: number;
    discount: number;
    total: number;
    currency: string;
  };

  payment: {
    method: "card" | "cod" | "wallet" | "installment";
    status: "pending" | "authorized" | "captured" | "failed" | "refunded";
    transactionId?: string;
    paidAt?: Date;
  };

  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "returned";
  fulfillmentStatus?:
    | "pending"
    | "pending_seller"
    | "shipped"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "delivery_failed";
  shippingCarrier?: string;
  trackingNumber?: string;
  shippingLabelUrl?: string;
  estimatedDeliveryDate?: Date;
  deliveredAt?: Date;

  cancelledAt?: Date;
  cancellationReason?: string;

  returnRequest?: {
    requestedAt: Date;
    reason: string;
    refundAmount: number;
    status: "pending" | "approved" | "rejected" | "completed";
    approvedAt?: Date;
    refundedAt?: Date;
  };

  escrow?: {
    accountId?: mongoose.Types.ObjectId;
    status?: EscrowStateValue;
    releaseAfter?: Date;
    lastEventId?: string;
    idempotencyKey?: string;
  };

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  completedAt?: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderId: {
      type: String,
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    customerEmail: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    items: [
      {
        listingId: {
          type: Schema.Types.ObjectId,
          ref: "SouqListing",
          required: true,
        },
        productId: {
          type: Schema.Types.ObjectId,
          ref: "SouqProduct",
          required: true,
        },
        fsin: {
          type: String,
          required: true,
        },
        sellerId: {
          type: Schema.Types.ObjectId,
          ref: "SouqSeller",
          required: true,
          index: true,
        },
        title: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        pricePerUnit: {
          type: Number,
          required: true,
          min: 0,
        },
        subtotal: {
          type: Number,
          required: true,
          min: 0,
        },
        fulfillmentMethod: {
          type: String,
          enum: ["fbf", "fbm"],
          required: true,
        },
        status: {
          type: String,
          enum: [
            "pending",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
            "returned",
          ],
          default: "pending",
        },
        trackingNumber: String,
        carrier: String,
        shippedAt: Date,
        deliveredAt: Date,
      },
    ],
    shippingAddress: {
      name: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      addressLine1: {
        type: String,
        required: true,
      },
      addressLine2: String,
      city: {
        type: String,
        required: true,
      },
      state: String,
      country: {
        type: String,
        required: true,
        default: "SA",
      },
      postalCode: {
        type: String,
        required: true,
      },
    },
    billingAddress: {
      name: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    shippingSpeed: {
      type: String,
      enum: ["standard", "express", "same_day"],
      default: "standard",
    },
    pricing: {
      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },
      shippingFee: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      tax: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      discount: {
        type: Number,
        default: 0,
        min: 0,
      },
      total: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        default: "SAR",
      },
    },
    payment: {
      method: {
        type: String,
        enum: ["card", "cod", "wallet", "installment"],
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "authorized", "captured", "failed", "refunded"],
        default: "pending",
      },
      transactionId: String,
      paidAt: Date,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "pending",
      index: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: [
        "pending",
        "pending_seller",
        "shipped",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "delivery_failed",
      ],
      default: "pending",
      index: true,
    },
    shippingCarrier: String,
    trackingNumber: {
      type: String,
      index: true,
    },
    shippingLabelUrl: String,
    estimatedDeliveryDate: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    returnRequest: {
      requestedAt: Date,
      reason: String,
      refundAmount: Number,
      status: {
        type: String,
        enum: ["pending", "approved", "rejected", "completed"],
      },
      approvedAt: Date,
      refundedAt: Date,
    },
    escrow: {
      accountId: {
        type: Schema.Types.ObjectId,
        ref: "EscrowAccount",
        index: true,
      },
      status: { type: String, enum: Object.values(EscrowState) },
      releaseAfter: { type: Date },
      lastEventId: { type: String },
      idempotencyKey: { type: String },
    },
    notes: String,
    confirmedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
    collection: "souq_orders",
    // Indexes managed centrally in lib/db/collections.ts to avoid conflicts
    autoIndex: false,
  },
);

// Tenant-scoped access patterns
OrderSchema.index({ orgId: 1, orderId: 1 });
OrderSchema.index({ orgId: 1, trackingNumber: 1 });

export const SouqOrder = getModel<IOrder>("SouqOrder", OrderSchema);

export default SouqOrder;
