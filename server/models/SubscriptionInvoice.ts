import mongoose, { Schema, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

export interface ISubscriptionInvoice extends Document {
  // orgId, createdBy, updatedBy will be added by plugins
  subscriptionId: Types.ObjectId;
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
  // orgId will be added by tenantIsolationPlugin
  
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
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

// APPLY PLUGINS (BEFORE INDEXES)
subscriptionInvoiceSchema.plugin(tenantIsolationPlugin);
subscriptionInvoiceSchema.plugin(auditPlugin);

// ADD TENANT-SCOPED INDEXES
subscriptionInvoiceSchema.index({ orgId: 1, status: 1, dueDate: 1 }); // For finding overdue invoices
subscriptionInvoiceSchema.index({ orgId: 1, subscriptionId: 1 }); // For finding invoices for a subscription

export const SubscriptionInvoice = (typeof mongoose.models !== 'undefined' && mongoose.models.SubscriptionInvoice) || mongoose.model<ISubscriptionInvoice>('SubscriptionInvoice', subscriptionInvoiceSchema);
export default SubscriptionInvoice;