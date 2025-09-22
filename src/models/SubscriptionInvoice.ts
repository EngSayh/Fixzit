import { Schema, model, models, Types } from 'mongoose';

const InvoiceSchema = new Schema({
  subscriptionId: { type: Types.ObjectId, ref: 'Subscription', index: true },
  amount: Number, currency: String,
  periodStart: Date, periodEnd: Date, dueDate: Date,
  status: { type: String, enum: ['draft','pending','paid','failed','void'], default: 'pending' },
  paytabsTranRef: String, // for reconciliation
  errorMessage: String
}, { timestamps: true });

export default models.SubscriptionInvoice || model('SubscriptionInvoice', InvoiceSchema);
