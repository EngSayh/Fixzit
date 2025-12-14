import { Schema, model, models } from 'mongoose';

const BacklogEventSchema = new Schema(
  {
    issueKey: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['import', 'status_change', 'comment', 'edit'] },
    message: { type: String, required: true, maxlength: 2000 },
    actor: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'backlog_events',
  }
);

BacklogEventSchema.index({ issueKey: 1, createdAt: -1 });

export default models.BacklogEvent || model('BacklogEvent', BacklogEventSchema);
