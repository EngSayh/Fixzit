import { Schema, model, models } from 'mongoose';

const QaEventSchema = new Schema({
  type: { type: String, required: true },
  route: String,
  role: String,
  orgId: String,
  ts: Number,
  meta: Schema.Types.Mixed,
  screenshot: String,
}, { timestamps: true });

export const QaEvent = models.QaEvent || model('QaEvent', QaEventSchema);
