import { Schema, model, models, Types, Model } from 'mongoose';

export interface MarketplaceAttributeDefinition {
  key: string;
  label: {
    en: string;
    ar?: string;
  };
  unit?: string;
  required?: boolean;
}

export interface MarketplaceAttributeSet {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  title: string;
  items: MarketplaceAttributeDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

const AttributeSetSchema = new Schema<MarketplaceAttributeSet>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true, trim: true },
    items: [
      {
        key: { type: String, required: true, trim: true },
        label: {
          en: { type: String, required: true, trim: true },
          ar: { type: String, trim: true }
        },
        unit: { type: String, trim: true },
        required: { type: Boolean, default: false }
      }
    ]
  },
  { timestamps: true }
);

const AttributeSetModel =
  (models.MarketplaceAttributeSet as Model<MarketplaceAttributeSet> | undefined) ||
  model<MarketplaceAttributeSet>('MarketplaceAttributeSet', AttributeSetSchema);

export default AttributeSetModel;
