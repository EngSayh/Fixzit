import { Schema, model, models, Types } from 'mongoose';
import { MODULE_KEYS } from './Module';

const PayTabsInfoSchema = new Schema(
  {
    profile_id: String,
    token: String,
    customer_email: String,
    last_tran_ref: String,
    agreement_id: String,
    cart_id: String,
  },
  { _id: false }
);

const SubscriptionSchema = new Schema(
  {
    tenant_id: { type: Types.ObjectId, ref: 'Tenant', required: false },
    owner_user_id: { type: Types.ObjectId, ref: 'User', required: false },
    subscriber_type: { 
      type: String, 
      enum: ['CORPORATE', 'OWNER'], 
      required: true 
    },
    modules: { 
      type: [String], 
      enum: MODULE_KEYS,
      default: [] 
    },
    seats: { 
      type: Number, 
      required: true,
      min: [1, 'Seats must be at least 1']
    },
    billing_cycle: { 
      type: String, 
      enum: ['MONTHLY', 'ANNUAL'], 
      default: 'MONTHLY' 
    },
    currency: { 
      type: String, 
      enum: ['USD', 'SAR'], 
      default: 'USD' 
    },
    price_book_id: { 
      type: Types.ObjectId, 
      ref: 'PriceBook', 
      required: true 
    },
    amount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'CANCELED'],
      default: 'INCOMPLETE',
    },
    paytabs: PayTabsInfoSchema,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Validate subscriber_type matches tenant_id/owner_user_id
SubscriptionSchema.pre('validate', function(next) {
  if (this.subscriber_type === 'CORPORATE') {
    if (!this.tenant_id) {
      return next(new Error('tenant_id is required when subscriber_type is CORPORATE'));
    }
    if (this.owner_user_id) {
      return next(new Error('owner_user_id must not be set when subscriber_type is CORPORATE'));
    }
  } else if (this.subscriber_type === 'OWNER') {
    if (!this.owner_user_id) {
      return next(new Error('owner_user_id is required when subscriber_type is OWNER'));
    }
    if (this.tenant_id) {
      return next(new Error('tenant_id must not be set when subscriber_type is OWNER'));
    }
  }
  next();
});

export default models.Subscription || model('Subscription', SubscriptionSchema);
