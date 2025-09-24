import { Schema, model, models, Types } from 'mongoose';

const AqarLeadSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  listingId: { type: Types.ObjectId, ref: 'AqarListing', required: true, index: true },
  propertyId: { type: Types.ObjectId, ref: 'Property', required: true, index: true },
  
  // Lead information
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  whatsapp: String,
  
  // Lead details
  message: String,
  budget: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'SAR' }
  },
  
  // Lead source and tracking
  source: { 
    type: String, 
    enum: ['marketplace', 'direct', 'referral', 'social', 'advertisement'],
    default: 'marketplace'
  },
  utmSource: String,
  utmMedium: String,
  utmCampaign: String,
  
  // Lead status and assignment
  status: { 
    type: String, 
    enum: ['new', 'contacted', 'qualified', 'interested', 'not_interested', 'converted', 'closed'],
    default: 'new',
    index: true
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Assignment
  assignedTo: { type: String, index: true }, // User ID
  assignedAt: Date,
  
  // Follow-up
  lastContact: Date,
  nextFollowUp: Date,
  notes: [{
    text: String,
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Conversion tracking
  convertedTo: {
    type: { type: String, enum: ['sale', 'rental'] },
    amount: Number,
    currency: String,
    date: Date,
    commission: Number
  },
  
  // Communication history
  communications: [{
    type: { type: String, enum: ['call', 'email', 'whatsapp', 'meeting', 'other'] },
    direction: { type: String, enum: ['inbound', 'outbound'] },
    content: String,
    timestamp: { type: Date, default: Date.now },
    createdBy: String
  }],
  
  // Metadata
  tags: [String],
  customFields: Schema.Types.Mixed,
  
  createdBy: { type: String, required: true },
  updatedBy: String
}, {
  timestamps: true
});

// Indexes
AqarLeadSchema.index({ tenantId: 1, status: 1 });
AqarLeadSchema.index({ tenantId: 1, assignedTo: 1 });
AqarLeadSchema.index({ listingId: 1, status: 1 });
AqarLeadSchema.index({ phone: 1, email: 1 });
AqarLeadSchema.index({ createdAt: -1 });

export type AqarLeadDoc = {
  _id: Types.ObjectId;
  tenantId: string;
  listingId: Types.ObjectId;
  propertyId: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  message?: string;
  budget?: {
    min?: number;
    max?: number;
    currency: string;
  };
  source: 'marketplace' | 'direct' | 'referral' | 'social' | 'advertisement';
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  status: 'new' | 'contacted' | 'qualified' | 'interested' | 'not_interested' | 'converted' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  assignedAt?: Date;
  lastContact?: Date;
  nextFollowUp?: Date;
  notes: Array<{
    text: string;
    createdBy: string;
    createdAt: Date;
  }>;
  convertedTo?: {
    type: 'sale' | 'rental';
    amount: number;
    currency: string;
    date: Date;
    commission: number;
  };
  communications: Array<{
    type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'other';
    direction: 'inbound' | 'outbound';
    content: string;
    timestamp: Date;
    createdBy: string;
  }>;
  tags: string[];
  customFields?: any;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

export const AqarLead = models.AqarLead || model<AqarLeadDoc>('AqarLead', AqarLeadSchema);