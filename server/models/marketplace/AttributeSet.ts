import { Schema, model, models, Types, Model } from "mongoose";
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";
import { auditPlugin } from "../../plugins/auditPlugin";

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
  orgId: Types.ObjectId; // This will be managed by tenantIsolationPlugin
  title: string;
  items: MarketplaceAttributeDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

const AttributeSetSchema = new Schema<MarketplaceAttributeSet>(
  {
    // orgId will be added by tenantIsolationPlugin
    title: { type: String, required: true, trim: true },
    items: [
      {
        key: { type: String, required: true, trim: true },
        label: {
          en: { type: String, required: true, trim: true },
          ar: { type: String, trim: true },
        },
        unit: { type: String, trim: true },
        required: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true },
);

// Apply plugins BEFORE indexes for proper tenant isolation
AttributeSetSchema.plugin(tenantIsolationPlugin);
AttributeSetSchema.plugin(auditPlugin);

// Indexes for efficient tenant-scoped queries
AttributeSetSchema.index({ orgId: 1 });
AttributeSetSchema.index({ orgId: 1, title: 1 });

const AttributeSetModel =
  (models.MarketplaceAttributeSet as
    | Model<MarketplaceAttributeSet>
    | undefined) ||
  model<MarketplaceAttributeSet>("MarketplaceAttributeSet", AttributeSetSchema);

export default AttributeSetModel;
