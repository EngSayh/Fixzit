import { Schema, model, models, InferSchemaType, Model, Document } from 'mongoose';
import { MockModel } from '@/src/lib/mockDb';

const ApplicationStages = [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn',
  'archived'
] as const;

type ApplicationStage = typeof ApplicationStages[number];

type AutoRejectResult = { reject: boolean; reason?: string };

type KnockoutInput = { experience?: number; skills?: string[] };

const HistorySchema = new Schema({
  action: { type: String, required: true },
  by: { type: String, required: true },
  at: { type: Date, default: Date.now },
  details: { type: String }
}, { _id: false });

const NoteSchema = new Schema({
  author: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isPrivate: { type: Boolean, default: false }
}, { _id: false });

const SnapshotSchema = new Schema({
  fullName: String,
  email: String,
  phone: String,
  location: String,
  skills: { type: [String], default: [] },
  experience: { type: Number, default: 0 },
  resumeUrl: String
}, { _id: false });

const ApplicationSchema = new Schema({
  orgId: { type: String, required: true, index: true },
  jobId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Job' },
  candidateId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Candidate' },
  stage: { type: String, enum: ApplicationStages, default: 'applied', index: true },
  score: { type: Number, default: 0 },
  source: { type: String, default: 'careers' },
  answers: { type: [Schema.Types.Mixed], default: [] },
  candidateSnapshot: { type: SnapshotSchema, default: () => ({}) },
  coverLetter: { type: String },
  resumeUrl: { type: String },
  history: { type: [HistorySchema], default: () => [{ action: 'applied', by: 'candidate', at: new Date() }] },
  notes: { type: [NoteSchema], default: [] },
  flags: { type: [String], default: [] },
  reviewers: { type: [String], default: [] },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

ApplicationSchema.index({ orgId: 1, jobId: 1, candidateId: 1 }, { unique: true });
ApplicationSchema.index({ stage: 1, score: -1 });

export type ApplicationDoc = InferSchemaType<typeof ApplicationSchema> & Document;

export interface ApplicationModel extends Model<ApplicationDoc> {}

function attachHistoryDefaults(application: any) {
  if (!application) return application;
  if (!Array.isArray(application.history) || application.history.length === 0) {
    application.history = [{ action: 'applied', by: 'system', at: new Date() }];
  }
  if (!Array.isArray(application.flags)) application.flags = [];
  if (!Array.isArray(application.reviewers)) application.reviewers = [];
  if (!Array.isArray(application.notes)) application.notes = [];
  if (!application.candidateSnapshot) application.candidateSnapshot = {};
  return application;
}

class ApplicationMockModel extends MockModel {
  constructor() {
    super('applications');
  }

  override async create(doc: any) {
    const created = await super.create({
      stage: 'applied',
      score: 0,
      source: 'careers',
      history: [{ action: 'applied', by: doc?.history?.[0]?.by || 'candidate', at: new Date() }],
      ...doc
    });
    return attachHistoryDefaults(created);
  }

  override async findById(id: string) {
    const doc = await super.findById(id);
    return attachHistoryDefaults(doc);
  }

  override async findOne(query: any) {
    const doc = await super.findOne(query);
    return attachHistoryDefaults(doc);
  }
}

const existingApplication = models.Application as ApplicationModel | undefined;
export const Application: ApplicationModel = isMockDB
  ? (new ApplicationMockModel() as unknown as ApplicationModel)
  : (existingApplication || model<ApplicationDoc, ApplicationModel>('Application', ApplicationSchema));

export type { AutoRejectResult, KnockoutInput, ApplicationStage };
