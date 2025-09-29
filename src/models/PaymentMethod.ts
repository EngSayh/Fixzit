import { Schema, model, models, Types } from 'mongoose';

const PaymentMethodSchema = new Schema({
  customerId: { type: Types.ObjectId, ref: 'Customer', index: true },
  provider: { type: String, default: 'PAYTABS' },
  token: { type: String, index: true }, // token from PayTabs callback
  scheme: String, last4: String, expMonth: Number, expYear: Number
}, { timestamps: true });

export default models.PaymentMethod || model('PaymentMethod', PaymentMethodSchema);
