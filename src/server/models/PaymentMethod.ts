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

export default models.PaymentMethod || model('PaymentMethod', PaymentMethodSchema);


