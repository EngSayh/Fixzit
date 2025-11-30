/**
 * Aqar Souq - Booking Model
 *
 * RE-EXPORT from canonical model to avoid duplicate schema registration.
 * The canonical model at models/aqarBooking.model.ts includes:
 * - reservedNights array for double-booking prevention
 * - Unique partial index on (orgId, listingId, reservedNights)
 * - Escrow creation with compensating actions
 * - Availability helpers (overlaps, isAvailable, createWithAvailability)
 * - Tenant isolation via orgId scoping
 *
 * @see models/aqarBooking.model.ts
 */

// Re-export everything from the canonical model
export {
  default,
  BookingStatus,
  type IBooking,
  type BookingModel,
  type BookingDoc,
} from "../aqarBooking.model";
