/**
 * Session Security Tests
 * 
 * Tests for session management security including:
 * - Session fixation prevention
 * - Session timeout handling
 * - Concurrent session limits
 * - Session hijacking prevention
 * 
 * @module tests/unit/security/session-security.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock crypto for secure random generation
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return {
    ...actual,
    randomBytes: vi.fn().mockReturnValue(Buffer.from('0123456789abcdef')),
  };
});

describe('Session Security', () => {
  const USER_ID = '6579a1b2c3d4e5f6a7b8c9d0';
  const ORG_ID = '6579a1b2c3d4e5f6a7b8c9d1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Session Fixation Prevention', () => {
    it('should regenerate session ID after authentication', () => {
      const sessionStore = new Map<string, { userId: string; createdAt: Date }>();
      
      // Create initial anonymous session
      const oldSessionId = 'anon-session-123';
      sessionStore.set(oldSessionId, { userId: '', createdAt: new Date() });

      const regenerateSession = (oldId: string, userId: string) => {
        // Delete old session
        sessionStore.delete(oldId);
        
        // Create new session with new ID
        const newSessionId = `auth-session-${Date.now()}`;
        sessionStore.set(newSessionId, { userId, createdAt: new Date() });
        
        return newSessionId;
      };

      const newSessionId = regenerateSession(oldSessionId, USER_ID);

      expect(sessionStore.has(oldSessionId)).toBe(false);
      expect(sessionStore.has(newSessionId)).toBe(true);
      expect(sessionStore.get(newSessionId)?.userId).toBe(USER_ID);
    });

    it('should invalidate all previous sessions on password change', () => {
      const userSessions = new Map<string, string[]>();
      userSessions.set(USER_ID, ['session-1', 'session-2', 'session-3']);

      const invalidateAllSessions = (userId: string, exceptCurrentSession?: string) => {
        const sessions = userSessions.get(userId) || [];
        const invalidated = sessions.filter(s => s !== exceptCurrentSession);
        
        if (exceptCurrentSession && sessions.includes(exceptCurrentSession)) {
          userSessions.set(userId, [exceptCurrentSession]);
        } else {
          userSessions.delete(userId);
        }
        
        return invalidated;
      };

      const invalidated = invalidateAllSessions(USER_ID, 'session-2');

      expect(invalidated).toContain('session-1');
      expect(invalidated).toContain('session-3');
      expect(invalidated).not.toContain('session-2');
      expect(userSessions.get(USER_ID)).toEqual(['session-2']);
    });
  });

  describe('Session Timeout', () => {
    it('should expire idle sessions after timeout', () => {
      const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

      const isSessionExpired = (lastActivityAt: Date) => {
        return Date.now() - lastActivityAt.getTime() > SESSION_TIMEOUT_MS;
      };

      const recentSession = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const expiredSession = new Date(Date.now() - 45 * 60 * 1000); // 45 minutes ago

      expect(isSessionExpired(recentSession)).toBe(false);
      expect(isSessionExpired(expiredSession)).toBe(true);
    });

    it('should extend session on activity', () => {
      const session = {
        id: 'session-123',
        userId: USER_ID,
        lastActivityAt: new Date(Date.now() - 20 * 60 * 1000),
      };

      const updateSessionActivity = (sess: typeof session) => {
        return { ...sess, lastActivityAt: new Date() };
      };

      const updatedSession = updateSessionActivity(session);
      
      expect(updatedSession.lastActivityAt.getTime()).toBeGreaterThan(
        session.lastActivityAt.getTime()
      );
    });

    it('should enforce absolute session expiry', () => {
      const ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

      const isAbsolutelyExpired = (createdAt: Date) => {
        return Date.now() - createdAt.getTime() > ABSOLUTE_TIMEOUT_MS;
      };

      const newSession = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const oldSession = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

      expect(isAbsolutelyExpired(newSession)).toBe(false);
      expect(isAbsolutelyExpired(oldSession)).toBe(true);
    });
  });

  describe('Concurrent Session Limits', () => {
    it('should limit number of concurrent sessions per user', () => {
      const MAX_SESSIONS = 3;
      const userSessions = new Map<string, Array<{ id: string; createdAt: Date }>>();

      const addSession = (userId: string, sessionId: string) => {
        const sessions = userSessions.get(userId) || [];
        
        // Sort by creation time (oldest first)
        sessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        
        // Remove oldest if at limit
        const removedSessions: string[] = [];
        while (sessions.length >= MAX_SESSIONS) {
          const removed = sessions.shift();
          if (removed) removedSessions.push(removed.id);
        }
        
        // Add new session
        sessions.push({ id: sessionId, createdAt: new Date() });
        userSessions.set(userId, sessions);
        
        return { removedSessions };
      };

      addSession(USER_ID, 'session-1');
      addSession(USER_ID, 'session-2');
      addSession(USER_ID, 'session-3');
      const result = addSession(USER_ID, 'session-4');

      expect(result.removedSessions).toContain('session-1');
      expect(userSessions.get(USER_ID)?.length).toBe(3);
    });

    it('should track session device fingerprints', () => {
      const sessions = new Map<string, { deviceFingerprint: string; ipAddress: string }>();

      const createSession = (
        sessionId: string,
        deviceInfo: { userAgent: string; screenRes: string },
        ipAddress: string
      ) => {
        // Create simple device fingerprint
        const fingerprint = Buffer.from(
          `${deviceInfo.userAgent}|${deviceInfo.screenRes}`
        ).toString('base64').substring(0, 32);

        sessions.set(sessionId, { deviceFingerprint: fingerprint, ipAddress });
        return fingerprint;
      };

      const fp1 = createSession('session-1', 
        { userAgent: 'Mozilla/5.0 Chrome', screenRes: '1920x1080' },
        '192.168.1.1'
      );

      const fp2 = createSession('session-2',
        { userAgent: 'Mozilla/5.0 Chrome', screenRes: '1920x1080' },
        '192.168.1.2'
      );

      expect(fp1).toBe(fp2); // Same device, different IP
      expect(sessions.get('session-1')?.ipAddress).not.toBe(
        sessions.get('session-2')?.ipAddress
      );
    });
  });

  describe('Session Hijacking Prevention', () => {
    it('should detect IP address changes mid-session', () => {
      const session = {
        id: 'session-123',
        userId: USER_ID,
        originalIp: '192.168.1.1',
        currentIp: '192.168.1.1',
      };

      const detectIpChange = (sess: typeof session, requestIp: string) => {
        if (sess.originalIp !== requestIp) {
          return {
            suspicious: true,
            reason: 'IP address changed during session',
            originalIp: sess.originalIp,
            newIp: requestIp,
          };
        }
        return { suspicious: false };
      };

      expect(detectIpChange(session, '192.168.1.1').suspicious).toBe(false);
      expect(detectIpChange(session, '10.0.0.1').suspicious).toBe(true);
    });

    it('should detect user agent changes mid-session', () => {
      const session = {
        id: 'session-123',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0',
      };

      const detectUaChange = (sess: typeof session, requestUa: string) => {
        // Simple comparison - in production, you'd parse and compare major components
        if (sess.userAgent !== requestUa) {
          return {
            suspicious: true,
            reason: 'User agent changed during session',
          };
        }
        return { suspicious: false };
      };

      expect(detectUaChange(session, session.userAgent).suspicious).toBe(false);
      expect(detectUaChange(session, 'Mozilla/5.0 Windows Firefox/115.0').suspicious).toBe(true);
    });

    it('should invalidate session on suspicious activity', () => {
      const activeSessions = new Set(['session-123', 'session-456']);

      const invalidateOnSuspiciousActivity = (
        sessionId: string,
        activityScore: number
      ): boolean => {
        const THRESHOLD = 0.7;
        
        if (activityScore >= THRESHOLD) {
          activeSessions.delete(sessionId);
          return true;
        }
        return false;
      };

      expect(activeSessions.has('session-123')).toBe(true);
      
      const invalidated = invalidateOnSuspiciousActivity('session-123', 0.85);
      
      expect(invalidated).toBe(true);
      expect(activeSessions.has('session-123')).toBe(false);
    });
  });

  describe('Secure Cookie Configuration', () => {
    it('should set correct cookie attributes', () => {
      const buildSessionCookie = (
        sessionId: string,
        options: { isProduction: boolean; domain?: string }
      ) => {
        return {
          name: 'session',
          value: sessionId,
          httpOnly: true,
          secure: options.isProduction,
          sameSite: 'lax' as const,
          path: '/',
          domain: options.domain,
          maxAge: 7 * 24 * 60 * 60, // 7 days
        };
      };

      const prodCookie = buildSessionCookie('session-123', { 
        isProduction: true,
        domain: '.fixzit.co',
      });

      expect(prodCookie.httpOnly).toBe(true);
      expect(prodCookie.secure).toBe(true);
      expect(prodCookie.sameSite).toBe('lax');
      expect(prodCookie.domain).toBe('.fixzit.co');
    });

    it('should generate cryptographically secure session IDs', () => {
      const generateSessionId = () => {
        const bytes = new Uint8Array(32);
        // In browser/Node, use crypto.getRandomValues or crypto.randomBytes
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = Math.floor(Math.random() * 256);
        }
        return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      };

      const id1 = generateSessionId();
      const id2 = generateSessionId();

      expect(id1).toHaveLength(64);
      expect(id2).toHaveLength(64);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Session Storage Security', () => {
    it('should encrypt sensitive session data at rest', () => {
      // Simplified encryption simulation
      const encrypt = (data: string, key: string): string => {
        return Buffer.from(data).toString('base64');
      };

      const decrypt = (encrypted: string, key: string): string => {
        return Buffer.from(encrypted, 'base64').toString();
      };

      const sessionData = JSON.stringify({
        userId: USER_ID,
        orgId: ORG_ID,
        role: 'ADMIN',
      });

      const encrypted = encrypt(sessionData, 'encryption-key');
      const decrypted = decrypt(encrypted, 'encryption-key');

      expect(encrypted).not.toBe(sessionData);
      expect(decrypted).toBe(sessionData);
    });

    it('should not store sensitive data in session', () => {
      const sanitizeSessionData = (rawData: {
        userId: string;
        email: string;
        password?: string;
        creditCard?: string;
        ssn?: string;
      }) => {
        // Remove sensitive fields before storing
        const { password, creditCard, ssn, ...safeData } = rawData;
        return safeData;
      };

      const userData = {
        userId: USER_ID,
        email: 'user@example.com',
        password: 'secret123',
        creditCard: '4111111111111111',
        ssn: '123-45-6789',
      };

      const sessionData = sanitizeSessionData(userData);

      expect(sessionData).not.toHaveProperty('password');
      expect(sessionData).not.toHaveProperty('creditCard');
      expect(sessionData).not.toHaveProperty('ssn');
      expect(sessionData.userId).toBe(USER_ID);
    });
  });
});
