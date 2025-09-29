import { Schema, model, models } from 'mongoose';

export type BillingCategory = 'per_seat' | 'per_tenant';

const ModuleSchema = new Schema({
  code: { type: String, unique: true, index: true }, // e.g., 'FM_CORE','PROPERTIES','FINANCE','HR','COMPLIANCE','REPORTS','MARKETPLACE'
  name: String,
  description: String,
  billingCategory: { type: String, enum: ['per_seat', 'per_tenant'], default: 'per_seat' },
  isCore: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default models.Module || model('Module', ModuleSchema);
