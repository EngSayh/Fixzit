import { Schema, model, models, InferSchemaType } from "mongoose";

const ApplicationSchema = new Schema({
  orgId: { type: String, required: true, index: true },
  jobId: { type: String, required: true, index: true },
  candidateId: { type: String, required: true, index: true },
  stage: { 
    type: String, 
    enum: ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'], 
    default: 'applied',
    index: true
  },
  status: { 
    type: String, 
    enum: ['active', 'withdrawn', 'expired'], 
    default: 'active' 
  },
  score: { type: Number, default: 0, min: 0, max: 100 },
  source: { type: String, enum: ['careers', 'linkedin', 'direct', 'referral'], default: 'careers' },
  candidateSnapshot: {
    fullName: String,
    email: String,
    phone: String,
    location: String,
    skills: [String],
    experience: Number,
    resumeUrl: String
  },
  coverLetter: String,
  answers: [Schema.Types.Mixed],
  history: [{
    action: { type: String, required: true },
    by: { type: String, required: true },
    at: { type: Date, default: Date.now },
    details: String
  }],
  appliedAt: { type: Date, default: Date.now },
  notes: String,
  metadata: Schema.Types.Mixed
}, {
  timestamps: true
});

// Add compound unique index to prevent duplicate applications
ApplicationSchema.index({ orgId: 1, jobId: 1, candidateId: 1 }, { unique: true });

export type ApplicationDoc = InferSchemaType<typeof ApplicationSchema>;
export const Application = models.Application || model("Application", ApplicationSchema);