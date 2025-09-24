import mongoose, { Document, Schema } from 'mongoose';

export interface IApplication extends Document {
  _id: string;
  jobId: string;
  candidateId: string;
  stage: 'submitted' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  score: number;
  notes: Array<{
    author: string;
    text: string;
    createdAt: Date;
    isPrivate: boolean;
  }>;
  history: Array<{
    action: string;
    by: string;
    at: Date;
    details?: string;
  }>;
  flags: string[];
  reviewers: string[];
  submittedAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    jobId: { type: String, required: true, ref: 'Job' },
    candidateId: { type: String, required: true, ref: 'Candidate' },
    stage: { 
      type: String, 
      enum: ['submitted', 'screening', 'interview', 'offer', 'hired', 'rejected'],
      default: 'submitted'
    },
    score: { type: Number, default: 0, min: 0, max: 100 },
    notes: [{
      author: { type: String, required: true },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
      isPrivate: { type: Boolean, default: false }
    }],
    history: [{
      action: { type: String, required: true },
      by: { type: String, required: true },
      at: { type: Date, default: Date.now },
      details: { type: String }
    }],
    flags: [{ type: String }],
    reviewers: [{ type: String }],
    submittedAt: { type: Date, default: Date.now }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add indexes for performance
ApplicationSchema.index({ jobId: 1, candidateId: 1 });
ApplicationSchema.index({ stage: 1 });
ApplicationSchema.index({ submittedAt: -1 });

export const Application = mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);