import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: string;
  subcategory?: string;
  type: 'material' | 'property' | 'service';
  vendorId: string;
  sku: string;
  barcode?: string;
  price: {
    amount: number;
    currency: string;
    vat: number;
    discount?: {
      type: 'percentage' | 'fixed';
      value: number;
      validUntil?: Date;
    };
  };
  stock: {
    quantity: number;
    unit: string;
    minOrder: number;
    maxOrder?: number;
    warehouse?: string;
    leadTime?: number; // in days
  };
  images: {
    primary: string;
    gallery: string[];
  };
  specifications: Record<string, any>;
  // For properties
  propertyDetails?: {
    location: {
      address: string;
      city: string;
      district: string;
      coordinates: {
        lat: number;
        lng: number;
      };
    };
    area: number;
    bedrooms?: number;
    bathrooms?: number;
    parking?: number;
    furnished?: boolean;
    amenities?: string[];
    nearbyPlaces?: Array<{
      type: string;
      name: string;
      distance: number;
    }>;
  };
  ratings: {
    average: number;
    count: number;
  };
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  publishedAt?: Date;
  views: number;
  salesCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: true,
    index: true
  },
  nameAr: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  descriptionAr: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  subcategory: String,
  type: {
    type: String,
    enum: ['material', 'property', 'service'],
    required: true,
    index: true
  },
  vendorId: {
    type: String,
    required: true,
    index: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  barcode: String,
  price: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'SAR'
    },
    vat: {
      type: Number,
      default: 15
    },
    discount: {
      type: {
        type: String,
        enum: ['percentage', 'fixed']
      },
      value: Number,
      validUntil: Date
    }
  },
  stock: {
    quantity: {
      type: Number,
      default: 0,
      min: 0
    },
    unit: {
      type: String,
      default: 'piece'
    },
    minOrder: {
      type: Number,
      default: 1,
      min: 1
    },
    maxOrder: Number,
    warehouse: String,
    leadTime: Number
  },
  images: {
    primary: {
      type: String,
      required: true
    },
    gallery: [{
      type: String
    }]
  },
  specifications: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  propertyDetails: {
    location: {
      address: String,
      city: String,
      district: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    area: Number,
    bedrooms: Number,
    bathrooms: Number,
    parking: Number,
    furnished: Boolean,
    amenities: [String],
    nearbyPlaces: [{
      type: String,
      name: String,
      distance: Number
    }]
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  tags: [{
    type: String,
    index: true
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  publishedAt: Date,
  views: {
    type: Number,
    default: 0
  },
  salesCount: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'products'
});

// Indexes for search and filtering
ProductSchema.index({ name: 'text', nameAr: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ category: 1, subcategory: 1, isActive: 1 });
ProductSchema.index({ 'price.amount': 1 });
ProductSchema.index({ 'propertyDetails.location.city': 1, 'propertyDetails.location.district': 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ salesCount: -1, 'ratings.average': -1 });

// Virtual for effective price
ProductSchema.virtual('effectivePrice').get(function() {
  if (!this.price.discount || !this.price.discount.validUntil || this.price.discount.validUntil < new Date()) {
    return this.price.amount;
  }
  
  if (this.price.discount.type === 'percentage') {
    return this.price.amount * (1 - this.price.discount.value / 100);
  } else {
    return this.price.amount - this.price.discount.value;
  }
});

// Virtual for availability
ProductSchema.virtual('isAvailable').get(function() {
  return this.isActive && this.stock.quantity > 0;
});

// Methods
ProductSchema.methods.incrementViews = async function() {
  this.views += 1;
  return this.save();
};

ProductSchema.methods.updateRating = async function(rating: number) {
  const newCount = this.ratings.count + 1;
  const newAverage = ((this.ratings.average * this.ratings.count) + rating) / newCount;
  
  this.ratings.average = Math.round(newAverage * 10) / 10;
  this.ratings.count = newCount;
  
  return this.save();
};

ProductSchema.methods.decrementStock = async function(quantity: number) {
  if (this.stock.quantity < quantity) {
    throw new Error('Insufficient stock');
  }
  
  this.stock.quantity -= quantity;
  this.salesCount += quantity;
  
  return this.save();
};

// Static methods
ProductSchema.statics.findByCategory = function(category: string, options: any = {}) {
  const query: any = { category, isActive: true };
  
  if (options.minPrice) query['price.amount'] = { $gte: options.minPrice };
  if (options.maxPrice) query['price.amount'] = { ...query['price.amount'], $lte: options.maxPrice };
  if (options.vendor) query.vendorId = options.vendor;
  if (options.inStock) query['stock.quantity'] = { $gt: 0 };
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

ProductSchema.statics.search = function(searchTerm: string, options: any = {}) {
  const query: any = {
    $text: { $search: searchTerm },
    isActive: true
  };
  
  if (options.type) query.type = options.type;
  if (options.category) query.category = options.category;
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

export const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
