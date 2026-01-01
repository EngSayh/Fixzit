/**
 * FEATURE-001: Notification Broadcast Service Tests
 * 
 * Unit tests for the notification broadcast service.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import {
  broadcastWorkOrderNotification,
  broadcastPaymentNotification,
  broadcastBidNotification,
  broadcastMaintenanceAlert,
  broadcastSystemAnnouncement,
} from '@/lib/notifications/broadcast';
import * as sseModule from '@/lib/sse';

// Mock the SSE module
vi.mock('@/lib/sse', async () => {
  const actual = await vi.importActual('@/lib/sse');
  return {
    ...actual,
    publishNotification: vi.fn(),
  };
});

describe('Notification Broadcast Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOrgId = new Types.ObjectId().toString();

  describe('broadcastWorkOrderNotification', () => {
    it('broadcasts work order created notification', async () => {
      await broadcastWorkOrderNotification(
        {
          workOrderId: 'wo-123',
          workOrderNumber: 'WO-001',
          action: 'created',
        },
        { orgId: mockOrgId }
      );

      expect(sseModule.publishNotification).toHaveBeenCalledTimes(1);
      const [orgId, payload] = (sseModule.publishNotification as ReturnType<typeof vi.fn>).mock.calls[0];
      
      expect(orgId.toString()).toBe(new Types.ObjectId(mockOrgId).toString());
      expect(payload.type).toBe('work_order_update');
      expect(payload.title).toBe('Work Order #WO-001');
      expect(payload.message).toBe('New work order created');
      expect(payload.link).toBe('/fm/work-orders/wo-123');
    });

    it('broadcasts work order status change notification', async () => {
      await broadcastWorkOrderNotification(
        {
          workOrderId: 'wo-456',
          workOrderNumber: 'WO-002',
          action: 'status_changed',
          newStatus: 'In Progress',
        },
        { orgId: mockOrgId }
      );

      expect(sseModule.publishNotification).toHaveBeenCalledTimes(1);
      const [, payload] = (sseModule.publishNotification as ReturnType<typeof vi.fn>).mock.calls[0];
      
      expect(payload.message).toBe('Work order status changed to In Progress');
    });

    it('targets specific users when provided', async () => {
      const targetUsers = [new Types.ObjectId().toString(), new Types.ObjectId().toString()];
      
      await broadcastWorkOrderNotification(
        {
          workOrderId: 'wo-789',
          workOrderNumber: 'WO-003',
          action: 'assigned',
          assignedTo: 'John Doe',
        },
        { orgId: mockOrgId, userIds: targetUsers }
      );

      expect(sseModule.publishNotification).toHaveBeenCalledTimes(1);
      const [, , targetUserIds] = (sseModule.publishNotification as ReturnType<typeof vi.fn>).mock.calls[0];
      
      expect(targetUserIds).toHaveLength(2);
    });
  });

  describe('broadcastPaymentNotification', () => {
    it('broadcasts payment received notification', async () => {
      await broadcastPaymentNotification(
        {
          paymentId: 'pay-123',
          amount: 150.50,
          currency: 'SAR',
          action: 'received',
        },
        { orgId: mockOrgId }
      );

      expect(sseModule.publishNotification).toHaveBeenCalledTimes(1);
      const [, payload] = (sseModule.publishNotification as ReturnType<typeof vi.fn>).mock.calls[0];
      
      expect(payload.type).toBe('payment_confirmed');
      expect(payload.message).toBe('Payment of SAR 150.50 received');
      expect(payload.priority).toBe('medium');
    });

    it('sets high priority for failed payments', async () => {
      await broadcastPaymentNotification(
        {
          paymentId: 'pay-456',
          amount: 200.00,
          currency: 'SAR',
          action: 'failed',
        },
        { orgId: mockOrgId }
      );

      const [, payload] = (sseModule.publishNotification as ReturnType<typeof vi.fn>).mock.calls[0];
      
      expect(payload.priority).toBe('high');
    });
  });

  describe('broadcastBidNotification', () => {
    it('broadcasts bid submitted notification', async () => {
      await broadcastBidNotification(
        {
          bidId: 'bid-123',
          rfqId: 'rfq-456',
          vendorName: 'ACME Corp',
          action: 'submitted',
        },
        { orgId: mockOrgId }
      );

      expect(sseModule.publishNotification).toHaveBeenCalledTimes(1);
      const [, payload] = (sseModule.publishNotification as ReturnType<typeof vi.fn>).mock.calls[0];
      
      expect(payload.type).toBe('bid_received');
      expect(payload.message).toBe('New bid received from ACME Corp');
      expect(payload.link).toBe('/fm/rfqs/rfq-456');
      expect(payload.priority).toBe('high');
    });
  });

  describe('broadcastMaintenanceAlert', () => {
    it('broadcasts maintenance alert with high priority by default', async () => {
      await broadcastMaintenanceAlert(
        'Scheduled Maintenance',
        'System will be down for 2 hours',
        { orgId: mockOrgId }
      );

      expect(sseModule.publishNotification).toHaveBeenCalledTimes(1);
      const [, payload] = (sseModule.publishNotification as ReturnType<typeof vi.fn>).mock.calls[0];
      
      expect(payload.type).toBe('maintenance_alert');
      expect(payload.title).toBe('Scheduled Maintenance');
      expect(payload.message).toBe('System will be down for 2 hours');
      expect(payload.priority).toBe('high');
    });
  });

  describe('broadcastSystemAnnouncement', () => {
    it('broadcasts system announcement to all users', async () => {
      await broadcastSystemAnnouncement(
        'New Feature',
        'Check out our new dashboard!',
        { orgId: mockOrgId, link: '/dashboard' }
      );

      expect(sseModule.publishNotification).toHaveBeenCalledTimes(1);
      const [, payload, targetUsers] = (sseModule.publishNotification as ReturnType<typeof vi.fn>).mock.calls[0];
      
      expect(payload.type).toBe('system_announcement');
      expect(payload.link).toBe('/dashboard');
      // System announcements don't target specific users
      expect(targetUsers).toBeUndefined();
    });
  });
});
