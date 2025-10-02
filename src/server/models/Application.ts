import { Schema, model, models, InferSchemaType, Model, Document } from 'mongoose';

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

// Add pre-save middleware to set defaults
ApplicationSchema.pre('save', function() {
  if (this.isNew) {
    this.stage = this.stage || 'applied';
    this.score = this.score || 0;
    this.source = this.source || 'careers';
    if (!this.history || this.history.length === 0) {
      this.history = [{ action: 'applied', by: 'candidate', at: new Date() }];
    }
  }
});

// Add post-find middleware to attach defaults
ApplicationSchema.post('find', function(docs: any) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc) {
        attachHistoryDefaults(doc);
      }
    });
  }
});

ApplicationSchema.post('findOne', function(doc: any) {
  if (doc) {
    attachHistoryDefaults(doc);
  }
});

ApplicationSchema.post('findOneAndUpdate', function(doc: any) {
  if (doc) {
    attachHistoryDefaults(doc);
  }
});

const existingApplication = models.Application as ApplicationModel | undefined;
export const Application: ApplicationModel = existingApplication || model<ApplicationDoc, ApplicationModel>('Application', ApplicationSchema);

export type { AutoRejectResult, KnockoutInput, ApplicationStage };

