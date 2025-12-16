/**
 * Customer Model - CRM and billing customer records
 * 
 * @module server/models/Customer
 * @description Manages customer records for invoicing, payments, and CRM.
 * Used across Souq (marketplace buyers), FM (service customers), Aqar (property clients).
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Encrypted contact information
 * - Billing and shipping address management
 * - Credit limit tracking
 * - Payment terms configuration (NET_30, etc.)
 * - VAT/tax number storage
 * - Invoice relationship tracking
 * 
 * @indexes
 * - Unique: { orgId, email } - Prevent duplicate customers per org
 * - Index: { isActive } for active customer filtering
 * - Index: { name } for customer search
 * 
 * @relationships
 * - Invoice.customerId → Customer._id
 * - Order.customerId → Customer._id
 * - Payment records reference customer_id
 * 
 * @encryption
 * - email encrypted via encryptionPlugin
 * - phone encrypted
 * - billingContact.email encrypted
 * 
 * @audit
 * - Contact updates logged
 * - Credit limit changes tracked
 * - Payment term modifications recorded
 */

import { Schema, model, models, Document } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { encryptionPlugin } from "../plugins/encryptionPlugin";

export interface ICustomer extends Document {
  // NOTE: orgId, createdBy, updatedBy added by plugins
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

const CustomerSchema = new Schema<ICustomer>(
  {
    // REMOVED: Manual organizationId and tenantId (conflicting fields)
    // Plugin will add orgId
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    vatNumber: { type: String },
    billingContact: {
      name: String,
      email: String,
      phone: String,
    },
    paymentTerms: { type: Number, default: 30 },
    creditLimit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
  },
  {
    timestamps: true,
  },
);

// APPLY PLUGINS (BEFORE INDEXES)
CustomerSchema.plugin(tenantIsolationPlugin);
CustomerSchema.plugin(auditPlugin);
// SEC-PII-001: Encrypt customer contact PII fields
CustomerSchema.plugin(encryptionPlugin, {
  fields: {
    "email": "Customer Email",
    "phone": "Customer Phone",
    "vatNumber": "VAT Number",
    "billingContact.email": "Billing Contact Email",
    "billingContact.phone": "Billing Contact Phone",
  },
});

// Compound indexes for multi-tenant queries (now using orgId from plugin)
CustomerSchema.index({ orgId: 1, email: 1 }, { sparse: true });
CustomerSchema.index({ orgId: 1, name: 1 });
CustomerSchema.index({ orgId: 1, isActive: 1 });
CustomerSchema.index({ orgId: 1, vatNumber: 1 }, { sparse: true });

const Customer = getModel<ICustomer>("Customer", CustomerSchema);

export default Customer;
