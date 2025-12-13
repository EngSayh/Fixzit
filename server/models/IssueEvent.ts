import mongoose, { Schema, Document, Model } from "mongoose";

export type IssueEventType = "SYNCED" | "UPDATED" | "STATUS_CHANGED" | "RESOLVED";

export interface IIssueEvent extends Document {
  issueId?: mongoose.Types.ObjectId;
  key: string;
  type: IssueEventType;
  sourceRef?: string;
  sourceHash?: string;
  metadata?: Record<string, unknown>;
  orgId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const IssueEventSchema = new Schema<IIssueEvent>(
  {
    issueId: { type: Schema.Types.ObjectId, ref: "Issue" },
    key: { type: String, required: true },
    type: { type: String, required: true, enum: ["SYNCED", "UPDATED", "STATUS_CHANGED", "RESOLVED"] },
    sourceRef: { type: String },
    sourceHash: { type: String },
    metadata: { type: Schema.Types.Mixed },
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "issue_events",
  }
);

IssueEventSchema.index({ orgId: 1, key: 1, createdAt: -1 });

// Model interface with static methods defined above
type IIssueEventModel = Model<IIssueEvent> & typeof IssueEventSchema.statics

const IssueEvent =
  (mongoose.models.IssueEvent as IIssueEventModel) ||
  mongoose.model<IIssueEvent, IIssueEventModel>("IssueEvent", IssueEventSchema);

export default IssueEvent;
