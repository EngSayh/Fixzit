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
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED', // Partially refunded
  REFUNDED = 'REFUNDED',             // Fully refunded
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
  refundAmount?: number;           // SAR - preserved original amount
  
  // Integration
  invoiceId?: mongoose.Types.ObjectId;     // Link to Finance Invoice
  
  // Metadata
  metadata?: Record<string, unknown>;
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
    },
    
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
    },
    
    gatewayTransactionId: { type: String },
    gatewayResponse: { type: Schema.Types.Mixed },
    
    paidAt: { type: Date },
    failedAt: { type: Date },
    refundedAt: { type: Date },
    refundAmount: { type: Number, min: 0, default: null },
    
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'aqar_payments',
  }
);

// Indexes (compound index covers status queries)
PaymentSchema.index({ userId: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ gatewayTransactionId: 1 });

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
  if (this.status !== PaymentStatus.COMPLETED && this.status !== PaymentStatus.PARTIALLY_REFUNDED) {
    throw new Error('Can only refund completed or partially refunded payments');
  }
  
  const actualRefundAmount = refundAmount ?? this.amount;
  
  // Validate refund amount
  if (actualRefundAmount <= 0 || actualRefundAmount > this.amount) {
    throw new Error(`Refund amount must be between 0 and ${this.amount}`);
  }
  
  // Check for double refunds
  const totalRefunded = (this.refundAmount ?? 0) + actualRefundAmount;
  if (totalRefunded > this.amount) {
    throw new Error(`Total refund (${totalRefunded}) exceeds payment amount (${this.amount})`);
  }
  
  // Update refund amount
  this.refundAmount = totalRefunded;
  
  // Set status based on refund completeness
  this.status = totalRefunded >= this.amount 
    ? PaymentStatus.REFUNDED 
    : PaymentStatus.PARTIALLY_REFUNDED;
    
  this.refundedAt = new Date();
  await this.save();
};

const Payment: Model<IPayment> =
  mongoose.models.AqarPayment || mongoose.model<IPayment>('AqarPayment', PaymentSchema);

export default Payment;
