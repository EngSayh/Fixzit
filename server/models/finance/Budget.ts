import mongoose, { Schema } from 'mongoose';
import { tenantIsolation, auditTrail } from '../../lib/plugins';

const BudgetSchema = new Schema({
  propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
  period: { type: String, required: true },
  amountMinor: { type: Schema.Types.Decimal128, required: true },
  currency: { type: String, default: 'SAR' },
}, { timestamps: true });

tenantIsolation(BudgetSchema);
auditTrail(BudgetSchema);
BudgetSchema.index({ orgId: 1, propertyId: 1, period: 1 }, { unique: true });

export const Budget = mongoose.models.Budget || mongoose.model('Budget', BudgetSchema);
export default Budget;
