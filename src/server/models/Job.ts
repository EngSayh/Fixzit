import { Schema, model, models, InferSchemaType } from "mongoose";

const JobSchema = new Schema({
  orgId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  department: { type: String, required: true },
  description: String,
  requirements: [String],
  responsibilities: [String],
  skills: [String],
  experience: String,
  location: String,
  type: { 
    type: String, 
    enum: ['full-time', 'part-time', 'contract', 'internship'], 
    default: 'full-time' 
  },
  salary: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'SAR' }
  },
  status: { 
    type: String, 
    enum: ['draft', 'published', 'closed', 'cancelled'], 
    default: 'draft' 
  },
  publishedAt: Date,
  closedAt: Date,
  metadata: Schema.Types.Mixed
}, {
  timestamps: true
});

export type JobDoc = InferSchemaType<typeof JobSchema>;
export const Job = models.Job || model("Job", JobSchema);