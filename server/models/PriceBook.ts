import { Schema, model, models, Model, Document } from 'mongoose';
import { auditPlugin } from '../plugins/auditPlugin';

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

// NOTE: PriceBook is global platform configuration (no tenantIsolationPlugin)
// Apply audit plugin to track who changes pricing (critical for financial governance)
PriceBookSchema.plugin(auditPlugin);

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

// TypeScript-safe model export
interface IPricePerModule {
  module_key: string;
  monthly_usd: number;
  monthly_sar: number;
}

interface ISeatTier {
  min_seats: number;
  max_seats: number;
  discount_pct: number;
  prices: IPricePerModule[];
}

interface IPriceBook extends Document {
  name: string;
  currency: 'USD' | 'SAR';
  effective_from: Date;
  active: boolean;
  tiers: ISeatTier[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
}

const PriceBook: Model<IPriceBook> = models.PriceBook || model<IPriceBook>('PriceBook', PriceBookSchema);
export default PriceBook;
