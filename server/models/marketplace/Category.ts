/**
 * Category Model - Fixzit Souq product taxonomy
 * 
 * @module server/models/marketplace/Category
 * @description Hierarchical product categorization for Fixzit Souq marketplace.
 * Supports multi-level category trees with parent-child relationships.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Hierarchical category tree (parent-child)
 * - Multi-language names (Arabic/English)
 * - SEO-friendly slugs
 * - Attribute set association for category-specific filters
 * - Unlimited nesting depth
 * 
 * @indexes
 * - Unique: { orgId, slug } - SEO-friendly URLs per tenant
 * - Index: { parentId } for child category lookups
 * - Index: { attrSetId } for attribute filtering
 * 
 * @relationships
 * - parentId → MarketplaceCategory._id (self-referential)
 * - attrSetId → AttributeSet._id (category-specific attributes)
 * - Product.categoryId → Category._id
 * 
 * @example_hierarchy
 * - Facility Supplies (parent: null)
 *   - Cleaning Products (parent: Facility Supplies)
 *     - Floor Cleaners (parent: Cleaning Products)
 *   - Safety Equipment (parent: Facility Supplies)
 *     - PPE (parent: Safety Equipment)
 * 
 * @audit
 * - Category renames tracked
 * - Hierarchy changes logged
 * - Attribute set associations recorded
 */

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
