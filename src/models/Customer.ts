import { Schema, model, models } from 'mongoose';

const CustomerSchema = new Schema({
  type: { type: String, enum: ['ORG','OWNER'], index: true }, // Corporate Property Manager OR Property Owner
  orgRef: { type: String },     // existing org/tenant id (if ORG)
  ownerRef: { type: String },   // existing owner id (if OWNER)
  name: String,
  billingEmail: { type: String, index: true },
  country: String,
  currency: { type: String, default: 'USD' }
}, { timestamps: true });

export default models.Customer || model('Customer', CustomerSchema);
