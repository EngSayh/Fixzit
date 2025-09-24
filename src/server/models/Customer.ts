import { Schema, model, models, Document } from 'mongoose';

export interface ICustomer extends Document {
  orgId: string;
  type: 'ORG' | 'OWNER' | 'TENANT' | 'INDIVIDUAL';
  name: string;
  billingEmail: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    country?: string;
    zip?: string;
  };
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>({
  orgId: { type: String, required: true, index: true },
  type: { type: String, enum: ['ORG', 'OWNER', 'TENANT', 'INDIVIDUAL'], required: true },
  name: { type: String, required: true },
  billingEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
  phone: String,
  address: {
    street: String,
    city: String,
    region: String,
    country: { type: String, default: 'SA' },
    zip: String
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true }
}, { timestamps: true, collection: 'customers' });

CustomerSchema.index({ orgId: 1, billingEmail: 1 }, { unique: true });

export const Customer = models.Customer || model<ICustomer>('Customer', CustomerSchema);


