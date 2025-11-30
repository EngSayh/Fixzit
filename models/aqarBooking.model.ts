/**
 * Aqar Souq - Booking Model (hotel-style daily rentals)
 * 
 * **Production Features:**
 * - Hard conflict prevention via reservedNights[] + unique partial index
 * - UTC-normalized date math (no timezone bugs)
 * - Tenant-scoped indexes for multi-tenant performance
 * - Atomic createWithAvailability() with race protection
 * - Guarded status transitions (confirm/checkIn/checkOut/cancel)
 * - Auto-computed pricing: totalPrice, platformFee (15%), hostPayout
 * - Query helpers: isAvailable(), overlaps()
 * 
 * **Conflict Strategy:**
 * The unique partial index on (orgId, listingId, reservedNights) where status IN [PENDING, CONFIRMED, CHECKED_IN]
 * is the ONLY reliable way to prevent double-bookings at DB level without heavyweight transactions.
 * Each booking has an array of UTC date-only nights [checkIn..checkOut-1].
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import type { MModel } from '@/src/types/mongoose-compat';
import { EscrowSource, EscrowState, type EscrowStateValue } from '@/server/models/finance/EscrowAccount';
import { tenantIsolationPlugin } from '@/server/plugins/tenantIsolation';
import { encryptField, decryptField, isEncrypted } from '@/lib/security/encryption';
import { logger } from '@/lib/logger';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
];

export interface IBooking extends Document {
  // Property / tenancy
  listingId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;

  // Parties
  guestId: mongoose.Types.ObjectId;
  hostId: mongoose.Types.ObjectId;

  // Dates (UTC date-only, checkOutDate is exclusive)
  checkInDate: Date;     // inclusive (00:00 UTC)
  checkOutDate: Date;    // exclusive (00:00 UTC next day)
  nights: number;
  reservedNights: Date[]; // array of UTC date-only nights [checkIn..checkOut-1]

  // Pricing (SAR)
  pricePerNight: number;     // >= 0
  totalPrice: number;        // computed: pricePerNight × nights
  platformFee: number;       // computed: 15% of totalPrice (consider moving to org config)
  hostPayout: number;        // computed: totalPrice - platformFee

  // Guests
  adults: number;
  children: number;
  infants: number;

  // Status
  status: BookingStatus;

  // Communication
  guestPhone?: string;
  guestNationalId?: string;
  specialRequests?: string;
  hostNotes?: string;

  // Payment
  paymentId?: mongoose.Types.ObjectId;
  paidAt?: Date;

  // Cancellation
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancellationReason?: string;
  refundAmount?: number;

  // Check-in/out
  checkedInAt?: Date;
  checkedOutAt?: Date;

  // Escrow
  escrow?: {
    accountId?: mongoose.Types.ObjectId;
    status?: EscrowStateValue;
    releaseAfter?: Date;
    lastEventId?: string;
    idempotencyKey?: string;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  confirm(): Promise<void>;
  checkIn(): Promise<void>;
  checkOut(): Promise<void>;
  cancel(userId: mongoose.Types.ObjectId, reason?: string): Promise<void>;
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
    reservedNights: [{ type: Date, index: true }], // filled per-night in UTC

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

    guestPhone: { type: String, trim: true },
    guestNationalId: { type: String, trim: true },
    specialRequests: { type: String, maxlength: 1000, trim: true },
    hostNotes: { type: String, maxlength: 1000, trim: true },

    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    paidAt: { type: Date },

    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: { type: String, maxlength: 500, trim: true },
    refundAmount: { type: Number, min: 0 },

    checkedInAt: { type: Date },
    checkedOutAt: { type: Date },
    escrow: {
      accountId: { type: Schema.Types.ObjectId, ref: 'EscrowAccount', index: true },
      status: { type: String, enum: Object.values(EscrowState) },
      releaseAfter: { type: Date },
      lastEventId: { type: String },
      idempotencyKey: { type: String },
    },
  },
  {
    timestamps: true,
    collection: 'aqar_bookings',
  }
);

/* ---------------- Indexes ---------------- */

// Query patterns: bookings by listing/guest/host within tenant, sorted by date
BookingSchema.index({ orgId: 1, listingId: 1, checkInDate: 1, checkOutDate: 1 });
BookingSchema.index({ orgId: 1, guestId: 1, status: 1, checkInDate: -1 });
BookingSchema.index({ orgId: 1, hostId: 1, status: 1, checkInDate: -1 });
BookingSchema.index({ createdAt: -1 });

/**
 * Hard no-overlap guarantee: unique per (orgId, listingId, reservedNight) while status is active.
 * This prevents two bookings from reserving the same night for the same listing.
 * Each booking has reservedNights[] with one UTC Date per booked night.
 * 
 * **Critical:** This is the ONLY reliable way to enforce no overlaps at DB level in MongoDB
 * without heavyweight transactions on date ranges.
 */
BookingSchema.index(
  { orgId: 1, listingId: 1, reservedNights: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ACTIVE_STATUSES } },
    name: 'uniq_active_reservation_per_night',
  }
);

// =============================================================================
// DATA-001 FIX: Apply tenantIsolationPlugin for multi-tenant data isolation
// CRITICAL: Prevents cross-tenant data access in Aqar Marketplace
// =============================================================================
BookingSchema.plugin(tenantIsolationPlugin);

// =============================================================================
// SEC-002 FIX: PII Encryption for guest personal data (GDPR Article 32)
// Encrypts nationalId and phone for data protection compliance
// =============================================================================
const BOOKING_ENCRYPTED_FIELDS = {
  'guestNationalId': 'Guest National ID',
  'guestPhone': 'Guest Phone',
} as const;

/**
 * Pre-save hook: Encrypt guest PII fields
 */
BookingSchema.pre('save', function(next) {
  try {
    for (const [field, fieldName] of Object.entries(BOOKING_ENCRYPTED_FIELDS)) {
      const value = (this as any)[field];
      if (value && !isEncrypted(value)) {
        (this as any)[field] = encryptField(value, `booking.${field}`);
        logger.info('booking:pii_encrypted', {
          action: 'pre_save_encrypt',
          fieldPath: field,
          fieldName,
          bookingId: this._id?.toString(),
        });
      }
    }
    next();
  } catch (error) {
    logger.error('booking:encryption_failed', {
      action: 'pre_save_encrypt',
      error: error instanceof Error ? error.message : String(error),
    });
    next(error as Error);
  }
});

/**
 * Pre-findOneAndUpdate hook: Encrypt guest PII fields during updates
 */
BookingSchema.pre('findOneAndUpdate', function(next) {
  try {
    const update = this.getUpdate() as Record<string, any>;
    if (!update) return next();
    
    const updateData = update.$set ?? update;
    
    for (const [field, fieldName] of Object.entries(BOOKING_ENCRYPTED_FIELDS)) {
      const value = updateData[field];
      if (value !== undefined && value !== null && !isEncrypted(String(value))) {
        if (update.$set) {
          update.$set[field] = encryptField(String(value), `booking.${field}`);
        } else {
          update[field] = encryptField(String(value), `booking.${field}`);
        }
        logger.info('booking:pii_encrypted', {
          action: 'pre_findOneAndUpdate_encrypt',
          fieldPath: field,
          fieldName,
        });
      }
    }
    next();
  } catch (error) {
    logger.error('booking:encryption_failed', {
      action: 'pre_findOneAndUpdate_encrypt',
      error: error instanceof Error ? error.message : String(error),
    });
    next(error as Error);
  }
});

/**
 * Post-find hooks: Decrypt guest PII fields after retrieval
 */
function decryptBookingPIIFields(doc: any) {
  if (!doc) return;
  try {
    for (const field of Object.keys(BOOKING_ENCRYPTED_FIELDS)) {
      const value = doc[field];
      if (value && isEncrypted(value)) {
        doc[field] = decryptField(value, `booking.${field}`);
      }
    }
  } catch (error) {
    logger.error('booking:decryption_failed', {
      action: 'post_find_decrypt',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

BookingSchema.post('find', function(docs: any[]) {
  if (Array.isArray(docs)) docs.forEach(decryptBookingPIIFields);
});

BookingSchema.post('findOne', function(doc: any) {
  decryptBookingPIIFields(doc);
});

BookingSchema.post('findOneAndUpdate', function(doc: any) {
  decryptBookingPIIFields(doc);
});

/* ---------------- Helpers ---------------- */

const MS_PER_DAY = 86_400_000;

/**
 * Normalize to UTC date-only (00:00:00.000 UTC)
 * Strips time component to avoid timezone issues
 */
function toUTCDateOnly(d: Date): Date {
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return new Date(t);
}

/**
 * Enumerate all nights (UTC date-only) from checkIn to checkOut-1
 * Example: checkIn=2025-01-01, checkOut=2025-01-03 => [2025-01-01, 2025-01-02]
 */
function enumerateNightsUTC(checkIn: Date, checkOut: Date): Date[] {
  const start = toUTCDateOnly(checkIn);
  const end = toUTCDateOnly(checkOut);
  const out: Date[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += MS_PER_DAY) {
    out.push(new Date(t));
  }
  return out;
}

/* ---------------- Pre-save: derived fields ---------------- */

/**
 * Pre-validate hook: compute nights, normalize dates to UTC, populate reservedNights
 * This runs before validation, ensuring nights >= 1 constraint is checked
 */
BookingSchema.pre('validate', function (next) {
  // Normalize to UTC date-only and compute nights
  if (this.isModified('checkInDate') || this.isModified('checkOutDate')) {
    const inUTC = toUTCDateOnly(this.checkInDate);
    const outUTC = toUTCDateOnly(this.checkOutDate);
    const nights = Math.max(0, Math.round((outUTC.getTime() - inUTC.getTime()) / MS_PER_DAY));
    this.nights = nights;

    if (this.nights < 1) {
      return next(new Error('Check-out must be at least 1 day after check-in'));
    }

    this.checkInDate = inUTC;
    this.checkOutDate = outUTC;
    this.reservedNights = enumerateNightsUTC(inUTC, outUTC);
  }

  // Auto-compute pricing (totalPrice, platformFee, hostPayout)
  if (this.isModified('pricePerNight') || this.isModified('nights') || this.isNew) {
    const total = Math.max(0, (this.pricePerNight || 0) * (this.nights || 0));
    // Platform fee: 15% default, configurable via PLATFORM_FEE_PERCENTAGE env var
    const feePercentage = Number(process.env.PLATFORM_FEE_PERCENTAGE) || 15;
    const platform = Math.round(total * (feePercentage / 100));
    const payout = Math.max(0, total - platform);
    this.totalPrice = total;
    this.platformFee = platform;
    this.hostPayout = payout;
  }

  next();
});

// =============================================================================
// DATA-003 FIX: Pre-findOneAndUpdate hook to recalculate derived fields
// CRITICAL: Without this, Booking.findOneAndUpdate() bypasses derived field computation
// This could lead to data inconsistency (wrong nights count, pricing, reservedNights)
// 
// ENHANCED: Now fetches existing document for partial updates to ensure derived
// fields are always recalculated correctly. Also enforces runValidators.
// =============================================================================
BookingSchema.pre('findOneAndUpdate', async function (next) {
  try {
    // Enforce validation and return updated document
    this.setOptions({ runValidators: true, new: true, context: 'query' });
    
    const update = this.getUpdate() as Record<string, any>;
    if (!update) return next();
    
    const updateData = update.$set ?? update;
    
    // Check if dates or price are being updated
    const hasCheckInUpdate = updateData.checkInDate !== undefined;
    const hasCheckOutUpdate = updateData.checkOutDate !== undefined;
    const hasPriceUpdate = updateData.pricePerNight !== undefined;
    
    // If any date or price field is being updated, we need to recalculate derived fields
    if (hasCheckInUpdate || hasCheckOutUpdate || hasPriceUpdate) {
      // Fetch existing document to get current values for partial updates
      // IMPORTANT: Attach session to respect active transactions
      const session = this.getOptions().session ?? null;
      // Use explicit type for lean() result (plain object, not Mongoose Document)
      const existing = await this.model.findOne(this.getQuery()).session(session).lean().exec() as {
        checkInDate?: Date;
        checkOutDate?: Date;
        pricePerNight?: number;
      } | null;
      if (!existing) {
        return next(new Error('Booking not found for update'));
      }
      
      // Merge existing values with updates (updates take precedence)
      const checkInDate = hasCheckInUpdate ? updateData.checkInDate : existing.checkInDate;
      const checkOutDate = hasCheckOutUpdate ? updateData.checkOutDate : existing.checkOutDate;
      const pricePerNight = hasPriceUpdate ? updateData.pricePerNight : existing.pricePerNight;
      
      // Calculate derived fields with merged values
      const inUTC = toUTCDateOnly(new Date(checkInDate));
      const outUTC = toUTCDateOnly(new Date(checkOutDate));
      const nights = Math.max(0, Math.round((outUTC.getTime() - inUTC.getTime()) / MS_PER_DAY));
      
      if (nights < 1) {
        return next(new Error('Check-out must be at least 1 day after check-in'));
      }
      
      const reservedNights = enumerateNightsUTC(inUTC, outUTC);
      
      // Calculate pricing
      const price = pricePerNight ?? 0;
      const total = Math.max(0, price * nights);
      const feePercentage = Number(process.env.PLATFORM_FEE_PERCENTAGE) || 15;
      const platform = Math.round(total * (feePercentage / 100));
      const payout = Math.max(0, total - platform);
      
      // Apply all derived fields to update
      const derivedFields = {
        checkInDate: inUTC,
        checkOutDate: outUTC,
        nights,
        reservedNights,
        totalPrice: total,
        platformFee: platform,
        hostPayout: payout,
      };
      
      if (update.$set) {
        Object.assign(update.$set, derivedFields);
      } else {
        Object.assign(update, derivedFields);
      }
      
      logger.info('booking:derived_fields_recalculated', {
        action: 'pre_findOneAndUpdate',
        nights,
        reservedNightsCount: reservedNights.length,
        isPartialUpdate: !hasCheckInUpdate || !hasCheckOutUpdate,
        updatedFields: Object.keys(updateData).filter(k => ['checkInDate', 'checkOutDate', 'pricePerNight'].includes(k)),
      });
    }
    
    next();
  } catch (error) {
    logger.error('booking:derived_field_calculation_failed', {
      action: 'pre_findOneAndUpdate',
      error: error instanceof Error ? error.message : String(error),
    });
    next(error as Error);
  }
});

/* ---------------- Methods: status transitions ---------------- */

/**
 * Confirm a pending booking (PENDING → CONFIRMED)
 * Throws if not in PENDING status
 */
BookingSchema.methods.confirm = async function (this: IBooking) {
  if (this.status !== BookingStatus.PENDING) {
    throw new Error('Only pending bookings can be confirmed');
  }
  this.status = BookingStatus.CONFIRMED;
  await this.save();
};

/**
 * Check in a confirmed booking (CONFIRMED → CHECKED_IN)
 * Validates check-in date is today or in the past
 * Throws if not in CONFIRMED status or if before check-in date
 */
BookingSchema.methods.checkIn = async function (this: IBooking) {
  if (this.status !== BookingStatus.CONFIRMED) {
    throw new Error('Only confirmed bookings can be checked in');
  }
  const todayUTC = toUTCDateOnly(new Date());
  if (todayUTC < this.checkInDate) {
    throw new Error('Cannot check in before the check-in date');
  }
  this.status = BookingStatus.CHECKED_IN;
  this.checkedInAt = new Date();
  await this.save();
};

/**
 * Check out a checked-in booking (CHECKED_IN → CHECKED_OUT)
 * Throws if not in CHECKED_IN status
 */
BookingSchema.methods.checkOut = async function (this: IBooking) {
  if (this.status !== BookingStatus.CHECKED_IN) {
    throw new Error('Only checked-in bookings can be checked out');
  }
  this.status = BookingStatus.CHECKED_OUT;
  this.checkedOutAt = new Date();
  await this.save();
};

/**
 * Cancel a booking (any active status → CANCELLED)
 * Computes refund based on days until check-in:
 * - >= 7 days: 100% refund
 * - >= 3 days: 50% refund
 * - < 3 days: 0% refund
 * 
 * Throws if already checked out, cancelled, or currently checked in
 */
BookingSchema.methods.cancel = async function (
  this: IBooking,
  userId: mongoose.Types.ObjectId,
  reason?: string
) {
  if ([BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED].includes(this.status)) {
    throw new Error('Cannot cancel completed or already cancelled booking');
  }
  if (this.status === BookingStatus.CHECKED_IN) {
    throw new Error('Cannot cancel an active stay. Please check out first.');
  }

  this.status = BookingStatus.CANCELLED;
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancellationReason = reason;

  // Refund policy: configurable via environment variables
  // Days thresholds for full refund (default 7 days)
  const fullRefundDays = Number(process.env.BOOKING_FULL_REFUND_DAYS) || 7;
  // Days threshold for partial refund (default 3 days)
  const partialRefundDays = Number(process.env.BOOKING_PARTIAL_REFUND_DAYS) || 3;
  // Partial refund percentage (default 50%)
  const partialRefundPercent = Number(process.env.BOOKING_PARTIAL_REFUND_PERCENT) || 50;
  
  const diffMs = this.checkInDate.getTime() - toUTCDateOnly(new Date()).getTime();
  const daysUntilCheckIn = Math.max(0, Math.floor(diffMs / MS_PER_DAY));
  if (daysUntilCheckIn >= fullRefundDays) {
    this.refundAmount = this.totalPrice;                         // Full refund
  } else if (daysUntilCheckIn >= partialRefundDays) {
    this.refundAmount = Math.round(this.totalPrice * (partialRefundPercent / 100));  // Configurable % refund
  } else {
    this.refundAmount = 0;                                       // No refund
  }

  await this.save();
};

/* ---------------- Statics: availability & atomic create ---------------- */

interface BookingModel extends MModel<IBooking> {
  /**
   * Check if any active booking overlaps with the given nights
   * @param orgId - Organization ID
   * @param listingId - Listing ID
   * @param nights - Array of UTC date-only nights to check
   * @returns true if any overlap exists, false otherwise
   */
  overlaps(params: {
    orgId: mongoose.Types.ObjectId;
    listingId: mongoose.Types.ObjectId;
    nights: Date[];
  }): Promise<boolean>;

  /**
   * Check if listing is available for booking (no active overlaps)
   * @param orgId - Organization ID
   * @param listingId - Listing ID
   * @param checkInDate - Check-in date (will be normalized to UTC)
   * @param checkOutDate - Check-out date (will be normalized to UTC)
   * @returns true if available, false if conflicts exist
   */
  isAvailable(params: {
    orgId: mongoose.Types.ObjectId;
    listingId: mongoose.Types.ObjectId;
    checkInDate: Date;
    checkOutDate: Date;
  }): Promise<boolean>;

  /**
   * Atomically create booking only if dates are available
   * Throws "Dates not available" if conflicts exist
   * The unique index provides final race protection
   * 
   * @param doc - Booking document to create
   * @param session - Optional MongoDB session for transactions
   * @returns Created booking document
   * @throws Error if dates not available or duplicate key on reservedNights
   */
  createWithAvailability(
    doc: Partial<IBooking>,
    session?: mongoose.ClientSession
  ): Promise<IBooking>;
}

/**
 * Check if any active booking has reserved any of the given nights
 * Used for availability checks before creating new bookings
 */
BookingSchema.statics.overlaps = async function ({
  orgId,
  listingId,
  nights,
}: {
  orgId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  nights: Date[];
}): Promise<boolean> {
  if (!nights.length) return false;
  const count = await this.countDocuments({
    orgId,
    listingId,
    status: { $in: ACTIVE_STATUSES },
    reservedNights: { $in: nights },
  });
  return count > 0;
};

/**
 * Check if listing is available for booking (no overlaps)
 * Normalizes dates to UTC and checks for conflicts
 */
// ✅ FIXED: Type-safe static method with proper BookingModel interface typing
BookingSchema.statics.isAvailable = (async function (
  this: BookingModel,
  {
    orgId,
    listingId,
    checkInDate,
    checkOutDate,
  }: {
    orgId: mongoose.Types.ObjectId;
    listingId: mongoose.Types.ObjectId;
    checkInDate: Date;
    checkOutDate: Date;
  }
): Promise<boolean> {
  const inUTC = toUTCDateOnly(checkInDate);
  const outUTC = toUTCDateOnly(checkOutDate);
  const nights = enumerateNightsUTC(inUTC, outUTC);
  return !(await this.overlaps({ orgId, listingId, nights }));
}) as BookingModel['isAvailable'];

/**
 * Atomically create booking with availability check
 * Throws if dates are not available
 * The unique index on reservedNights provides final race protection
 */
BookingSchema.statics.createWithAvailability = (async function (
  this: BookingModel,
  doc: Partial<IBooking>,
  session?: mongoose.ClientSession
): Promise<IBooking> {
  const inUTC = toUTCDateOnly(doc.checkInDate as Date);
  const outUTC = toUTCDateOnly(doc.checkOutDate as Date);
  const nights = enumerateNightsUTC(inUTC, outUTC);

  // Pre-check for conflicts (UX feedback)
  const conflict = await this.overlaps({
    orgId: doc.orgId as mongoose.Types.ObjectId,
    listingId: doc.listingId as mongoose.Types.ObjectId,
    nights,
  });
  if (conflict) {
    throw new Error('Dates not available for this listing');
  }

  // Create (unique index also guards race condition)
  const created = await this.create(
    [
      {
        ...doc,
        checkInDate: inUTC,
        checkOutDate: outUTC,
        reservedNights: nights,
      },
    ],
    { session }
  );
  const bookingDoc = created[0];

  // Create escrow account tied to this booking (critical for payouts)
  const { escrowService } = await import('@/services/souq/settlements/escrow-service');
  const { logger } = await import('@/lib/logger');
  try {
    if (process.env.FEATURE_ESCROW_ENABLED !== 'false') {
      const account = await escrowService.createEscrowAccount({
        source: EscrowSource.AQAR_BOOKING,
        sourceId: bookingDoc._id,
        bookingId: bookingDoc._id,
        orgId: bookingDoc.orgId,
        buyerId: bookingDoc.guestId,
        sellerId: bookingDoc.hostId,
        expectedAmount: bookingDoc.totalPrice,
        currency: 'SAR',
        releaseAfter: bookingDoc.checkOutDate,
        idempotencyKey: bookingDoc._id.toString(),
        riskHold: false,
      });

      bookingDoc.escrow = {
        accountId: account._id,
        status: account.status,
        releaseAfter: account.releasePolicy?.autoReleaseAt,
        idempotencyKey: account.idempotencyKeys?.[0],
      };
      await bookingDoc.save();
    } else {
      logger.info('[Escrow] Skipping escrow creation for booking (feature flag disabled)', {
        bookingId: bookingDoc._id.toString(),
      });
    }
  } catch (error) {
    logger.error('[Escrow] Failed to create account for booking', {
      bookingId: bookingDoc._id.toString(),
      error,
    });
    throw error;
  }

  return bookingDoc;
}) as BookingModel['createWithAvailability'];

/* ---------------- Model Export ---------------- */

// ✅ FIXED: Type-safe model export with proper BookingModel interface typing  
const Booking: BookingModel =
  (mongoose.models.AqarBooking as BookingModel) ||
  mongoose.model<IBooking, BookingModel>('AqarBooking', BookingSchema);

export default Booking;
export type BookingDoc = IBooking;
