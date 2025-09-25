// @ts-nocheck
import { Schema, model, models } from 'mongoose';

const JobSchema = new Schema({
  orgId: { type: String, index: true },
  title: String,
  department: String,
  description: String
}, { timestamps: true });

export const Job = models.Job || model('Job', JobSchema);

