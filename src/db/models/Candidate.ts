import { Schema, model, models, InferSchemaType, Model, Document } from 'mongoose';

const CandidateSchema = new Schema({
  orgId: { type: String, required: true, index: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  emailLower: { type: String, required: true, index: true },
  phone: { type: String },
  location: { type: String },
  linkedin: { type: String },
  skills: { type: [String], default: [] },
  experience: { type: Number, default: 0 },
  resumeUrl: { type: String },
  resumeText: { type: String },
  source: { type: String, default: 'careers' },
  consents: {
    privacy: { type: Boolean, default: true },
    contact: { type: Boolean, default: true },
    dataRetention: { type: Boolean, default: true }
  }
}, { timestamps: true });

CandidateSchema.index({ orgId: 1, emailLower: 1 }, { unique: true });

CandidateSchema.pre('validate', function(next) {
  if ((this as any).email) {
    (this as any).emailLower = (this as any).email.toLowerCase();
  }
  next();
});

export type CandidateDoc = InferSchemaType<typeof CandidateSchema> & Document;

export interface CandidateModel extends Model<CandidateDoc> {
  findByEmail(orgId: string, email: string): Promise<CandidateDoc | null>;
}

CandidateSchema.statics.findByEmail = function(orgId: string, email: string) {
  return this.findOne({ orgId, emailLower: email.toLowerCase() });
};

// Add pre-save middleware to set defaults
CandidateSchema.pre('save', function() {
  if (this.isNew) {
    this.skills = this.skills || [];
    this.consents = this.consents || { privacy: true, contact: true, dataRetention: true };
    if (this.email) {
      this.emailLower = this.email.toLowerCase();
    }
  }
});

// Add static method
CandidateSchema.statics.findByEmail = async function(orgId: string, email: string) {
  return this.findOne({ orgId, emailLower: email.toLowerCase() });
};

const existingCandidateModel = models.Candidate as CandidateModel | undefined;
export const Candidate: CandidateModel = existingCandidateModel || model<CandidateDoc, CandidateModel>('Candidate', CandidateSchema);
