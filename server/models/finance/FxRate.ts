import mongoose, { Schema } from 'mongoose';
import { tenantIsolation, auditTrail } from '../../lib/plugins';

const FxRateSchema = new Schema({
  date: { type: Date, required: true },
  baseCurrency: { type: String, required: true },
  quoteCurrency: { type: String, required: true },
  rate: { type: Number, required: true },
  source: { type: String, default: 'polygon' },
});

tenantIsolation(FxRateSchema);
auditTrail(FxRateSchema);
FxRateSchema.index({ orgId: 1, date: 1, baseCurrency: 1, quoteCurrency: 1 }, { unique: true });

export const FxRate = mongoose.models.FxRate || mongoose.model('FxRate', FxRateSchema);
export default FxRate;
