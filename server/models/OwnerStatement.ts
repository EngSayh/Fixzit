import { Schema, InferSchemaType, Types } from "mongoose";
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';
import { getModel } from '@/src/types/mongoose-compat';

const OwnerStatementSchema = new Schema({
  // tenantId will be added by tenantIsolationPlugin
  ownerId: { type: Schema.Types.ObjectId, ref: 'Owner', required: true },
  propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
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

// Apply plugins BEFORE indexes
OwnerStatementSchema.plugin(tenantIsolationPlugin);
OwnerStatementSchema.plugin(auditPlugin);

// Tenant-scoped indexes (orgId from plugin)
OwnerStatementSchema.index({ orgId: 1, ownerId: 1, period: 1, year: 1 });

export type OwnerStatementDoc = InferSchemaType<typeof OwnerStatementSchema>;

export const OwnerStatement = getModel<OwnerStatementDoc>('OwnerStatement', OwnerStatementSchema);
