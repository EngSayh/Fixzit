import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionInvoice extends Document {
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  dueDate: Date;
  paidAt?: Date;
  paymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionInvoiceSchema = new Schema<ISubscriptionInvoice>({
  subscriptionId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'SAR'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'cancelled'],
    default: 'pending'
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidAt: Date,
  paymentMethod: String
}, {
  timestamps: true
});

export const SubscriptionInvoice = mongoose.models.SubscriptionInvoice || mongoose.model<ISubscriptionInvoice>('SubscriptionInvoice', subscriptionInvoiceSchema);
export default SubscriptionInvoice;
