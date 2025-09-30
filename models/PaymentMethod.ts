import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentMethod extends Document {
  userId: string;
  type: 'card' | 'bank_account' | 'wallet';
  provider: 'paytabs' | 'stripe' | 'paypal';
  providerPaymentMethodId: string;
  isDefault: boolean;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSchema = new Schema<IPaymentMethod>({
  userId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['card', 'bank_account', 'wallet'],
    required: true
  },
  provider: {
    type: String,
    enum: ['paytabs', 'stripe', 'paypal'],
    required: true
  },
  providerPaymentMethodId: {
    type: String,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  last4: String,
  brand: String,
  expiryMonth: Number,
  expiryYear: Number,
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

export const PaymentMethod = mongoose.models.PaymentMethod || mongoose.model<IPaymentMethod>('PaymentMethod', paymentMethodSchema);
export default PaymentMethod;