import { Schema, model, models, Types } from 'mongoose';

const PaymentMethodSchema = new Schema(
  {
    org_id: { 
      type: Types.ObjectId, 
      ref: 'Organization'
      // Note: required conditionally in validation - see validate hook below
    },
    owner_user_id: { 
      type: Types.ObjectId, 
      ref: 'User'
      // Note: required conditionally in validation - see validate hook below
    },
    gateway: { type: String, default: 'PAYTABS' },
    pt_token: { type: String, index: true },
    pt_masked_card: String,
    pt_customer_email: String,
  },
  { timestamps: true }
);

// XOR validation: Either org_id OR owner_user_id must be provided, but not both
PaymentMethodSchema.pre('validate', function (next) {
  const hasOrg = !!this.org_id;
  const hasOwner = !!this.owner_user_id;
  
  if (!hasOrg && !hasOwner) {
    return next(new Error('Either org_id or owner_user_id must be provided'));
  }
  
  if (hasOrg && hasOwner) {
    return next(new Error('Cannot set both org_id and owner_user_id'));
  }
  
  next();
});

// Indexes for efficient queries
PaymentMethodSchema.index({ org_id: 1 });
PaymentMethodSchema.index({ owner_user_id: 1 });

export default models.PaymentMethod || model('PaymentMethod', PaymentMethodSchema);

