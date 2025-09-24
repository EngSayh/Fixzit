import { Schema, model, models, InferSchemaType, Model, Document } from 'mongoose';
import { MockModel } from '@/src/lib/mockDb';

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
  if (this.email) {
    this.emailLower = this.email.toLowerCase();
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

const isMockDB = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';

class CandidateMockModel extends MockModel {
  constructor() {
    super('candidates');
  }

  private attach(doc: any) {
    if (!doc) return doc;
    doc.save = async () => {
      await this.findByIdAndUpdate(doc._id, { $set: doc });
      return doc;
    };
    return doc;
  }

  override async create(doc: any) {
    const payload = {
      skills: [],
      consents: { privacy: true, contact: true, dataRetention: true },
      ...doc,
      emailLower: doc.email?.toLowerCase()
    };
    const created = await super.create(payload);
    return this.attach(created);
  }

  async findByEmail(orgId: string, email: string) {
    const doc = await super.findOne({ orgId, emailLower: email.toLowerCase() });
    return this.attach(doc);
  }

  override async findOne(query: any) {
    const doc = await super.findOne(query);
    return this.attach(doc);
  }
}

export const Candidate: CandidateModel = isMockDB
  ? new CandidateMockModel() as unknown as CandidateModel
  : ((models.Candidate as CandidateModel) || model<CandidateDoc, CandidateModel>('Candidate', CandidateSchema));
