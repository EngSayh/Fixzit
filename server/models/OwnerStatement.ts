import { Schema, model, models, InferSchemaType } from "mongoose";

const OwnerStatementSchema = new Schema({
  tenantId: { type: String, index: true, required: true },
  ownerId: { type: String, index: true, required: true },
  propertyId: { type: String, index: true },
  period: { type: String, required: true },
  year: { type: Number, required: true },
  currency: { type: String, default: "SAR" },
  totals: {
    income: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    net: { type: Number, default: 0 }
  },
  lineItems: [{
    date: { type: Date, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ["INCOME","EXPENSE"], required: true },
    amount: { type: Number, required: true },
    reference: { type: String }
  }]
}, { timestamps: true });

OwnerStatementSchema.index({ tenantId: 1, ownerId: 1, period: 1, year: 1 });

export type OwnerStatementDoc = InferSchemaType<typeof OwnerStatementSchema>;

export const OwnerStatement = models.OwnerStatement || model("OwnerStatement", OwnerStatementSchema);
