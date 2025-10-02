import { Schema, model, models, Document } from 'mongoose';

export interface IPriceTier extends Document {
  _id: string;
  moduleId: Schema.Types.ObjectId;
  seatsMin: number;
  seatsMax: number;
  pricePerSeatMonthly?: number;
  flatMonthly?: number;
  currency: string;
  region?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const priceTierSchema = new Schema<IPriceTier>({
  moduleId: {
    type: Schema.Types.ObjectId,
    ref: 'Module',
    required: true
  },
  seatsMin: {
    type: Number,
    required: true,
    min: 1
  },
  seatsMax: {
    type: Number,
    required: true,
    min: 1
  },
  pricePerSeatMonthly: {
    type: Number,
    min: 0
  },
  flatMonthly: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true
  },
  region: {
    type: String,
    trim: true
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

priceTierSchema.index({ moduleId: 1, seatsMin: 1, seatsMax: 1, currency: 1 }, { unique: true });

export const PriceTier = models.PriceTier || model<IPriceTier>('PriceTier', priceTierSchema);
export default PriceTier;

