import { Schema, model, models } from 'mongoose';

export type BacklogCategory = 'bug' | 'logic' | 'test' | 'efficiency' | 'next_step';
export type BacklogPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type BacklogEffort = 'XS' | 'S' | 'M' | 'L' | 'XL';
export type BacklogStatus = 'pending' | 'in_progress' | 'resolved' | 'wont_fix';

const BacklogIssueSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    externalId: { type: String, unique: true, sparse: true, index: true },
    category: { type: String, required: true, enum: ['bug', 'logic', 'test', 'efficiency', 'next_step'], index: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    action: { type: String, required: true, maxlength: 2000 },
    location: {
      file: { type: String },
      lines: { type: String },
      section: { type: String },
    },
    priority: { type: String, required: true, enum: ['P0', 'P1', 'P2', 'P3'], index: true },
    effort: { type: String, required: true, enum: ['XS', 'S', 'M', 'L', 'XL'], index: true },
    impact: { type: Number, required: true, min: 1, max: 10, index: true },
    riskTags: { type: [String], default: [] },
    status: { type: String, required: true, enum: ['pending', 'in_progress', 'resolved', 'wont_fix'], default: 'pending', index: true },
    firstSeen: { type: Date, required: true },
    lastSeen: { type: Date, required: true },
    mentionCount: { type: Number, default: 1 },
    sourceEntries: { type: [String], default: [] },
    rawSource: { type: String, required: true, maxlength: 4000 },
    sourcePath: { type: String },
  },
  {
    timestamps: true,
    collection: 'backlog_issues',
  }
);

BacklogIssueSchema.index({ priority: 1, impact: -1, updatedAt: -1 });
BacklogIssueSchema.index({ 'location.file': 1, status: 1 });

export default models.BacklogIssue || model('BacklogIssue', BacklogIssueSchema);
