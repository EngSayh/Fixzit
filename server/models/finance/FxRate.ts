import mongoose, { Schema } from 'mongoose';
import { ensureMongoConnection } from '@/server/lib/db';
import { tenantIsolationPlugin } from '@/server/plugins/tenantIsolation';
import { auditPlugin } from '@/server/plugins/auditPlugin';

ensureMongoConnection();

const FxRateSchema = new Schema({
  date: { type: Date, required: true },
  baseCurrency: { type: String, required: true },
  quoteCurrency: { type: String, required: true },
  rate: { type: Number, required: true },
  source: { type: String, default: 'polygon' },
});

tenantIsolationPlugin(FxRateSchema);
auditPlugin(FxRateSchema);
FxRateSchema.index({ orgId: 1, date: 1, baseCurrency: 1, quoteCurrency: 1 }, { unique: true });

export const FxRate = mongoose.models.FxRate || mongoose.model('FxRate', FxRateSchema);
export default FxRate;
