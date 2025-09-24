import { Schema, model, models, Document } from 'mongoose';

export interface IJob extends Document {
  orgId: string;
  title: string;
  titleAr?: string;
  department: string;
  jobType: 'full-time' | 'part-time' | 'contract' | 'internship';
  location: {
    city: string;
    country: string;
    mode: 'onsite' | 'hybrid' | 'remote';
  };
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  description: string;
  descriptionAr?: string;
  requirements: string[];
  benefits: string[];
  skills: string[];
  tags: string[];
  status: 'draft' | 'pending' | 'published' | 'closed';
  visibility: 'public' | 'internal';
  approvals: Array<{
    userId: string;
    at: Date;
  }>;
  slug: string;
  publishedAt?: Date;
  postedBy: string;
  screeningRules?: {
    minYears?: number;
    requiredSkills?: string[];
    autoRejectIfMissingSkills?: boolean;
  };
  experience: string;
  urgent?: boolean;
  featured?: boolean;
  viewCount: number;
  applicationCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>({
  orgId: { 
    type: String, 
    index: true, 
    required: true,
    default: 'fixzit-platform'
  },
  title: { 
    type: String, 
    required: true 
  },
  titleAr: String,
  department: {
    type: String,
    required: true
  },
  jobType: { 
    type: String, 
    enum: ['full-time', 'part-time', 'contract', 'internship'], 
    default: 'full-time' 
  },
  location: {
    city: { type: String, required: true },
    country: { type: String, required: true },
    mode: { 
      type: String, 
      enum: ['onsite', 'hybrid', 'remote'], 
      default: 'onsite' 
    }
  },
  salaryRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' }
  },
  description: { 
    type: String, 
    required: true 
  },
  descriptionAr: String,
  requirements: [{
    type: String
  }],
  benefits: [{
    type: String
  }],
  skills: [{
    type: String,
    index: true
  }],
  tags: [{
    type: String,
    index: true
  }],
  status: { 
    type: String, 
    enum: ['draft', 'pending', 'published', 'closed'], 
    default: 'draft', 
    index: true 
  },
  visibility: { 
    type: String, 
    enum: ['public', 'internal'], 
    default: 'public' 
  },
  approvals: [{
    userId: String,
    at: { type: Date, default: Date.now }
  }],
  slug: { 
    type: String, 
    index: true, 
    unique: false // unique per org
  },
  publishedAt: Date,
  postedBy: {
    type: String,
    required: true
  },
  screeningRules: {
    minYears: { type: Number, default: 0 },
    requiredSkills: [String],
    autoRejectIfMissingSkills: { type: Boolean, default: false }
  },
  experience: {
    type: String,
    default: '0-2 years'
  },
  urgent: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  }
}, { 
  timestamps: true,
  collection: 'ats_jobs'
});

// Indexes
JobSchema.index({ orgId: 1, slug: 1 }, { unique: true });
JobSchema.index({ title: 'text', department: 'text', description: 'text', skills: 'text' });
JobSchema.index({ status: 1, visibility: 1, publishedAt: -1 });
JobSchema.index({ 'location.city': 1, 'location.country': 1 });

// Virtual for effective status
JobSchema.virtual('isActive').get(function() {
  return this.status === 'published' && this.visibility === 'public';
});

// Methods
JobSchema.methods.publish = async function() {
  this.status = 'published';
  this.publishedAt = new Date();
  return this.save();
};

JobSchema.methods.close = async function() {
  this.status = 'closed';
  return this.save();
};

JobSchema.methods.incrementViews = async function() {
  this.viewCount += 1;
  return this.save();
};

// Static methods
JobSchema.statics.findPublished = function(orgId?: string) {
  const query: any = { 
    status: 'published', 
    visibility: 'public' 
  };
  if (orgId) query.orgId = orgId;
  
  return this.find(query).sort({ publishedAt: -1 });
};

JobSchema.statics.findBySlug = function(orgId: string, slug: string) {
  return this.findOne({ orgId, slug });
};

JobSchema.statics.search = function(searchTerm: string, options: any = {}) {
  const query: any = {
    $text: { $search: searchTerm },
    status: 'published',
    visibility: 'public'
  };
  
  if (options.location) query['location.city'] = options.location;
  if (options.department) query.department = options.department;
  if (options.jobType) query.jobType = options.jobType;
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 50);
};

export const Job = models.ATS_Job || model<IJob>('ATS_Job', JobSchema);
