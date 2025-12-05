import { SouqInventory, IInventory } from "@/server/models/souq/Inventory";
import { SouqListing } from "@/server/models/souq/Listing";
import { addJob } from "@/lib/queues/setup";
import { logger } from "@/lib/logger";
import type { ClientSession } from "mongoose";

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

      const inventory = await SouqInventory.findOne(
        {
          listingId,
          status: { $ne: "suspended" },
          orgId,
        },
      );

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
        orgId: params.orgId,
      });

      if (!inventory) {
        logger.warn("Inventory not found", { listingId: params.listingId });
        return false;
      }

      // Clean expired reservations first
      inventory.cleanExpiredReservations();

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
        orgId: params.orgId,
      });

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
        orgId: params.orgId,
      });

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

      const inventory = await SouqInventory.findOne({
        listingId: params.listingId,
        orgId: params.orgId,
      });

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

    return await SouqInventory.findOne({
      listingId,
      orgId,
    });
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

    const query: Record<string, unknown> = { sellerId, orgId };

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
      orgId,
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
        orgId,
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

      const query: Record<string, unknown> = { status: "active" };
      if (sellerId) query.sellerId = sellerId;
      query.orgId = orgId;

      const inventories = await SouqInventory.find(query);

      for (const inventory of inventories) {
        inventory.updateHealth();

        // Check if listing still exists (stranded check)
        const listing = await SouqListing.findOne({
          listingId: inventory.listingId,
          orgId,
        }) ?? await SouqListing.findOne({ listingId: inventory.listingId });
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

      const query: Record<string, unknown> = { status: "active" };
      if (sellerId) query.sellerId = sellerId;
      query.orgId = orgId;

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
      const query: Record<string, unknown> = { listingId };
      if (orgId) query.orgId = orgId;

      const listingQuery = SouqListing.findOne(query);
      let listing = session ? await listingQuery.session(session) : await listingQuery;

      // Backward compatibility: if orgId is set but listing schema/data lacks it
      if (!listing && orgId) {
        const fallbackQuery = SouqListing.findOne({ listingId });
        listing = session ? await fallbackQuery.session(session) : await fallbackQuery;
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
