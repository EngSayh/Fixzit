import { Schema, model, models, Document } from 'mongoose';

export interface ICustomer extends Document {
  _id: string;
  organizationId: string;
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  vatNumber?: string;
  billingContact?: {
    name: string;
    email: string;
    phone?: string;
  };
  paymentTerms?: number; // days
  creditLimit?: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>({
  organizationId: { type: String, required: true },
  tenantId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  vatNumber: { type: String },
  billingContact: {
    name: String,
    email: String,
    phone: String
  },
  paymentTerms: { type: Number, default: 30 },
  creditLimit: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  notes: { type: String }
}, {
  timestamps: true
});

// Compound indexes for multi-tenant queries
CustomerSchema.index({ organizationId: 1, tenantId: 1 });
CustomerSchema.index({ organizationId: 1, tenantId: 1, email: 1 });
CustomerSchema.index({ organizationId: 1, tenantId: 1, name: 1 });

const Customer = models.Customer || model<ICustomer>('Customer', CustomerSchema);

export default Customer;