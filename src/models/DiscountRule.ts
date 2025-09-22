import { Schema, model, models } from 'mongoose';

const DiscountRuleSchema = new Schema({
  code: { type: String, unique: true }, // 'ANNUAL'
  type: { type: String, enum: ['percent','amount'], default: 'percent' },
  value: Number, // e.g. 15
  active: { type: Boolean, default: true },
  editableBy: { type: [String], default: ['SUPER_ADMIN'] }
}, { timestamps: true });

export default models.DiscountRule || model('DiscountRule', DiscountRuleSchema);
