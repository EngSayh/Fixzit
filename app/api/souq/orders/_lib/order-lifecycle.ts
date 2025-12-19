/**
 * @fileoverview Souq Order Lifecycle Handlers
 * @description Stock reservation, release, and escrow management for orders
 * @module api/souq/orders/_lib/order-lifecycle
 */

import { Types } from "mongoose";
import { logger } from "@/lib/logger";
import { SouqOrder } from "@/server/models/souq/Order";
import { escrowService } from "@/services/souq/settlements/escrow-service";
import { EscrowSource } from "@/server/models/finance/EscrowAccount";

export interface ListingDocument {
  _id: Types.ObjectId;
  availableQuantity?: number;
  reservedQuantity?: number;
  reserveStock?: (quantity: number) => Promise<boolean>;
  releaseStock?: (quantity: number) => Promise<void>;
  save?: () => Promise<unknown>;
  [key: string]: unknown;
}

export interface Reservation {
  listing: ListingDocument;
  quantity: number;
  manualFallback: boolean;
}

/**
 * Reserve stock for a listing
 * Uses listing.reserveStock if available, otherwise manual fallback
 */
export async function reserveStockForListing(
  listingDoc: ListingDocument,
  quantity: number,
): Promise<{ success: boolean; manualFallback: boolean }> {
  if (typeof listingDoc.reserveStock === "function") {
    const success = await listingDoc.reserveStock(quantity);
    return { success, manualFallback: false };
  }

  const available =
    typeof listingDoc.availableQuantity === "number"
      ? listingDoc.availableQuantity
      : 0;
  if (available < quantity) {
    return { success: false, manualFallback: false };
  }
  const currentReserved =
    typeof listingDoc.reservedQuantity === "number"
      ? listingDoc.reservedQuantity
      : 0;
  listingDoc.availableQuantity = available - quantity;
  listingDoc.reservedQuantity = currentReserved + quantity;
  await listingDoc.save?.();
  return { success: true, manualFallback: true };
}

/**
 * Release all stock reservations (rollback on error)
 */
export async function releaseReservations(reservations: Reservation[]): Promise<void> {
  if (!reservations.length) return;
  
  await Promise.all(
    reservations.map(async ({ listing, quantity, manualFallback }) => {
      try {
        if (typeof listing.releaseStock === "function") {
          await listing.releaseStock(quantity);
          return;
        }
        if (manualFallback) {
          const currentReserved =
            typeof listing.reservedQuantity === "number"
              ? listing.reservedQuantity
              : 0;
          const currentAvailable =
            typeof listing.availableQuantity === "number"
              ? listing.availableQuantity
              : 0;
          listing.reservedQuantity = Math.max(0, currentReserved - quantity);
          listing.availableQuantity = currentAvailable + quantity;
          await listing.save?.();
        }
      } catch (releaseError) {
        logger.error(
          "Failed to release reserved stock",
          releaseError as Error,
          {
            listingId: listing?._id?.toString?.(),
          },
        );
      }
    }),
  );
}

export interface DocumentWithId {
  _id: Types.ObjectId;
  [key: string]: unknown;
}

/**
 * Extract document ID from a value that may be a document or ObjectId
 */
export function getDocumentId(
  value: DocumentWithId | Types.ObjectId | unknown,
): Types.ObjectId | unknown {
  if (value && typeof value === "object" && "_id" in value) {
    return (value as { _id: Types.ObjectId })._id;
  }
  return value;
}

export interface EscrowParams {
  orderId: string;
  orderObjectId: Types.ObjectId;
  sellerOrgId: string;
  customerId: Types.ObjectId;
  sellerId?: Types.ObjectId;
  total: number;
  idempotencyKey: string;
}

/**
 * Create escrow account for order
 */
export async function createOrderEscrow(params: EscrowParams): Promise<{
  accountId: Types.ObjectId;
  status: string;
  releaseAfter?: Date;
  idempotencyKey?: string;
} | null> {
  const escrowFeatureFlag =
    process.env.FEATURE_ESCROW_ENABLED ??
    (process.env.NODE_ENV === "test" ? "false" : "true");

  if (escrowFeatureFlag === "false") {
    logger.info("[Escrow] Skipping escrow creation (feature flag disabled)", {
      orderId: params.orderId,
    });
    return null;
  }

  const escrowAccount = await escrowService.createEscrowAccount({
    source: EscrowSource.MARKETPLACE_ORDER,
    sourceId: params.orderObjectId,
    orderId: params.orderObjectId,
    orgId: new Types.ObjectId(params.sellerOrgId),
    buyerId: params.customerId,
    sellerId: params.sellerId,
    expectedAmount: params.total,
    currency: "SAR",
    releaseAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    idempotencyKey: params.idempotencyKey,
    riskHold: false,
  });

  return {
    accountId: escrowAccount._id,
    status: escrowAccount.status,
    releaseAfter: escrowAccount.releasePolicy?.autoReleaseAt,
    idempotencyKey: escrowAccount.idempotencyKeys?.[0],
  };
}

/**
 * Handle escrow creation failure with compensating actions
 */
export async function handleEscrowFailure(
  order: InstanceType<typeof SouqOrder>,
  reservations: Reservation[],
  error: unknown,
): Promise<void> {
  const orderId = order.orderId;
  
  logger.error("[Escrow] Failed to create account for order, applying compensating action", {
    orderId,
    error: error instanceof Error ? error.message : String(error),
  });

  try {
    // Mark order as cancelled with reason (preserves audit trail)
    order.status = "cancelled";
    order.cancelledAt = new Date();
    order.cancellationReason = "Escrow creation failed - system rollback";
    await order.save();

    // Release stock reservations
    await releaseReservations(reservations);

    logger.warn("[Escrow] Order cancelled due to escrow failure (inventory released)", {
      orderId,
    });
  } catch (compensationError) {
    // If compensation fails, try hard delete as last resort
    logger.error("[Escrow] Compensation failed, attempting hard delete", {
      orderId,
      compensationError:
        compensationError instanceof Error
          ? compensationError.message
          : String(compensationError),
    });
    try {
      await SouqOrder.deleteOne({ _id: order._id, orgId: order.orgId });
      await releaseReservations(reservations);
      logger.warn("[Escrow] Order hard-deleted after escrow failure", { orderId });
    } catch (deleteError) {
      logger.error(
        "[Escrow] CRITICAL: Unable to clean up order after escrow failure - manual intervention required",
        {
          orderId,
          deleteError:
            deleteError instanceof Error ? deleteError.message : String(deleteError),
        },
      );
    }
  }
}
