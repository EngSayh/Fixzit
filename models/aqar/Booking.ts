/**
 * Aqar Souq - Booking Model
 * 
 * Daily rental bookings (hotel-style)
 * Matches sa.aqar.fm Daily Rentals functionality
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export enum BookingStatus {
  PENDING = 'PENDING',           // Awaiting host confirmation
  CONFIRMED = 'CONFIRMED',       // Host accepted
  CHECKED_IN = 'CHECKED_IN',     // Guest arrived
  CHECKED_OUT = 'CHECKED_OUT',   // Completed
  CANCELLED = 'CANCELLED',       // Cancelled by either party
  REJECTED = 'REJECTED',         // Host rejected
}

export interface IBooking extends Document {
  // Property
  listingId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  
  // Parties
  guestId: mongoose.Types.ObjectId;
  hostId: mongoose.Types.ObjectId;
  
  // Dates
  checkInDate: Date;
  checkOutDate: Date;
  nights: number;
  
  // Pricing
  pricePerNight: number;        // SAR
  totalPrice: number;           // SAR
  platformFee: number;          // SAR (15%)
  hostPayout: number;           // SAR
  
  // Guests
  adults: number;
  children: number;
  infants: number;
  
  // Status
  status: BookingStatus;
  
  // Communication
  guestPhone?: string;
  guestNationalId?: string;     // Nafath verified
  specialRequests?: string;
  hostNotes?: string;
  
  // Payment
  paymentId?: mongoose.Types.ObjectId;
  paidAt?: Date;
  
  // Cancellation
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancellationReason?: string;
  refundAmount?: number;        // SAR
  
  // Check-in/out
  checkedInAt?: Date;
  checkedOutAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'AqarListing', required: true, index: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    
    guestId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    checkInDate: { type: Date, required: true, index: true },
    checkOutDate: { type: Date, required: true, index: true },
    nights: { type: Number, required: true, min: 1 },
    
    pricePerNight: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0, default: 0 },
    hostPayout: { type: Number, required: true, min: 0 },
    
    adults: { type: Number, required: true, min: 1 },
    children: { type: Number, default: 0, min: 0 },
    infants: { type: Number, default: 0, min: 0 },
    
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
      required: true,
      index: true,
    },
    
    guestPhone: { type: String, select: false },
    guestNationalId: { type: String, select: false },
    specialRequests: { type: String, maxlength: 1000 },
    hostNotes: { type: String, maxlength: 1000 },
    
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    paidAt: { type: Date },
    
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: { type: String, maxlength: 500 },
    refundAmount: { type: Number, min: 0 },
    
    checkedInAt: { type: Date },
    checkedOutAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'aqar_bookings',
  }
);

// Indexes
BookingSchema.index({ listingId: 1, checkInDate: 1, checkOutDate: 1 });
BookingSchema.index({ guestId: 1, status: 1, checkInDate: -1 });
BookingSchema.index({ hostId: 1, status: 1, checkInDate: -1 });
BookingSchema.index({ createdAt: -1 });

// Pre-validate: Calculate derived fields (must run before validation so required fields are present)
BookingSchema.pre('validate', function (next) {
  if (this.isModified('checkInDate') || this.isModified('checkOutDate')) {
    // Normalize to UTC date-only (ignore time-of-day)
    const checkInUTC = Date.UTC(
      this.checkInDate.getUTCFullYear(),
      this.checkInDate.getUTCMonth(),
      this.checkInDate.getUTCDate()
    );
    const checkOutUTC = Date.UTC(
      this.checkOutDate.getUTCFullYear(),
      this.checkOutDate.getUTCMonth(),
      this.checkOutDate.getUTCDate()
    );
    
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const nightsDiff = (checkOutUTC - checkInUTC) / MS_PER_DAY;
    
    // Validate that check-out is at least 1 day after check-in (don't mask with Math.max)
    if (nightsDiff < 1) {
      return next(new Error('Check-out must be at least 1 day after check-in'));
    }
    
    this.nights = nightsDiff;
  }
  
  if (this.isModified('pricePerNight') || this.isModified('nights')) {
    this.totalPrice = this.pricePerNight * this.nights;
    this.platformFee = Math.round(this.totalPrice * 0.15); // 15% platform fee, rounded to SAR
    this.hostPayout = Math.round(this.totalPrice - this.platformFee); // Also rounded to SAR for consistency
  }
  
  next();
});

// Methods - Use atomic updates with state preconditions to prevent race conditions
BookingSchema.methods.confirm = async function (this: IBooking) {
  const result = await mongoose.model<IBooking>('AqarBooking').findOneAndUpdate(
    { _id: this._id, status: BookingStatus.PENDING },
    { $set: { status: BookingStatus.CONFIRMED } },
    { new: true }
  );
  
  if (!result) {
    throw new Error('Cannot confirm: booking not found or not in PENDING status');
  }
  
  // Update local instance
  this.status = result.status;
  return result;
};

BookingSchema.methods.checkIn = async function (this: IBooking) {
  const result = await mongoose.model<IBooking>('AqarBooking').findOneAndUpdate(
    { _id: this._id, status: BookingStatus.CONFIRMED },
    { $set: { status: BookingStatus.CHECKED_IN, checkedInAt: new Date() } },
    { new: true }
  );
  
  if (!result) {
    throw new Error('Cannot check in: booking not found or not in CONFIRMED status');
  }
  
  // Update local instance
  this.status = result.status;
  this.checkedInAt = result.checkedInAt;
  return result;
};

BookingSchema.methods.checkOut = async function (this: IBooking) {
  const result = await mongoose.model<IBooking>('AqarBooking').findOneAndUpdate(
    { _id: this._id, status: BookingStatus.CHECKED_IN },
    { $set: { status: BookingStatus.CHECKED_OUT, checkedOutAt: new Date() } },
    { new: true }
  );
  
  if (!result) {
    throw new Error('Cannot check out: booking not found or not in CHECKED_IN status');
  }
  
  // Update local instance
  this.status = result.status;
  this.checkedOutAt = result.checkedOutAt;
  return result;
};

BookingSchema.methods.cancel = async function (
  this: IBooking,
  userId: mongoose.Types.ObjectId,
  reason?: string
) {
  // Calculate refund based on cancellation policy (before atomic update)
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const diffMs = this.checkInDate.getTime() - Date.now();
  const daysUntilCheckIn = Math.max(0, Math.floor(diffMs / MS_PER_DAY));
  
  let refundAmount: number;
  if (daysUntilCheckIn >= 7) {
    refundAmount = this.totalPrice; // Full refund
  } else if (daysUntilCheckIn >= 3) {
    refundAmount = Math.round(this.totalPrice * 0.5); // 50% refund
  } else {
    refundAmount = 0; // No refund
  }
  
  // Atomic update with preconditions: only allow cancellation from non-terminal states
  const result = await mongoose.model<IBooking>('AqarBooking').findOneAndUpdate(
    { 
      _id: this._id, 
      status: { $nin: [BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED] }
    },
    { 
      $set: { 
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: reason,
        refundAmount
      } 
    },
    { new: true }
  );
  
  if (!result) {
    throw new Error('Cannot cancel: booking not found or already in terminal state (CHECKED_OUT or CANCELLED)');
  }
  
  // Update local instance
  this.status = result.status;
  this.cancelledAt = result.cancelledAt;
  this.cancelledBy = result.cancelledBy;
  this.cancellationReason = result.cancellationReason;
  this.refundAmount = result.refundAmount;
  return result;
};

const Booking: Model<IBooking> =
  mongoose.models.AqarBooking || mongoose.model<IBooking>('AqarBooking', BookingSchema);

export default Booking;
