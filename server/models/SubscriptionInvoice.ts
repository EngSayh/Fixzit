import mongoose, { Schema, Document, Types } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

export interface ISubscriptionInvoice extends Document {
  orgId: Types.ObjectId; // Required by tenantIsolationPlugin (explicitly set in code)
  subscriptionId: Types.ObjectId;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "cancelled";
  dueDate: Date;
  periodStart: Date; // ✅ ADDED: Billing period start
  periodEnd: Date; // ✅ ADDED: Billing period end
  paidAt?: Date;
  paymentMethod?: string;
  paytabsRef?: string; // ✅ ADDED: PayTabs transaction reference
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId; // Added by auditPlugin
  updatedBy?: Types.ObjectId; // Added by auditPlugin
}

const subscriptionInvoiceSchema = new Schema<ISubscriptionInvoice>(
  {
    // ✅ FIXED COMMENT: orgId is required and must be explicitly set in code
    // The tenantIsolationPlugin adds the field definition, but does NOT auto-populate it
    // All SubscriptionInvoice.create() calls must include orgId

    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "SAR",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
    },
    dueDate: {
      type: Date,
      required: true,
    },
    periodStart: {
      // ✅ ADDED
      type: Date,
      required: true,
    },
    periodEnd: {
      // ✅ ADDED
      type: Date,
      required: true,
    },
    paidAt: Date,
    paymentMethod: String,
    paytabsRef: String, // ✅ ADDED: PayTabs transaction reference
  },
  {
    timestamps: true,
    collection: "subscriptioninvoices",
    // Indexes are managed centrally in lib/db/collections.ts
    autoIndex: false,
  },
);

// APPLY PLUGINS (BEFORE INDEXES)
subscriptionInvoiceSchema.plugin(tenantIsolationPlugin);
subscriptionInvoiceSchema.plugin(auditPlugin);

export const SubscriptionInvoice =
  (typeof mongoose.models !== "undefined" &&
    mongoose.models.SubscriptionInvoice) ||
  mongoose.model<ISubscriptionInvoice>(
    "SubscriptionInvoice",
    subscriptionInvoiceSchema,
  );
export default SubscriptionInvoice;
