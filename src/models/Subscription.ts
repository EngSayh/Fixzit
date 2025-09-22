import { Schema, model, models, Types } from 'mongoose';

const SubscriptionItemSchema = new Schema({
  moduleId: { type: Types.ObjectId, ref: 'Module' },
  seatCount: Number,
  unitPriceMonthly: Number, // resolved at purchase
  billingCategory: { type: String, enum: ['per_seat','per_tenant'] },
});

const SubscriptionSchema = new Schema({
  customerId: { type: Types.ObjectId, ref: 'Customer', index: true },
  planType: { type: String, enum: ['CORPORATE_FM','OWNER_FM'] },
  items: [SubscriptionItemSchema],
  totalMonthly: Number,
  billingCycle: { type: String, enum: ['monthly','annual'], default: 'monthly' },
  annualDiscountPct: Number, // snapshot (e.g., 15)
  status: { type: String, enum: ['trial','active','past_due','canceled'], default: 'active' },
  seatTotal: Number, // for validation against tiers
  currency: { type: String, default: 'USD' },
  paytabsRegion: { type: String, default: 'GLOBAL' }, // e.g., 'KSA' uses secure.paytabs.sa
  paytabsTokenId: { type: Types.ObjectId, ref: 'PaymentMethod' }, // set after callback (monthly)
  startedAt: Date,
  nextInvoiceAt: Date
}, { timestamps: true });

export default models.Subscription || model('Subscription', SubscriptionSchema);
