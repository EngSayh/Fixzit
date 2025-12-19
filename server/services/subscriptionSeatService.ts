/**
 * Subscription Seat Management Service
 * Handles user activation/deactivation, seat allocation, and usage tracking
 */

import mongoose from "mongoose";
import Subscription from "../models/Subscription";
import { connectToDatabase } from "../../lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { WORK_ORDERS_ENTITY_LEGACY } from "@/config/topbar-modules";

export interface SeatAllocation {
  userId: mongoose.Types.ObjectId;
  moduleKey: string;
  allocatedAt: Date;
  allocatedBy?: mongoose.Types.ObjectId;
}

export interface UsageSnapshot {
  timestamp: Date;
  users: number;
  properties: number;
  units: number;
  [WORK_ORDERS_ENTITY_LEGACY]: number;
  active_users_by_module: Record<string, number>;
}

export interface SeatUsageReport {
  subscriptionId: mongoose.Types.ObjectId;
  totalSeats: number;
  allocatedSeats: number;
  availableSeats: number;
  utilization: number; // Percentage
  allocations: SeatAllocation[];
  usageSnapshot?: UsageSnapshot;
}

type SubscriptionDocument = Awaited<ReturnType<typeof Subscription.findById>>;

type SubscriptionMetadata = {
  seat_allocations?: SeatAllocation[];
  usage_snapshot?: UsageSnapshot;
  last_usage_sync?: Date;
  [key: string]: unknown;
};

// Extended type that includes metadata and seats properties
type SubscriptionInstance = NonNullable<SubscriptionDocument> & {
  metadata?: Record<string, unknown>;
  seats?: number;
};

function ensureSeatMetadata(sub: SubscriptionInstance): SubscriptionMetadata {
  if (!sub.metadata || typeof sub.metadata !== "object") {
    sub.metadata = {} as Record<string, unknown>;
  }
  const metadata = sub.metadata as unknown as SubscriptionMetadata;
  if (!Array.isArray(metadata.seat_allocations)) {
    metadata.seat_allocations = [];
  }
  return metadata;
}

/**
 * Get active subscription for a tenant
 */
export async function getSubscriptionForTenant(
  tenantId: string,
): Promise<SubscriptionDocument> {
  await connectToDatabase();

  // NO_LEAN: Subscription document returned to caller who may need document methods
  return Subscription.findOne({
    tenant_id: tenantId,
    status: { $in: ["ACTIVE", "PAST_DUE"] },
  });
}

/**
 * Get active subscription for an owner
 */
export async function getSubscriptionForOwner(
  ownerUserId: string,
): Promise<SubscriptionDocument> {
  await connectToDatabase();

  // NO_LEAN: Subscription document returned to caller who may need document methods
  return Subscription.findOne({
    owner_user_id: ownerUserId,
    status: { $in: ["ACTIVE", "PAST_DUE"] },
  });
}

/**
 * Check if subscription has enough available seats
 */
export function ensureSeatsAvailable(
  sub: SubscriptionInstance,
  requiredSeats: number,
): void {
  const seats = sub.seats || 0;
  if (seats < requiredSeats) {
    throw new Error(
      `Not enough seats. Required: ${requiredSeats}, Available: ${seats}`,
    );
  }
}

/**
 * Allocate a seat to a user for a specific module
 */
export async function allocateSeat(
  subscriptionId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  moduleKey: string,
  allocatedBy?: mongoose.Types.ObjectId | string,
): Promise<SubscriptionInstance> {
  await connectToDatabase();

  // NO_LEAN: Document returned to caller who may need to modify seat allocations
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  if (subscription.status !== "ACTIVE" && subscription.status !== "PAST_DUE") {
    throw new Error(
      `Cannot allocate seat to inactive subscription: ${subscriptionId}`,
    );
  }

  // Check if module is included in subscription
  if (!subscription.modules.includes(moduleKey)) {
    throw new Error(`Module ${moduleKey} not included in subscription`);
  }

  // Initialize seat allocations if not exists
  const metadata = ensureSeatMetadata(subscription);
  const allocations = metadata.seat_allocations ?? [];

  // Check if user already has this module allocated
  const existingAllocation = allocations.find(
    (a) =>
      a.userId.toString() === userId.toString() && a.moduleKey === moduleKey,
  );

  if (existingAllocation) {
    logger.warn("[Seats] User already has seat for module", {
      userId: userId.toString(),
      moduleKey,
    });
    return subscription;
  }

  // Check if we have available seats
  const allocatedCount = allocations.length;
  const totalSeats = (subscription as SubscriptionInstance).seats || 0;
  if (allocatedCount >= totalSeats) {
    throw new Error(
      `No available seats. Total: ${totalSeats}, Allocated: ${allocatedCount}`,
    );
  }

  // Allocate the seat
  allocations.push({
    userId: new mongoose.Types.ObjectId(userId),
    moduleKey,
    allocatedAt: new Date(),
    allocatedBy: allocatedBy
      ? new mongoose.Types.ObjectId(allocatedBy)
      : undefined,
  });

  metadata.seat_allocations = allocations;
  await subscription.save();

  logger.info("[Seats] Seat allocated", {
    subscriptionId: subscriptionId.toString(),
    userId: userId.toString(),
    moduleKey,
  });
  return subscription;
}

/**
 * Deallocate a seat from a user
 */
export async function deallocateSeat(
  subscriptionId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  moduleKey?: string,
): Promise<SubscriptionInstance> {
  await connectToDatabase();

  // NO_LEAN: Document needs metadata access and may be modified for seat removal
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  const metadata = subscription.metadata as SubscriptionMetadata | undefined;
  if (!metadata?.seat_allocations) {
    logger.warn("[Seats] No seat allocations to remove", {
      subscriptionId: subscriptionId.toString(),
      userId: userId.toString(),
    });
    return subscription;
  }

  const allocations = metadata.seat_allocations ?? [];

  // Remove specific module or all modules for user
  metadata.seat_allocations = allocations.filter((a) => {
    const matchesUser = a.userId.toString() === userId.toString();
    if (moduleKey) {
      return !(matchesUser && a.moduleKey === moduleKey);
    }
    return !matchesUser;
  });

  await subscription.save();

  logger.info("[Seats] Seat deallocated", {
    subscriptionId: subscriptionId.toString(),
    userId: userId.toString(),
    moduleKey: moduleKey || "all",
  });
  return subscription;
}

/**
 * Get available seats count
 */
export async function getAvailableSeats(
  subscriptionId: mongoose.Types.ObjectId | string,
): Promise<number> {
  await connectToDatabase();

  // NO_LEAN: Document metadata accessed for seat allocation counting
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  const metadata = subscription.metadata as SubscriptionMetadata | undefined;
  const allocations = metadata?.seat_allocations;
  const allocatedCount = Array.isArray(allocations) ? allocations.length : 0;
  const totalSeats = (subscription as SubscriptionInstance).seats || 0;
  return totalSeats - allocatedCount;
}

/**
 * Get comprehensive seat usage report
 */
export async function getSeatUsageReport(
  subscriptionId: mongoose.Types.ObjectId | string,
): Promise<SeatUsageReport> {
  await connectToDatabase();

  // NO_LEAN: Subscription metadata accessed for seat report generation
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  const metadata = subscription.metadata as SubscriptionMetadata | undefined;
  const allocations = metadata?.seat_allocations ?? [];
  const allocatedSeats = Array.isArray(allocations) ? allocations.length : 0;
  const totalSeats = (subscription as SubscriptionInstance).seats || 0;
  const availableSeats = totalSeats - allocatedSeats;
  const utilization =
    totalSeats > 0 ? (allocatedSeats / totalSeats) * 100 : 0;

  return {
    subscriptionId: subscription._id as mongoose.Types.ObjectId,
    totalSeats,
    allocatedSeats,
    availableSeats,
    utilization: Math.round(utilization * 100) / 100,
    allocations,
    usageSnapshot: metadata?.usage_snapshot,
  };
}

/**
 * Validate that a user can access a module
 */
export async function validateModuleAccess(
  userId: mongoose.Types.ObjectId | string,
  moduleKey: string,
  tenantId?: string,
  ownerUserId?: string,
): Promise<boolean> {
  await connectToDatabase();

  // Find subscription for tenant or owner
  let subscription;
  if (tenantId) {
    subscription = await getSubscriptionForTenant(tenantId);
  } else if (ownerUserId) {
    subscription = await getSubscriptionForOwner(ownerUserId);
  } else {
    return false;
  }

  if (!subscription) {
    return false;
  }

  // Check if module is in subscription
  if (!subscription.modules.includes(moduleKey)) {
    return false;
  }

  // Check if user has seat allocated for this module
  const metadata = subscription.metadata as SubscriptionMetadata | undefined;
  const allocations = metadata?.seat_allocations ?? [];
  return allocations.some(
    (a) =>
      a.userId.toString() === userId.toString() && a.moduleKey === moduleKey,
  );
}

/**
 * Record user activation (when user is created or reactivated)
 */
export async function recordUserActivation(
  subscriptionId: string,
): Promise<SubscriptionDocument> {
  await connectToDatabase();

  // NO_LEAN: Document returned to caller who may need document methods
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return null;

  logger.info("[Subscription] User activated", { subscriptionId });
  return sub;
}

/**
 * Record user deactivation (when user is deactivated or deleted)
 */
export async function recordUserDeactivation(
  subscriptionId: string,
): Promise<SubscriptionDocument> {
  await connectToDatabase();

  // NO_LEAN: Document may need metadata access for future operations
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return null;

  logger.info("[Subscription] User deactivated", { subscriptionId });
  return sub;
}

/**
 * Update usage snapshot with current system usage
 */
export async function updateUsageSnapshot(
  subscriptionId: string,
  snapshot: {
    users?: number;
    properties?: number;
    units?: number;
    [WORK_ORDERS_ENTITY_LEGACY]?: number;
  },
): Promise<SubscriptionDocument> {
  await connectToDatabase();

  // NO_LEAN: Document metadata is modified for usage snapshot storage
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return null;

  // Store usage snapshot in metadata
  const subWithMetadata = sub as SubscriptionInstance;
  if (!subWithMetadata.metadata || typeof subWithMetadata.metadata !== "object") {
    subWithMetadata.metadata = {};
  }
  const metadata = subWithMetadata.metadata as SubscriptionMetadata;
  metadata.usage_snapshot = {
    timestamp: new Date(),
    users: snapshot.users || 0,
    properties: snapshot.properties || 0,
    units: snapshot.units || 0,
    [WORK_ORDERS_ENTITY_LEGACY]: snapshot[WORK_ORDERS_ENTITY_LEGACY] || 0,
    active_users_by_module: {},
  };
  metadata.last_usage_sync = new Date();

  await sub.save();
  logger.info("[Subscription] Usage snapshot updated", {
    subscriptionId,
    snapshot,
  });
  return sub;
}

/**
 * Bulk allocate seats for multiple users
 */
export async function bulkAllocateSeats(
  subscriptionId: mongoose.Types.ObjectId | string,
  allocations: Array<{ userId: string; moduleKey: string }>,
  allocatedBy?: mongoose.Types.ObjectId | string,
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const allocation of allocations) {
    try {
      await allocateSeat(
        subscriptionId,
        allocation.userId,
        allocation.moduleKey,
        allocatedBy,
      );
      results.success++;
    } catch (error: unknown) {
      results.failed++;
      const message = error instanceof Error ? error.message : String(error);
      results.errors.push(
        `${allocation.userId}/${allocation.moduleKey}: ${message}`,
      );
    }
  }

  return results;
}

export default {
  getSubscriptionForTenant,
  getSubscriptionForOwner,
  ensureSeatsAvailable,
  allocateSeat,
  deallocateSeat,
  getAvailableSeats,
  getSeatUsageReport,
  validateModuleAccess,
  recordUserActivation,
  recordUserDeactivation,
  updateUsageSnapshot,
  bulkAllocateSeats,
};
