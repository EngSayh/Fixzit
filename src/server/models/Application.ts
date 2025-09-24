import { Schema, model, models, InferSchemaType } from "mongoose";
import { isMockDB } from "@/src/lib/mongo";
import { MockModel } from "@/src/lib/mockDb";

const History = new Schema({
  action: String,
  by: String,
  at: { type: Date, default: Date.now },
  details: String
}, { _id: false });

const ApplicationSchema = new Schema({
  orgId: { type: String, index: true, required: true },
  jobId: { type: String, index: true, required: true },
  candidateId: { type: String, index: true, required: true },
  stage: { type: String, default: 'applied', index: true },
  score: { type: Number, default: 0 },
  source: String,
  candidateSnapshot: Schema.Types.Mixed,
  coverLetter: String,
  notes: { type: [ { author:String, text:String, createdAt:{ type:Date, default:Date.now }, isPrivate:Boolean } ], default: [] },
  reviewers: { type: [String], default: [] },
  flags: { type: [String], default: [] },
  history: { type: [History], default: [] }
}, { timestamps: true });

ApplicationSchema.index({ orgId: 1, jobId: 1, candidateId: 1 }, { unique: true });

export type ApplicationDoc = InferSchemaType<typeof ApplicationSchema>;

class ApplicationMock extends MockModel {
  constructor() { super('applications'); }
  async findById(id: string) { 
    // @ts-ignore
    return await super.findById(id);
  }
}

export const Application: any = isMockDB
  ? new ApplicationMock()
  : (models.Application || model("Application", ApplicationSchema));

