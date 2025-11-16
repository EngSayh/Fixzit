import { Schema, model, models, Types } from 'mongoose'
import { getModel, MModel } from '@/src/types/mongoose-compat';;
import { tenantIsolationPlugin } from '../../plugins/tenantIsolation';
import { auditPlugin } from '../../plugins/auditPlugin';

export type TransactionType = 'SALE' | 'RENTAL' | 'LEASE';
export type TransactionStatus = 'DRAFT' | 'PENDING' | 'SIGNED' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED';

export interface TransactionParty {
  userId?: Types.ObjectId; // Changed for ref attribute
  name: string;
  email: string;
  phone: string;
  idNumber: string; // National ID, Iqama, etc.
  idType: 'NATIONAL_ID' | 'IQAMA' | 'PASSPORT' | 'CR'; // Commercial Registration
  address?: string;
}

export interface PaymentSchedule {
  dueDate: Date;
  amount: number;
  description: string;
  status: PaymentStatus;
  paidDate?: Date;
  paymentMethod?: string;
  referenceNumber?: string;
}

export interface TransactionDocument {
  name: string;
  url: string;
  type: 'CONTRACT' | 'PROOF_OF_PAYMENT' | 'TITLE_DEED' | 'ID_COPY' | 'OTHER';
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
}

export interface PropertyTransaction {
  _id: Types.ObjectId;
  orgId: Types.ObjectId; // This will be added by tenantIsolationPlugin
  propertyId: Types.ObjectId;
  agentId: Types.ObjectId;
  
  // Transaction Details
  type: TransactionType;
  status: TransactionStatus;
  referenceNumber: string;
  
  // Parties
  buyer?: TransactionParty; // For sale
  seller?: TransactionParty;
  tenant?: TransactionParty; // For rental
  landlord?: TransactionParty;
  
  // Financial
  totalAmount: number;
  currency: string;
  paymentSchedule: PaymentSchedule[];
  securityDeposit?: number;
  agentCommission: {
    amount: number;
    percentage?: number;
    paidBy: 'BUYER' | 'SELLER' | 'SHARED';
    status: PaymentStatus;
  };
  
  // Contract
  contractStartDate?: Date;
  contractEndDate?: Date;
  contractDuration?: number; // months
  renewalOption?: boolean;
  earlyTerminationClause?: string;
  
  // Documents
  documents: TransactionDocument[];
  
  // Completion
  completedAt?: Date;
  handoverDate?: Date;
  
  // Notes
  terms?: string;
  specialConditions?: string;
  internalNotes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const PropertyTransactionSchema = new Schema<PropertyTransaction>(
  {
    // orgId will be added by tenantIsolationPlugin
    propertyId: { type: Schema.Types.ObjectId, required: true, ref: 'PropertyListing', index: true },
    agentId: { type: Schema.Types.ObjectId, required: true, ref: 'RealEstateAgent', index: true },
    
    type: {
      type: String,
      enum: ['SALE', 'RENTAL', 'LEASE'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'SIGNED', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
      index: true
    },
    referenceNumber: { type: String, required: true }, // unique will be tenant-scoped below
    
    buyer: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      email: String,
      phone: String,
      idNumber: String,
      idType: {
        type: String,
        enum: ['NATIONAL_ID', 'IQAMA', 'PASSPORT', 'CR']
      },
      address: String
    },
    seller: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      email: String,
      phone: String,
      idNumber: String,
      idType: {
        type: String,
        enum: ['NATIONAL_ID', 'IQAMA', 'PASSPORT', 'CR']
      },
      address: String
    },
    tenant: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      email: String,
      phone: String,
      idNumber: String,
      idType: {
        type: String,
        enum: ['NATIONAL_ID', 'IQAMA', 'PASSPORT', 'CR']
      },
      address: String
    },
    landlord: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      email: String,
      phone: String,
      idNumber: String,
      idType: {
        type: String,
        enum: ['NATIONAL_ID', 'IQAMA', 'PASSPORT', 'CR']
      },
      address: String
    },
    
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'SAR' },
    paymentSchedule: [{
      dueDate: { type: Date, required: true },
      amount: { type: Number, required: true },
      description: String,
      status: {
        type: String,
        enum: ['PENDING', 'PARTIAL', 'PAID', 'REFUNDED'],
        default: 'PENDING'
      },
      paidDate: Date,
      paymentMethod: String,
      referenceNumber: String
    }],
    securityDeposit: Number,
    agentCommission: {
      amount: { type: Number, required: true },
      percentage: Number,
      paidBy: {
        type: String,
        enum: ['BUYER', 'SELLER', 'SHARED'],
        required: true
      },
      status: {
        type: String,
        enum: ['PENDING', 'PARTIAL', 'PAID', 'REFUNDED'],
        default: 'PENDING'
      }
    },
    
    contractStartDate: Date,
    contractEndDate: Date,
    contractDuration: Number,
    renewalOption: Boolean,
    earlyTerminationClause: String,
    
    documents: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      type: {
        type: String,
        enum: ['CONTRACT', 'PROOF_OF_PAYMENT', 'TITLE_DEED', 'ID_COPY', 'OTHER'],
        required: true
      },
      uploadedAt: { type: Date, default: Date.now },
      uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' }
    }],
    
    completedAt: Date,
    handoverDate: Date,
    
    terms: String,
    specialConditions: String,
    internalNotes: String
  },
  {
    timestamps: true,
    collection: 'aqar_transactions'
  }
);

// APPLY PLUGINS (BEFORE INDEXES)
PropertyTransactionSchema.plugin(tenantIsolationPlugin);
PropertyTransactionSchema.plugin(auditPlugin);

// INDEXES (AFTER PLUGINS) - orgId is now added by the plugin
// ⚡ CRITICAL FIX: Tenant-scoped unique index for referenceNumber
PropertyTransactionSchema.index({ orgId: 1, referenceNumber: 1 }, { unique: true });

// ⚡ FIXED: All indexes now tenant-scoped
PropertyTransactionSchema.index({ orgId: 1, propertyId: 1, status: 1 });
PropertyTransactionSchema.index({ orgId: 1, agentId: 1, createdAt: -1 });
PropertyTransactionSchema.index({ orgId: 1, type: 1, status: 1 });
PropertyTransactionSchema.index({ orgId: 1, 'buyer.userId': 1 });
PropertyTransactionSchema.index({ orgId: 1, 'seller.userId': 1 });
PropertyTransactionSchema.index({ orgId: 1, 'tenant.userId': 1 });
PropertyTransactionSchema.index({ orgId: 1, 'landlord.userId': 1 });

const PropertyTransactionModel = getModel<PropertyTransaction>('PropertyTransaction', PropertyTransactionSchema);

export default PropertyTransactionModel;
