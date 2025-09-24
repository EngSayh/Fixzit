import { Schema, model, models, Types } from 'mongoose';

const AqarSavedSearchSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  
  name: { type: String, required: true },
  description: String,
  
  // Search criteria
  criteria: {
    purpose: { type: String, enum: ['sale', 'rent', 'daily'] },
    propertyType: [String],
    city: String,
    district: String,
    minPrice: Number,
    maxPrice: Number,
    minArea: Number,
    maxArea: Number,
    bedrooms: Number,
    bathrooms: Number,
    furnished: Boolean,
    features: [String], // pool, gym, security, etc.
    keywords: [String]
  },
  
  // Notification settings
  notifications: {
    enabled: { type: Boolean, default: true },
    frequency: { 
      type: String, 
      enum: ['instant', 'daily', 'weekly'], 
      default: 'daily' 
    },
    channels: [{ 
      type: String, 
      enum: ['email', 'sms', 'push', 'whatsapp'] 
    }],
    lastNotified: Date
  },
  
  // Analytics
  totalMatches: { type: Number, default: 0 },
  newMatches: { type: Number, default: 0 },
  lastRun: Date,
  
  // Status
  isActive: { type: Boolean, default: true },
  
  createdBy: { type: String, required: true },
  updatedBy: String
}, {
  timestamps: true
});

// Indexes
AqarSavedSearchSchema.index({ tenantId: 1, userId: 1 });
AqarSavedSearchSchema.index({ tenantId: 1, 'notifications.enabled': 1 });
AqarSavedSearchSchema.index({ 'notifications.lastNotified': 1 });

export type AqarSavedSearchDoc = {
  _id: Types.ObjectId;
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  criteria: {
    purpose?: 'sale' | 'rent' | 'daily';
    propertyType?: string[];
    city?: string;
    district?: string;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
    bedrooms?: number;
    bathrooms?: number;
    furnished?: boolean;
    features?: string[];
    keywords?: string[];
  };
  notifications: {
    enabled: boolean;
    frequency: 'instant' | 'daily' | 'weekly';
    channels: string[];
    lastNotified?: Date;
  };
  totalMatches: number;
  newMatches: number;
  lastRun?: Date;
  isActive: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

export const AqarSavedSearch = models.AqarSavedSearch || model<AqarSavedSearchDoc>('AqarSavedSearch', AqarSavedSearchSchema);