import mongoose, { Schema } from "mongoose";
import { ensureMongoConnection } from "@/server/lib/db";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";

ensureMongoConnection();

const BudgetSchema = new Schema(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    period: { type: String, required: true },
    amountMinor: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, default: "SAR" },
  },
  { timestamps: true },
);

tenantIsolationPlugin(BudgetSchema);
auditPlugin(BudgetSchema);
BudgetSchema.index({ orgId: 1, propertyId: 1, period: 1 }, { unique: true });

export const Budget =
  mongoose.models.Budget || mongoose.model("Budget", BudgetSchema);
export default Budget;
