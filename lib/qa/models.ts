import { Schema } from 'mongoose'
import { getModel } from '@/src/types/mongoose-compat';

interface QaEventDoc {
  type: string;
  route?: string;
  role?: string;
  orgId?: string;
  ts?: number;
  meta?: Record<string, unknown>;
  screenshot?: string;
}

const QaEventSchema = new Schema<QaEventDoc>({
  type: { type: String, required: true },
  route: String,
  role: String,
  orgId: String,
  ts: Number,
  meta: Schema.Types.Mixed,
  screenshot: String,
}, { timestamps: true });

export const QaEvent = getModel<QaEventDoc>('QaEvent', QaEventSchema);
