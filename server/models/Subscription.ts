import { Schema, model, models, Types } from 'mongoose';

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
    subscriber_type: { type: String, enum: ['CORPORATE', 'OWNER'], required: true },
    modules: { type: [String], default: [] },
    seats: { type: Number, required: true },
    billing_cycle: { type: String, enum: ['MONTHLY', 'ANNUAL'], default: 'MONTHLY' },
    currency: { type: String, enum: ['USD', 'SAR'], default: 'USD' },
    price_book_id: { type: Types.ObjectId, ref: 'PriceBook', required: true },
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

export default models.Subscription || model('Subscription', SubscriptionSchema);
