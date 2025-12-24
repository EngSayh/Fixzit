/**
 * @description Tests for /api/superadmin/notifications/* endpoints
 * @file tests/api/superadmin/notifications.route.test.ts
 * 
 * Pattern: Static imports with mutable context variables (per TESTING_STRATEGY.md)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mutable context variables - read at call time by mock factories
type SuperadminSession = {
  username: string;
  role: string;
  orgId: string;
  issuedAt: number;
  expiresAt: number;
} | null;

let mockSession: SuperadminSession = null;
let mockNotifications: unknown[] = [];
let mockNotificationCount = 0;

// Mock dependencies
vi.mock('@/lib/superadmin/auth', () => ({
  getSuperadminSession: vi.fn(async () => mockSession),
}));

vi.mock('@/lib/mongodb-unified', () => ({
  getDatabase: vi.fn(async () => ({
    collection: vi.fn(() => ({
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn(async () => mockNotifications),
      })),
      countDocuments: vi.fn(async () => mockNotificationCount),
    })),
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/db/collections', () => ({
  COLLECTIONS: {
    notifications: 'notifications',
  },
}));

// Static imports AFTER vi.mock() calls (pool:forks compatible pattern)
import { GET as getHistory } from '@/app/api/superadmin/notifications/history/route';
import { GET as getConfig } from '@/app/api/superadmin/notifications/config/route';
import { POST as postSend } from '@/app/api/superadmin/notifications/send/route';
import { POST as postTest } from '@/app/api/superadmin/notifications/test/route';

describe('GET /api/superadmin/notifications/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
    mockNotifications = [];
    mockNotificationCount = 0;
  });

  it('returns 401 when not authenticated', async () => {
    mockSession = null;

    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/history');
    const response = await getHistory(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns notifications when authenticated', async () => {
    mockSession = {
      username: 'admin',
      role: 'super_admin',
      orgId: 'system',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    };
    mockNotifications = [
      { _id: '1', title: 'Test Notification', status: 'sent', createdAt: new Date() },
    ];
    mockNotificationCount = 1;

    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/history');
    const response = await getHistory(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.notifications).toHaveLength(1);
  });
});

describe('GET /api/superadmin/notifications/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it('returns 401 when not authenticated', async () => {
    mockSession = null;

    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/config');
    const response = await getConfig(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns config when authenticated', async () => {
    mockSession = {
      username: 'admin',
      role: 'super_admin',
      orgId: 'system',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    };

    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/config');
    const response = await getConfig(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.config).toBeDefined();
    expect(data.config.email).toBeDefined();
    expect(data.config.sms).toBeDefined();
  });
});

describe('POST /api/superadmin/notifications/send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it('returns 401 when not authenticated', async () => {
    mockSession = null;

    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', message: 'Test message' }),
    });
    const response = await postSend(request);

    expect(response.status).toBe(401);
  });

  it('returns 400 when title/message missing', async () => {
    mockSession = {
      username: 'admin',
      role: 'super_admin',
      orgId: 'system',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    };

    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/send', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await postSend(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('required');
  });
});

describe('POST /api/superadmin/notifications/test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it('returns 401 when not authenticated', async () => {
    mockSession = null;

    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ channel: 'email' }),
    });
    const response = await postTest(request);

    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid channel', async () => {
    mockSession = {
      username: 'admin',
      role: 'super_admin',
      orgId: 'system',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    };

    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ channel: 'invalid-channel' }),
    });
    const response = await postTest(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid channel');
  });
});
