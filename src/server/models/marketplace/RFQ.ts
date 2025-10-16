import { Schema, model, models, Types, Model } from 'mongoose';

export interface MarketplaceRFQBid {
  vendorId: Types.ObjectId;
  amount: number;
  currency: string;
  leadDays?: number;
  submittedAt: Date;
}

export interface MarketplaceRFQ {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  requesterId: Types.ObjectId;
  title: string;
  description?: string;
  categoryId?: Types.ObjectId;
  quantity?: number;
  budget?: number;
  currency: string;
  deadline?: Date;
  status: 'OPEN' | 'CLOSED' | 'AWARDED';
  bids: MarketplaceRFQBid[];
  createdAt: Date;
  updatedAt: Date;
}

const RFQSchema = new Schema<MarketplaceRFQ>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true },
    requesterId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    categoryId: { type: Schema.Types.ObjectId },
    quantity: { type: Number },
    budget: { type: Number },
    currency: { type: String, default: 'SAR' },
    deadline: { type: Date },
    status: { type: String, enum: ['OPEN', 'CLOSED', 'AWARDED'], default: 'OPEN' },
    bids: [
      {
        vendorId: { type: Schema.Types.ObjectId, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, required: true },
        leadDays: { type: Number },
        submittedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

RFQSchema.index({ orgId: 1, status: 1 });

const RFQModel =
  (models.MarketplaceRFQ as Model<MarketplaceRFQ> | undefined) ||
  model<MarketplaceRFQ>('MarketplaceRFQ', RFQSchema);

export default RFQModel;

