/**
 * @fileoverview SSE Module Tests
 * @module tests/unit/lib/sse
 * @see Issue #293 - Technical Debt: Complete TODO Items
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  subscribeToNotifications,
  publishNotification,
  formatSSEMessage,
  createHeartbeat,
  getActiveSubscriptionCount,
  SSE_CONFIG,
  type NotificationPayload,
  type SSEMessage,
} from '@/lib/sse';
import { Types } from 'mongoose';

describe('sse', () => {
  const testOrgId = new Types.ObjectId();
  const testUserId = new Types.ObjectId();
  const otherOrgId = new Types.ObjectId();
  const otherUserId = new Types.ObjectId();

  beforeEach(() => {
    // Clear any existing subscriptions by unsubscribing all
    vi.clearAllMocks();
  });

  describe('subscribeToNotifications', () => {
    it('should return an unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToNotifications(testOrgId, testUserId, callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Cleanup
      unsubscribe();
    });

    it('should increment subscription count on subscribe', () => {
      const initialCount = getActiveSubscriptionCount();
      const callback = vi.fn();
      const unsubscribe = subscribeToNotifications(testOrgId, testUserId, callback);
      
      expect(getActiveSubscriptionCount()).toBe(initialCount + 1);
      
      // Cleanup
      unsubscribe();
    });

    it('should decrement subscription count on unsubscribe', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToNotifications(testOrgId, testUserId, callback);
      const countAfterSubscribe = getActiveSubscriptionCount();
      
      unsubscribe();
      
      expect(getActiveSubscriptionCount()).toBe(countAfterSubscribe - 1);
    });
  });

  describe('publishNotification', () => {
    it('should call subscriber callback when notification published', async () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToNotifications(testOrgId, testUserId, callback);
      
      const notification: NotificationPayload = {
        id: 'notif-1',
        type: 'notification',
        title: 'Test',
        message: 'Test message',
        priority: 'medium',
        createdAt: new Date().toISOString(),
      };
      
      await publishNotification(testOrgId, notification);
      
      expect(callback).toHaveBeenCalledWith(notification);
      
      // Cleanup
      unsubscribe();
    });

    it('should not call subscriber from different org (tenant isolation)', async () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToNotifications(testOrgId, testUserId, callback);
      
      const notification: NotificationPayload = {
        id: 'notif-2',
        type: 'notification',
        title: 'Other Org',
        message: 'Should not receive',
        priority: 'low',
        createdAt: new Date().toISOString(),
      };
      
      // Publish to different org
      await publishNotification(otherOrgId, notification);
      
      expect(callback).not.toHaveBeenCalled();
      
      // Cleanup
      unsubscribe();
    });

    it('should filter by targetUserIds when specified', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const unsubscribe1 = subscribeToNotifications(testOrgId, testUserId, callback1);
      const unsubscribe2 = subscribeToNotifications(testOrgId, otherUserId, callback2);
      
      const notification: NotificationPayload = {
        id: 'notif-3',
        type: 'notification',
        title: 'Targeted',
        message: 'Only for user 1',
        priority: 'high',
        createdAt: new Date().toISOString(),
      };
      
      // Target only testUserId
      await publishNotification(testOrgId, notification, [testUserId]);
      
      expect(callback1).toHaveBeenCalledWith(notification);
      expect(callback2).not.toHaveBeenCalled();
      
      // Cleanup
      unsubscribe1();
      unsubscribe2();
    });

    it('should send to all users when targetUserIds not specified', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const unsubscribe1 = subscribeToNotifications(testOrgId, testUserId, callback1);
      const unsubscribe2 = subscribeToNotifications(testOrgId, otherUserId, callback2);
      
      const notification: NotificationPayload = {
        id: 'notif-4',
        type: 'system_announcement',
        title: 'Broadcast',
        message: 'For everyone',
        priority: 'medium',
        createdAt: new Date().toISOString(),
      };
      
      await publishNotification(testOrgId, notification);
      
      expect(callback1).toHaveBeenCalledWith(notification);
      expect(callback2).toHaveBeenCalledWith(notification);
      
      // Cleanup
      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('formatSSEMessage', () => {
    it('should format message with all fields', () => {
      const message: SSEMessage<{ text: string }> = {
        id: 'msg-1',
        event: 'notification',
        data: { text: 'Hello' },
        retry: 3000,
      };
      
      const formatted = formatSSEMessage(message);
      
      expect(formatted).toContain('id: msg-1\n');
      expect(formatted).toContain('event: notification\n');
      expect(formatted).toContain('retry: 3000\n');
      expect(formatted).toContain('data: {"text":"Hello"}\n\n');
    });

    it('should handle missing optional fields', () => {
      const message: SSEMessage = {
        id: 'msg-2',
        event: 'heartbeat',
        data: {},
      };
      
      const formatted = formatSSEMessage(message);
      
      expect(formatted).toContain('id: msg-2\n');
      expect(formatted).toContain('event: heartbeat\n');
      expect(formatted).not.toContain('retry:');
      expect(formatted).toContain('data: {}\n\n');
    });
  });

  describe('createHeartbeat', () => {
    it('should create valid heartbeat comment', () => {
      const heartbeat = createHeartbeat();
      
      expect(heartbeat).toMatch(/^: heartbeat \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\n\n$/);
    });
  });

  describe('getActiveSubscriptionCount', () => {
    it('should return count for specific org', () => {
      const callback = vi.fn();
      const unsubscribe1 = subscribeToNotifications(testOrgId, testUserId, callback);
      const unsubscribe2 = subscribeToNotifications(testOrgId, otherUserId, callback);
      const unsubscribe3 = subscribeToNotifications(otherOrgId, testUserId, callback);
      
      expect(getActiveSubscriptionCount(testOrgId)).toBe(2);
      expect(getActiveSubscriptionCount(otherOrgId)).toBe(1);
      
      // Cleanup
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    });
  });

  describe('SSE_CONFIG', () => {
    it('should have valid heartbeat interval', () => {
      expect(SSE_CONFIG.HEARTBEAT_INTERVAL_MS).toBeGreaterThan(0);
    });

    it('should have valid reconnect retry', () => {
      expect(SSE_CONFIG.RECONNECT_RETRY_MS).toBeGreaterThan(0);
    });

    it('should have reasonable max connections', () => {
      expect(SSE_CONFIG.MAX_CONNECTIONS_PER_USER).toBeGreaterThanOrEqual(1);
      expect(SSE_CONFIG.MAX_CONNECTIONS_PER_USER).toBeLessThanOrEqual(10);
    });
  });
});
