import { Schema, model, models, InferSchemaType } from "mongoose";

const CandidateSchema = new Schema({
  orgId: { type: String, required: true, index: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, index: true, lowercase: true, trim: true },
  phone: String,
  resume: String, // File path or URL
  coverLetter: String,
  experience: Number, // years
  skills: [String],
  education: [{
    degree: String,
    institution: String,
    year: Number
  }],
  status: { 
    type: String, 
    enum: ['active', 'archived', 'blacklisted'], 
    default: 'active' 
  },
  metadata: Schema.Types.Mixed
}, {
  timestamps: true
});

export type CandidateDoc = InferSchemaType<typeof CandidateSchema>;

// Add static methods to schema
CandidateSchema.statics.findByEmail = async function(orgId: string, email: string) {
  return await this.findOne({ orgId, email });
};

const CandidateModel = models.Candidate || model("Candidate", CandidateSchema);

// One candidate per email within an org
CandidateSchema.index({ orgId: 1, email: 1 }, { unique: true });

export const Candidate = CandidateModel;