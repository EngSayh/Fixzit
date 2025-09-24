import { Schema, model, models, Types } from 'mongoose';

const ServiceAgreementSchema = new Schema(
  {
    subscriber_type: { type: String, enum: ['CORPORATE', 'OWNER'] },
    subscriber_id: { type: Types.ObjectId, required: true },
    modules: { type: [String], default: [] },
    seats: Number,
    term: { type: String, enum: ['MONTHLY', 'ANNUAL'] },
    start_at: Date,
    end_at: Date,
    currency: String,
    amount: Number,
    status: { type: String, enum: ['DRAFT', 'SIGNED', 'ACTIVE'], default: 'DRAFT' },
    pdf_url: String,
    e_signed_at: Date,
  },
  { timestamps: true }
);

export default models.ServiceAgreement || model('ServiceAgreement', ServiceAgreementSchema);
