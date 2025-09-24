// src/server/models/Listing.ts - Property & Material listings with KSA compliance
import { Schema, model, models } from 'mongoose';

const ListingSchema = new Schema({
  // Basic Info
  type: {
    type: String,
    enum: ['property', 'material'],
    required: true,
    index: true
  },
  
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'active', 'sold', 'expired', 'suspended'],
    default: 'draft',
    index: true
  },

  // Organization
  tenantId: { type: String, required: true, index: true },
  orgId: { type: String, required: true, index: true },
  
  // Listing Details
  title: { type: String, required: true },
  titleAr: { type: String }, // Arabic title
  description: { type: String, required: true },
  descriptionAr: { type: String }, // Arabic description
  
  // Pricing
  price: { type: Number, required: true },
  currency: { type: String, default: 'SAR' },
  priceType: { type: String, enum: ['fixed', 'negotiable', 'auction'], default: 'fixed' },
  
  // Property-specific fields
  property: {
    category: { type: String, enum: ['residential', 'commercial', 'industrial', 'agricultural'] },
    subcategory: { type: String }, // apartment, villa, office, warehouse, etc.
    purpose: { type: String, enum: ['sale', 'rent', 'lease'] },
    
    // Size & Features
    area: { type: Number }, // Square meters
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    parkingSpaces: { type: Number },
    furnished: { type: Boolean },
    yearBuilt: { type: Number },
    
    // Location with National Address
    location: {
      city: { type: String, required: true },
      district: { type: String, required: true },
      street: { type: String },
      
      // KSA National Address fields
      nationalAddress: {
        buildingNumber: { type: String, length: 4 },
        streetName: { type: String },
        district: { type: String },
        city: { type: String },
        postalCode: { type: String, length: 5 },
        additionalNumber: { type: String, length: 4 },
        unitNumber: { type: String },
        addressId: { type: String } // SPL UUID
      },
      
      // Coordinates (generalized for public view)
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
        accuracy: { type: String, enum: ['exact', 'street', 'district'], default: 'district' }
      }
    },
    
    // Legal & Compliance
    ownership: {
      type: { type: String, enum: ['freehold', 'leasehold'] },
      deedNumber: { type: String },
      deedDate: { type: Date }
    },
    
    // Ejar Integration
    ejar: {
      eligible: { type: Boolean, default: true },
      contractNumber: { type: String },
      verified: { type: Boolean, default: false }
    }
  },
  
  // Material-specific fields
  material: {
    category: { type: String }, // cement, steel, electrical, plumbing, etc.
    brand: { type: String },
    model: { type: String },
    specifications: { type: Schema.Types.Mixed },
    
    // Inventory
    quantity: { type: Number },
    unit: { type: String }, // pieces, kg, meters, etc.
    minOrder: { type: Number, default: 1 },
    
    // Delivery
    deliveryOptions: [{
      method: { type: String },
      cost: { type: Number },
      timeframe: { type: String }
    }],
    
    // Compliance
    certifications: [{
      type: { type: String },
      number: { type: String },
      issuedBy: { type: String },
      validUntil: { type: Date }
    }]
  },
  
  // Seller Information
  seller: {
    userId: { type: String, required: true },
    type: { type: String, enum: ['owner', 'agent', 'broker', 'vendor'], required: true },
    name: { type: String, required: true },
    
    // Contact (masked for public)
    contact: {
      phone: { type: String },
      phoneMasked: { type: String }, // e.g., +966 5XX XXX 123
      email: { type: String },
      emailMasked: { type: String }, // e.g., a***@example.com
      whatsapp: { type: Boolean }
    },
    
    // Verification
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    
    // REGA FAL License (for brokers/agents)
    falLicense: {
      required: { type: Boolean, default: false },
      number: { type: String },
      holder: { type: String },
      expiresAt: { type: Date },
      valid: { type: Boolean, default: false },
      verifiedAt: { type: Date }
    },
    
    // Company info (if applicable)
    company: {
      name: { type: String },
      crNumber: { type: String }, // Commercial Registration
      vatNumber: { type: String }
    }
  },
  
  // Media
  media: {
    images: [{
      url: { type: String },
      thumbnailUrl: { type: String },
      watermarked: { type: Boolean, default: true },
      caption: { type: String },
      order: { type: Number }
    }],
    
    videos: [{
      url: { type: String },
      thumbnailUrl: { type: String },
      duration: { type: Number },
      caption: { type: String }
    }],
    
    virtualTour: {
      url: { type: String },
      provider: { type: String }
    },
    
    documents: [{
      type: { type: String }, // floor_plan, deed, certificate, etc.
      url: { type: String },
      verified: { type: Boolean, default: false }
    }]
  },
  
  // Verification & Trust
  verification: {
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    
    // Document verification
    documentsVerified: { type: Boolean, default: false },
    documentsVerifiedAt: { type: Date },
    documentsVerifiedBy: { type: String },
    
    // Physical verification (TruCheck style)
    physicallyVerified: { type: Boolean, default: false },
    physicallyVerifiedAt: { type: Date },
    physicallyVerifiedBy: { type: String },
    
    // Address verification (National Address)
    addressVerified: { type: Boolean, default: false },
    addressVerifiedAt: { type: Date },
    
    // Risk assessment
    riskScore: { type: Number, default: 0 },
    riskFlags: [{ type: String }],
    requiresReview: { type: Boolean, default: false }
  },
  
  // Visibility & Access
  visibility: {
    public: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    boost: {
      active: { type: Boolean, default: false },
      until: { type: Date }
    }
  },
  
  // Guest browsing controls
  guestAccess: {
    allowBrowse: { type: Boolean, default: true },
    showPrice: { type: Boolean, default: true },
    showLocation: { type: String, enum: ['exact', 'district', 'city'], default: 'district' },
    requireAuthFor: {
      contact: { type: Boolean, default: true },
      exactLocation: { type: Boolean, default: true },
      documents: { type: Boolean, default: true },
      makeOffer: { type: Boolean, default: true }
    }
  },
  
  // Engagement metrics
  stats: {
    views: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    offers: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 }
  },
  
  // SEO & Marketing
  seo: {
    slug: { type: String, unique: true },
    metaTitle: { type: String },
    metaDescription: { type: String },
    keywords: [{ type: String }]
  },
  
  // Fraud prevention
  security: {
    duplicateHash: { type: String, index: true }, // Perceptual hash of images + title
    reportCount: { type: Number, default: 0 },
    reports: [{
      userId: { type: String },
      reason: { type: String },
      details: { type: String },
      createdAt: { type: Date, default: Date.now }
    }]
  },
  
  // Timestamps
  publishedAt: { type: Date },
  expiresAt: { type: Date },
  soldAt: { type: Date },
  
  // Audit
  createdBy: { type: String, required: true },
  updatedBy: { type: String },
  deletedAt: { type: Date },
  deletedBy: { type: String }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ListingSchema.index({ type: 1, status: 1, tenantId: 1 });
ListingSchema.index({ 'property.location.city': 1, 'property.purpose': 1 });
ListingSchema.index({ 'material.category': 1, status: 1 });
ListingSchema.index({ 'seller.userId': 1, status: 1 });
ListingSchema.index({ publishedAt: -1 });
// security.duplicateHash already declared as { index: true } on path; avoid duplicate index warnings

// Virtual for public URL
ListingSchema.virtual('publicUrl').get(function() {
  if (this.type === 'property') {
    return `/marketplace/properties/${this._id}`;
  }
  return `/marketplace/materials/${this._id}`;
});

// Method to mask sensitive data for public view
ListingSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  
  // Mask seller contact
  if (obj.seller?.contact) {
    obj.seller.contact = {
      phoneMasked: obj.seller.contact.phoneMasked,
      emailMasked: obj.seller.contact.emailMasked,
      whatsapp: obj.seller.contact.whatsapp
    };
  }
  
  // Generalize location for guests
  if (obj.property?.location?.coordinates) {
    if (obj.guestAccess?.showLocation === 'district') {
      // Round coordinates to district level
      obj.property.location.coordinates.lat = Math.round(obj.property.location.coordinates.lat * 100) / 100;
      obj.property.location.coordinates.lng = Math.round(obj.property.location.coordinates.lng * 100) / 100;
    }
  }
  
  // Remove sensitive fields
  delete obj.seller.falLicense?.number;
  delete obj.property?.ownership?.deedNumber;
  delete obj.security;
  
  return obj;
};

// Static method to check duplicate
ListingSchema.statics.checkDuplicate = async function(title: string, images: string[]) {
  // In production, use perceptual hashing for images
  const hash = require('crypto').createHash('md5').update(title.toLowerCase()).digest('hex');
  
  const duplicate = await this.findOne({
    'security.duplicateHash': hash,
    status: { $in: ['active', 'pending_review'] }
  });
  
  return duplicate;
};

export default models.Listing || model('Listing', ListingSchema);
