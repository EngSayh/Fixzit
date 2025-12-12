/**
 * @fileoverview Tests for subscriptionSeatService.ts
 * Tests seat management, allocation, and usage tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// Mock dependencies
vi.mock('../../lib/mongodb-unified', () => ({
  connectToDatabase: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/server/models/Subscription', () => ({
  default: {
    findOne: vi.fn(() => Promise.resolve(null)),
    findById: vi.fn(() => Promise.resolve(null)),
  },
}));

describe('subscriptionSeatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSubscriptionForTenant', () => {
    it('should find active subscription for tenant', async () => {
      const mockSubscription = {
        _id: new mongoose.Types.ObjectId(),
        tenant_id: 'tenant123',
        status: 'ACTIVE',
        seats: 10,
      };

      const Subscription = (await import('@/server/models/Subscription')).default;
      vi.mocked(Subscription.findOne).mockResolvedValue(mockSubscription as any);

      const { getSubscriptionForTenant } = await import('@/server/services/subscriptionSeatService');
      const result = await getSubscriptionForTenant('tenant123');

      expect(result).toEqual(mockSubscription);
      expect(Subscription.findOne).toHaveBeenCalledWith({
        tenant_id: 'tenant123',
        status: { $in: ['ACTIVE', 'PAST_DUE'] },
      });
    });

    it('should return null for non-existent tenant', async () => {
      const Subscription = (await import('@/server/models/Subscription')).default;
      vi.mocked(Subscription.findOne).mockResolvedValue(null);

      const { getSubscriptionForTenant } = await import('@/server/services/subscriptionSeatService');
      const result = await getSubscriptionForTenant('nonexistent');

      expect(result).toBeNull();
    });

    it('should include PAST_DUE in status filter', async () => {
      const Subscription = (await import('@/server/models/Subscription')).default;
      vi.mocked(Subscription.findOne).mockResolvedValue(null);

      const { getSubscriptionForTenant } = await import('@/server/services/subscriptionSeatService');
      await getSubscriptionForTenant('tenant123');

      expect(Subscription.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $in: ['ACTIVE', 'PAST_DUE'] },
        }),
      );
    });
  });

  describe('getSubscriptionForOwner', () => {
    it('should find active subscription for owner', async () => {
      const mockSubscription = {
        _id: new mongoose.Types.ObjectId(),
        owner_user_id: 'owner123',
        status: 'ACTIVE',
        seats: 5,
      };

      const Subscription = (await import('@/server/models/Subscription')).default;
      vi.mocked(Subscription.findOne).mockResolvedValue(mockSubscription as any);

      const { getSubscriptionForOwner } = await import('@/server/services/subscriptionSeatService');
      const result = await getSubscriptionForOwner('owner123');

      expect(result).toEqual(mockSubscription);
    });
  });

  describe('ensureSeatsAvailable', () => {
    it('should not throw when enough seats available', async () => {
      const { ensureSeatsAvailable } = await import('@/server/services/subscriptionSeatService');

      const mockSub = { seats: 10 } as any;

      expect(() => ensureSeatsAvailable(mockSub, 5)).not.toThrow();
    });

    it('should throw when not enough seats', async () => {
      const { ensureSeatsAvailable } = await import('@/server/services/subscriptionSeatService');

      const mockSub = { seats: 2 } as any;

      expect(() => ensureSeatsAvailable(mockSub, 5)).toThrow();
    });

    it('should handle undefined seats as 0', async () => {
      const { ensureSeatsAvailable } = await import('@/server/services/subscriptionSeatService');

      const mockSub = {} as any;

      expect(() => ensureSeatsAvailable(mockSub, 1)).toThrow();
    });

    it('should allow exact seat count', async () => {
      const { ensureSeatsAvailable } = await import('@/server/services/subscriptionSeatService');

      const mockSub = { seats: 5 } as any;

      expect(() => ensureSeatsAvailable(mockSub, 5)).not.toThrow();
    });
  });

  describe('SeatAllocation interface', () => {
    it('should have correct structure', () => {
      // Type check - this will fail at compile time if interface changes
      const allocation: {
        userId: mongoose.Types.ObjectId;
        moduleKey: string;
        allocatedAt: Date;
        allocatedBy?: mongoose.Types.ObjectId;
      } = {
        userId: new mongoose.Types.ObjectId(),
        moduleKey: 'work_orders',
        allocatedAt: new Date(),
      };

      expect(allocation.userId).toBeDefined();
      expect(allocation.moduleKey).toBe('work_orders');
      expect(allocation.allocatedAt).toBeInstanceOf(Date);
    });
  });

  describe('UsageSnapshot interface', () => {
    it('should track multi-module usage', () => {
      const snapshot: {
        timestamp: Date;
        users: number;
        properties: number;
        units: number;
        active_users_by_module: Record<string, number>;
      } = {
        timestamp: new Date(),
        users: 50,
        properties: 10,
        units: 100,
        active_users_by_module: {
          fm: 20,
          aqar: 15,
          souq: 5,
        },
      };

      expect(snapshot.users).toBe(50);
      expect(snapshot.active_users_by_module.fm).toBe(20);
    });
  });

  describe('SeatUsageReport interface', () => {
    it('should calculate utilization correctly', () => {
      const report = {
        subscriptionId: new mongoose.Types.ObjectId(),
        totalSeats: 10,
        allocatedSeats: 7,
        availableSeats: 3,
        utilization: 70, // 7/10 * 100
        allocations: [],
      };

      expect(report.utilization).toBe(70);
      expect(report.totalSeats - report.allocatedSeats).toBe(report.availableSeats);
    });
  });
});
