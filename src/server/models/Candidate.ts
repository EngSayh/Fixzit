import mongoose, { Document, Schema } from 'mongoose';

export interface ICandidate extends Document {
  _id: string;
  email: string;
  name: string;
  phone?: string;
  resume?: {
    url: string;
    filename: string;
    uploadedAt: Date;
  };
  linkedinProfile?: string;
  skills: string[];
  experience: {
    years: number;
    description: string;
  };
  education: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  location: {
    city: string;
    country: string;
  };
  availability: 'immediate' | 'within_2_weeks' | 'within_month' | 'negotiable';
  status: 'active' | 'inactive' | 'hired' | 'blacklisted';
  source: 'direct' | 'linkedin' | 'referral' | 'agency' | 'other';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema = new Schema<ICandidate>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    resume: {
      url: { type: String },
      filename: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    },
    linkedinProfile: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    experience: {
      years: { type: Number, default: 0, min: 0 },
      description: { type: String, trim: true }
    },
    education: [{
      degree: { type: String, required: true, trim: true },
      institution: { type: String, required: true, trim: true },
      year: { type: Number, required: true }
    }],
    location: {
      city: { type: String, trim: true },
      country: { type: String, trim: true, default: 'Saudi Arabia' }
    },
    availability: { 
      type: String, 
      enum: ['immediate', 'within_2_weeks', 'within_month', 'negotiable'],
      default: 'negotiable'
    },
    status: { 
      type: String, 
      enum: ['active', 'inactive', 'hired', 'blacklisted'],
      default: 'active'
    },
    source: { 
      type: String, 
      enum: ['direct', 'linkedin', 'referral', 'agency', 'other'],
      default: 'direct'
    },
    notes: { type: String, trim: true }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add indexes for performance
CandidateSchema.index({ email: 1 });
CandidateSchema.index({ status: 1 });
CandidateSchema.index({ skills: 1 });
CandidateSchema.index({ 'location.city': 1 });

export const Candidate = mongoose.models.Candidate || mongoose.model<ICandidate>('Candidate', CandidateSchema);