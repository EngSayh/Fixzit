/**
 * @fileoverview Organization Schema - Core organizational entity
 * @module modules/organizations/schema
 */

import mongoose, { Schema, Document } from 'mongoose'
import { getModel, MModel } from '@/src/types/mongoose-compat';;

export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  nameAr?: string;
  subscriptionPlan: 'Standard' | 'Premium' | 'Enterprise';
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  logoUrl?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  billingEmail?: string;
  taxId?: string;
  settings?: {
    timezone?: string;
    language?: string;
    currency?: string;
  };
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>({
  name: { 
    type: String, 
    required: [true, 'Organization name is required'],
    trim: true,
    minlength: [2, 'Organization name must be at least 2 characters'],
    maxlength: [100, 'Organization name cannot exceed 100 characters']
  },
  nameAr: { 
    type: String,
    trim: true,
    maxlength: [100, 'Arabic name cannot exceed 100 characters']
  },
  subscriptionPlan: { 
    type: String, 
    enum: ['Standard', 'Premium', 'Enterprise'],
    default: 'Standard',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'trial'],
    default: 'active',
    required: true
  },
  logoUrl: String,
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  website: { type: String, trim: true },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true }
  },
  billingEmail: { type: String, trim: true, lowercase: true },
  taxId: { type: String, trim: true },
  settings: {
    timezone: { type: String, default: 'Asia/Riyadh' },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'SAR' }
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { 
  timestamps: true,
  collection: 'organizations'
});

OrganizationSchema.index({ name: 1 }, { unique: true });
OrganizationSchema.index({ subscriptionPlan: 1, status: 1 });

export default getModel<IOrganization>('Organization', OrganizationSchema);
