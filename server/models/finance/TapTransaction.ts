import {
  Schema,
  type InferSchemaType,
  type Model,
  type Document,
  Types,
} from "mongoose";
import { getModel } from "@/src/types/mongoose-compat";
import { ensureMongoConnection } from "@/server/lib/db";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";

ensureMongoConnection();

const TapTransactionSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: { type: String, index: true },
    chargeId: { type: String, required: true, unique: true },
    orderId: { type: String },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    correlationId: { type: String, index: true },
    status: { type: String, index: true },
    currency: { type: String, default: "SAR" },
    amountHalalas: { type: Number },
    amountSAR: { type: Number },
    redirectUrl: { type: String },
    expiresAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
    tapMetadata: { type: Schema.Types.Mixed },
    rawCharge: { type: Schema.Types.Mixed },
    requestContext: {
      type: Schema.Types.Mixed,
      default: {},
    },
    paymentContext: {
      partyType: String,
      partyId: String,
      partyName: String,
      propertyId: String,
      unitId: String,
      notes: String,
    },
    lastEventAt: { type: Date },
    events: [
      {
        type: {
          type: String,
        },
        status: { type: String },
        at: { type: Date, default: Date.now },
        payload: { type: Schema.Types.Mixed },
      },
    ],
    refunds: [
      {
        refundId: { type: String },
        status: { type: String },
        amountHalalas: { type: Number },
        amountSAR: { type: Number },
        currency: { type: String },
        reason: { type: String },
        processedAt: { type: Date },
      },
    ],
  },
  {
    timestamps: true,
    collection: "finance_tap_transactions",
  },
);

TapTransactionSchema.plugin(tenantIsolationPlugin);

TapTransactionSchema.index({ orgId: 1, createdAt: -1 });
TapTransactionSchema.index({ status: 1, updatedAt: -1 });

export type TapTransactionDoc = InferSchemaType<typeof TapTransactionSchema> &
  Document & {
    orgId: Types.ObjectId;
  };

export const TapTransaction: Model<TapTransactionDoc> =
  getModel<TapTransactionDoc>("TapTransaction", TapTransactionSchema);
