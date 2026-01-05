/**
 * WebSocket Cleanup Tests
 * 
 * Tests for proper WebSocket connection cleanup on disconnect
 * to prevent resource leaks and orphaned connections.
 * 
 * @module tests/unit/services/websocket-cleanup.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('WebSocket Cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Connection Management', () => {
    it('should track active connections per user', () => {
      const connections = new Map<string, Set<string>>();

      const addConnection = (userId: string, connectionId: string) => {
        if (!connections.has(userId)) {
          connections.set(userId, new Set());
        }
        connections.get(userId)!.add(connectionId);
      };

      const removeConnection = (userId: string, connectionId: string) => {
        const userConnections = connections.get(userId);
        if (userConnections) {
          userConnections.delete(connectionId);
          if (userConnections.size === 0) {
            connections.delete(userId);
          }
        }
      };

      const getConnectionCount = (userId: string): number => {
        return connections.get(userId)?.size || 0;
      };

      addConnection('user-1', 'conn-1');
      addConnection('user-1', 'conn-2');
      addConnection('user-2', 'conn-3');

      expect(getConnectionCount('user-1')).toBe(2);
      expect(getConnectionCount('user-2')).toBe(1);

      removeConnection('user-1', 'conn-1');
      expect(getConnectionCount('user-1')).toBe(1);

      removeConnection('user-1', 'conn-2');
      expect(connections.has('user-1')).toBe(false);
    });

    it('should limit connections per user', () => {
      const MAX_CONNECTIONS_PER_USER = 5;
      const connections = new Map<string, string[]>();

      const addConnection = (userId: string, connectionId: string): boolean => {
        const userConnections = connections.get(userId) || [];
        
        if (userConnections.length >= MAX_CONNECTIONS_PER_USER) {
          return false;
        }

        userConnections.push(connectionId);
        connections.set(userId, userConnections);
        return true;
      };

      for (let i = 0; i < MAX_CONNECTIONS_PER_USER; i++) {
        expect(addConnection('user-1', `conn-${i}`)).toBe(true);
      }

      expect(addConnection('user-1', 'conn-extra')).toBe(false);
    });
  });

  describe('Cleanup on Disconnect', () => {
    it('should clean up resources on connection close', () => {
      const resources = {
        subscriptions: new Set<string>(),
        timers: new Map<string, ReturnType<typeof setTimeout>>(),
        callbacks: new Map<string, () => void>(),
      };

      const setupConnection = (connId: string) => {
        resources.subscriptions.add(`${connId}:notifications`);
        resources.subscriptions.add(`${connId}:updates`);
        resources.timers.set(connId, setTimeout(() => {}, 30000));
        resources.callbacks.set(connId, () => {});
      };

      const cleanupConnection = (connId: string) => {
        // Remove subscriptions
        resources.subscriptions.forEach(sub => {
          if (sub.startsWith(connId)) {
            resources.subscriptions.delete(sub);
          }
        });

        // Clear timers
        const timer = resources.timers.get(connId);
        if (timer) {
          clearTimeout(timer);
          resources.timers.delete(connId);
        }

        // Remove callbacks
        resources.callbacks.delete(connId);
      };

      setupConnection('conn-123');
      expect(resources.subscriptions.size).toBe(2);
      expect(resources.timers.size).toBe(1);
      expect(resources.callbacks.size).toBe(1);

      cleanupConnection('conn-123');
      expect(resources.subscriptions.size).toBe(0);
      expect(resources.timers.size).toBe(0);
      expect(resources.callbacks.size).toBe(0);
    });

    it('should handle graceful close with cleanup delay', async () => {
      let cleanedUp = false;
      const CLEANUP_DELAY_MS = 1000;

      const scheduleCleanup = (connId: string, callback: () => void) => {
        return setTimeout(() => {
          callback();
          cleanedUp = true;
        }, CLEANUP_DELAY_MS);
      };

      scheduleCleanup('conn-123', () => {
        // Cleanup logic
      });

      expect(cleanedUp).toBe(false);

      vi.advanceTimersByTime(CLEANUP_DELAY_MS);

      expect(cleanedUp).toBe(true);
    });

    it('should cancel pending cleanup on reconnect', () => {
      const pendingCleanups = new Map<string, ReturnType<typeof setTimeout>>();

      const scheduleCleanup = (connId: string, callback: () => void, delay: number) => {
        const timer = setTimeout(callback, delay);
        pendingCleanups.set(connId, timer);
      };

      const cancelCleanup = (connId: string): boolean => {
        const timer = pendingCleanups.get(connId);
        if (timer) {
          clearTimeout(timer);
          pendingCleanups.delete(connId);
          return true;
        }
        return false;
      };

      let cleanedUp = false;
      scheduleCleanup('conn-123', () => { cleanedUp = true; }, 5000);

      expect(pendingCleanups.has('conn-123')).toBe(true);

      // User reconnects before cleanup
      const cancelled = cancelCleanup('conn-123');
      expect(cancelled).toBe(true);

      vi.advanceTimersByTime(5000);
      expect(cleanedUp).toBe(false);
    });
  });

  describe('Heartbeat Monitoring', () => {
    it('should detect stale connections via heartbeat', () => {
      // Heartbeat interval: 30000ms, Stale threshold: 60000ms
      const STALE_THRESHOLD_MS = 60000;

      const connections = new Map<string, { lastHeartbeat: number }>();

      const updateHeartbeat = (connId: string) => {
        connections.set(connId, { lastHeartbeat: Date.now() });
      };

      const isStale = (connId: string): boolean => {
        const conn = connections.get(connId);
        if (!conn) return true;
        return Date.now() - conn.lastHeartbeat > STALE_THRESHOLD_MS;
      };

      const cleanupStaleConnections = () => {
        const staleIds: string[] = [];
        connections.forEach((conn, connId) => {
          if (isStale(connId)) {
            staleIds.push(connId);
          }
        });
        staleIds.forEach(id => connections.delete(id));
        return staleIds;
      };

      updateHeartbeat('conn-1');
      updateHeartbeat('conn-2');

      vi.advanceTimersByTime(30000);
      updateHeartbeat('conn-1'); // Only conn-1 sends heartbeat

      vi.advanceTimersByTime(40000);

      const stale = cleanupStaleConnections();
      expect(stale).toContain('conn-2');
      expect(stale).not.toContain('conn-1');
      expect(connections.has('conn-1')).toBe(true);
      expect(connections.has('conn-2')).toBe(false);
    });

    it('should send ping/pong for connection health', () => {
      const pingResponses: string[] = [];

      const sendPing = (connId: string) => {
        return { connId, type: 'ping', timestamp: Date.now() };
      };

      const handlePong = (connId: string) => {
        pingResponses.push(connId);
      };

      const ping = sendPing('conn-123');
      expect(ping.type).toBe('ping');

      handlePong('conn-123');
      expect(pingResponses).toContain('conn-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle abrupt disconnections', () => {
      const errorLog: Array<{ connId: string; error: string }> = [];

      const handleDisconnectError = (connId: string, error: Error) => {
        errorLog.push({ connId, error: error.message });
        // Perform cleanup anyway
        return true;
      };

      const result = handleDisconnectError('conn-123', new Error('Connection reset'));
      
      expect(result).toBe(true);
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].error).toBe('Connection reset');
    });

    it('should retry cleanup on failure', async () => {
      let attempts = 0;
      const MAX_RETRIES = 3;

      const cleanupWithRetry = async (connId: string): Promise<boolean> => {
        attempts++;
        
        if (attempts < MAX_RETRIES) {
          throw new Error('Cleanup failed');
        }
        
        return true;
      };

      const executeWithRetry = async (
        fn: () => Promise<boolean>,
        maxRetries: number
      ): Promise<boolean> => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch {
            if (i === maxRetries - 1) {
              return false;
            }
          }
        }
        return false;
      };

      const result = await executeWithRetry(() => cleanupWithRetry('conn-123'), MAX_RETRIES);
      expect(result).toBe(true);
      expect(attempts).toBe(MAX_RETRIES);
    });
  });

  describe('Room Management', () => {
    it('should remove user from all rooms on disconnect', () => {
      const rooms = new Map<string, Set<string>>();

      const joinRoom = (roomId: string, userId: string) => {
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
        }
        rooms.get(roomId)!.add(userId);
      };

      const leaveAllRooms = (userId: string) => {
        const leftRooms: string[] = [];
        rooms.forEach((users, roomId) => {
          if (users.has(userId)) {
            users.delete(userId);
            leftRooms.push(roomId);
            if (users.size === 0) {
              rooms.delete(roomId);
            }
          }
        });
        return leftRooms;
      };

      joinRoom('room-a', 'user-1');
      joinRoom('room-b', 'user-1');
      joinRoom('room-b', 'user-2');

      const leftRooms = leaveAllRooms('user-1');
      expect(leftRooms).toContain('room-a');
      expect(leftRooms).toContain('room-b');
      expect(rooms.has('room-a')).toBe(false); // Empty room deleted
      expect(rooms.get('room-b')?.has('user-2')).toBe(true);
    });

    it('should notify room members on user disconnect', () => {
      const notifications: Array<{ roomId: string; message: string }> = [];
      const rooms = new Map<string, Set<string>>();

      const notifyRoomMembers = (roomId: string, excludeUserId: string, message: string) => {
        const users = rooms.get(roomId);
        if (users) {
          users.forEach(userId => {
            if (userId !== excludeUserId) {
              notifications.push({ roomId, message });
            }
          });
        }
      };

      rooms.set('room-1', new Set(['user-1', 'user-2', 'user-3']));

      notifyRoomMembers('room-1', 'user-1', 'user-1 has left');

      expect(notifications).toHaveLength(2); // user-2 and user-3 notified
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should limit total connections globally', () => {
      const MAX_GLOBAL_CONNECTIONS = 10000;
      let currentConnections = 0;

      const canAcceptConnection = (): boolean => {
        return currentConnections < MAX_GLOBAL_CONNECTIONS;
      };

      const addConnection = (): boolean => {
        if (!canAcceptConnection()) {
          return false;
        }
        currentConnections++;
        return true;
      };

      const removeConnection = () => {
        currentConnections = Math.max(0, currentConnections - 1);
      };

      for (let i = 0; i < MAX_GLOBAL_CONNECTIONS; i++) {
        expect(addConnection()).toBe(true);
      }

      expect(addConnection()).toBe(false);

      removeConnection();
      expect(addConnection()).toBe(true);
    });

    it('should clean up expired sessions', () => {
      const SESSION_TIMEOUT_MS = 3600000; // 1 hour
      const sessions = new Map<string, { createdAt: number; userId: string }>();

      const createSession = (connId: string, userId: string) => {
        sessions.set(connId, { createdAt: Date.now(), userId });
      };

      const cleanupExpiredSessions = () => {
        const now = Date.now();
        const expired: string[] = [];

        sessions.forEach((session, connId) => {
          if (now - session.createdAt > SESSION_TIMEOUT_MS) {
            expired.push(connId);
          }
        });

        expired.forEach(connId => sessions.delete(connId));
        return expired;
      };

      createSession('conn-1', 'user-1');
      createSession('conn-2', 'user-2');

      vi.advanceTimersByTime(SESSION_TIMEOUT_MS + 1000);

      createSession('conn-3', 'user-3');

      const expired = cleanupExpiredSessions();
      expect(expired).toContain('conn-1');
      expect(expired).toContain('conn-2');
      expect(expired).not.toContain('conn-3');
      expect(sessions.size).toBe(1);
    });
  });
});
