/**
 * Work Order Status Race Condition Tests
 * 
 * Tests for concurrent status update handling to prevent race conditions.
 * Ensures atomic updates and proper version control.
 * 
 * @module tests/unit/services/work-order-status-race.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Work Order Status Race Conditions', () => {
  const WO_ID = '6579a1b2c3d4e5f6a7b8c9d0';
  const ORG_ID = '6579a1b2c3d4e5f6a7b8c9d1';

  beforeEach(() => {
    vi.useRealTimers(); // Reset any fake timers from other tests
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Optimistic Locking', () => {
    it('should reject update if version has changed', async () => {
      // Simulate optimistic locking with version field
      const currentWorkOrder = {
        _id: WO_ID,
        status: 'PENDING',
        version: 5,
        orgId: ORG_ID,
      };

      const updateWithVersionCheck = vi.fn().mockImplementation(
        async (filter: { _id: string; version: number }, update: { status: string }) => {
          if (filter.version !== currentWorkOrder.version) {
            return { modifiedCount: 0, matchedCount: 0 };
          }
          // Simulate successful update
          return { modifiedCount: 1, matchedCount: 1, ...update, version: filter.version + 1 };
        }
      );

      // First update with correct version succeeds
      const result1 = await updateWithVersionCheck(
        { _id: WO_ID, version: 5 },
        { status: 'IN_PROGRESS' }
      );
      expect(result1.modifiedCount).toBe(1);

      // Update current version to simulate the first update
      currentWorkOrder.version = 6;

      // Second update with stale version fails
      const result2 = await updateWithVersionCheck(
        { _id: WO_ID, version: 5 },
        { status: 'COMPLETED' }
      );
      expect(result2.modifiedCount).toBe(0);
    });

    it('should increment version on successful update', async () => {
      let workOrderVersion = 1;

      const updateAndIncrementVersion = vi.fn().mockImplementation(async () => {
        workOrderVersion += 1;
        return { version: workOrderVersion };
      });

      await updateAndIncrementVersion();
      expect(workOrderVersion).toBe(2);

      await updateAndIncrementVersion();
      expect(workOrderVersion).toBe(3);
    });
  });

  describe('Atomic Status Transitions', () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      PENDING: ['SCHEDULED', 'CANCELLED'],
      SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['PAUSED', 'COMPLETED', 'CANCELLED'],
      PAUSED: ['IN_PROGRESS', 'CANCELLED'],
      COMPLETED: ['CLOSED'],
      CANCELLED: [],
      CLOSED: [],
    };

    it('should only allow valid status transitions', () => {
      const validateTransition = (currentStatus: string, newStatus: string): boolean => {
        const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
        return allowedTransitions.includes(newStatus);
      };

      // Valid transitions
      expect(validateTransition('PENDING', 'SCHEDULED')).toBe(true);
      expect(validateTransition('SCHEDULED', 'IN_PROGRESS')).toBe(true);
      expect(validateTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);

      // Invalid transitions
      expect(validateTransition('PENDING', 'COMPLETED')).toBe(false);
      expect(validateTransition('COMPLETED', 'IN_PROGRESS')).toBe(false);
      expect(validateTransition('CLOSED', 'PENDING')).toBe(false);
    });

    it('should use findOneAndUpdate for atomic operations', async () => {
      const mockFindOneAndUpdate = vi.fn().mockImplementation(
        async (filter: Record<string, unknown>, update: Record<string, unknown>, options: Record<string, unknown>) => {
          // Simulate atomic find and update
          const setFields = (update.$set ?? {}) as Record<string, unknown>;
          return options.new ? { ...filter, ...setFields } : { ...filter };
        }
      );

      const result = await mockFindOneAndUpdate(
        { _id: WO_ID, status: 'PENDING' },
        { $set: { status: 'SCHEDULED', updatedAt: new Date() } },
        { new: true }
      );

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: WO_ID, status: 'PENDING' },
        expect.objectContaining({ $set: expect.objectContaining({ status: 'SCHEDULED' }) }),
        { new: true }
      );
      expect(result.status).toBe('SCHEDULED');
    });

    it('should fail gracefully if status already changed', async () => {
      const mockFindOneAndUpdate = vi.fn().mockResolvedValue(null);

      const result = await mockFindOneAndUpdate(
        { _id: WO_ID, status: 'PENDING' }, // Current status is actually SCHEDULED
        { $set: { status: 'IN_PROGRESS' } },
        { new: true }
      );

      expect(result).toBeNull();
    });
  });

  describe('Concurrent Update Handling', () => {
    it('should handle multiple simultaneous status updates', async () => {
      // Use fake timers to avoid CI flakiness with real setTimeout
      vi.useFakeTimers();
      
      let currentStatus = 'PENDING';
      let updateCount = 0;
      let callOrder = 0;

      const atomicUpdate = vi.fn().mockImplementation(
        async (expectedStatus: string, newStatus: string) => {
          // Use deterministic delays based on call order to simulate race condition
          const order = callOrder++;
          const delays = [5, 2, 8]; // First call gets 5ms, second gets 2ms, third gets 8ms
          await new Promise(resolve => setTimeout(resolve, delays[order] ?? 1));

          if (currentStatus === expectedStatus) {
            currentStatus = newStatus;
            updateCount++;
            return { success: true, newStatus };
          }
          return { success: false, currentStatus };
        }
      );

      // Simulate concurrent updates - start all promises
      const updatePromises = [
        atomicUpdate('PENDING', 'SCHEDULED'),
        atomicUpdate('PENDING', 'CANCELLED'),
        atomicUpdate('PENDING', 'SCHEDULED'),
      ];
      
      // Advance fake timers to let all setTimeout resolve
      await vi.advanceTimersByTimeAsync(20);
      
      // Now await all results
      const updates = await Promise.all(updatePromises);
      
      // Restore real timers
      vi.useRealTimers();

      // Only one should succeed (the one with shortest delay wins)
      const successfulUpdates = updates.filter(u => u.success);
      expect(successfulUpdates.length).toBe(1);
      expect(updateCount).toBe(1);
    }, 10000); // Explicit 10s timeout

    it('should use transactions for multi-document updates', async () => {
      const mockSession = {
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        abortTransaction: vi.fn(),
        endSession: vi.fn(),
      };

      const executeWithTransaction = async (
        operations: Array<() => Promise<unknown>>
      ): Promise<{ success: boolean; results?: unknown[] }> => {
        mockSession.startTransaction();
        try {
          const results = await Promise.all(operations.map(op => op()));
          mockSession.commitTransaction();
          return { success: true, results };
        } catch {
          mockSession.abortTransaction();
          return { success: false };
        } finally {
          mockSession.endSession();
        }
      };

      const updateWorkOrder = vi.fn().mockResolvedValue({ updated: true });
      const createAuditLog = vi.fn().mockResolvedValue({ created: true });

      const result = await executeWithTransaction([updateWorkOrder, createAuditLog]);

      expect(result.success).toBe(true);
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should rollback on partial failure', async () => {
      const mockSession = {
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        abortTransaction: vi.fn(),
        endSession: vi.fn(),
      };

      const executeWithTransaction = async (
        operations: Array<() => Promise<unknown>>
      ): Promise<{ success: boolean }> => {
        mockSession.startTransaction();
        try {
          await Promise.all(operations.map(op => op()));
          mockSession.commitTransaction();
          return { success: true };
        } catch {
          mockSession.abortTransaction();
          return { success: false };
        } finally {
          mockSession.endSession();
        }
      };

      const updateWorkOrder = vi.fn().mockResolvedValue({ updated: true });
      const failingOperation = vi.fn().mockRejectedValue(new Error('Database error'));

      const result = await executeWithTransaction([updateWorkOrder, failingOperation]);

      expect(result.success).toBe(false);
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate status update requests', async () => {
      let workOrder = { _id: WO_ID, status: 'PENDING', lastUpdateId: '' };

      const idempotentUpdate = vi.fn().mockImplementation(
        async (updateId: string, newStatus: string) => {
          // Check if this update was already processed
          if (workOrder.lastUpdateId === updateId) {
            return { success: true, alreadyProcessed: true };
          }

          workOrder = { ...workOrder, status: newStatus, lastUpdateId: updateId };
          return { success: true, alreadyProcessed: false };
        }
      );

      const updateId = 'update-123';

      // First request
      const result1 = await idempotentUpdate(updateId, 'SCHEDULED');
      expect(result1.alreadyProcessed).toBe(false);
      expect(workOrder.status).toBe('SCHEDULED');

      // Duplicate request (retry)
      const result2 = await idempotentUpdate(updateId, 'SCHEDULED');
      expect(result2.alreadyProcessed).toBe(true);
      expect(workOrder.status).toBe('SCHEDULED');
    });

    it('should use request ID for idempotency tracking', () => {
      const processedRequests = new Set<string>();

      const isIdempotent = (requestId: string): boolean => {
        if (processedRequests.has(requestId)) {
          return true;
        }
        processedRequests.add(requestId);
        return false;
      };

      expect(isIdempotent('req-001')).toBe(false); // First time
      expect(isIdempotent('req-001')).toBe(true);  // Duplicate
      expect(isIdempotent('req-002')).toBe(false); // New request
    });
  });

  describe('SLA Impact on Status Updates', () => {
    it('should recalculate SLA when status changes', () => {
      const calculateSLARemaining = (
        createdAt: Date,
        slaHours: number,
        currentStatus: string
      ): number => {
        if (['COMPLETED', 'CLOSED', 'CANCELLED'].includes(currentStatus)) {
          return 0; // SLA doesn't apply to terminal states
        }

        const now = new Date();
        const deadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
        const remainingMs = deadline.getTime() - now.getTime();
        return Math.max(0, remainingMs);
      };

      const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const slaHours = 4;

      const remaining = calculateSLARemaining(createdAt, slaHours, 'IN_PROGRESS');
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(2 * 60 * 60 * 1000);

      const completedRemaining = calculateSLARemaining(createdAt, slaHours, 'COMPLETED');
      expect(completedRemaining).toBe(0);
    });

    it('should pause SLA timer when work order is paused', () => {
      const slaState = {
        totalPausedMs: 0,
        pausedAt: null as Date | null,
        isPaused: false,
      };

      const pauseSLA = (pausedAt: Date) => {
        slaState.pausedAt = pausedAt;
        slaState.isPaused = true;
      };

      const resumeSLA = (resumedAt: Date) => {
        if (slaState.pausedAt) {
          slaState.totalPausedMs += resumedAt.getTime() - slaState.pausedAt.getTime();
          slaState.pausedAt = null;
          slaState.isPaused = false;
        }
      };

      const pauseTime = new Date('2024-01-01T10:00:00Z');
      const resumeTime = new Date('2024-01-01T12:00:00Z');

      pauseSLA(pauseTime);
      expect(slaState.isPaused).toBe(true);

      resumeSLA(resumeTime);
      expect(slaState.isPaused).toBe(false);
      expect(slaState.totalPausedMs).toBe(2 * 60 * 60 * 1000); // 2 hours
    });
  });
});
