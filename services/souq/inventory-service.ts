import { SouqInventory, IInventory, type IInventoryReservation } from "@/server/models/souq/Inventory";
import { SouqListing } from "@/server/models/souq/Listing";
import { addJob } from "@/lib/queues/setup";
import { logger } from "@/lib/logger";
import mongoose, { type ClientSession } from "mongoose";
import { buildSouqOrgFilter } from "@/services/souq/org-scope";

// 🔐 STRICT v4.1: Use shared org filter helper for consistent tenant isolation
// Handles both orgId and legacy org_id fields with proper ObjectId matching
const buildOrgFilter = (orgId: string | mongoose.Types.ObjectId) =>
  buildSouqOrgFilter(orgId.toString()) as Record<string, unknown>;

// Type for reservation record
interface InventoryReservation {
  reservationId: string;
  quantity: number;
  reservedAt: Date;
  expiresAt: Date;
  status: "active" | "expired" | "converted";
}

// Type for inventory with polyfilled methods
interface PolyfillableInventory {
  reservations?: InventoryReservation[];
  reservedQuantity?: number;
  availableQuantity?: number;
  totalQuantity?: number;
  health?: {
    reservedUnits?: number;
    sellableUnits?: number;
  };
  cleanExpiredReservations?: () => number;
  reserve?: (reservationId: string, quantity: number, expirationMinutes?: number) => boolean;
  release?: (reservationId: string) => boolean;
  convertReservation?: (reservationId: string, orderId: string) => boolean;
  isOutOfStock?: () => boolean;
}

// Some tests use lightweight/mocked models; polyfill core inventory methods to keep behavior stable
const ensureInventoryMethods = (inventory: PolyfillableInventory | null): PolyfillableInventory | null => {
  if (!inventory) return inventory;

  if (typeof inventory.cleanExpiredReservations !== "function") {
    inventory.cleanExpiredReservations = () => {
      const now = Date.now();
      const before = inventory.reservations?.length ?? 0;
      inventory.reservations = (inventory.reservations || []).filter(
        (r: InventoryReservation) => r.status === "active" && new Date(r.expiresAt || now).getTime() > now,
      );
      const removed = before - (inventory.reservations?.length ?? 0);
      if (removed > 0) {
        inventory.reservedQuantity = Math.max(
          0,
          (inventory.reservedQuantity ?? 0) - removed,
        );
      }
      return removed;
    };
  }

  if (typeof inventory.reserve !== "function") {
    inventory.reserve = (reservationId: string, quantity: number, expirationMinutes = 15) => {
      if ((inventory.availableQuantity ?? 0) < quantity) return false;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
      inventory.reservations = inventory.reservations || [];
      inventory.reservations.push({
        reservationId,
        quantity,
        reservedAt: new Date(),
        expiresAt,
        status: "active",
      });
      inventory.reservedQuantity = (inventory.reservedQuantity ?? 0) + quantity;
      inventory.availableQuantity = (inventory.availableQuantity ?? 0) - quantity;
      inventory.health = inventory.health || {};
      inventory.health.reservedUnits = (inventory.health.reservedUnits ?? 0) + quantity;
      return true;
    };
  }

  if (typeof inventory.release !== "function") {
    inventory.release = (reservationId: string) => {
      const reservation = (inventory.reservations || []).find(
        (r: IInventoryReservation) => r.reservationId === reservationId && r.status === "active",
      ) as IInventoryReservation | undefined;
      if (!reservation) return false;
      reservation.status = "expired";
      inventory.reservedQuantity = Math.max(
        0,
        (inventory.reservedQuantity ?? 0) - reservation.quantity,
      );
      inventory.availableQuantity = (inventory.availableQuantity ?? 0) + reservation.quantity;
      inventory.health = inventory.health || {};
      inventory.health.reservedUnits = Math.max(
        0,
        (inventory.health.reservedUnits ?? 0) - reservation.quantity,
      );
      return true;
    };
  }

  if (typeof inventory.convertReservation !== "function") {
    inventory.convertReservation = (reservationId: string, _orderId: string) => {
      const reservation = (inventory.reservations || []).find(
        (r: IInventoryReservation) => r.reservationId === reservationId && r.status === "active",
      ) as IInventoryReservation | undefined;
      if (!reservation) return false;
      reservation.status = "converted";
      inventory.reservedQuantity = Math.max(
        0,
        (inventory.reservedQuantity ?? 0) - reservation.quantity,
      );
      inventory.totalQuantity = Math.max(
        0,
        (inventory.totalQuantity ?? 0) - reservation.quantity,
      );
      inventory.availableQuantity = Math.max(
        0,
        (inventory.availableQuantity ?? 0),
      );
      inventory.health = inventory.health || {};
      inventory.health.sellableUnits = Math.max(
        0,
        (inventory.health.sellableUnits ?? 0) - reservation.quantity,
      );
      return true;
    };
  }

  if (typeof inventory.isOutOfStock !== "function") {
    inventory.isOutOfStock = () => (inventory.availableQuantity ?? 0) <= 0;
  }

  return inventory;
};

/**
 * Inventory Service
 * Manages stock levels, reservations, and inventory health across FBM/FBF fulfillment
 */

export interface IReceiveInventoryParams {
  listingId: string;
  productId: string;
  sellerId: string;
  quantity: number;
  fulfillmentType: "FBM" | "FBF";
  orgId: string;
  warehouseId?: string;
  binLocation?: string;
  performedBy: string;
  reason?: string;
}

export interface IReserveInventoryParams {
  listingId: string;
  quantity: number;
  reservationId: string;
  orgId: string;
  expirationMinutes?: number;
}

export interface IReleaseInventoryParams {
  listingId: string;
  reservationId: string;
  orgId: string;
}

export interface IConvertReservationParams {
  listingId: string;
  reservationId: string;
  orderId: string;
  orgId: string;
}

export interface IReturnInventoryParams {
  listingId: string;
  rmaId: string;
  quantity: number;
  condition: "sellable" | "unsellable";
  orgId: string;
  session?: ClientSession;
}

export interface IAdjustInventoryParams {
  listingId: string;
  quantity: number;
  type: "damage" | "lost";
  reason: string;
  performedBy: string;
  orgId: string;
}

export interface IInventoryHealthReport {
  totalListings: number;
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  strandedCount: number;
  agingCount: number; // Inventory older than 90 days
}

class InventoryService {
  /**
   * Initialize inventory for a new listing
   */
  async initializeInventory(
    params: IReceiveInventoryParams,
  ): Promise<IInventory> {
    try {
      if (!params.orgId) {
        throw new Error("orgId is required to initialize inventory");
      }

      const inventoryId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const inventory = await SouqInventory.create({
        inventoryId,
        listingId: params.listingId,
        productId: params.productId,
        sellerId: params.sellerId,
        orgId: params.orgId,
        availableQuantity: params.quantity,
        totalQuantity: params.quantity,
        reservedQuantity: 0,
        fulfillmentType: params.fulfillmentType,
        warehouseId: params.warehouseId,
        binLocation: params.binLocation,
        reservations: [],
        transactions: [
          {
            transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: "receive",
            quantity: params.quantity,
            reason: params.reason || "Initial inventory",
            performedBy: params.performedBy,
            performedAt: new Date(),
          },
        ],
        health: {
          sellableUnits: params.quantity,
          unsellableUnits: 0,
          inboundUnits: 0,
          reservedUnits: 0,
          agingDays: 0,
          isStranded: false,
        },
        status: "active",
      });

      // Update listing stock status
      await this.updateListingStockStatus(
        params.listingId,
        params.quantity,
        params.orgId,
      );

      logger.info("Inventory initialized", {
        inventoryId,
        listingId: params.listingId,
        quantity: params.quantity,
      });

      return inventory;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to initialize inventory", error, { params });
      throw error;
    }
  }

  /**
   * Receive additional stock for existing inventory
   */
  async receiveStock(
    listingId: string,
    quantity: number,
    performedBy: string,
    orgId: string,
    reason?: string
  ): Promise<IInventory> {
    try {
      if (!orgId) {
        throw new Error("orgId is required to receive stock");
      }

      const inventory = await SouqInventory.findOne({
        listingId,
        status: { $ne: "suspended" },
        ...buildOrgFilter(orgId),
      });

      if (!inventory) {
        throw new Error(`Inventory not found for listing: ${listingId}`);
      }

      inventory.receive(quantity, performedBy, reason);
      await inventory.save();

      // Update listing stock status
      await this.updateListingStockStatus(
        listingId,
        inventory.availableQuantity,
        orgId,
      );

      logger.info("Stock received", {
        listingId,
        quantity,
        availableQuantity: inventory.availableQuantity,
      });

      return inventory;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to receive stock", error, { listingId, quantity });
      throw error;
    }
  }

  /**
   * Reserve inventory for a pending checkout
   */
  async reserveInventory(params: IReserveInventoryParams): Promise<boolean> {
    try {
      if (!params.orgId) {
        throw new Error("orgId is required to reserve inventory");
      }

      const inventory = await SouqInventory.findOne({
        listingId: params.listingId,
        status: "active",
        ...buildOrgFilter(params.orgId),
      });
      ensureInventoryMethods(inventory);

      if (!inventory) {
        logger.warn("Inventory not found", { listingId: params.listingId });
        return false;
      }

      // Clean expired reservations first
      if (typeof (inventory as { cleanExpiredReservations?: () => number }).cleanExpiredReservations === "function") {
        (inventory as { cleanExpiredReservations: () => number }).cleanExpiredReservations();
      }

      // Try to reserve
      const reserved = inventory.reserve(
        params.reservationId,
        params.quantity,
        params.expirationMinutes || 15,
      );

      if (!reserved) {
        logger.warn("Insufficient stock for reservation", {
          listingId: params.listingId,
          requested: params.quantity,
          available: inventory.availableQuantity,
        });
        return false;
      }

      await inventory.save();

      // Update listing if out of stock
      if (inventory.isOutOfStock()) {
        await this.updateListingStockStatus(
          params.listingId,
          0,
          params.orgId,
        );
      }

      logger.info("Inventory reserved", {
        reservationId: params.reservationId,
        listingId: params.listingId,
        quantity: params.quantity,
      });

      return true;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to reserve inventory", error, { params });
      throw error;
    }
  }

  /**
   * Release a reservation (order cancelled or expired)
   */
  async releaseReservation(params: IReleaseInventoryParams): Promise<boolean> {
    try {
      if (!params.orgId) {
        throw new Error("orgId is required to release reservation");
      }

      const inventory = await SouqInventory.findOne({
        listingId: params.listingId,
        ...buildOrgFilter(params.orgId),
      });
      ensureInventoryMethods(inventory);

      if (!inventory) {
        logger.warn("Inventory not found", { listingId: params.listingId });
        return false;
      }

      const released = inventory.release(params.reservationId);

      if (!released) {
        logger.warn("Reservation not found or already released", {
          reservationId: params.reservationId,
        });
        return false;
      }

      await inventory.save();

      // Update listing stock status
      await this.updateListingStockStatus(
        params.listingId,
        inventory.availableQuantity,
        params.orgId,
      );

      logger.info("Reservation released", {
        reservationId: params.reservationId,
        listingId: params.listingId,
      });

      return true;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to release reservation", error, { params });
      throw error;
    }
  }

  /**
   * Convert reservation to sale (order confirmed)
   */
  async convertReservationToSale(
    params: IConvertReservationParams,
  ): Promise<boolean> {
    try {
      if (!params.orgId) {
        throw new Error("orgId is required to convert reservation");
      }

      const inventory = await SouqInventory.findOne({
        listingId: params.listingId,
        ...buildOrgFilter(params.orgId),
      });
      ensureInventoryMethods(inventory);

      if (!inventory) {
        throw new Error(`Inventory not found for listing: ${params.listingId}`);
      }

      const converted = inventory.convertReservation(
        params.reservationId,
        params.orderId,
      );

      if (!converted) {
        throw new Error(`Reservation not found: ${params.reservationId}`);
      }

      await inventory.save();

      // Update listing stock status
      await this.updateListingStockStatus(
        params.listingId,
        inventory.availableQuantity,
        params.orgId,
      );

      // Trigger Buy Box recompute if stock changed significantly
      if (inventory.isLowStock()) {
        await addJob("souq:buybox-recompute", "recompute", {
          productId: inventory.productId,
        });
      }

      logger.info("Reservation converted to sale", {
        reservationId: params.reservationId,
        orderId: params.orderId,
        listingId: params.listingId,
      });

      return true;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to convert reservation", error, { params });
      throw error;
    }
  }

  /**
   * Process return (RMA)
   */
  async processReturn(params: IReturnInventoryParams): Promise<IInventory> {
    try {
      if (!params.orgId) {
        throw new Error("orgId is required to process returns");
      }

      const inventoryQuery = SouqInventory.findOne({
        listingId: params.listingId,
        ...buildOrgFilter(params.orgId),
      });
      const inventory = params.session
        ? await inventoryQuery.session(params.session)
        : await inventoryQuery;
      ensureInventoryMethods(inventory);

      if (!inventory) {
        throw new Error(`Inventory not found for listing: ${params.listingId}`);
      }

      inventory.processReturn(params.rmaId, params.quantity, params.condition);
      await inventory.save(params.session ? { session: params.session } : undefined);

      // Update listing stock status
      await this.updateListingStockStatus(
        params.listingId,
        inventory.availableQuantity,
        params.orgId,
        params.session,
      );

      logger.info("Return processed", {
        rmaId: params.rmaId,
        listingId: params.listingId,
        quantity: params.quantity,
        condition: params.condition,
      });

      return inventory;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to process return", error, { params });
      throw error;
    }
  }

  /**
   * Adjust inventory for damage/loss
   */
  async adjustInventory(params: IAdjustInventoryParams): Promise<IInventory> {
    try {
      if (!params.orgId) {
        throw new Error("orgId is required to adjust inventory");
      }

      const inventory = await SouqInventory.findOne({
        listingId: params.listingId,
        orgId: params.orgId,
      });

      if (!inventory) {
        throw new Error(`Inventory not found for listing: ${params.listingId}`);
      }

      inventory.adjustUnsellable(
        params.quantity,
        params.type,
        params.performedBy,
        params.reason,
      );
      await inventory.save();

      logger.info("Inventory adjusted", {
        listingId: params.listingId,
        quantity: params.quantity,
        type: params.type,
      });

      return inventory;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to adjust inventory", error, { params });
      throw error;
    }
  }

  /**
   * Get inventory for a listing
   */
  async getInventory(
    listingId: string,
    orgId: string,
  ): Promise<IInventory | null> {
    if (!orgId) {
      throw new Error("orgId is required to fetch inventory");
    }

    const doc = await SouqInventory.findOne({
      listingId,
      ...buildOrgFilter(orgId),
    }).lean();

    return doc ? (doc as unknown as IInventory) : null;
  }

  /**
   * Get all inventory for a seller
   */
  async getSellerInventory(
    sellerId: string,
    filters?: {
      status?: string;
      fulfillmentType?: "FBM" | "FBF";
      lowStockOnly?: boolean;
      orgId: string;
    },
  ): Promise<IInventory[]> {
    const orgId = filters?.orgId;
    if (!orgId) {
      throw new Error("orgId is required to fetch seller inventory");
    }

    const query: Record<string, unknown> = { sellerId, ...buildOrgFilter(orgId) };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.fulfillmentType) {
      query.fulfillmentType = filters.fulfillmentType;
    }

    if (filters?.orgId) {
      query.orgId = filters.orgId;
    }

    let inventory = await SouqInventory.find(query).sort({ updatedAt: -1 });

    if (filters?.lowStockOnly) {
      inventory = inventory.filter((inv: IInventory) => inv.isLowStock());
    }

    return inventory;
  }

  /**
   * Get inventory health report for a seller
   */
  async getInventoryHealthReport(
    sellerId: string,
    orgId: string,
  ): Promise<IInventoryHealthReport> {
    if (!orgId) {
      throw new Error("orgId is required to fetch inventory health");
    }

    const inventory = await SouqInventory.find({
      sellerId,
      status: "active",
      ...buildOrgFilter(orgId),
    });

    const report: IInventoryHealthReport = {
      totalListings: inventory.length,
      totalUnits: 0,
      availableUnits: 0,
      reservedUnits: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      strandedCount: 0,
      agingCount: 0,
    };

    inventory.forEach((inv: IInventory) => {
      report.totalUnits += inv.totalQuantity;
      report.availableUnits += inv.availableQuantity;
      report.reservedUnits += inv.reservedQuantity;

      if (inv.isLowStock()) report.lowStockCount++;
      if (inv.isOutOfStock()) report.outOfStockCount++;
      if (inv.health.isStranded) report.strandedCount++;
      if (inv.health.agingDays > 90) report.agingCount++;
    });

    return report;
  }

  /**
   * Clean expired reservations (run periodically via cron)
   */
  async cleanExpiredReservations(orgId: string): Promise<{
    cleaned: number;
    released: number;
  }> {
    if (!orgId) {
      throw new Error("orgId is required to clean expired reservations");
    }

    let cleaned = 0;
    let released = 0;

    try {
      const inventories = await SouqInventory.find({
        status: "active",
        "reservations.status": "active",
        ...buildOrgFilter(orgId),
      });

      for (const inventory of inventories) {
        const count = inventory.cleanExpiredReservations();
        if (count > 0) {
          await inventory.save();
          await this.updateListingStockStatus(
            inventory.listingId,
            inventory.availableQuantity,
            orgId,
          );
          cleaned++;
          released += count;
        }
      }

      logger.info("Expired reservations cleaned", { cleaned, released });

      return { cleaned, released };
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to clean expired reservations", error);
      throw error;
    }
  }

  /**
   * Update inventory health metrics (run daily)
   */
  async updateHealthMetrics(sellerId: string | undefined, orgId: string): Promise<void> {
    try {
      if (!orgId) {
        throw new Error("orgId is required to update health metrics");
      }

      const query: Record<string, unknown> = { status: "active", ...buildOrgFilter(orgId) };
      if (sellerId) query.sellerId = sellerId;

      const inventories = await SouqInventory.find(query);

      for (const inventory of inventories) {
        inventory.updateHealth();

        // Check if listing still exists (stranded check)
        // legacy fallback: second query intentionally omits orgId for backward compatibility with legacy records
        const listing =
          (await SouqListing.findOne({
            listingId: inventory.listingId,
            ...buildOrgFilter(orgId),
          })) ?? (await SouqListing.findOne({ listingId: inventory.listingId }));
        inventory.health.isStranded = !listing || listing.status !== "active";

        await inventory.save();
      }

      logger.info("Health metrics updated", { count: inventories.length });
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to update health metrics", error);
      throw error;
    }
  }

  /**
   * Queue low stock alerts
   */
  async queueLowStockAlerts(sellerId: string | undefined, orgId: string): Promise<number> {
    try {
      if (!orgId) {
        throw new Error("orgId is required to queue low stock alerts");
      }

      const query: Record<string, unknown> = { status: "active", ...buildOrgFilter(orgId) };
      if (sellerId) query.sellerId = sellerId;

      const inventories = await SouqInventory.find(query);
      let alertCount = 0;

      for (const inventory of inventories) {
        if (inventory.isLowStock()) {
          await addJob("souq:notifications", "low_stock_alert", {
            sellerId: inventory.sellerId,
            listingId: inventory.listingId,
            productId: inventory.productId,
            availableQuantity: inventory.availableQuantity,
            threshold: inventory.lowStockThreshold,
            orgId,
          });
          alertCount++;
        }
      }

      logger.info("Low stock alerts queued", { alertCount });
      return alertCount;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to queue low stock alerts", error);
      throw error;
    }
  }

  /**
   * Private helper: Update listing stock status
   */
  private async updateListingStockStatus(
    listingId: string,
    availableQuantity: number,
    orgId?: string,
    session?: ClientSession,
  ): Promise<void> {
    try {
      if (!orgId) {
        logger.warn("Listing stock update skipped (orgId missing)", { listingId });
        return;
      }

      const query: Record<string, unknown> = { listingId, ...buildOrgFilter(orgId) };

      const listingQuery = SouqListing.findOne(query);
      let listing = session ? await listingQuery.session(session) : await listingQuery;

      // Backward compatibility: allow legacy records missing orgId, but do not cross orgs
      // legacy fallback: intentionally omits orgId for backward compatibility, with explicit org mismatch check below
      if (!listing) {
        const fallbackQuery = SouqListing.findOne({ listingId });
        const fallback = session ? await fallbackQuery.session(session) : await fallbackQuery;
        if (fallback?.orgId && fallback.orgId.toString() !== orgId.toString()) {
          logger.warn("Listing org mismatch during stock update; skipping", {
            listingId,
            orgId,
            listingOrgId: fallback.orgId.toString(),
          });
          return;
        }
        listing = fallback ?? null;
      }

      if (!listing) {
        logger.warn("Listing not found for inventory update", { listingId });
        return;
      }

      listing.stockQuantity = availableQuantity;
      await listing.save(session ? { session } : undefined);
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Failed to update listing stock status", error, {
        listingId,
      });
      // Don't throw - this is a secondary operation
    }
  }
}

export const inventoryService = new InventoryService();
