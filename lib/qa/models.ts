import { Schema } from 'mongoose'
import { getModel } from '@/src/types/mongoose-compat';

const QaEventSchema = new Schema({
  type: { type: String, required: true },
  route: String,
  role: String,
  orgId: String,
  ts: Number,
  meta: Schema.Types.Mixed,
  screenshot: String,
}, { timestamps: true });

export const QaEvent = getModel<any>('QaEvent', QaEventSchema);
