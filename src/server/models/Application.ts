import { Schema, model, models, InferSchemaType, Types } from "mongoose";
import { MockModel } from "@/src/lib/mockDb";
import { isMockDB } from "@/src/lib/mongo";

const HistorySchema = new Schema({
  action: String,
  by: String,
  at: { type: Date, default: Date.now },
  details: String
}, { _id: false });

const SnapshotSchema = new Schema({
  fullName: String,
  email: String,
  phone: String,
  location: String,
  skills: [String],
  experience: Number,
  resumeUrl: String
}, { _id: false });

const NoteSchema = new Schema({
  author: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
  isPrivate: Boolean
}, { _id: false });

const ApplicationSchema = new Schema({
  orgId: { type: String, required: true, index: true },
  jobId: { type: Types.ObjectId, ref: 'Job', required: true, index: true },
  candidateId: { type: Types.ObjectId, ref: 'Candidate', required: true, index: true },
  stage: { type: String, enum: ['applied','screen','interview','offer','hired','rejected'], default: 'applied', index: true },
  score: { type: Number, default: 0, index: true },
  source: { type: String, default: 'careers' },
  answers: Schema.Types.Mixed,
  flags: { type: [String], default: [] },
  reviewers: { type: [String], default: [] },
  notes: { type: [NoteSchema], default: [] },
  candidateSnapshot: { type: SnapshotSchema, default: () => ({}) },
  history: { type: [HistorySchema], default: [] }
}, { timestamps: true });

ApplicationSchema.index({ orgId: 1, jobId: 1, candidateId: 1 }, { unique: true });

export type ApplicationDoc = InferSchemaType<typeof ApplicationSchema>;

export const Application = isMockDB
  ? new MockModel('applications') as any
  : (models.Application || model("Application", ApplicationSchema));

