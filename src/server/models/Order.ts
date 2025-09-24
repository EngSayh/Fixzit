import { Schema, model, models, Document } from 'mongoose';

export interface IOrder extends Document {
  orgId: string;
  userId: string;
  cartId?: string;
  items: Array<{ productId: string; quantity: number; price: number; currency?: string }>;
  totals: { subtotal: number; vat: number; shipping: number; discount: number; total: number };
  currency: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  orgId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  cartId: { type: String },
  items: [{ productId: String, quantity: Number, price: Number, currency: { type: String, default: 'SAR' } }],
  totals: {
    subtotal: { type: Number, default: 0 },
    vat: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  currency: { type: String, default: 'SAR' },
  status: { type: String, enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'], default: 'pending', index: true }
}, { timestamps: true, collection: 'orders' });

OrderSchema.index({ orgId: 1, userId: 1, createdAt: -1 });
// Text search index on product ids won't help; index over totals not relevant.
// Provide a basic text index on currency/status for quick filtering by free text.
OrderSchema.index({ status: 'text', currency: 'text' });

export const Order = models.Order || model<IOrder>('Order', OrderSchema);


