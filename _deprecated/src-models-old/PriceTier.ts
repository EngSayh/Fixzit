import { Schema, model, models, Document } from 'mongoose';

export interface IPriceTier extends Document {
  _id: string;
  name: string;
  description?: string;
  tier: number;
  discountPercentage: number;
  minimumOrderValue?: number;
  createdAt: Date;
  updatedAt: Date;
}

const priceTierSchema = new Schema<IPriceTier>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  tier: {
    type: Number,
    required: true,
    min: 1
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  minimumOrderValue: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Ensure unique tier numbers
priceTierSchema.index({ tier: 1 }, { unique: true });
priceTierSchema.index({ name: 1 }, { unique: true });

export const PriceTier = models.PriceTier || model<IPriceTier>('PriceTier', priceTierSchema);
export default PriceTier;