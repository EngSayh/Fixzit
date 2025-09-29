import { Schema, model, models, Types } from 'mongoose';

const PriceTierSchema = new Schema({
  moduleId: { type: Types.ObjectId, ref: 'Module', index: true },
  seatsMin: Number, // inclusive
  seatsMax: Number, // inclusive, <=200
  pricePerSeatMonthly: Number, // USD baseline (convert later by currency)
  flatMonthly: Number,         // for per_tenant modules (e.g., MARKETPLACE)
  currency: { type: String, default: 'USD' },
  region: { type: String, default: 'GLOBAL' }
}, { timestamps: true });

export default models.PriceTier || model('PriceTier', PriceTierSchema);
