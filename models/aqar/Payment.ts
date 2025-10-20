/**
 * Aqar Souq - Payment Model
 * 
 * Payment records for packages, boosts, fees
 * Integration with Fixzit Finance module
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export enum PaymentType {
  PACKAGE = 'PACKAGE',               // Listing package
  BOOST = 'BOOST',                   // Listing boost
  LISTING_FEE = 'LISTING_FEE',       // 999 SAR SALE, 199 SAR RENT/DAILY
  EJAR_FEE = 'EJAR_FEE',             // 299 SAR single, 499 SAR multiple
  PLATFORM_FEE = 'PLATFORM_FEE',     // Booking platform fee (15%)
}

export enum PaymentStatus {
  PENDING = 'PENDING',               // Awaiting payment
  PROCESSING = 'PROCESSING',         // Payment in progress
  COMPLETED = 'COMPLETED',           // Payment successful
  FAILED = 'FAILED',                 // Payment failed
  REFUNDED = 'REFUNDED',             // Refunded
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  MADA = 'MADA',                     // KSA domestic cards
  APPLE_PAY = 'APPLE_PAY',
  STC_PAY = 'STC_PAY',               // KSA mobile wallet
}

export interface IPayment extends Document {
  // User
  userId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  
  // Payment details
  type: PaymentType;
  amount: number;              // SAR
  currency: string;            // SAR
  
  // Related entity
  relatedId?: mongoose.Types.ObjectId;     // Package/Boost/Listing/Booking ID
  relatedModel?: string;                    // 'AqarPackage', 'AqarBoost', etc.
  
  // Status
  status: PaymentStatus;
  
  // Payment method
  method?: PaymentMethod;
  
  // Gateway response
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, unknown>;
  
  // Timestamps
  paidAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
  
  // Integration
  invoiceId?: mongoose.Types.ObjectId;     // Link to Finance Invoice
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    
    type: {
      type: String,
      enum: Object.values(PaymentType),
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'SAR', required: true },
    
    relatedId: { type: Schema.Types.ObjectId, index: true },
    relatedModel: { type: String },
    
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      required: true,
      index: true,
    },
    
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
    },
    
    gatewayTransactionId: { type: String, index: true },
    gatewayResponse: { type: Schema.Types.Mixed },
    
    paidAt: { type: Date },
    failedAt: { type: Date },
    refundedAt: { type: Date },
    
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'aqar_payments',
  }
);

// Indexes
PaymentSchema.index({ userId: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ gatewayTransactionId: 1 });
PaymentSchema.index({ createdAt: -1 });

// Static: Get standard fees
PaymentSchema.statics.getStandardFees = function () {
  return {
    SALE_LISTING: 999,           // SAR
    RENT_LISTING: 199,           // SAR
    DAILY_LISTING: 199,          // SAR
    EJAR_SINGLE: 299,            // SAR
    EJAR_MULTIPLE: 499,          // SAR
    BOOKING_PLATFORM_FEE: 0.15,  // 15%
  };
};

// Methods
PaymentSchema.methods.markAsCompleted = async function (
  this: IPayment,
  transactionId?: string,
  response?: Record<string, unknown>
) {
  this.status = PaymentStatus.COMPLETED;
  this.paidAt = new Date();
  if (transactionId) this.gatewayTransactionId = transactionId;
  if (response) this.gatewayResponse = response;
  await this.save();
};

PaymentSchema.methods.markAsFailed = async function (
  this: IPayment,
  response?: Record<string, unknown>
) {
  this.status = PaymentStatus.FAILED;
  this.failedAt = new Date();
  if (response) this.gatewayResponse = response;
  await this.save();
};

PaymentSchema.methods.markAsRefunded = async function (
  this: IPayment,
  refundAmount?: number
) {
  if (this.status !== PaymentStatus.COMPLETED) {
    throw new Error('Can only refund completed payments');
  }
  this.status = PaymentStatus.REFUNDED;
  this.refundedAt = new Date();
  if (refundAmount !== undefined) {
    this.amount = refundAmount;
  }
  await this.save();
};

const Payment: Model<IPayment> =
  mongoose.models.AqarPayment || mongoose.model<IPayment>('AqarPayment', PaymentSchema);

export default Payment;
