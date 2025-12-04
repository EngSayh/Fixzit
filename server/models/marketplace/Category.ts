import { Schema, model, models, Types, Model } from "mongoose";
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";
import { auditPlugin } from "../../plugins/auditPlugin";

export interface MarketplaceCategory {
  _id: Types.ObjectId;
  orgId: Types.ObjectId; // This will be managed by tenantIsolationPlugin
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
    // orgId will be added by tenantIsolationPlugin
    name: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, trim: true },
    },
    slug: { type: String, required: true, trim: true },
    parentId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "MarketplaceCategory",
    },
    attrSetId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "MarketplaceAttributeSet",
    },
  },
  { timestamps: true },
);

// Apply plugins BEFORE indexes for proper tenant isolation
CategorySchema.plugin(tenantIsolationPlugin);
CategorySchema.plugin(auditPlugin);

// All indexes MUST be tenant-scoped
CategorySchema.index(
  { orgId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);
CategorySchema.index({ orgId: 1, parentId: 1 });

const CategoryModel =
  (models.MarketplaceCategory as Model<MarketplaceCategory> | undefined) ||
  model<MarketplaceCategory>("MarketplaceCategory", CategorySchema);

export default CategoryModel;
