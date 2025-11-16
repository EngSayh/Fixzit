/**
 * Aqar Souq - Booking Model
 * 
 * Daily rental bookings (hotel-style)
 * Matches sa.aqar.fm Daily Rentals functionality
 */

import mongoose, { Schema, Document, Model } from 'mongoose'
import { getModel, MModel } from '@/src/types/mongoose-compat';;

/* eslint-disable no-unused-vars */
export enum BookingStatus {
  PENDING = 'PENDING',           // Awaiting host confirmation
  CONFIRMED = 'CONFIRMED',       // Host accepted
  CHECKED_IN = 'CHECKED_IN',     // Guest arrived
  CHECKED_OUT = 'CHECKED_OUT',   // Completed
  CANCELLED = 'CANCELLED',       // Cancelled by either party
  REJECTED = 'REJECTED',         // Host rejected
}
/* eslint-enable no-unused-vars */

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
    
    guestPhone: { type: String },
    guestNationalId: { type: String },
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

// Pre-save: Calculate derived fields
BookingSchema.pre('save', function (next) {
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
    this.nights = Math.max(0, (checkOutUTC - checkInUTC) / MS_PER_DAY);
    
    if (this.nights < 1) {
      return next(new Error('Check-out must be at least 1 day after check-in'));
    }
  }
  
  if (this.isModified('pricePerNight') || this.isModified('nights')) {
    this.totalPrice = this.pricePerNight * this.nights;
    this.platformFee = Math.round(this.totalPrice * 0.15); // 15% platform fee
    this.hostPayout = this.totalPrice - this.platformFee;
  }
  
  next();
});

// Methods
// eslint-disable-next-line no-unused-vars
BookingSchema.methods.confirm = async function (this: IBooking) {
  if (this.status !== BookingStatus.PENDING) {
    throw new Error('Only pending bookings can be confirmed');
  }
  this.status = BookingStatus.CONFIRMED;
  await this.save();
};

// eslint-disable-next-line no-unused-vars
BookingSchema.methods.checkIn = async function (this: IBooking) {
  if (this.status !== BookingStatus.CONFIRMED) {
    throw new Error('Only confirmed bookings can be checked in');
  }
  this.status = BookingStatus.CHECKED_IN;
  this.checkedInAt = new Date();
  await this.save();
};

// eslint-disable-next-line no-unused-vars
BookingSchema.methods.checkOut = async function (this: IBooking) {
  if (this.status !== BookingStatus.CHECKED_IN) {
    throw new Error('Only checked-in bookings can be checked out');
  }
  this.status = BookingStatus.CHECKED_OUT;
  this.checkedOutAt = new Date();
  await this.save();
};

BookingSchema.methods.cancel = async function (
  this: IBooking,
  userId: mongoose.Types.ObjectId,
  reason?: string
) {
  if ([BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED].includes(this.status)) {
    throw new Error('Cannot cancel completed or already cancelled booking');
  }
  
  this.status = BookingStatus.CANCELLED;
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancellationReason = reason;
  
  // Calculate refund based on cancellation policy
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const diffMs = this.checkInDate.getTime() - Date.now();
  const daysUntilCheckIn = Math.max(0, Math.floor(diffMs / MS_PER_DAY));
  
  if (daysUntilCheckIn >= 7) {
    this.refundAmount = this.totalPrice; // Full refund
  } else if (daysUntilCheckIn >= 3) {
    this.refundAmount = Math.round(this.totalPrice * 0.5); // 50% refund
  } else {
    this.refundAmount = 0; // No refund
  }
  
  await this.save();
};

const Booking =
  getModel<any>('AqarBooking', BookingSchema);

export default Booking;
