import { Schema, model, models } from 'mongoose';

const PricePerModuleSchema = new Schema(
  {
    module_key: { type: String, required: true },
    monthly_usd: { type: Number, required: true },
    monthly_sar: { type: Number, required: true },
  },
  { _id: false }
);

const SeatTierSchema = new Schema(
  {
    min_seats: { type: Number, required: true },
    max_seats: { type: Number, required: true },
    discount_pct: { 
      type: Number, 
      default: 0,
      min: [0, 'Discount percentage must be between 0 and 100'],
      max: [100, 'Discount percentage must be between 0 and 100']
    },
    prices: { type: [PricePerModuleSchema], default: [] },
  },
  { _id: false }
);

const PriceBookSchema = new Schema(
  {
    name: { type: String, required: true },
    currency: { type: String, enum: ['USD', 'SAR'], default: 'USD' },
    effective_from: { type: Date, default: () => new Date() },
    active: { type: Boolean, default: true },
    tiers: { type: [SeatTierSchema], default: [] },
  },
  { timestamps: true }
);

// Validate min_seats <= max_seats for all tiers
PriceBookSchema.pre('save', function(next) {
  if (this.tiers && Array.isArray(this.tiers)) {
    for (const tier of this.tiers) {
      if (tier.min_seats > tier.max_seats) {
        return next(new Error(`min_seats (${tier.min_seats}) must be <= max_seats (${tier.max_seats}) in all tiers`));
      }
    }
  }
  next();
});

export default models.PriceBook || model('PriceBook', PriceBookSchema);
