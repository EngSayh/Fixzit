import { Schema, model, models, InferSchemaType } from "mongoose";

const ApplicationSchema = new Schema({
  orgId: { type: String, required: true, index: true },
  jobId: { type: String, required: true, index: true },
  candidateId: { type: String, required: true, index: true },
  stage: { 
    type: String, 
    enum: ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'], 
    default: 'applied',
    index: true
  },
  status: { 
    type: String, 
    enum: ['active', 'withdrawn', 'expired'], 
    default: 'active' 
  },
  appliedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  notes: String,
  metadata: Schema.Types.Mixed
}, {
  timestamps: true
});

export type ApplicationDoc = InferSchemaType<typeof ApplicationSchema>;
export const Application = models.Application || model("Application", ApplicationSchema);