import { Schema, model, models, Document } from 'mongoose';

export interface ICategory extends Document {
  orgId: string;
  name: string;
  nameAr: string;
  slug: string;
  parentId?: string;
  path: string[];
  description?: string;
  descriptionAr?: string;
  icon?: string;
  image?: string;
  sort: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  orgId: { 
    type: String, 
    required: true, 
    index: true,
    default: 'fixzit-platform'
  },
  name: { 
    type: String, 
    required: true 
  },
  nameAr: { 
    type: String, 
    required: true 
  },
  slug: { 
    type: String, 
    required: true 
  },
  parentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Category', 
    default: null 
  },
  path: [{ 
    type: String, 
    index: true 
  }],
  description: String,
  descriptionAr: String,
  icon: String,
  image: String,
  sort: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  }
}, { 
  timestamps: true,
  collection: 'categories'
});

// Indexes
CategorySchema.index({ orgId: 1, slug: 1 }, { unique: true });
CategorySchema.index({ parentId: 1, sort: 1 });
CategorySchema.index({ path: 1 });
CategorySchema.index({ name: 'text', nameAr: 'text' });

// Virtual for full path
CategorySchema.virtual('fullPath').get(function() {
  return this.path.join(' > ');
});

// Methods
CategorySchema.methods.addSubcategory = async function(subcategoryData: Partial<ICategory>) {
  const newPath = [...this.path, this.slug];
  
  const subcategory = new (models.Category || model('Category', CategorySchema))({
    ...subcategoryData,
    parentId: this._id,
    path: newPath,
    orgId: this.orgId
  });
  
  return subcategory.save();
};

// Static methods
CategorySchema.statics.findBySlug = function(orgId: string, slug: string) {
  return this.findOne({ orgId, slug, isActive: true });
};

CategorySchema.statics.findRootCategories = function(orgId: string) {
  return this.find({ 
    orgId, 
    parentId: null, 
    isActive: true 
  }).sort({ sort: 1 });
};

CategorySchema.statics.findSubcategories = function(orgId: string, parentId: string) {
  return this.find({ 
    orgId, 
    parentId, 
    isActive: true 
  }).sort({ sort: 1 });
};

CategorySchema.statics.buildTree = async function(orgId: string) {
  const categories: any[] = await this.find({ orgId, isActive: true }).lean();
  const categoryMap: Map<string, any> = new Map();
  const tree: any[] = [];

  // First pass: create map
  categories.forEach((cat: any) => {
    categoryMap.set(cat._id.toString(), { ...cat, children: [] });
  });

  // Second pass: build tree
  categories.forEach((cat: any) => {
    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId.toString());
      if (parent) {
        parent.children.push(categoryMap.get(cat._id.toString()));
      }
    } else {
      tree.push(categoryMap.get(cat._id.toString()));
    }
  });

  return tree;
};

export const Category = models.Category || model<ICategory>('Category', CategorySchema);
