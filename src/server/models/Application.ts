// @ts-nocheck
import { Schema, model, models } from 'mongoose';

const NoteSchema = new Schema({
  author: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
  isPrivate: { type: Boolean, default: false }
}, { _id: false });

const HistorySchema = new Schema({
  action: String,
  by: String,
  at: { type: Date, default: Date.now },
  details: String
}, { _id: false });

const ApplicationSchema = new Schema({
  orgId: { type: String, index: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', index: true },
  candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', index: true },
  stage: { type: String, default: 'applied' },
  score: { type: Number, default: 0 },
  notes: [NoteSchema],
  history: [HistorySchema],
  flags: [String],
  reviewers: [String]
}, { timestamps: true });

export const Application = models.Application || model('Application', ApplicationSchema);

