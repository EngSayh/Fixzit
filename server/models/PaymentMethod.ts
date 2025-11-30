import { Schema, model, models, Model, Document } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";
import { auditPlugin } from "../plugins/auditPlugin";

const PaymentMethodSchema = new Schema(
  {
    // NOTE: This schema uses a flexible ownership model (XOR validation)
    // Either orgId (organization payment method) OR owner_user_id (user payment method)
    // This is intentional and does NOT use tenantIsolationPlugin
    // AUDIT-2025-11-29: Changed from org_id to orgId
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      // Note: required conditionally in validation - see validate hook below
    },
    owner_user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      // Note: required conditionally in validation - see validate hook below
    },
    gateway: { type: String, default: "PAYTABS" },
    pt_token: { type: String },
    pt_masked_card: String,
    pt_customer_email: String,
  },
  { timestamps: true },
);

// XOR validation: Either orgId OR owner_user_id must be provided, but not both
// AUDIT-2025-11-29: Changed from org_id to orgId
PaymentMethodSchema.pre("validate", function (next) {
  const hasOrg = !!this.orgId;
  const hasOwner = !!this.owner_user_id;

  if (!hasOrg && !hasOwner) {
    return next(new Error("Either orgId or owner_user_id must be provided"));
  }

  if (hasOrg && hasOwner) {
    return next(new Error("Cannot set both orgId and owner_user_id"));
  }

  next();
});

// Apply audit plugin for tracking who created/updated payment methods
PaymentMethodSchema.plugin(auditPlugin);

// Indexes for efficient queries
PaymentMethodSchema.index({ orgId: 1 }); // AUDIT-2025-11-29: Changed from org_id
PaymentMethodSchema.index({ owner_user_id: 1 });
PaymentMethodSchema.index({ pt_token: 1 }, { sparse: true }); // For quick token lookup

// TypeScript-safe model export
interface IPaymentMethod extends Document {
  orgId?: Schema.Types.ObjectId; // AUDIT-2025-11-29: Changed from org_id
  owner_user_id?: Schema.Types.ObjectId;
  gateway: string;
  pt_token?: string;
  pt_masked_card?: string;
  pt_customer_email?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
}

const PaymentMethod = getModel<IPaymentMethod>(
  "PaymentMethod",
  PaymentMethodSchema,
);
export default PaymentMethod;
