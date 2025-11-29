/**
 * Aqar Souq - Boost Model (paid listing promotions)
 *
 * **Production Features:**
 * - Unique partial index on (orgId, listingId, type, active: true) prevents overlaps
 * - Atomic activate() with duplicate key translation to user-friendly errors
 * - Auto-expiry guard in pre-save hook (computes expiresAt from activatedAt + duration)
 * - isActiveNow virtual (checks active && expiresAt > now)
 * - Analytics-safe counters: recordImpression/recordClick use $inc with min-0 protection
 * - ✅ Configurable pricing: getPricing(type, days) static uses environment variables (BOOST_*_PRICE_PER_DAY) with sensible defaults
 * - Query helpers: findActiveFor(orgId, listingId, type?), activateExclusive(id)
 *
 * **Overlap Prevention:**
 * The unique partial index ensures only ONE active boost of a given type per listing per tenant.
 * If you need multiple active HIGHLIGHTED but single FEATURED/PINNED, adjust the index filter.
 *
 * **Types:**
 * - FEATURED: Top placement, highest visibility (100 SAR/day)
 * - PINNED: Sticky in category listing (50 SAR/day)
 * - HIGHLIGHTED: Visual distinction (25 SAR/day)
 */

import mongoose, { Schema, Document } from "mongoose";
import type { HydratedDocument } from "mongoose";
import {
  getModel,
  MModel,
  CommonModelStatics,
} from "@/src/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";

export enum BoostType {
  FEATURED = "FEATURED", // Top placement, highest visibility
  PINNED = "PINNED", // Sticky in category listing
  HIGHLIGHTED = "HIGHLIGHTED", // Visual distinction
}

export interface IBoost extends Document {
  // Listing / tenancy / user
  listingId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  // Boost details
  type: BoostType;
  durationDays: number; // Positive integer, min 1

  // Pricing (SAR)
  price: number; // >= 0, computed from type + duration

  // Payment
  paymentId?: mongoose.Types.ObjectId;
  paidAt?: Date;

  // Validity
  activatedAt?: Date;
  expiresAt?: Date;
  active: boolean; // True when boost is live, false when inactive/expired

  // Analytics
  impressions: number; // Incremented on view
  clicks: number; // Incremented on click

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isActiveNow: boolean; // Computed: active && expiresAt > now

  // Instance methods
  activate(): Promise<void>;
  deactivateIfExpired(): Promise<void>;
  recordImpression(): Promise<{ impressions: number }>;
  recordClick(): Promise<{ clicks: number }>;
}

export type BoostModel = MModel<IBoost> &
  CommonModelStatics<IBoost> & {
    /**
     * Get pricing for a boost type and duration
     * @param type - Boost type (FEATURED, PINNED, HIGHLIGHTED)
     * @param days - Duration in days (positive integer)
     * @returns Price in SAR
     * @throws Error if type is invalid or days is not a positive integer
     */
    getPricing(type: BoostType, days: number): number;

    /**
     * Atomically activate a boost by ID
     * @param id - Boost document ID
     * @returns Activated boost document
     * @throws Error if boost not found, already active, not paid, or conflicts with existing active boost
     */
    activateExclusive(id: mongoose.Types.ObjectId): Promise<IBoost>;

    /**
     * Find all active boosts for a listing, optionally filtered by type
     * @param orgId - Organization ID
     * @param listingId - Listing ID
     * @param type - Optional boost type filter
     * @returns Array of active boost documents (lean), sorted by expiresAt desc
     */
    findActiveFor(
      orgId: mongoose.Types.ObjectId,
      listingId: mongoose.Types.ObjectId,
      type?: BoostType,
    ): Promise<IBoost[]>;
  };

const BoostSchema = new Schema<IBoost>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "AqarListing",
      required: true,
      index: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(BoostType),
      required: true,
      index: true,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
      max: 730, // Maximum 2 years (730 days)
      validate: {
        validator: Number.isInteger,
        message: "Duration must be a whole number of days",
      },
    },

    price: {
      type: Number,
      required: true,
      min: 0,
      max: 999999.99, // Maximum reasonable price in SAR
      validate: {
        validator: (v: number) => Number.isFinite(v) && v >= 0,
        message: "Price must be a valid non-negative number",
      },
    },

    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    paidAt: { type: Date },

    activatedAt: { type: Date },
    expiresAt: { type: Date, index: true },
    active: { type: Boolean, default: false, index: true },

    impressions: { type: Number, default: 0, min: 0 },
    clicks: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    collection: "aqar_boosts",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/* ---------------- Indexes ---------------- */

// Query patterns: active boosts per listing (with expiry), user dashboards
BoostSchema.index({ orgId: 1, listingId: 1, active: 1, expiresAt: -1 });
BoostSchema.index({ orgId: 1, userId: 1, active: 1, createdAt: -1 });

/**
 * Hard no-overlap guarantee: at most ONE active boost of a given type for a listing per tenant.
 * This prevents multiple active FEATURED boosts on the same listing.
 *
 * **Note:** If you need to allow multiple active HIGHLIGHTED but single FEATURED/PINNED,
 * adjust the partial filter to: { active: true, type: { $in: ['FEATURED', 'PINNED'] } }
 */
BoostSchema.index(
  { orgId: 1, listingId: 1, type: 1, active: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
    name: "uniq_active_boost_per_type",
  },
);

// =============================================================================
// DATA-001 FIX: Apply tenantIsolationPlugin for multi-tenant data isolation
// CRITICAL: Prevents cross-tenant data access in Aqar Marketplace boosts
// =============================================================================
BoostSchema.plugin(tenantIsolationPlugin);

/* ---------------- Static: Pricing ---------------- */

/**
 * Get pricing for boost type and duration
 * Configurable via environment variables (defaults in SAR/day)
 */
BoostSchema.statics.getPricing = function (type: BoostType, days: number) {
  if (!Object.values(BoostType).includes(type)) {
    throw new Error("Invalid boost type");
  }
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error("Days must be a positive integer");
  }

  // Pricing configurable via environment variables with sensible defaults
  const perDay = {
    [BoostType.FEATURED]:
      Number(process.env.BOOST_FEATURED_PRICE_PER_DAY) || 100, // SAR/day
    [BoostType.PINNED]: Number(process.env.BOOST_PINNED_PRICE_PER_DAY) || 50, // SAR/day
    [BoostType.HIGHLIGHTED]:
      Number(process.env.BOOST_HIGHLIGHTED_PRICE_PER_DAY) || 25, // SAR/day
  } as const;
  return perDay[type] * days;
};

/* ---------------- Hooks ---------------- */

/**
 * Pre-validate: normalize duration and counters
 * Ensure duration is a positive integer, counters are non-negative
 */
BoostSchema.pre("validate", function (next) {
  // Normalize duration to positive integer
  if (typeof this.durationDays === "number") {
    this.durationDays = Math.max(1, Math.floor(this.durationDays));
  }
  // Normalize counters (ensure non-negative)
  if (typeof this.impressions === "number" && this.impressions < 0) {
    this.impressions = 0;
  }
  if (typeof this.clicks === "number" && this.clicks < 0) {
    this.clicks = 0;
  }

  next();
});

/**
 * Pre-save: auto-compute expiresAt from activatedAt + duration
 * If boost is active but expiresAt is missing, compute it
 * This ensures consistent expiry times even if activation logic is bypassed
 */
BoostSchema.pre("save", function (next) {
  // Keep expiresAt consistent: if active and duration is set but expiresAt missing => compute
  // If activatedAt is present, anchor from it, otherwise from now()
  if (this.active) {
    const anchor = this.activatedAt ? new Date(this.activatedAt) : new Date();
    const ms = Math.max(1, this.durationDays || 1) * 24 * 60 * 60 * 1000;
    this.activatedAt = anchor;
    this.expiresAt = new Date(anchor.getTime() + ms);
  }
  next();
});

/* ---------------- Virtuals ---------------- */

/**
 * Check if boost is currently active (active flag + not expired)
 * Used for UI display and filtering
 */
BoostSchema.virtual("isActiveNow").get(function (this: IBoost) {
  if (!this.active || !this.expiresAt) return false;
  return this.expiresAt > new Date();
});

/* ---------------- Methods ---------------- */

/**
 * Activate a boost (sets active flag, computes expiresAt)
 * Throws if already active, not paid, or conflicts with existing active boost
 * The unique index on (orgId, listingId, type, active: true) provides final race protection
 */
BoostSchema.methods.activate = async function (this: IBoost) {
  if (this.active) {
    throw new Error("Boost already activated");
  }
  if (!this.paidAt) {
    throw new Error("Boost not paid");
  }
  // Atomic activation with index guard (one active per listing/type/org)
  this.active = true;
  this.activatedAt = new Date();
  this.expiresAt = new Date(
    Date.now() + Math.max(1, this.durationDays) * 24 * 60 * 60 * 1000,
  );
  try {
    await this.save();
  } catch (err: unknown) {
    // Translate duplicate key error into user-friendly message
    const mongoError = err as { code?: number };
    if (mongoError.code === 11000) {
      throw new Error(
        "Another active boost of this type already exists for this listing",
      );
    }
    throw err;
  }
};

/**
 * Deactivate boost if expired
 * Used for cleanup jobs or on-demand expiry checks
 */
BoostSchema.methods.deactivateIfExpired = async function (this: IBoost) {
  if (this.active && this.expiresAt && this.expiresAt < new Date()) {
    this.active = false;
    await this.save();
  }
};

/**
 * Record an impression (view) for this boost
 * Uses atomic $inc to prevent race conditions
 * @returns Updated impressions count
 */
BoostSchema.methods.recordImpression = async function (this: IBoost) {
  const updated = await (this.constructor as BoostModel).findByIdAndUpdate(
    this._id,
    { $inc: { impressions: 1 } },
    { new: true, projection: { impressions: 1 } },
  );
  return { impressions: updated?.impressions ?? this.impressions + 1 };
};

/**
 * Record a click for this boost
 * Uses atomic $inc to prevent race conditions
 * @returns Updated clicks count
 */
BoostSchema.methods.recordClick = async function (this: IBoost) {
  const updated = await (this.constructor as BoostModel).findByIdAndUpdate(
    this._id,
    { $inc: { clicks: 1 } },
    { new: true, projection: { clicks: 1 } },
  );
  return { clicks: updated?.clicks ?? this.clicks + 1 };
};

/* ---------------- Statics ---------------- */

/**
 * Atomically activate a boost by ID
 * Wraps the activate() method for convenience
 */
BoostSchema.statics.activateExclusive = async function (
  id: mongoose.Types.ObjectId,
) {
  const doc = await this.findById(id);
  if (!doc) {
    throw new Error("Boost not found");
  }
  await doc.activate();
  return doc;
};

/**
 * Find all active boosts for a listing, optionally filtered by type
 * Filters by active flag and expiresAt > now for accurate results
 */
BoostSchema.statics.findActiveFor = function (
  orgId: mongoose.Types.ObjectId,
  listingId: mongoose.Types.ObjectId,
  type?: BoostType,
) {
  interface QueryFilter {
    orgId: mongoose.Types.ObjectId;
    listingId: mongoose.Types.ObjectId;
    active: boolean;
    expiresAt: { $gt: Date };
    type?: BoostType;
  }
  const q: QueryFilter = {
    orgId,
    listingId,
    active: true,
    expiresAt: { $gt: new Date() },
  };
  if (type) q.type = type;
  return this.find(q).sort({ expiresAt: -1 }).lean();
};

/* ---------------- Model Export ---------------- */

const Boost = getModel<IBoost>("AqarBoost", BoostSchema) as BoostModel;

export default Boost;
export type BoostDoc = HydratedDocument<IBoost>;
