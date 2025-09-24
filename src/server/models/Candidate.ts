import { Schema, model, models, Document, Model } from 'mongoose';

export interface ICandidate extends Document {
  orgId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location?: string;
  linkedin?: string;
  portfolio?: string;
  github?: string;
  website?: string;
  skills: string[];
  experience: number; // years
  currentPosition?: string;
  currentCompany?: string;
  expectedSalary?: {
    min: number;
    max: number;
    currency: string;
  };
  noticePeriod?: string;
  resumeUrl?: string;
  resumeText?: string; // Parsed resume text for searching
  source: string;
  tags: string[];
  notes?: string;
  consents: {
    privacy: boolean;
    contact: boolean;
    dataRetention: boolean;
  };
  gdprDeleteAt?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema = new Schema<ICandidate>({
  orgId: {
    type: String,
    required: true,
    index: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  location: String,
  linkedin: String,
  portfolio: String,
  github: String,
  website: String,
  skills: [{
    type: String,
    index: true
  }],
  experience: {
    type: Number,
    default: 0
  },
  currentPosition: String,
  currentCompany: String,
  expectedSalary: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'SAR' }
  },
  noticePeriod: String,
  resumeUrl: String,
  resumeText: String,
  source: {
    type: String,
    default: 'careers',
    index: true
  },
  tags: [String],
  notes: String,
  consents: {
    privacy: { type: Boolean, default: false },
    contact: { type: Boolean, default: false },
    dataRetention: { type: Boolean, default: false }
  },
  gdprDeleteAt: Date,
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
  collection: 'ats_candidates'
});

// Indexes
CandidateSchema.index({ orgId: 1, email: 1 }, { unique: true });
CandidateSchema.index({ firstName: 'text', lastName: 'text', skills: 'text', resumeText: 'text' });
CandidateSchema.index({ createdAt: -1 });
CandidateSchema.index({ gdprDeleteAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for full name
CandidateSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Methods
CandidateSchema.methods.anonymize = async function() {
  this.firstName = 'ANONYMIZED';
  this.lastName = 'ANONYMIZED';
  this.email = `anonymized-${this._id}@fixzit.com`;
  this.phone = 'ANONYMIZED';
  this.linkedin = undefined;
  this.portfolio = undefined;
  this.github = undefined;
  this.website = undefined;
  this.resumeUrl = undefined;
  this.resumeText = undefined;
  this.isActive = false;
  
  return this.save();
};

CandidateSchema.methods.updateConsent = async function(consents: Partial<ICandidate['consents']>) {
  Object.assign(this.consents, consents);
  
  // If data retention consent is revoked, set deletion date
  if (consents.dataRetention === false) {
    this.gdprDeleteAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  
  return this.save();
};

// Static methods
CandidateSchema.statics.findByEmail = function(orgId: string, email: string) {
  return this.findOne({ orgId, email: email.toLowerCase().trim() });
};

CandidateSchema.statics.findOrCreate = async function(this: any, orgId: string, candidateData: Partial<ICandidate>) {
  const email = candidateData.email?.toLowerCase().trim();
  if (!email) throw new Error('Email is required');
  
  let candidate = await this.findOne({ orgId, email });
  
  if (!candidate) {
    candidate = await this.create({ orgId, ...candidateData });
  } else {
    // Update existing candidate with new information
    Object.assign(candidate, candidateData);
    await candidate.save();
  }
  
  return candidate;
};

CandidateSchema.statics.search = function(orgId: string, searchTerm: string, options: any = {}) {
  const query: any = {
    orgId,
    isActive: true,
    $text: { $search: searchTerm }
  };
  
  if (options.skills?.length > 0) {
    query.skills = { $in: options.skills };
  }
  
  if (options.minExperience) {
    query.experience = { $gte: options.minExperience };
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 50);
};

interface CandidateModel extends Model<ICandidate> {
  findByEmail(orgId: string, email: string): Promise<ICandidate | null>;
  findOrCreate(orgId: string, candidateData: Partial<ICandidate>): Promise<ICandidate>;
  search(orgId: string, searchTerm: string, options?: any): Promise<ICandidate[]>;
}

export const Candidate = (models.ATS_Candidate as unknown as CandidateModel) || model<ICandidate, CandidateModel>('ATS_Candidate', CandidateSchema);
