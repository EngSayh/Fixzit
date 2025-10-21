/**
 * Aqar Souq - Package Model
 * 
 * Listing packages for brokers/developers
 * Pricing: 50 SAR (5 ads), 150 SAR (20 ads), 250 SAR (50 ads)
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export enum PackageType {
  STARTER = 'STARTER',     // 50 SAR, 5 listings, 30 days
  STANDARD = 'STANDARD',   // 150 SAR, 20 listings, 30 days
  PREMIUM = 'PREMIUM',     // 250 SAR, 50 listings, 30 days
}

export interface IPackage extends Document {
  // User
  userId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  
  // Package details
  type: PackageType;
  listingsAllowed: number;
  listingsUsed: number;
  validityDays: number;
  
  // Pricing
  price: number;              // SAR
  
  // Payment
  paymentId?: mongoose.Types.ObjectId;
  paidAt?: Date;
  
  // Validity
  activatedAt?: Date;
  expiresAt?: Date;
  active: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  activate(): Promise<void>;
  consumeListing(session?: mongoose.ClientSession): Promise<void>;
  updateIfExpired(): Promise<void>;
}

// Model interface with statics
export interface IAqarPackageModel extends Model<IPackage> {
  getPricing(type: PackageType): { price: number; listings: number; days: number };
}

const PackageSchema = new Schema<IPackage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    
    type: {
      type: String,
      enum: Object.values(PackageType),
      required: true,
      index: true,
    },
    listingsAllowed: { type: Number, required: true, min: 1 },
    listingsUsed: { type: Number, default: 0, min: 0 },
    validityDays: { type: Number, required: true, min: 1 },
    
    price: { type: Number, required: true, min: 0 },
    
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    paidAt: { type: Date },
    
    activatedAt: { type: Date },
    expiresAt: { type: Date, index: true },
    active: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    collection: 'aqar_packages',
  }
);

// Indexes
PackageSchema.index({ userId: 1, active: 1, expiresAt: -1 });

// Static: Get package pricing
PackageSchema.statics.getPricing = function (type: PackageType) {
  const pricing = {
    [PackageType.STARTER]: { price: 50, listings: 5, days: 30 },
    [PackageType.STANDARD]: { price: 150, listings: 20, days: 30 },
    [PackageType.PREMIUM]: { price: 250, listings: 50, days: 30 },
  };
  return pricing[type];
};

// Methods
PackageSchema.methods.activate = async function (this: IPackage) {
  // Atomic activation to prevent concurrent activation races
  const now = new Date();
  const expiresAt = new Date(now.getTime() + this.validityDays * 24 * 60 * 60 * 1000);
  
  const result = await (this.constructor as unknown as typeof import('mongoose').Model).findOneAndUpdate(
    {
      _id: this._id,
      active: false,
      paidAt: { $exists: true, $ne: null }
    },
    {
      $set: {
        active: true,
        activatedAt: now,
        expiresAt: expiresAt
      }
    },
    { new: true }
  );
  
  if (!result) {
    // Determine specific error
    if (this.active) {
      throw new Error('Package already activated');
    }
    if (!this.paidAt) {
      throw new Error('Package not paid');
    }
    throw new Error('Failed to activate package');
  }
  
  // Update in-memory instance
  this.active = true;
  this.activatedAt = now;
  this.expiresAt = expiresAt;
};

PackageSchema.methods.consumeListing = async function (this: IPackage, session?: mongoose.ClientSession) {
  // Atomic update to avoid race conditions
  const now = new Date();
  const filter: Record<string, unknown> = {
    _id: this._id,
    active: true,
    $expr: { $lt: ['$listingsUsed', '$listingsAllowed'] },
  };
  
  // Add expiry check only if expiresAt is set
  if (this.expiresAt) {
    filter.expiresAt = { $gt: now };
  }
  
  const updated = await (this.constructor as unknown as typeof import('mongoose').Model).findOneAndUpdate(
    filter,
    { $inc: { listingsUsed: 1 } },
    { new: true, ...(session && { session }) }
  );
  
  if (!updated) {
    // Determine specific error - NOTE: State may have changed between findOneAndUpdate and this check
    // This provides best-effort error messaging for debugging
    if (!this.active) {
      throw new Error('Package not active');
    }
    if (this.expiresAt && this.expiresAt < now) {
      throw new Error('Package expired');
    }
    if (this.listingsUsed >= this.listingsAllowed) {
      throw new Error('Package listings exhausted');
    }
    // Catch-all: Could be expired, exhausted, or inactive (state changed after check)
    throw new Error('Failed to consume listing - package may be expired, exhausted, or inactive');
  }
  
  // Update current instance
  this.listingsUsed = updated.listingsUsed as number;
};

// Method to update package status if expired
// Uses atomic update to prevent TOCTOU race conditions
PackageSchema.methods.updateIfExpired = async function (this: IPackage) {
  // Atomic update - only one process will successfully flip the flag
  const result = await mongoose.model('AqarPackage').findOneAndUpdate(
    {
      _id: this._id,
      active: true,
      expiresAt: { $lt: new Date() }
    },
    {
      $set: { active: false }
    },
    { new: true }
  );
  
  // Update local instance if change occurred
  if (result) {
    this.active = false;
  }
};

const Package: IAqarPackageModel =
  (mongoose.models.AqarPackage as IAqarPackageModel) || mongoose.model<IPackage, IAqarPackageModel>('AqarPackage', PackageSchema);

export default Package;
