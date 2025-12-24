/**
 * @description Tests for /api/superadmin/notifications/* endpoints
 * @file tests/api/superadmin/notifications.route.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/superadmin/auth', () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock('@/lib/mongodb-unified', () => ({
  getDatabase: vi.fn(),
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

// Get mocked functions
import { getSuperadminSession } from '@/lib/superadmin/auth';
import { getDatabase } from '@/lib/mongodb-unified';

const mockGetSuperadminSession = vi.mocked(getSuperadminSession);
const mockGetDatabase = vi.mocked(getDatabase);

describe('GET /api/superadmin/notifications/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // NOTE: vi.resetModules() intentionally omitted here because this test
    // relies on hoisted vi.mock() calls. Calling resetModules() would clear
    // those mocks and cause the route to use real implementations.
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSuperadminSession.mockResolvedValue(null);

    const { GET } = await import('@/app/api/superadmin/notifications/history/route');
    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/history');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns notifications when authenticated', async () => {
    mockGetSuperadminSession.mockResolvedValue({
      username: 'admin',
      role: 'super_admin',
      orgId: 'system',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    const mockNotifications = [
      { _id: '1', title: 'Test Notification', status: 'sent', createdAt: new Date() },
    ];
    const mockCollection = {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue(mockNotifications),
            }),
          }),
        }),
      }),
      countDocuments: vi.fn().mockResolvedValue(1),
    };
    mockGetDatabase.mockResolvedValue({
      collection: vi.fn().mockReturnValue(mockCollection),
    } as unknown as ReturnType<typeof getDatabase>);

    const { GET } = await import('@/app/api/superadmin/notifications/history/route');
    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/history');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.notifications).toHaveLength(1);
  });
});

describe('GET /api/superadmin/notifications/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // NOTE: vi.resetModules() intentionally omitted - see note above
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSuperadminSession.mockResolvedValue(null);

    const { GET } = await import('@/app/api/superadmin/notifications/config/route');
    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/config');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns config when authenticated', async () => {
    mockGetSuperadminSession.mockResolvedValue({
      username: 'admin',
      role: 'super_admin',
      orgId: 'system',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    const { GET } = await import('@/app/api/superadmin/notifications/config/route');
    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/config');
    const response = await GET(request);

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
    // NOTE: vi.resetModules() intentionally omitted - see note above
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSuperadminSession.mockResolvedValue(null);

    const { POST } = await import('@/app/api/superadmin/notifications/send/route');
    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', message: 'Test message' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('returns 400 when title/message missing', async () => {
    mockGetSuperadminSession.mockResolvedValue({
      username: 'admin',
      role: 'super_admin',
      orgId: 'system',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    const { POST } = await import('@/app/api/superadmin/notifications/send/route');
    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/send', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('required');
  });
});

describe('POST /api/superadmin/notifications/test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // NOTE: vi.resetModules() intentionally omitted - see note above
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSuperadminSession.mockResolvedValue(null);

    const { POST } = await import('@/app/api/superadmin/notifications/test/route');
    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ channel: 'email' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid channel', async () => {
    mockGetSuperadminSession.mockResolvedValue({
      username: 'admin',
      role: 'super_admin',
      orgId: 'system',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    const { POST } = await import('@/app/api/superadmin/notifications/test/route');
    const request = new NextRequest('http://localhost:3000/api/superadmin/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ channel: 'invalid-channel' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid channel');
  });
});
