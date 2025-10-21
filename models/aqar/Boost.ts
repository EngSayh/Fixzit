/**
 * Aqar Souq - Boost Model
 * 
 * Paid listing promotions (featured, pinned, highlighted)
 * Increases visibility in search results
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export enum BoostType {
  FEATURED = 'FEATURED',       // Top of search, homepage
  PINNED = 'PINNED',           // Stays at top for duration
  HIGHLIGHTED = 'HIGHLIGHTED', // Visual highlight in results
}

export interface IBoost extends Document {
  // Listing
  listingId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  
  // Boost details
  type: BoostType;
  durationDays: number;
  
  // Pricing
  price: number;              // SAR
  
  // Payment
  paymentId?: mongoose.Types.ObjectId;
  paidAt?: Date;
  
  // Validity
  activatedAt?: Date;
  expiresAt?: Date;
  active: boolean;
  
  // Analytics
  impressions: number;
  clicks: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const BoostSchema = new Schema<IBoost>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'AqarListing', required: true, index: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    type: {
      type: String,
      enum: Object.values(BoostType),
      required: true,
      index: true,
    },
    durationDays: { type: Number, required: true, min: 1 },
    
    price: { type: Number, required: true, min: 0 },
    
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    paidAt: { type: Date },
    
    activatedAt: { type: Date },
    expiresAt: { type: Date, index: true },
    active: { type: Boolean, default: false, index: true },
    
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'aqar_boosts',
  }
);

// Indexes
BoostSchema.index({ listingId: 1, active: 1, expiresAt: -1 });
BoostSchema.index({ userId: 1, active: 1 });

// Static: Get boost pricing
BoostSchema.statics.getPricing = function (type: BoostType, days: number) {
  const MAX_DAYS = 365; // Maximum allowed boost duration to prevent overflow
  
  // Validate type
  if (!Object.values(BoostType).includes(type)) {
    throw new Error('Invalid boost type');
  }
  
  // Validate days
  if (!Number.isFinite(days) || days <= 0 || !Number.isInteger(days)) {
    throw new Error('Days must be a positive integer');
  }
  
  if (days > MAX_DAYS) {
    throw new Error(`Days cannot exceed ${MAX_DAYS}`);
  }
  
  const basePrice = {
    [BoostType.FEATURED]: 100,      // 100 SAR per day
    [BoostType.PINNED]: 50,         // 50 SAR per day
    [BoostType.HIGHLIGHTED]: 25,    // 25 SAR per day
  };
  return basePrice[type] * days;
};

// Methods
BoostSchema.methods.activate = async function (this: IBoost) {
  // Atomic activation: check preconditions and update in single operation
  // Prevents race conditions where multiple concurrent activations could occur
  const now = new Date();
  const expiresAt = new Date(now.getTime() + this.durationDays * 24 * 60 * 60 * 1000);
  
  const result = await (this.constructor as typeof import('mongoose').Model).findOneAndUpdate(
    {
      _id: this._id,
      active: false, // Precondition: must not be already active
      paidAt: { $ne: null }, // Precondition: must be paid
    },
    {
      $set: {
        active: true,
        activatedAt: now,
        expiresAt: expiresAt,
      },
    },
    { new: true } // Return updated document
  );
  
  if (!result) {
    // Check why activation failed
    if (this.active) {
      throw new Error('Boost already activated');
    }
    if (!this.paidAt) {
      throw new Error('Boost not paid');
    }
    throw new Error('Boost activation failed due to concurrent modification');
  }
  
  // Update current document instance with new values
  this.active = true;
  this.activatedAt = now;
  this.expiresAt = expiresAt;
};

BoostSchema.methods.recordImpression = async function (this: IBoost) {
  await (this.constructor as typeof import('mongoose').Model).updateOne(
    { _id: this._id },
    { $inc: { impressions: 1 } }
  );
};

BoostSchema.methods.recordClick = async function (this: IBoost) {
  await (this.constructor as typeof import('mongoose').Model).updateOne(
    { _id: this._id },
    { $inc: { clicks: 1 } }
  );
};

BoostSchema.methods.checkExpiry = async function (this: IBoost) {
  // Atomic expiry check: update all expired boosts in single operation
  // Prevents race conditions where multiple concurrent checks could occur
  const now = new Date();
  
  const result = await (this.constructor as typeof import('mongoose').Model).findOneAndUpdate(
    {
      _id: this._id,
      active: true, // Only check active boosts
      expiresAt: { $lt: now }, // Only boosts that have expired
    },
    {
      $set: { active: false },
    },
    { new: true } // Return updated document
  );
  
  if (result) {
    // Boost was expired and deactivated
    this.active = false;
  }
};

const Boost: Model<IBoost> =
  mongoose.models.AqarBoost || mongoose.model<IBoost>('AqarBoost', BoostSchema);

export default Boost;
