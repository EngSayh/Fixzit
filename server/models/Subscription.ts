import { Schema, model, models, Model, Document } from 'mongoose';
import { auditPlugin } from '../plugins/auditPlugin';
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

const BillingHistorySchema = new Schema(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    tran_ref: String,
    status: { 
      type: String, 
      enum: ['SUCCESS', 'FAILED', 'PENDING'], 
      required: true 
    },
    error: String,
  },
  { _id: false }
);

const SubscriptionSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: false },
    owner_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: false },
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
      type: Schema.Types.ObjectId, 
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
    next_billing_date: { 
      type: Date, 
      required: false,
      index: true 
    },
    billing_history: {
      type: [BillingHistorySchema],
      default: []
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// NOTE: This schema uses XOR validation (tenant_id OR owner_user_id, not both)
// similar to PaymentMethod. It intentionally does NOT use tenantIsolationPlugin.
SubscriptionSchema.plugin(auditPlugin);

// Validate subscriber_type matches tenant_id/owner_user_id (XOR validation)
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

// Indexes for performance
SubscriptionSchema.index({ tenant_id: 1, status: 1 });
SubscriptionSchema.index({ owner_user_id: 1, status: 1 });
SubscriptionSchema.index({ status: 1 });
// Index for recurring billing query (billing_cycle + status + next_billing_date)
SubscriptionSchema.index({ billing_cycle: 1, status: 1, next_billing_date: 1 });

// TypeScript-safe model export
interface IPayTabsInfo {
  profile_id?: string;
  token?: string;
  customer_email?: string;
  last_tran_ref?: string;
  agreement_id?: string;
  cart_id?: string;
}

interface IBillingHistory {
  date: Date;
  amount: number;
  currency: string;
  tran_ref?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  error?: string;
}

interface ISubscription extends Document {
  tenant_id?: Schema.Types.ObjectId;
  owner_user_id?: Schema.Types.ObjectId;
  subscriber_type: 'CORPORATE' | 'OWNER';
  modules: string[];
  seats: number;
  billing_cycle: 'MONTHLY' | 'ANNUAL';
  currency: 'USD' | 'SAR';
  price_book_id: Schema.Types.ObjectId;
  amount: number;
  status: 'INCOMPLETE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  paytabs?: IPayTabsInfo;
  next_billing_date?: Date;
  billing_history: IBillingHistory[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
}

const Subscription: Model<ISubscription> = models.Subscription || model<ISubscription>('Subscription', SubscriptionSchema);
export default Subscription;
