/**
 * @module server/models/souq/Wishlist
 * @description Customer wishlist model for Fixzit Marketplace.
 *              Amazon-inspired "Save for Later" functionality.
 *
 * @features
 * - Multiple wishlists per user (Default, Birthday, etc.)
 * - Product tracking with metadata (priority, notes, price alerts)
 * - Price drop notifications
 * - Share wishlist functionality
 * - Move to cart integration
 * - Tenant-isolated (orgId scoping)
 *
 * @indexes
 * - { orgId: 1, userId: 1 } — User's wishlists
 * - { orgId: 1, userId: 1, name: 1 } — Named wishlist lookup (unique)
 * - { orgId: 1, "items.productId": 1 } — Product popularity tracking
 *
 * @relationships
 * - References User model (userId)
 * - References Product model (items.productId)
 * - References Listing model (items.listingId for specific seller)
 *
 * @audit
 * - timestamps: createdAt, updatedAt from Mongoose
 * - Wishlist changes logged for analytics
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";
import { getModel } from "@/types/mongoose-compat";

// Wishlist item embedded in wishlist
export interface IWishlistItem {
  productId: mongoose.Types.ObjectId;
  listingId?: mongoose.Types.ObjectId; // Optional: specific seller listing
  addedAt: Date;
  priority: "high" | "medium" | "low";
  notes?: string;
  priceWhenAdded?: number;
  priceAlertEnabled: boolean;
  priceAlertThreshold?: number; // Alert when price drops below this
  notifiedAt?: Date; // Last price alert notification
}

export interface IWishlist extends Document {
  _id: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  
  // Wishlist metadata
  name: string; // "Default", "Birthday Ideas", "Home Office"
  description?: string;
  isDefault: boolean; // Only one default per user
  isPublic: boolean; // Can be shared via link
  shareToken?: string; // Unique token for sharing
  
  // Items
  items: IWishlistItem[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const WishlistItemSchema = new Schema<IWishlistItem>(
  {
    productId: { 
      type: Schema.Types.ObjectId, 
      ref: "SouqProduct", 
      required: true 
    },
    listingId: { 
      type: Schema.Types.ObjectId, 
      ref: "SouqListing" 
    },
    addedAt: { 
      type: Date, 
      default: Date.now 
    },
    priority: { 
      type: String, 
      enum: ["high", "medium", "low"], 
      default: "medium" 
    },
    notes: { 
      type: String, 
      maxlength: 500 
    },
    priceWhenAdded: { 
      type: Number 
    },
    priceAlertEnabled: { 
      type: Boolean, 
      default: false 
    },
    priceAlertThreshold: { 
      type: Number 
    },
    notifiedAt: { 
      type: Date 
    },
  },
  { _id: false }
);

const WishlistSchema = new Schema<IWishlist>(
  {
    orgId: { 
      type: Schema.Types.ObjectId, 
      required: true, 
      index: true 
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      required: true, 
      ref: "User" 
    },
    name: { 
      type: String, 
      required: true, 
      default: "Default",
      maxlength: 100 
    },
    description: { 
      type: String, 
      maxlength: 500 
    },
    isDefault: { 
      type: Boolean, 
      default: false 
    },
    isPublic: { 
      type: Boolean, 
      default: false 
    },
    shareToken: { 
      type: String, 
      sparse: true 
    },
    items: { 
      type: [WishlistItemSchema], 
      default: [] 
    },
  },
  { 
    timestamps: true,
    collection: "souq_wishlists"
  }
);

// Indexes for query performance
WishlistSchema.index({ orgId: 1, userId: 1 });
WishlistSchema.index({ orgId: 1, userId: 1, name: 1 }, { unique: true });
WishlistSchema.index({ orgId: 1, shareToken: 1 }, { sparse: true });
WishlistSchema.index({ orgId: 1, "items.productId": 1 });
WishlistSchema.index({ orgId: 1, "items.priceAlertEnabled": 1 });

// Ensure only one default wishlist per user
WishlistSchema.pre("save", async function(next) {
  if (this.isDefault && this.isNew) {
    const existing = await SouqWishlist.findOne({
      orgId: this.orgId,
      userId: this.userId,
      isDefault: true,
    });
    if (existing) {
      existing.isDefault = false;
      await existing.save();
    }
  }
  next();
});

// Instance methods
WishlistSchema.methods.addItem = function(
  productId: mongoose.Types.ObjectId,
  options: Partial<IWishlistItem> = {}
): IWishlistItem {
  const existingIndex = this.items.findIndex(
    (item: IWishlistItem) => item.productId.toString() === productId.toString()
  );
  
  if (existingIndex >= 0) {
    // Update existing item
    Object.assign(this.items[existingIndex], options);
    return this.items[existingIndex];
  }
  
  // Add new item
  const newItem: IWishlistItem = {
    productId,
    addedAt: new Date(),
    priority: "medium",
    priceAlertEnabled: false,
    ...options,
  };
  this.items.push(newItem);
  return newItem;
};

WishlistSchema.methods.removeItem = function(
  productId: mongoose.Types.ObjectId
): boolean {
  const initialLength = this.items.length;
  this.items = this.items.filter(
    (item: IWishlistItem) => item.productId.toString() !== productId.toString()
  );
  return this.items.length < initialLength;
};

WishlistSchema.methods.hasItem = function(
  productId: mongoose.Types.ObjectId
): boolean {
  return this.items.some(
    (item: IWishlistItem) => item.productId.toString() === productId.toString()
  );
};

// Export model with safe instantiation
export const SouqWishlist: Model<IWishlist> = getModel<IWishlist>(
  "SouqWishlist",
  WishlistSchema
);

export default SouqWishlist;
