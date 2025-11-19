import { Schema, type Document } from 'mongoose';
import { getModel } from '@/src/types/mongoose-compat';

/**
 * RMA (Return Merchandise Authorization) Model
 * Manages the return process from initiation through inspection and refund
 */

export interface IRMAItem {
  orderItemId: string;
  listingId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  reason: string;
  returnReason: 'defective' | 'wrong_item' | 'not_as_described' | 'no_longer_needed' | 'damaged_in_shipping' | 'other';
  imageUrls?: string[]; // Evidence photos
}

export interface IRMATimeline {
  status: string;
  timestamp: Date;
  note?: string;
  performedBy?: string;
}

export interface IRMAInspection {
  inspectedAt: Date;
  inspectedBy: string;
  condition: 'as_new' | 'minor_wear' | 'damaged' | 'defective' | 'wrong_item';
  notes: string;
  approved: boolean;
  restockable: boolean;
  photosUrls?: string[];
}

export interface IRMARefund {
  amount: number;
  method: 'original_payment' | 'wallet' | 'bank_transfer';
  processedAt?: Date;
  transactionId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface IRMAShipping {
  carrier?: string;
  trackingNumber?: string;
  labelUrl?: string;
  pickupScheduled?: Date;
  pickupAddress?: string;
  deliveredAt?: Date;
  shippingCost: number;
  paidBy: 'buyer' | 'seller' | 'platform';
}

export interface IRMA extends Document {
  rmaId: string;
  orderId: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  
  // Items being returned
  items: IRMAItem[];
  
  // Status workflow
  status: 'initiated' | 'approved' | 'rejected' | 'label_generated' | 'in_transit' | 
          'received' | 'inspecting' | 'inspected' | 'completed' | 'cancelled';
  
  // Auto-approval
  autoApproved: boolean;
  approvalReason?: string;
  approvedAt?: Date;
  
  // Return window
  returnWindowDays: number;
  returnDeadline: Date;
  
  // Shipping
  shipping: IRMAShipping;
  
  // Inspection
  inspection?: IRMAInspection;
  
  // Refund
  refund: IRMARefund;
  
  // Communication
  buyerNotes?: string;
  sellerNotes?: string;
  adminNotes?: string;
  
  // Timeline
  timeline: IRMATimeline[];
  
  // Policy violation
  isFraudSuspected: boolean;
  fraudReason?: string;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  addTimelineEvent(status: string, note?: string, performedBy?: string): void;
  approve(flagOrActor?: boolean | string, reason?: string): void;
  reject(reason: string, performedBy: string): void;
  generateLabel(carrier: string, trackingNumber: string, labelUrl: string): void;
  markInTransit(): void;
  markReceived(): void;
  startInspection(): void;
  completeInspection(
    inspectedBy: string,
    condition: string,
    approved: boolean,
    restockable: boolean,
    notes: string,
    photos?: string[]
  ): void;
  initiateRefund(): void;
  completeRefund(refundInfo: string | { transactionId: string; processedAt?: Date; status?: IRMARefund['status'] }): void;
  cancel(reason: string, performedBy: string): void;
  isWithinReturnWindow(): boolean;
  calculateRefundAmount(): number;
  flagFraud(reason: string): void;
}

const RMAItemSchema = new Schema<IRMAItem>({
  orderItemId: { type: String, required: true },
  listingId: { type: String, required: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  reason: { type: String, required: true },
  returnReason: { 
    type: String, 
    enum: ['defective', 'wrong_item', 'not_as_described', 'no_longer_needed', 'damaged_in_shipping', 'other'],
    required: true 
  },
  imageUrls: [String]
}, { _id: false });

const RMATimelineSchema = new Schema<IRMATimeline>({
  status: { type: String, required: true },
  timestamp: { type: Date, required: true, default: Date.now },
  note: String,
  performedBy: String
}, { _id: false });

const RMAInspectionSchema = new Schema<IRMAInspection>({
  inspectedAt: { type: Date, required: true },
  inspectedBy: { type: String, required: true },
  condition: { 
    type: String, 
    enum: ['as_new', 'minor_wear', 'damaged', 'defective', 'wrong_item'],
    required: true 
  },
  notes: { type: String, required: true },
  approved: { type: Boolean, required: true },
  restockable: { type: Boolean, required: true },
  photosUrls: [String]
}, { _id: false });

const RMARefundSchema = new Schema<IRMARefund>({
  amount: { type: Number, required: true },
  method: { 
    type: String, 
    enum: ['original_payment', 'wallet', 'bank_transfer'],
    default: 'original_payment'
  },
  processedAt: Date,
  transactionId: String,
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  }
}, { _id: false });

const RMAShippingSchema = new Schema<IRMAShipping>({
  carrier: String,
  trackingNumber: String,
  labelUrl: String,
  pickupScheduled: Date,
  pickupAddress: String,
  deliveredAt: Date,
  shippingCost: { type: Number, default: 0 },
  paidBy: { 
    type: String, 
    enum: ['buyer', 'seller', 'platform'],
    default: 'seller'
  }
}, { _id: false });

const RMASchema = new Schema<IRMA>({
  rmaId: { type: String, required: true, unique: true, index: true },
  orderId: { type: String, required: true, index: true },
  orderNumber: { type: String, required: true },
  buyerId: { type: String, required: true, index: true },
  sellerId: { type: String, required: true, index: true },
  
  items: [RMAItemSchema],
  
  status: { 
    type: String, 
    enum: ['initiated', 'approved', 'rejected', 'label_generated', 'in_transit', 
           'received', 'inspecting', 'inspected', 'completed', 'cancelled'],
    default: 'initiated',
    index: true
  },
  
  autoApproved: { type: Boolean, default: false },
  approvalReason: String,
  approvedAt: Date,
  
  returnWindowDays: { type: Number, default: 30 },
  returnDeadline: { type: Date, required: true },
  
  shipping: { type: RMAShippingSchema, default: () => ({}) },
  inspection: RMAInspectionSchema,
  refund: { type: RMARefundSchema, required: true },
  
  buyerNotes: String,
  sellerNotes: String,
  adminNotes: String,
  
  timeline: [RMATimelineSchema],
  
  isFraudSuspected: { type: Boolean, default: false },
  fraudReason: String,
  
  completedAt: Date
}, {
  timestamps: true,
  collection: 'souq_rmas'
});

// Indexes
RMASchema.index({ status: 1, createdAt: -1 });
RMASchema.index({ buyerId: 1, status: 1 });
RMASchema.index({ sellerId: 1, status: 1 });
RMASchema.index({ sellerId: 1, createdAt: -1 });
RMASchema.index({ returnDeadline: 1 });

// Methods

/**
 * Add timeline event
 */
RMASchema.methods.addTimelineEvent = function(status: string, note?: string, performedBy?: string): void {
  this.timeline.push({
    status,
    timestamp: new Date(),
    note,
    performedBy
  });
};

/**
 * Approve RMA (manual or auto)
 */
RMASchema.methods.approve = function(flagOrActor: boolean | string = false, reason?: string): void {
  const isAuto = typeof flagOrActor === 'boolean' ? flagOrActor : false;
  const performedBy =
    typeof flagOrActor === 'string' ? flagOrActor : isAuto ? 'system' : 'admin';

  this.status = 'approved';
  this.autoApproved = isAuto;
  this.approvalReason = reason || (isAuto ? 'Auto-approved per policy' : 'Manually approved');
  this.approvedAt = new Date();
  
  this.addTimelineEvent('approved', this.approvalReason, performedBy);
};

/**
 * Reject RMA
 */
RMASchema.methods.reject = function(reason: string, performedBy: string): void {
  this.status = 'rejected';
  this.adminNotes = reason;
  
  this.addTimelineEvent('rejected', reason, performedBy);
};

/**
 * Generate return label
 */
RMASchema.methods.generateLabel = function(carrier: string, trackingNumber: string, labelUrl: string): void {
  this.status = 'label_generated';
  this.shipping.carrier = carrier;
  this.shipping.trackingNumber = trackingNumber;
  this.shipping.labelUrl = labelUrl;
  
  this.addTimelineEvent('label_generated', `${carrier} - ${trackingNumber}`, 'system');
};

/**
 * Mark as in transit
 */
RMASchema.methods.markInTransit = function(): void {
  this.status = 'in_transit';
  this.addTimelineEvent('in_transit', 'Package picked up by carrier', 'system');
};

/**
 * Mark as received at warehouse
 */
RMASchema.methods.markReceived = function(): void {
  this.status = 'received';
  this.shipping.deliveredAt = new Date();
  this.addTimelineEvent('received', 'Package received at warehouse', 'system');
};

/**
 * Start inspection
 */
RMASchema.methods.startInspection = function(): void {
  this.status = 'inspecting';
  this.addTimelineEvent('inspecting', 'Quality inspection in progress', 'system');
};

/**
 * Complete inspection
 */
RMASchema.methods.completeInspection = function(
  inspectedBy: string,
  condition: string,
  approved: boolean,
  restockable: boolean,
  notes: string,
  photos?: string[]
): void {
  this.inspection = {
    inspectedAt: new Date(),
    inspectedBy,
    condition: condition as 'as_new' | 'minor_wear' | 'damaged' | 'defective' | 'wrong_item',
    notes,
    approved,
    restockable,
    photosUrls: photos
  };
  
  this.addTimelineEvent('inspection_complete', `Condition: ${condition}, Approved: ${approved}`, inspectedBy);
  this.status = approved ? 'inspected' : 'completed';
  
  if (approved) {
    this.initiateRefund();
  } else {
    this.completedAt = new Date();
    this.addTimelineEvent('completed', 'Return rejected after inspection', 'system');
  }
};

/**
 * Initiate refund
 */
RMASchema.methods.initiateRefund = function(): void {
  this.refund.status = 'processing';
  this.addTimelineEvent('refund_initiated', `Refund amount: ${this.refund.amount} SAR`, 'system');
};

/**
 * Complete refund
 */
RMASchema.methods.completeRefund = function(
  refundInfo: string | { transactionId: string; processedAt?: Date; status?: IRMARefund['status'] }
): void {
  const info =
    typeof refundInfo === 'string'
      ? { transactionId: refundInfo }
      : refundInfo;

  this.refund.status = info.status || 'completed';
  this.refund.processedAt = info.processedAt || new Date();
  this.refund.transactionId = info.transactionId;
  
  this.status = 'completed';
  this.completedAt = new Date();
  
  this.addTimelineEvent('completed', `Refund completed: ${info.transactionId}`, 'system');
};

/**
 * Cancel RMA
 */
RMASchema.methods.cancel = function(reason: string, performedBy: string): void {
  this.status = 'cancelled';
  this.adminNotes = reason;
  this.completedAt = new Date();
  
  this.addTimelineEvent('cancelled', reason, performedBy);
};

/**
 * Check if return window is valid
 */
RMASchema.methods.isWithinReturnWindow = function(): boolean {
  return new Date() <= this.returnDeadline;
};

/**
 * Calculate refund amount
 */
RMASchema.methods.calculateRefundAmount = function(): number {
  return this.items.reduce(
    (sum: number, item: IRMAItem) => sum + (item.unitPrice * item.quantity),
    0
  );
};

/**
 * Flag as potential fraud
 */
RMASchema.methods.flagFraud = function(reason: string): void {
  this.isFraudSuspected = true;
  this.fraudReason = reason;
  this.addTimelineEvent('fraud_flagged', reason, 'system');
};

export const SouqRMA = getModel<IRMA>('SouqRMA', RMASchema);
