/**
 * Subscription Seat Management Service
 * Handles user activation/deactivation, seat allocation, and usage tracking
 */

import mongoose from 'mongoose';
import Subscription from '../models/Subscription';
import { connectToDatabase } from '../../lib/mongodb-unified';
import { logger } from '@/lib/logger';

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
  work_orders: number;
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
type SubscriptionInstance = NonNullable<SubscriptionDocument>;

type SubscriptionMetadata = {
  seat_allocations?: SeatAllocation[];
  usage_snapshot?: UsageSnapshot;
  last_usage_sync?: Date;
  [key: string]: unknown;
};

function ensureSeatMetadata(sub: SubscriptionInstance): SubscriptionMetadata {
  if (!sub.metadata || typeof sub.metadata !== 'object') {
    sub.metadata = {};
  }
  const metadata = sub.metadata as SubscriptionMetadata;
  if (!Array.isArray(metadata.seat_allocations)) {
    metadata.seat_allocations = [];
  }
  return metadata;
}

/**
 * Get active subscription for a tenant
 */
export async function getSubscriptionForTenant(tenantId: string): Promise<SubscriptionDocument> {
  await connectToDatabase();
  
  return Subscription.findOne({
    tenant_id: tenantId,
    status: { $in: ['ACTIVE', 'PAST_DUE'] },
  });
}

/**
 * Get active subscription for an owner
 */
export async function getSubscriptionForOwner(ownerUserId: string): Promise<SubscriptionDocument> {
  await connectToDatabase();
  
  return Subscription.findOne({
    owner_user_id: ownerUserId,
    status: { $in: ['ACTIVE', 'PAST_DUE'] },
  });
}

/**
 * Check if subscription has enough available seats
 */
export function ensureSeatsAvailable(sub: SubscriptionInstance, requiredSeats: number): void {
  if (sub.seats < requiredSeats) {
    throw new Error(`Not enough seats. Required: ${requiredSeats}, Available: ${sub.seats}`);
  }
}

/**
 * Allocate a seat to a user for a specific module
 */
export async function allocateSeat(
  subscriptionId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  moduleKey: string,
  allocatedBy?: mongoose.Types.ObjectId | string
): Promise<SubscriptionInstance> {
  await connectToDatabase();
  
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  if (subscription.status !== 'ACTIVE' && subscription.status !== 'PAST_DUE') {
    throw new Error(`Cannot allocate seat to inactive subscription: ${subscriptionId}`);
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
    (a) => a.userId.toString() === userId.toString() && a.moduleKey === moduleKey
  );

  if (existingAllocation) {
    logger.warn('[Seats] User already has seat for module', { 
      userId: userId.toString(), 
      moduleKey 
    });
    return subscription;
  }

  // Check if we have available seats
  const allocatedCount = allocations.length;
  if (allocatedCount >= subscription.seats) {
    throw new Error(`No available seats. Total: ${subscription.seats}, Allocated: ${allocatedCount}`);
  }

  // Allocate the seat
  allocations.push({
    userId: new mongoose.Types.ObjectId(userId),
    moduleKey,
    allocatedAt: new Date(),
    allocatedBy: allocatedBy ? new mongoose.Types.ObjectId(allocatedBy) : undefined,
  });

  metadata.seat_allocations = allocations;
  await subscription.save();

  logger.info('[Seats] Seat allocated', { 
    subscriptionId: subscriptionId.toString(), 
    userId: userId.toString(), 
    moduleKey 
  });
  return subscription;
}

/**
 * Deallocate a seat from a user
 */
export async function deallocateSeat(
  subscriptionId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  moduleKey?: string
): Promise<SubscriptionInstance> {
  await connectToDatabase();
  
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  const metadata = subscription.metadata as SubscriptionMetadata | undefined;
  if (!metadata?.seat_allocations) {
    logger.warn('[Seats] No seat allocations to remove', { 
      subscriptionId: subscriptionId.toString(), 
      userId: userId.toString() 
    });
    return subscription;
  }

  const allocations = metadata.seat_allocations ?? [];

  // Remove specific module or all modules for user
  metadata.seat_allocations = allocations.filter(
    (a) => {
      const matchesUser = a.userId.toString() === userId.toString();
      if (moduleKey) {
        return !(matchesUser && a.moduleKey === moduleKey);
      }
      return !matchesUser;
    }
  );

  await subscription.save();

  logger.info('[Seats] Seat deallocated', { 
    subscriptionId: subscriptionId.toString(), 
    userId: userId.toString(), 
    moduleKey: moduleKey || 'all' 
  });
  return subscription;
}

/**
 * Get available seats count
 */
export async function getAvailableSeats(
  subscriptionId: mongoose.Types.ObjectId | string
): Promise<number> {
  await connectToDatabase();
  
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  const metadata = subscription.metadata as SubscriptionMetadata | undefined;
  const allocations = metadata?.seat_allocations;
  const allocatedCount = Array.isArray(allocations) ? allocations.length : 0;
  return subscription.seats - allocatedCount;
}

/**
 * Get comprehensive seat usage report
 */
export async function getSeatUsageReport(
  subscriptionId: mongoose.Types.ObjectId | string
): Promise<SeatUsageReport> {
  await connectToDatabase();
  
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  const metadata = subscription.metadata as SubscriptionMetadata | undefined;
  const allocations = metadata?.seat_allocations ?? [];
  const allocatedSeats = Array.isArray(allocations) ? allocations.length : 0;
  const availableSeats = subscription.seats - allocatedSeats;
  const utilization = subscription.seats > 0 ? (allocatedSeats / subscription.seats) * 100 : 0;

  return {
    subscriptionId: subscription._id as mongoose.Types.ObjectId,
    totalSeats: subscription.seats,
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
  ownerUserId?: string
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
    (a) => a.userId.toString() === userId.toString() && a.moduleKey === moduleKey
  );
}

/**
 * Record user activation (when user is created or reactivated)
 */
export async function recordUserActivation(subscriptionId: string): Promise<SubscriptionDocument> {
  await connectToDatabase();
  
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return null;
  
  logger.info('[Subscription] User activated', { subscriptionId });
  return sub;
}

/**
 * Record user deactivation (when user is deactivated or deleted)
 */
export async function recordUserDeactivation(subscriptionId: string): Promise<SubscriptionDocument> {
  await connectToDatabase();
  
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return null;
  
  logger.info('[Subscription] User deactivated', { subscriptionId });
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
    work_orders?: number;
  }
): Promise<SubscriptionDocument> {
  await connectToDatabase();
  
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return null;
  
  // Store usage snapshot in metadata
  if (!sub.metadata || typeof sub.metadata !== 'object') {
    sub.metadata = {};
  }
  const metadata = sub.metadata as SubscriptionMetadata;
  metadata.usage_snapshot = {
    timestamp: new Date(),
    users: snapshot.users || 0,
    properties: snapshot.properties || 0,
    units: snapshot.units || 0,
    work_orders: snapshot.work_orders || 0,
    active_users_by_module: {},
  };
  sub.metadata.last_usage_sync = new Date();
  
  await sub.save();
  logger.info('[Subscription] Usage snapshot updated', { subscriptionId, snapshot });
  return sub;
}

/**
 * Bulk allocate seats for multiple users
 */
export async function bulkAllocateSeats(
  subscriptionId: mongoose.Types.ObjectId | string,
  allocations: Array<{ userId: string; moduleKey: string }>,
  allocatedBy?: mongoose.Types.ObjectId | string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const allocation of allocations) {
    try {
      await allocateSeat(subscriptionId, allocation.userId, allocation.moduleKey, allocatedBy);
      results.success++;
    } catch (error: unknown) {
      results.failed++;
      const message = error instanceof Error ? error.message : String(error);
      results.errors.push(`${allocation.userId}/${allocation.moduleKey}: ${message}`);
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
