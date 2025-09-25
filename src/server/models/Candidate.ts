// @ts-nocheck
import { Schema, model, models } from 'mongoose';

const CandidateSchema = new Schema({
  orgId: { type: String, index: true },
  firstName: String,
  lastName: String,
  email: { type: String, index: true },
  phone: String
}, { timestamps: true });

export const Candidate = models.Candidate || model('Candidate', CandidateSchema);

