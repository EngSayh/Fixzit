// Subscription Seat Management Service
// Handles user activation/deactivation and seat limits

import Subscription from '../models/Subscription';
import { connectToDatabase } from '../../lib/mongodb-unified';
import { logger } from '@/lib/logger';

export async function getSubscriptionForTenant(tenantId: string): Promise<any> {
  await connectToDatabase();
  
  return Subscription.findOne({
    tenant_id: tenantId,
    status: { $in: ['ACTIVE', 'PAST_DUE'] },
  });
}

export function ensureSeatsAvailable(sub: any, requiredSeats: number): void {
  if (sub.seats < requiredSeats) {
    throw new Error(`Not enough seats. Required: ${requiredSeats}, Available: ${sub.seats}`);
  }
}

export async function recordUserActivation(subscriptionId: string): Promise<any> {
  await connectToDatabase();
  
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return null;
  
  // Logic for tracking active users would go here
  // For now, just return the subscription
  logger.info('[Subscription] User activated', { subscriptionId });
  return sub;
}

export async function recordUserDeactivation(subscriptionId: string): Promise<any> {
  await connectToDatabase();
  
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return null;
  
  logger.info('[Subscription] User deactivated', { subscriptionId });
  return sub;
}

export async function updateUsageSnapshot(subscriptionId: string, snapshot: { users?: number; properties?: number; units?: number; work_orders?: number }): Promise<any> {
  await connectToDatabase();
  
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return null;
  
  // Store usage snapshot in metadata
  if (!sub.metadata) sub.metadata = {};
  sub.metadata.usage_snapshot = snapshot;
  sub.metadata.last_usage_sync = new Date();
  
  await sub.save();
  logger.info('[Subscription] Usage snapshot updated', { subscriptionId, snapshot });
  return sub;
}
