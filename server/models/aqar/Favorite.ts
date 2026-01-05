/**
 * @module server/models/aqar/Favorite
 * @description User bookmarks/favorites for real estate listings and projects.
 *              Supports saved searches, wishlist management, and price drop alerts.
 *
 * @features
 * - Favorite types: LISTING (property listings), PROJECT (development projects)
 * - User-specific bookmarks (private, not shared)
 * - Notes and tags for organizing favorites
 * - Price tracking (alert on price drops)
 * - Quick access to saved properties
 * - Favorite count analytics (popular listings)
 *
 * @indexes
 * - { orgId: 1, userId: 1, targetId: 1, targetType: 1 } (unique) — One favorite per user per target
 * - { orgId: 1, userId: 1, createdAt: -1 } — User's favorite history
 * - { orgId: 1, targetId: 1, targetType: 1 } — Favorite count per listing/project
 *
 * @relationships
 * - References User model (userId)
 * - References Listing model (targetId when targetType = LISTING)
 * - References Project model (targetId when targetType = PROJECT)
 * - Integrates with notification system (price drop alerts)
 *
 * @audit
 * - createdBy: Via tenantIsolationPlugin
 * - timestamps: createdAt, updatedAt from Mongoose
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";

export enum FavoriteType {
  LISTING = "LISTING",
  PROJECT = "PROJECT",
}

export interface IFavorite extends Document {
  // User
  userId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;

  // Target
  targetId: mongoose.Types.ObjectId;
  targetType: FavoriteType;

  // Metadata
  notes?: string;
  tags?: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    targetId: {
      type: Schema.Types.ObjectId,
      refPath: "targetType",
      required: true,
    },
    targetType: {
      type: String,
      enum: Object.values(FavoriteType),
      required: true,
      index: true,
    },

    notes: { type: String, maxlength: 1000 },
    tags: [{ type: String, maxlength: 50 }],
  },
  {
    timestamps: true,
    collection: "aqar_favorites",
  },
);

// Indexes
FavoriteSchema.index({ userId: 1, targetType: 1, createdAt: -1 });
FavoriteSchema.index(
  { userId: 1, targetId: 1, targetType: 1 },
  { unique: true },
); // Prevent duplicates

// =============================================================================
// DATA-001 FIX: Apply tenantIsolationPlugin for multi-tenant data isolation
// CRITICAL: Prevents cross-tenant data access in Aqar favorites
// =============================================================================
FavoriteSchema.plugin(tenantIsolationPlugin);

const Favorite = getModel<IFavorite>("AqarFavorite", FavoriteSchema);

export default Favorite;
