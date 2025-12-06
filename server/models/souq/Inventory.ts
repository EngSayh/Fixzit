import mongoose, { Schema, type Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";

/**
 * Inventory Model
 * Tracks available stock per listing, reservations during checkout,
 * and inventory health metrics (aging, stranded, unfulfillable)
 */

export interface IInventoryReservation {
  reservationId: string;
  orderId?: string;
  quantity: number;
  reservedAt: Date;
  expiresAt: Date; // Auto-release if not converted to order
  status: "active" | "converted" | "expired";
}

export interface IInventoryTransaction {
  transactionId: string;
  type: "receive" | "sale" | "return" | "damage" | "lost" | "adjustment";
  quantity: number; // Positive for increase, negative for decrease
  orderId?: string;
  rmaId?: string;
  reason?: string;
  performedBy: string; // User ID or system
  performedAt: Date;
}

export interface IInventoryHealth {
  sellableUnits: number;
  unsellableUnits: number; // Damaged, defective, etc.
  inboundUnits: number; // In transit to warehouse
  reservedUnits: number; // Pending checkout
  agingDays: number; // Days since last sale
  isStranded: boolean; // No active listing linked
  lastSoldAt?: Date;
}

export interface IInventory extends Document {
  inventoryId: string;
  listingId: string; // Link to SouqListing
  productId: string; // Link to SouqProduct (FSIN)
  sellerId: string;
  orgId?: mongoose.Types.ObjectId;

  // Stock Levels
  availableQuantity: number; // Sellable units minus reservations
  totalQuantity: number; // All units (sellable + unsellable + reserved)
  reservedQuantity: number; // Sum of active reservations

  // Warehouse Location
  fulfillmentType: "FBM" | "FBF"; // Fulfilled by Merchant or Fixzit
  warehouseId?: string; // For FBF only
  binLocation?: string; // Physical shelf location

  // Reservations
  reservations: IInventoryReservation[];

  // Transaction History
  transactions: IInventoryTransaction[];

  // Health Metrics
  health: IInventoryHealth;

  // Thresholds
  lowStockThreshold: number;
  outOfStockThreshold: number;
  reorderQuantity?: number;

  // Status
  status: "active" | "suspended" | "depleted";

  // Audit
  createdAt: Date;
  updatedAt: Date;

  reserve(
    reservationId: string,
    quantity: number,
    expirationMinutes?: number,
  ): boolean;
  release(reservationId: string): boolean;
  convertReservation(reservationId: string, orderId: string): boolean;
  receive(quantity: number, performedBy: string, reason?: string): void;
  processReturn(
    rmaId: string,
    quantity: number,
    condition: "sellable" | "unsellable",
  ): void;
  adjustUnsellable(
    quantity: number,
    type: "damage" | "lost",
    performedBy: string,
    reason: string,
  ): void;
  isLowStock(): boolean;
  isOutOfStock(): boolean;
  updateHealth(): void;
  cleanExpiredReservations(): number;
}

const InventoryReservationSchema = new Schema<IInventoryReservation>(
  {
    reservationId: { type: String, required: true },
    orderId: String,
    quantity: { type: Number, required: true, min: 1 },
    reservedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "converted", "expired"],
      default: "active",
    },
  },
  { _id: false },
);

const InventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    transactionId: { type: String, required: true },
    type: {
      type: String,
      enum: ["receive", "sale", "return", "damage", "lost", "adjustment"],
      required: true,
    },
    quantity: { type: Number, required: true },
    orderId: String,
    rmaId: String,
    reason: String,
    performedBy: { type: String, required: true },
    performedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const InventoryHealthSchema = new Schema<IInventoryHealth>(
  {
    sellableUnits: { type: Number, default: 0 },
    unsellableUnits: { type: Number, default: 0 },
    inboundUnits: { type: Number, default: 0 },
    reservedUnits: { type: Number, default: 0 },
    agingDays: { type: Number, default: 0 },
    isStranded: { type: Boolean, default: false },
    lastSoldAt: Date,
  },
  { _id: false },
);

const InventorySchema = new Schema<IInventory>(
  {
    inventoryId: { type: String, required: true, unique: true, index: true },
    listingId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    sellerId: { type: String, required: true, index: true },
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    availableQuantity: { type: Number, required: true, min: 0, default: 0 },
    totalQuantity: { type: Number, required: true, min: 0, default: 0 },
    reservedQuantity: { type: Number, required: true, min: 0, default: 0 },

    fulfillmentType: { type: String, enum: ["FBM", "FBF"], required: true },
    warehouseId: String,
    binLocation: String,

    reservations: [InventoryReservationSchema],
    transactions: [InventoryTransactionSchema],
    health: { type: InventoryHealthSchema, default: () => ({}) },

    lowStockThreshold: { type: Number, default: 5 },
    outOfStockThreshold: { type: Number, default: 0 },
    reorderQuantity: Number,

    status: {
      type: String,
      enum: ["active", "suspended", "depleted"],
      default: "active",
    },
  },
  {
    timestamps: true,
    collection: "souq_inventory",
  },
);

// Indexes
InventorySchema.index({ listingId: 1, status: 1 });
InventorySchema.index({ orgId: 1, listingId: 1 });
InventorySchema.index({ sellerId: 1, fulfillmentType: 1 });
InventorySchema.index({ orgId: 1, status: 1 });
InventorySchema.index({ "health.isStranded": 1 });
InventorySchema.index({ "health.agingDays": -1 });

// Methods

/**
 * Reserve inventory for a pending order
 */
InventorySchema.methods.reserve = function (
  reservationId: string,
  quantity: number,
  expirationMinutes: number = 15,
): boolean {
  if (this.availableQuantity < quantity) {
    return false; // Insufficient stock
  }

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

  this.reservations.push({
    reservationId,
    quantity,
    reservedAt: new Date(),
    expiresAt,
    status: "active",
  });

  this.reservedQuantity += quantity;
  this.availableQuantity -= quantity;
  this.health.reservedUnits += quantity;

  return true;
};

/**
 * Release a reservation (order cancelled or expired)
 */
InventorySchema.methods.release = function (reservationId: string): boolean {
  const reservation = this.reservations.find(
    (r: IInventoryReservation) =>
      r.reservationId === reservationId && r.status === "active",
  );

  if (!reservation) {
    return false;
  }

  reservation.status = "expired";
  this.reservedQuantity -= reservation.quantity;
  this.availableQuantity += reservation.quantity;
  this.health.reservedUnits -= reservation.quantity;

  return true;
};

/**
 * Convert reservation to sale (order confirmed)
 */
InventorySchema.methods.convertReservation = function (
  reservationId: string,
  orderId: string,
): boolean {
  const reservation = this.reservations.find(
    (r: IInventoryReservation) =>
      r.reservationId === reservationId && r.status === "active",
  );

  if (!reservation) {
    return false;
  }

  reservation.status = "converted";
  reservation.orderId = orderId;
  this.reservedQuantity -= reservation.quantity;
  this.totalQuantity -= reservation.quantity;
  this.health.reservedUnits -= reservation.quantity;
  this.health.sellableUnits -= reservation.quantity;

  // Record transaction
  this.transactions.push({
    transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "sale",
    quantity: -reservation.quantity,
    orderId,
    performedBy: "system",
    performedAt: new Date(),
  });

  this.health.lastSoldAt = new Date();
  this.health.agingDays = 0;

  // Update status
  if (this.availableQuantity === 0) {
    this.status = "depleted";
  }

  return true;
};

/**
 * Receive new stock
 */
InventorySchema.methods.receive = function (
  quantity: number,
  performedBy: string,
  reason?: string,
): void {
  this.availableQuantity += quantity;
  this.totalQuantity += quantity;
  this.health.sellableUnits += quantity;

  this.transactions.push({
    transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "receive",
    quantity,
    reason,
    performedBy,
    performedAt: new Date(),
  });

  if (this.status === "depleted" && this.availableQuantity > 0) {
    this.status = "active";
  }
};

/**
 * Process return (RMA)
 */
InventorySchema.methods.processReturn = function (
  rmaId: string,
  quantity: number,
  condition: "sellable" | "unsellable",
): void {
  this.totalQuantity += quantity;

  if (condition === "sellable") {
    this.availableQuantity += quantity;
    this.health.sellableUnits += quantity;
  } else {
    this.health.unsellableUnits += quantity;
  }

  this.transactions.push({
    transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "return",
    quantity,
    rmaId,
    reason: `Return condition: ${condition}`,
    performedBy: "system",
    performedAt: new Date(),
  });

  if (this.status === "depleted" && this.availableQuantity > 0) {
    this.status = "active";
  }
};

/**
 * Mark units as damaged/lost
 */
InventorySchema.methods.adjustUnsellable = function (
  quantity: number,
  type: "damage" | "lost",
  performedBy: string,
  reason: string,
): void {
  this.totalQuantity -= quantity;
  this.health.unsellableUnits += quantity;

  this.transactions.push({
    transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    quantity: -quantity,
    reason,
    performedBy,
    performedAt: new Date(),
  });
};

/**
 * Check if low stock alert needed
 */
InventorySchema.methods.isLowStock = function (): boolean {
  return (
    this.availableQuantity > 0 &&
    this.availableQuantity <= this.lowStockThreshold
  );
};

/**
 * Check if out of stock
 */
InventorySchema.methods.isOutOfStock = function (): boolean {
  return this.availableQuantity <= this.outOfStockThreshold;
};

/**
 * Update health metrics (run periodically)
 */
InventorySchema.methods.updateHealth = function (): void {
  if (this.health.lastSoldAt) {
    const daysSinceLastSale = Math.floor(
      (Date.now() - this.health.lastSoldAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    this.health.agingDays = daysSinceLastSale;
  }

  // Mark as stranded if no active listing
  // (This would be checked via listingId lookup in actual implementation)
};

/**
 * Clean up expired reservations (run periodically)
 */
InventorySchema.methods.cleanExpiredReservations = function (): number {
  let releasedCount = 0;
  const now = new Date();

  this.reservations.forEach((reservation: IInventoryReservation) => {
    if (reservation.status === "active" && reservation.expiresAt < now) {
      this.release(reservation.reservationId);
      releasedCount++;
    }
  });

  return releasedCount;
};

export const SouqInventory = getModel<IInventory>(
  "SouqInventory",
  InventorySchema,
);
