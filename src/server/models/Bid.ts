import { Schema, model, models, Document } from 'mongoose';

export interface IBid extends Document {
  orgId: string;
  rfqId: string;
  vendorId: string;
  amount?: number;
  currency?: string;
  terms?: string;
  status: 'submitted' | 'withdrawn' | 'awarded' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const BidSchema = new Schema<IBid>({
  orgId: { type: String, required: true, index: true },
  rfqId: { type: String, required: true, index: true },
  vendorId: { type: String, required: true, index: true },
  amount: { type: Number },
  currency: { type: String, default: 'SAR' },
  terms: { type: String },
  status: { type: String, enum: ['submitted', 'withdrawn', 'awarded', 'rejected'], default: 'submitted', index: true }
}, { timestamps: true, collection: 'bids' });

BidSchema.index({ orgId: 1, rfqId: 1, vendorId: 1 }, { unique: true });

export const Bid = models.Bid || model<IBid>('Bid', BidSchema);


