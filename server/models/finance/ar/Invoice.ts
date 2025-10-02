import { Schema, model, models, Document } from 'mongoose';

export interface IInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  customerId: Schema.Types.ObjectId;
  customerName: string;
  issueDate: Date;
  dueDate: Date;
  lineItems: IInvoiceLineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  organizationId: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;
}

const InvoiceLineItemSchema = new Schema<IInvoiceLineItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, min: 0 },
  taxAmount: { type: Number, min: 0 }
}, { _id: false });

const InvoiceSchema = new Schema<IInvoice>({
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  customerName: { type: String, required: true },
  issueDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  lineItems: { type: [InvoiceLineItemSchema], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  taxTotal: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  balance: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled'], default: 'draft' },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

InvoiceSchema.index({ organizationId: 1, status: 1, dueDate: 1 });

export const Invoice = models.Invoice || model<IInvoice>('Invoice', InvoiceSchema);
