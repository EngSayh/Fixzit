import mongoose from 'mongoose';
import { getDb } from './db';

const CounterSchema = new mongoose.Schema({
  orgId: { type: String, required: true },
  prefix: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
CounterSchema.index({ orgId: 1, prefix: 1 }, { unique: true });

const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

export async function nextNumber(orgId: string, prefix: string): Promise<string> {
  await getDb();
  const doc = await Counter.findOneAndUpdate(
    { orgId, prefix },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `${prefix}-${String(doc.seq).padStart(6, '0')}`;
}
