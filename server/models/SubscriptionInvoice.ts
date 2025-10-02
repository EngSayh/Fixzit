import { Schema, model, models, Types } from 'mongoose';

const SubscriptionInvoiceSchema = new Schema(
  {
    subscription_id: { type: Types.ObjectId, ref: 'Subscription', required: true },
    invoice_number: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['draft', 'open', 'paid', 'void'], default: 'draft' },
    due_date: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default models.SubscriptionInvoice || model('SubscriptionInvoice', SubscriptionInvoiceSchema);
