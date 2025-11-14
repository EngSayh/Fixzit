/**
 * Souq Category Model - Product categorization hierarchy
 * @module server/models/souq/Category
 */

import mongoose, { Schema, type Document } from 'mongoose';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  categoryId: string; // CAT-{UUID}
  name: Record<string, string>; // { en: 'Electronics', ar: 'إلكترونيات' }
  slug: string; // URL-friendly
  parentCategoryId?: string; // For hierarchy (L1 > L2 > L3)
  level: number; // 1, 2, or 3 (max 3 levels)
  path: string[]; // Full path of category IDs for traversal
  description?: Record<string, string>;
  icon?: string; // Icon URL or name
  bannerImage?: string;
  
  // Restrictions
  isRestricted: boolean; // Requires approval to list
  isActive: boolean;
  
  // Attributes
  requiredAttributes: string[]; // Attribute IDs required for products
  optionalAttributes: string[]; // Attribute IDs optional for products
  
  // Metadata
  displayOrder: number;
  productCount?: number; // Cached count of products
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId; // Admin user ID
  updatedBy?: mongoose.Types.ObjectId;
}

const CategorySchema = new Schema<ICategory>(
  {
    categoryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: Map,
      of: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
    },
    parentCategoryId: {
      type: String,
      index: true,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
      index: true,
    },
    path: {
      type: [String],
      default: [],
      index: true,
    },
    description: {
      type: Map,
      of: String,
    },
    icon: String,
    bannerImage: String,
    isRestricted: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    requiredAttributes: {
      type: [String],
      default: [],
    },
    optionalAttributes: {
      type: [String],
      default: [],
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    productCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'souq_categories',
  }
);

// Indexes for performance
CategorySchema.index({ parentCategoryId: 1, displayOrder: 1 });
CategorySchema.index({ level: 1, isActive: 1 });
CategorySchema.index({ path: 1 });
CategorySchema.index({ 'name.en': 'text', 'name.ar': 'text' });

// Virtual for full path names
CategorySchema.virtual('fullPath').get(function () {
  return this.path;
});

// Static method: Get category tree
CategorySchema.statics.getCategoryTree = async function () {
  const categories = await this.find({ isActive: true }).sort({ level: 1, displayOrder: 1 });

  const tree: unknown[] = [];
  const categoryMap = new Map();

  categories.forEach((cat: ICategory) => {
    const catObj = cat.toObject();
    catObj.children = [];
    categoryMap.set(catObj.categoryId, catObj);
  });

  categories.forEach((cat: ICategory) => {
    const catObj = categoryMap.get(cat.categoryId);
    if (cat.parentCategoryId) {
      const parent = categoryMap.get(cat.parentCategoryId);
      if (parent) {
        parent.children.push(catObj);
      }
    } else {
      tree.push(catObj);
    }
  });

  return tree;
};

// Static method: Get breadcrumb
CategorySchema.statics.getBreadcrumb = async function (categoryId: string) {
  const category = await this.findOne({ categoryId });
  if (!category) return [];

  const breadcrumb = [];
  for (const catId of category.path) {
    const cat = await this.findOne({ categoryId: catId });
    if (cat) {
      breadcrumb.push({
        categoryId: cat.categoryId,
        name: cat.name,
        slug: cat.slug,
      });
    }
  }

  breadcrumb.push({
    categoryId: category.categoryId,
    name: category.name,
    slug: category.slug,
  });

  return breadcrumb;
};

// Pre-save: Update path
CategorySchema.pre('save', async function (next) {
  if (this.isModified('parentCategoryId') || this.isNew) {
    const path: string[] = [];

    if (this.parentCategoryId) {
      const parent = await mongoose.model('SouqCategory').findOne({
        categoryId: this.parentCategoryId,
      });

      if (parent) {
        path.push(...parent.path, parent.categoryId);
        this.level = parent.level + 1;
      } else {
        this.level = 1;
      }
    } else {
      this.level = 1;
    }

    this.path = path;
  }

  next();
});

export const SouqCategory =
  mongoose.models.SouqCategory || mongoose.model<ICategory>('SouqCategory', CategorySchema);

export default SouqCategory;
