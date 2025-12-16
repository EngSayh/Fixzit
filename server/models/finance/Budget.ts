/**
 * @module server/models/finance/Budget
 * @description Property budget tracking for financial planning and expense control.
 *              Supports period-based budgets (monthly, quarterly, annual) with variance analysis.
 *
 * @features
 * - Period-based budgets (e.g., "2025-Q1", "2025-01", "2025")
 * - Decimal128 storage for precision-safe financial calculations
 * - Multi-currency support (SAR default)
 * - Property-level budget allocation
 * - Budget vs actual expense tracking
 * - Variance analysis and alerts
 * - Budget rollover support (carry forward unused budget)
 *
 * @indexes
 * - { orgId: 1, propertyId: 1, period: 1 } (unique) — One budget per property per period
 *
 * @relationships
 * - References Property model (propertyId)
 * - Compared against FMFinancialTransaction (actual expenses)
 * - Compared against Expense model (approved expenses)
 * - Integrates with OwnerStatement (budget vs actual reporting)
 *
 * @compliance
 * - Decimal128 precision for ZATCA/GAZT compliance
 * - Audit trail for budget modifications
 *
 * @audit
 * - createdBy, updatedBy: Auto-tracked via auditPlugin
 * - timestamps: createdAt, updatedAt from Mongoose
 */
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
BudgetSchema.index(
  { orgId: 1, propertyId: 1, period: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);

export const Budget =
  mongoose.models.Budget || mongoose.model("Budget", BudgetSchema);
export default Budget;
