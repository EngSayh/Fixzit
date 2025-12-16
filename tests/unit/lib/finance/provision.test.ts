/**
 * @fileoverview Tests for provision.ts (finance module)
 * Tests subscription provisioning logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Subscription model
vi.mock('@/server/models/Subscription', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

describe('provision.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('provisionSubscriber', () => {
    it('should find subscription by _id', async () => {
      const Subscription = (await import('@/server/models/Subscription')).default;
      const mockSubscription = {
        _id: 'sub123',
        status: 'ACTIVE',
        tenant_id: 'tenant123',
      };

      vi.mocked(Subscription.findOne).mockResolvedValue(mockSubscription as any);

      const { provisionSubscriber } = await import('@/lib/finance/provision');
      const result = await provisionSubscriber('sub123');

      expect(Subscription.findOne).toHaveBeenCalledWith({ _id: 'sub123' });
      expect(result).toEqual(mockSubscription);
    });

    it('should throw error when subscription not found', async () => {
      const Subscription = (await import('@/server/models/Subscription')).default;

      vi.mocked(Subscription.findOne).mockResolvedValue(null);

      const { provisionSubscriber } = await import('@/lib/finance/provision');

      await expect(provisionSubscriber('nonexistent')).rejects.toThrow(
        'Subscription not found for provisioning',
      );
    });

    it('should return full subscription document', async () => {
      const Subscription = (await import('@/server/models/Subscription')).default;
      const fullSubscription = {
        _id: 'sub789',
        status: 'ACTIVE',
        tenant_id: 'tenant456',
        plan_id: 'pro',
        seats: 10,
        billing_cycle: 'monthly',
        metadata: {
          welcome_email_sent: true,
        },
      };

      vi.mocked(Subscription.findOne).mockResolvedValue(fullSubscription as any);

      const { provisionSubscriber } = await import('@/lib/finance/provision');
      const result = await provisionSubscriber('sub789');

      expect(result).toHaveProperty('plan_id', 'pro');
      expect(result).toHaveProperty('seats', 10);
    });

    it('should handle subscription with pending status', async () => {
      const Subscription = (await import('@/server/models/Subscription')).default;
      const pendingSubscription = {
        _id: 'sub_pending',
        status: 'PENDING',
        tenant_id: 'tenant789',
      };

      vi.mocked(Subscription.findOne).mockResolvedValue(pendingSubscription as any);

      const { provisionSubscriber } = await import('@/lib/finance/provision');
      const result = await provisionSubscriber('sub_pending');

      expect(result.status).toBe('PENDING');
    });

    it('should work with ObjectId-like string', async () => {
      const Subscription = (await import('@/server/models/Subscription')).default;
      const mockSubscription = {
        _id: '507f1f77bcf86cd799439011',
        status: 'ACTIVE',
      };

      vi.mocked(Subscription.findOne).mockResolvedValue(mockSubscription as any);

      const { provisionSubscriber } = await import('@/lib/finance/provision');
      const result = await provisionSubscriber('507f1f77bcf86cd799439011');

      expect(result._id).toBe('507f1f77bcf86cd799439011');
    });

    it('should surface database errors', async () => {
      const Subscription = (await import('@/server/models/Subscription')).default;
      vi.mocked(Subscription.findOne).mockRejectedValue(new Error('db offline'));

      const { provisionSubscriber } = await import('@/lib/finance/provision');

      await expect(provisionSubscriber('any')).rejects.toThrow('db offline');
    });
  });
});
