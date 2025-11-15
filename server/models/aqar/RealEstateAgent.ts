import { Schema, model, models, Types } from 'mongoose'
import { getModel, MModel } from '@/src/types/mongoose-compat';;

export type AgentStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type AgentTier = 'BASIC' | 'PREMIUM' | 'ELITE';

export interface AgentLicense {
  number: string;
  authority: string; // RERA, DLD, etc.
  issueDate: Date;
  expiryDate: Date;
  verified: boolean;
}

export interface AgentStatistics {
  totalListings: number;
  activeListings: number;
  soldProperties: number;
  rentedProperties: number;
  totalSalesValue: number;
  averageRating: number;
  totalReviews: number;
  responseTime: number; // in minutes
  viewingCompletionRate: number; // percentage
}

export interface AgentContact {
  phone: string;
  whatsapp?: string;
  email: string;
  website?: string;
  officeAddress?: string;
  socialMedia?: {
    linkedin?: string;
    instagram?: string;
    twitter?: string;
  };
}

export interface RealEstateAgent {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // Link to User account
  orgId: Types.ObjectId; // Real estate company/organization
  
  // Personal Info
  firstName: string;
  lastName: string;
  displayName?: string;
  photo?: string;
  bio: {
    en?: string;
    ar?: string;
  };
  
  // Professional Info
  license: AgentLicense;
  specializations: string[]; // residential, commercial, luxury, investment
  languages: string[]; // English, Arabic, Urdu, etc.
  experience: number; // years
  
  // Contact
  contact: AgentContact;
  
  // Performance
  statistics: AgentStatistics;
  tier: AgentTier;
  verified: boolean;
  featured: boolean;
  
  // Availability
  workingHours?: {
    [key: string]: { // monday, tuesday, etc.
      start: string; // "09:00"
      end: string; // "18:00"
      available: boolean;
    };
  };
  
  // Settings
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  
  status: AgentStatus;
  joinedAt: Date;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RealEstateAgentSchema = new Schema<RealEstateAgent>(
  {
    // ⚡ FIXED: Remove global unique: true - will be enforced via compound index with orgId
    // Note: index: true removed from userId and orgId to avoid duplicate index warnings
    // These fields are indexed via composite indexes below (orgId+userId, orgId+status, etc.)
    userId: { type: Schema.Types.ObjectId, required: true },
    orgId: { type: Schema.Types.ObjectId, required: true },
    
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true },
    photo: String,
    bio: {
      en: String,
      ar: String
    },
    
    license: {
      // ⚡ FIXED: Remove global unique: true - will be enforced via compound index with orgId
      number: { type: String, required: true },
      authority: { type: String, required: true },
      issueDate: { type: Date, required: true },
      expiryDate: { type: Date, required: true },
      verified: { type: Boolean, default: false }
    },
    specializations: [{ type: String }],
    languages: [{ type: String }],
    experience: { type: Number, default: 0 },
    
    contact: {
      phone: { type: String, required: true },
      whatsapp: String,
      email: { type: String, required: true },
      website: String,
      officeAddress: String,
      socialMedia: {
        linkedin: String,
        instagram: String,
        twitter: String
      }
    },
    
    statistics: {
      totalListings: { type: Number, default: 0 },
      activeListings: { type: Number, default: 0 },
      soldProperties: { type: Number, default: 0 },
      rentedProperties: { type: Number, default: 0 },
      totalSalesValue: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      responseTime: { type: Number, default: 0 },
      viewingCompletionRate: { type: Number, default: 0 }
    },
    
    tier: {
      type: String,
      enum: ['BASIC', 'PREMIUM', 'ELITE'],
      default: 'BASIC',
      index: true
    },
    verified: { type: Boolean, default: false, index: true },
    featured: { type: Boolean, default: false, index: true },
    
    workingHours: Schema.Types.Mixed,
    
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true }
    },
    
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true
    },
    joinedAt: { type: Date, default: Date.now },
    lastActiveAt: Date
  },
  {
    timestamps: true,
    collection: 'aqar_agents'
  }
);

// Indexes
RealEstateAgentSchema.index({ orgId: 1, status: 1 });
RealEstateAgentSchema.index({ verified: 1, featured: 1 });
RealEstateAgentSchema.index({ 'statistics.averageRating': -1 });
RealEstateAgentSchema.index({ tier: 1, 'statistics.totalListings': -1 });
// ⚡ FIXED: Add compound tenant-scoped unique indexes
RealEstateAgentSchema.index({ orgId: 1, userId: 1 }, { unique: true });
RealEstateAgentSchema.index({ orgId: 1, 'license.number': 1 }, { unique: true });

// ⚡ FIXED: Add orgId prefix to text search for tenant isolation
RealEstateAgentSchema.index({
  orgId: 1,
  firstName: 'text',
  lastName: 'text',
  displayName: 'text',
  'bio.en': 'text',
  'bio.ar': 'text'
});

const RealEstateAgentModel = getModel<RealEstateAgent>('RealEstateAgent', RealEstateAgentSchema);

export default RealEstateAgentModel;
