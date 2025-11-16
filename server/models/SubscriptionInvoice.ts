import mongoose, { Schema, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

export interface ISubscriptionInvoice extends Document {
  orgId: Types.ObjectId; // Required by tenantIsolationPlugin (explicitly set in code)
  subscriptionId: Types.ObjectId;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  dueDate: Date;
  periodStart: Date; // ✅ ADDED: Billing period start
  periodEnd: Date;   // ✅ ADDED: Billing period end
  paidAt?: Date;
  paymentMethod?: string;
  paytabsRef?: string; // ✅ ADDED: PayTabs transaction reference
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId;  // Added by auditPlugin
  updatedBy?: Types.ObjectId;  // Added by auditPlugin
}

const subscriptionInvoiceSchema = new Schema<ISubscriptionInvoice>({
  // ✅ FIXED COMMENT: orgId is required and must be explicitly set in code
  // The tenantIsolationPlugin adds the field definition, but does NOT auto-populate it
  // All SubscriptionInvoice.create() calls must include orgId
  
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
  periodStart: {  // ✅ ADDED
    type: Date,
    required: true
  },
  periodEnd: {    // ✅ ADDED
    type: Date,
    required: true
  },
  paidAt: Date,
  paymentMethod: String,
  paytabsRef: String  // ✅ ADDED: PayTabs transaction reference
}, {
  timestamps: true
});

// APPLY PLUGINS (BEFORE INDEXES)
subscriptionInvoiceSchema.plugin(tenantIsolationPlugin);
subscriptionInvoiceSchema.plugin(auditPlugin);

// ✅ FIXED: Add tenant-scoped compound indexes matching actual query patterns
// For finding overdue invoices by tenant and status
subscriptionInvoiceSchema.index({ orgId: 1, status: 1, dueDate: 1 });

// For finding all invoices for a specific subscription (most common read path)
subscriptionInvoiceSchema.index({ orgId: 1, subscriptionId: 1, dueDate: -1 });

// For charge-recurring queries that filter by subscription + status
subscriptionInvoiceSchema.index({ orgId: 1, subscriptionId: 1, status: 1 });

// For PayTabs callback lookups
subscriptionInvoiceSchema.index({ paytabsRef: 1 }, { sparse: true });

export const SubscriptionInvoice = (typeof mongoose.models !== 'undefined' && mongoose.models.SubscriptionInvoice) || mongoose.model<ISubscriptionInvoice>('SubscriptionInvoice', subscriptionInvoiceSchema);
export default SubscriptionInvoice;