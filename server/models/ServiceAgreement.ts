import { Schema, model, models, Types } from 'mongoose';

const ServiceAgreementSchema = new Schema(
  {
    orgId: {
      type: Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    subscriber_type: { 
      type: String, 
      enum: ['CORPORATE', 'OWNER'],
      required: true 
    },
    subscriber_id: { 
      type: Types.ObjectId, 
      required: true,
      refPath: 'subscriber_type'
    },
    modules: { type: [String], default: [] },
    seats: { 
      type: Number,
      required: true,
      min: [1, 'Seats must be at least 1']
    },
    term: { 
      type: String, 
      enum: ['MONTHLY', 'ANNUAL'],
      required: true 
    },
    start_at: { 
      type: Date,
      required: true 
    },
    end_at: { 
      type: Date,
      required: true 
    },
    currency: { 
      type: String,
      required: true,
      uppercase: true,
      match: [/^[A-Z]{3}$/, 'Currency must be a valid ISO 4217 code (e.g., USD, EUR, SAR)']
    },
    amount: { 
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative']
    },
    status: { 
      type: String, 
      enum: ['DRAFT', 'SIGNED', 'ACTIVE'], 
      default: 'DRAFT' 
    },
    pdf_url: String,
    e_signed_at: Date,
  },
  { timestamps: true }
);

// Validate start_at < end_at
ServiceAgreementSchema.pre('save', function(next) {
  if (this.start_at && this.end_at && this.start_at >= this.end_at) {
    return next(new Error('start_at must be before end_at'));
  }
  next();
});

export default models.ServiceAgreement || model('ServiceAgreement', ServiceAgreementSchema);
