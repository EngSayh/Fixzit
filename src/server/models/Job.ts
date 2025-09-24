import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
  _id: string;
  title: string;
  slug: string;
  description: string;
  requirements: string[];
  qualifications: string[];
  responsibilities: string[];
  location: {
    city: string;
    country: string;
    isRemote: boolean;
  };
  employment: {
    type: 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship';
    level: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  };
  salary: {
    min: number;
    max: number;
    currency: string;
    period: 'hourly' | 'monthly' | 'annually';
    isNegotiable: boolean;
  };
  benefits: string[];
  skills: {
    required: string[];
    preferred: string[];
  };
  department: string;
  hiringManager: string;
  status: 'draft' | 'published' | 'paused' | 'closed' | 'cancelled';
  applicationDeadline?: Date;
  startDate?: Date;
  isUrgent: boolean;
  applicationCount: number;
  viewCount: number;
  externalPostings: Array<{
    platform: 'linkedin' | 'indeed' | 'glassdoor' | 'custom';
    url: string;
    postedAt: Date;
    isActive: boolean;
  }>;
  createdBy: string;
  publishedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true, trim: true },
    requirements: [{ type: String, trim: true }],
    qualifications: [{ type: String, trim: true }],
    responsibilities: [{ type: String, trim: true }],
    location: {
      city: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true, default: 'Saudi Arabia' },
      isRemote: { type: Boolean, default: false }
    },
    employment: {
      type: { 
        type: String, 
        enum: ['full_time', 'part_time', 'contract', 'freelance', 'internship'],
        required: true,
        default: 'full_time'
      },
      level: { 
        type: String, 
        enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
        required: true,
        default: 'mid'
      }
    },
    salary: {
      min: { type: Number, required: true, min: 0 },
      max: { type: Number, required: true, min: 0 },
      currency: { type: String, required: true, default: 'SAR' },
      period: { 
        type: String, 
        enum: ['hourly', 'monthly', 'annually'],
        required: true,
        default: 'monthly'
      },
      isNegotiable: { type: Boolean, default: false }
    },
    benefits: [{ type: String, trim: true }],
    skills: {
      required: [{ type: String, trim: true }],
      preferred: [{ type: String, trim: true }]
    },
    department: { type: String, required: true, trim: true },
    hiringManager: { type: String, required: true, trim: true },
    status: { 
      type: String, 
      enum: ['draft', 'published', 'paused', 'closed', 'cancelled'],
      default: 'draft'
    },
    applicationDeadline: { type: Date },
    startDate: { type: Date },
    isUrgent: { type: Boolean, default: false },
    applicationCount: { type: Number, default: 0, min: 0 },
    viewCount: { type: Number, default: 0, min: 0 },
    externalPostings: [{
      platform: { 
        type: String, 
        enum: ['linkedin', 'indeed', 'glassdoor', 'custom'],
        required: true
      },
      url: { type: String, required: true, trim: true },
      postedAt: { type: Date, default: Date.now },
      isActive: { type: Boolean, default: true }
    }],
    createdBy: { type: String, required: true, trim: true },
    publishedAt: { type: Date },
    closedAt: { type: Date }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Validate salary range
JobSchema.pre('save', function(next) {
  if (this.salary.max < this.salary.min) {
    next(new Error('Maximum salary must be greater than or equal to minimum salary'));
  }
  next();
});

// Add indexes for performance
JobSchema.index({ slug: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ department: 1 });
JobSchema.index({ 'location.city': 1 });
JobSchema.index({ 'employment.type': 1 });
JobSchema.index({ 'employment.level': 1 });
JobSchema.index({ publishedAt: -1 });
JobSchema.index({ applicationDeadline: 1 });

export const Job = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);