/**
 * @module server/models/OwnerStatement
 * @description Financial statements for property owners showing income, expenses, and net distributions.
 *              Supports monthly/quarterly/annual statement generation for owner reporting and tax filing.
 *
 * @features
 * - Period-based statements (monthly, quarterly, annual)
 * - Income tracking (rent payments, utility reimbursements, late fees)
 * - Expense tracking (maintenance, management fees, property taxes, insurance)
 * - Net calculation (income - expenses = owner distribution)
 * - Line-item detail with reference linking (invoice IDs, transaction IDs)
 * - Property-specific or consolidated owner portfolio statements
 * - Multi-currency support (SAR default)
 * - PDF export support for owner distribution emails
 *
 * @indexes
 * - { orgId: 1, ownerId: 1, year: -1, period: 1 } — Owner statement history queries
 * - { orgId: 1, propertyId: 1, year: -1 } — Property-specific statements
 * - { orgId: 1, ownerId: 1, propertyId: 1, year: 1, period: 1 } (unique) — Prevent duplicate statements
 *
 * @relationships
 * - References Owner model (ownerId)
 * - References Property model (propertyId) for property-specific statements
 * - Links to FMFinancialTransaction model (lineItems reference transaction IDs)
 * - Links to Invoice model (lineItems reference invoice IDs)
 * - Integrates with owner dashboard for statement downloads
 *
 * @audit
 * - createdBy, updatedBy: Auto-tracked via auditPlugin
 * - timestamps: createdAt, updatedAt from Mongoose
 * - Statements immutable once generated (corrections via adjusting entries)
 */
import { Schema, InferSchemaType, Types } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { getModel } from "@/types/mongoose-compat";

const OwnerStatementSchema = new Schema(
  {
    // tenantId will be added by tenantIsolationPlugin
    ownerId: { type: Schema.Types.ObjectId, ref: "Owner", required: true },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
    period: { type: String, required: true },
    year: { type: Number, required: true },
    currency: { type: String, default: "SAR" },
    totals: {
      income: { type: Number, default: 0 },
      expenses: { type: Number, default: 0 },
      net: { type: Number, default: 0 },
    },
    lineItems: [
      {
        date: { type: Date, required: true },
        description: { type: String, required: true },
        type: { type: String, enum: ["INCOME", "EXPENSE"], required: true },
        amount: { type: Number, required: true },
        reference: { type: String },
      },
    ],
  },
  { timestamps: true },
);

// Apply plugins BEFORE indexes
OwnerStatementSchema.plugin(tenantIsolationPlugin);
OwnerStatementSchema.plugin(auditPlugin);

// Tenant-scoped indexes (orgId from plugin)
OwnerStatementSchema.index({ orgId: 1, ownerId: 1, period: 1, year: 1 });

export type OwnerStatementDoc = InferSchemaType<typeof OwnerStatementSchema>;

export const OwnerStatement = getModel<OwnerStatementDoc>(
  "OwnerStatement",
  OwnerStatementSchema,
);
