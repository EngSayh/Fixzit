import { Schema, model, models, Types, Model } from 'mongoose';

export interface MarketplaceCategory {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  name: {
    en: string;
    ar?: string;
  };
  slug: string;
  parentId?: Types.ObjectId | null;
  attrSetId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<MarketplaceCategory>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true },
    name: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, trim: true }
    },
    slug: { type: String, required: true, trim: true },
    parentId: { type: Schema.Types.ObjectId, default: null },
    attrSetId: { type: Schema.Types.ObjectId, default: null }
  },
  { timestamps: true }
);

CategorySchema.index({ orgId: 1, slug: 1 }, { unique: true });

const CategoryModel =
  (models.MarketplaceCategory as Model<MarketplaceCategory> | undefined) ||
  model<MarketplaceCategory>('MarketplaceCategory', CategorySchema);

export default CategoryModel;

