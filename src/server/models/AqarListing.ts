import { Schema, model, models, Types } from 'mongoose';

const MediaSchema = new Schema({
  url: { type: String, required: true },
  alt: String,
  type: { type: String, enum: ['image', 'video'], default: 'image' },
  isCover: { type: Boolean, default: false }
}, { _id: false });

const LocationSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: String,
  city: { type: String, required: true, index: true },
  district: { type: String, required: true, index: true },
  neighborhood: String,
  postalCode: String
}, { _id: false });

const ContactSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  whatsapp: String,
  email: String,
  company: String,
  licenseNumber: String,
  isVerified: { type: Boolean, default: false }
}, { _id: false });

const AqarListingSchema = new Schema({
  // Tenant isolation
  tenantId: { type: String, required: true, index: true },
  
  // Reference to existing Property (no duplication)
  propertyId: { type: Types.ObjectId, ref: 'Property', required: true, index: true },
  
  // Listing specific data
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  
  // Transaction type
  purpose: { 
    type: String, 
    enum: ['sale', 'rent', 'daily'], 
    required: true, 
    index: true 
  },
  
  // Property type
  propertyType: { 
    type: String, 
    enum: ['apartment', 'villa', 'land', 'office', 'shop', 'building', 'floor', 'room', 'farm', 'chalet', 'warehouse'],
    required: true,
    index: true
  },
  
  // Pricing
  price: { 
    amount: { type: Number, required: true, index: true },
    currency: { type: String, default: 'SAR' },
    period: { type: String, enum: ['total', 'monthly', 'yearly', 'daily'], default: 'total' }
  },
  
  // Property specifications
  specifications: {
    area: { type: Number, required: true, index: true }, // in sqm
    bedrooms: { type: Number, index: true },
    bathrooms: { type: Number, index: true },
    livingRooms: { type: Number, default: 0 },
    floors: { type: Number, default: 1 },
    age: { type: String, default: 'new' }, // new, 1-5 years, 5-10 years, etc.
    furnished: { type: Boolean, default: false, index: true },
    parking: { type: Number, default: 0 },
    balcony: { type: Boolean, default: false },
    garden: { type: Boolean, default: false },
    pool: { type: Boolean, default: false },
    gym: { type: Boolean, default: false },
    security: { type: Boolean, default: false },
    elevator: { type: Boolean, default: false },
    maidRoom: { type: Boolean, default: false }
  },
  
  // Location
  location: LocationSchema,
  
  // Media
  media: [MediaSchema],
  
  // Contact information
  contact: ContactSchema,
  
  // Listing status
  status: { 
    type: String, 
    enum: ['draft', 'pending', 'active', 'sold', 'rented', 'expired', 'rejected'], 
    default: 'draft',
    index: true
  },
  
  // Verification
  isVerified: { type: Boolean, default: false, index: true },
  isFeatured: { type: Boolean, default: false, index: true },
  isPremium: { type: Boolean, default: false, index: true },
  
  // License information (REGA compliance)
  license: {
    number: String,
    expiryDate: Date,
    source: { type: String, default: 'REGA' },
    isValid: { type: Boolean, default: false }
  },
  
  // Analytics
  views: { type: Number, default: 0 },
  favorites: { type: Number, default: 0 },
  inquiries: { type: Number, default: 0 },
  
  // SEO and search
  keywords: [String],
  tags: [String],
  
  // Dates
  publishedAt: { type: Date, index: true },
  expiresAt: { type: Date, index: true },
  
  // Audit
  createdBy: { type: String, required: true },
  updatedBy: String,
  approvedBy: String,
  approvedAt: Date
}, {
  timestamps: true
});

// Indexes for performance
AqarListingSchema.index({ tenantId: 1, status: 1 });
AqarListingSchema.index({ tenantId: 1, purpose: 1, propertyType: 1 });
AqarListingSchema.index({ tenantId: 1, 'location.city': 1, 'location.district': 1 });
AqarListingSchema.index({ 'location.lat': 1, 'location.lng': 1 });
AqarListingSchema.index({ price: 1, specifications: 1 });
AqarListingSchema.index({ publishedAt: -1 });
AqarListingSchema.index({ isVerified: 1, isFeatured: 1 });
AqarListingSchema.index({ title: 'text', description: 'text', keywords: 'text' });

// Pre-save middleware to generate slug
AqarListingSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
    this.slug = `${baseSlug}-${Date.now()}`;
  }
  next();
});

export type AqarListingDoc = {
  _id: Types.ObjectId;
  tenantId: string;
  propertyId: Types.ObjectId;
  title: string;
  description: string;
  slug: string;
  purpose: 'sale' | 'rent' | 'daily';
  propertyType: string;
  price: {
    amount: number;
    currency: string;
    period: string;
  };
  specifications: {
    area: number;
    bedrooms?: number;
    bathrooms?: number;
    livingRooms?: number;
    floors?: number;
    age?: string;
    furnished: boolean;
    parking?: number;
    balcony?: boolean;
    garden?: boolean;
    pool?: boolean;
    gym?: boolean;
    security?: boolean;
    elevator?: boolean;
    maidRoom?: boolean;
  };
  location: {
    lat: number;
    lng: number;
    address?: string;
    city: string;
    district: string;
    neighborhood?: string;
    postalCode?: string;
  };
  media: Array<{
    url: string;
    alt?: string;
    type: 'image' | 'video';
    isCover: boolean;
  }>;
  contact: {
    name: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    company?: string;
    licenseNumber?: string;
    isVerified: boolean;
  };
  status: 'draft' | 'pending' | 'active' | 'sold' | 'rented' | 'expired' | 'rejected';
  isVerified: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  license: {
    number?: string;
    expiryDate?: Date;
    source: string;
    isValid: boolean;
  };
  views: number;
  favorites: number;
  inquiries: number;
  keywords: string[];
  tags: string[];
  publishedAt?: Date;
  expiresAt?: Date;
  createdBy: string;
  updatedBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const AqarListing = models.AqarListing || model<AqarListingDoc>('AqarListing', AqarListingSchema);