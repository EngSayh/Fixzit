import { Schema, model, models, Document, Types } from 'mongoose';

export interface IOffer extends Document {
  orgId: string;
  applicationId: Types.ObjectId;
  jobId: Types.ObjectId;
  candidateId: Types.ObjectId;
  offerNumber: string;
  status: 'draft' | 'pending-approval' | 'approved' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'withdrawn';
  
  // Compensation
  compensation: {
    baseSalary: number;
    currency: string;
    payFrequency: 'monthly' | 'bi-weekly' | 'weekly';
    bonus?: {
      type: 'performance' | 'signing' | 'retention';
      amount: number;
      terms: string;
    };
    equity?: {
      type: 'stock-options' | 'rsu' | 'shares';
      amount: number;
      vestingSchedule: string;
    };
  };
  
  // Benefits
  benefits: string[];
  customBenefits?: Array<{
    name: string;
    description: string;
    value?: string;
  }>;
  
  // Terms
  startDate: Date;
  expiryDate: Date;
  probationPeriod?: {
    duration: number;
    unit: 'days' | 'months';
  };
  workLocation: {
    type: 'onsite' | 'remote' | 'hybrid';
    address?: string;
    remotePercentage?: number;
  };
  reportingTo?: {
    name: string;
    title: string;
  };
  
  // Documents
  offerLetterUrl?: string;
  contractUrl?: string;
  attachments: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  
  // Signatures
  signatures: {
    candidate?: {
      name: string;
      signedAt: Date;
      ipAddress: string;
    };
    approver?: {
      userId: string;
      name: string;
      title: string;
      signedAt: Date;
    };
  };
  
  // Approvals
  approvals: Array<{
    userId: string;
    name: string;
    role: string;
    status: 'pending' | 'approved' | 'rejected';
    comments?: string;
    decidedAt?: Date;
  }>;
  
  // Tracking
  viewedAt?: Date;
  sentAt?: Date;
  reminders: Array<{
    sentAt: Date;
    type: 'email' | 'sms';
  }>;
  
  // Negotiation
  negotiations: Array<{
    requestedBy: 'candidate' | 'employer';
    changes: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
  }>;
  
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  comments: String,
  decidedAt: Date
}, { _id: true });

const OfferSchema = new Schema<IOffer>({
  orgId: { 
    type: String, 
    required: true, 
    index: true 
  },
  applicationId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ATS_Application', 
    required: true, 
    index: true 
  },
  jobId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ATS_Job', 
    required: true 
  },
  candidateId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ATS_Candidate', 
    required: true 
  },
  offerNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  status: { 
    type: String, 
    enum: ['draft', 'pending-approval', 'approved', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'withdrawn'], 
    default: 'draft',
    index: true
  },
  
  compensation: {
    baseSalary: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    payFrequency: { 
      type: String, 
      enum: ['monthly', 'bi-weekly', 'weekly'], 
      default: 'monthly' 
    },
    bonus: {
      type: { type: String, enum: ['performance', 'signing', 'retention'] },
      amount: Number,
      terms: String
    },
    equity: {
      type: { type: String, enum: ['stock-options', 'rsu', 'shares'] },
      amount: Number,
      vestingSchedule: String
    }
  },
  
  benefits: [String],
  customBenefits: [{
    name: String,
    description: String,
    value: String
  }],
  
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true, index: true },
  probationPeriod: {
    duration: Number,
    unit: { type: String, enum: ['days', 'months'] }
  },
  workLocation: {
    type: { 
      type: String, 
      enum: ['onsite', 'remote', 'hybrid'], 
      required: true 
    },
    address: String,
    remotePercentage: Number
  },
  reportingTo: {
    name: String,
    title: String
  },
  
  offerLetterUrl: String,
  contractUrl: String,
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  
  signatures: {
    candidate: {
      name: String,
      signedAt: Date,
      ipAddress: String
    },
    approver: {
      userId: String,
      name: String,
      title: String,
      signedAt: Date
    }
  },
  
  approvals: [ApprovalSchema],
  
  viewedAt: Date,
  sentAt: Date,
  reminders: [{
    sentAt: Date,
    type: { type: String, enum: ['email', 'sms'] }
  }],
  
  negotiations: [{
    requestedBy: { type: String, enum: ['candidate', 'employer'] },
    changes: String,
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }],
  
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  }
}, { 
  timestamps: true,
  collection: 'ats_offers'
});

// Indexes
OfferSchema.index({ status: 1, expiryDate: 1 });
OfferSchema.index({ 'approvals.userId': 1, 'approvals.status': 1 });

// Pre-save middleware to generate offer number
OfferSchema.pre('save', async function(next) {
  if (this.isNew && !this.offerNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await models.ATS_Offer.countDocuments({
      createdAt: {
        $gte: new Date(year, date.getMonth(), 1),
        $lt: new Date(year, date.getMonth() + 1, 1)
      }
    });
    this.offerNumber = `OFF-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Methods
OfferSchema.methods.send = async function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

OfferSchema.methods.markViewed = async function() {
  if (!this.viewedAt) {
    this.viewedAt = new Date();
    this.status = 'viewed';
    return this.save();
  }
  return this;
};

OfferSchema.methods.accept = async function(candidateSignature: any) {
  this.status = 'accepted';
  this.signatures.candidate = {
    ...candidateSignature,
    signedAt: new Date()
  };
  return this.save();
};

OfferSchema.methods.decline = async function(reason?: string) {
  this.status = 'declined';
  if (reason && this.metadata) {
    this.metadata.set('declineReason', reason);
  }
  return this.save();
};

OfferSchema.methods.withdraw = async function(reason: string) {
  this.status = 'withdrawn';
  if (this.metadata) {
    this.metadata.set('withdrawalReason', reason);
  }
  return this.save();
};

OfferSchema.methods.requestApproval = async function(approvers: any[]) {
  this.status = 'pending-approval';
  this.approvals = approvers.map(a => ({
    userId: a.userId,
    name: a.name,
    role: a.role,
    status: 'pending'
  }));
  return this.save();
};

OfferSchema.methods.processApproval = async function(userId: string, decision: 'approved' | 'rejected', comments?: string) {
  const approval = this.approvals.find((a: any) => a.userId === userId);
  if (!approval) throw new Error('Approver not found');
  
  approval.status = decision;
  approval.comments = comments;
  approval.decidedAt = new Date();
  
  // Check if all approvals are complete
  const allApproved = this.approvals.every((a: any) => a.status === 'approved');
  const anyRejected = this.approvals.some((a: any) => a.status === 'rejected');
  
  if (allApproved) {
    this.status = 'approved';
  } else if (anyRejected) {
    this.status = 'draft'; // Back to draft for revision
  }
  
  return this.save();
};

// Static methods
OfferSchema.statics.findByStatus = function(orgId: string, status: string) {
  return this.find({ orgId, status })
    .populate('applicationId')
    .populate('candidateId')
    .populate('jobId')
    .sort({ createdAt: -1 });
};

OfferSchema.statics.findExpiring = function(orgId: string, days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    orgId,
    status: { $in: ['sent', 'viewed'] },
    expiryDate: {
      $gte: new Date(),
      $lte: futureDate
    }
  });
};

export const Offer = models.ATS_Offer || model<IOffer>('ATS_Offer', OfferSchema);
