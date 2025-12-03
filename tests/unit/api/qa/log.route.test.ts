/**
 * Unit tests for api/qa/log route.
 * Testing framework: Vitest
 * 
 * Tests RBAC enforcement, org-scoped isolation, and input validation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as mongodbUnified from '@/lib/mongodb-unified';

vi.mock('@/lib/mongodb-unified');
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }
}));
vi.mock('@/lib/authz', () => ({
  requireSuperAdmin: vi.fn().mockResolvedValue({ id: 'test-user', tenantId: 'test-org' }),
}));
vi.mock('@/server/security/rateLimit', () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn(() => 'test-rate-limit-key'),
}));

import { POST, GET } from "@/app/api/qa/log/route";
import { logger } from '@/lib/logger';
import { requireSuperAdmin } from '@/lib/authz';

type HeadersLike = {
  get: (key: string) => string | null;
};
type CookiesLike = {
  get: (key: string) => { value: string } | undefined;
};
type NextRequestLike = {
  json: () => Promise<Record<string, unknown>>;
  headers: HeadersLike;
  cookies: CookiesLike;
  ip?: string | null;
  url: string;
  nextUrl?: { protocol: string };
};

const LOG_URL = 'http://localhost:3000/api/qa/log';

function createGetRequest(queryParams?: Record<string, string>): NextRequestLike {
  const url = queryParams
    ? `${LOG_URL}?${new URLSearchParams(queryParams).toString()}`
    : LOG_URL;
  return {
    url,
    nextUrl: { protocol: 'http:' },
    json: async () => ({}),
    headers: { get: () => null },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  };
}

function createPostRequest(body: Record<string, unknown>): NextRequestLike {
  return {
    url: LOG_URL,
    nextUrl: { protocol: 'http:' },
    json: async () => body,
    headers: { 
      get: (key: string) => key.toLowerCase() === 'content-type' ? 'application/json' : null 
    },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  };
}

describe('api/qa/log route - RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth mock to default success
    vi.mocked(requireSuperAdmin).mockResolvedValue({ 
      id: 'test-user', 
      tenantId: 'test-org', 
      role: 'SUPER_ADMIN', 
      email: 'admin@test.com' 
    });
  });

  describe('POST /api/qa/log', () => {
    it('returns 401 when no authorization header provided', async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(
        new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await POST(createPostRequest({ event: 'test', data: {} }));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('UNAUTHORIZED');
    });

    it('returns 403 when user is not SUPER_ADMIN', async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(
        new Response(JSON.stringify({ error: 'FORBIDDEN' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await POST(createPostRequest({ event: 'test', data: {} }));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('FORBIDDEN');
    });

    it('returns 400 when tenantId is missing from auth context', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue({
        id: 'test-user',
        tenantId: '', // Empty tenantId
        role: 'SUPER_ADMIN',
        email: 'admin@test.com'
      });

      const res = await POST(createPostRequest({ event: 'test', data: {} }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Missing organization context');
    });
  });

  describe('GET /api/qa/log', () => {
    it('returns 401 when no authorization header provided', async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(
        new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await GET(createGetRequest());
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('UNAUTHORIZED');
    });

    it('returns 403 when user is not SUPER_ADMIN', async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(
        new Response(JSON.stringify({ error: 'FORBIDDEN' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await GET(createGetRequest());
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('FORBIDDEN');
    });

    it('returns 400 when tenantId is missing from auth context', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue({
        id: 'test-user',
        tenantId: '', // Empty tenantId
        role: 'SUPER_ADMIN',
        email: 'admin@test.com'
      });

      const res = await GET(createGetRequest());
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Missing organization context');
    });
  });
});

describe('api/qa/log route - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireSuperAdmin).mockResolvedValue({ 
      id: 'test-user', 
      tenantId: 'test-org', 
      role: 'SUPER_ADMIN', 
      email: 'admin@test.com' 
    });
  });

  it('returns success when request is valid', async () => {
    const mod = vi.mocked(mongodbUnified);

    const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const collection = vi.fn().mockReturnValue({ insertOne });
    const nativeDb = { collection } as any;
    mod.getDatabase.mockResolvedValue(nativeDb);

    const event = 'button_click';
    const data = { id: 123, label: 'Save' };

    const res = await POST(createPostRequest({ event, data }));
    const body = await res.json();

    expect(body).toEqual({ success: true });
    expect(logger.info).toHaveBeenCalledWith(`📝 QA Log: ${event}`, expect.objectContaining({ orgId: 'test-org' }));
    expect(mod.getDatabase).toHaveBeenCalled();
    expect(collection).toHaveBeenCalledWith('qa_logs');
    expect(insertOne).toHaveBeenCalledTimes(1);
    
    // Verify org tagging on inserted document
    const insertedDoc = insertOne.mock.calls[0][0];
    expect(insertedDoc.orgId).toBe('test-org');
    expect(insertedDoc.userId).toBe('test-user');
  });

  it('validates event name is required', async () => {
    const res = await POST(createPostRequest({ data: {} }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to log event');
  });

  it('rejects payloads larger than 10KB', async () => {
    const largeData = 'x'.repeat(11 * 1024); // 11KB
    const res = await POST(createPostRequest({ event: 'test', data: largeData }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Payload too large');
  });

  it('sanitizes event name to max 128 chars', async () => {
    const mod = vi.mocked(mongodbUnified);

    const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const collection = vi.fn().mockReturnValue({ insertOne });
    const nativeDb = { collection } as any;
    mod.getDatabase.mockResolvedValue(nativeDb);

    const longEvent = 'a'.repeat(200);
    const res = await POST(createPostRequest({ event: longEvent, data: {} }));
    expect(res.status).toBe(200);

    const insertedDoc = insertOne.mock.calls[0][0];
    expect(insertedDoc.event.length).toBe(128);
  });

  it('returns 503 when DB is unavailable to make outages visible', async () => {
    const mod = vi.mocked(mongodbUnified);
    mod.getDatabase.mockRejectedValue(new Error('DB connection failed'));

    const res = await POST(createPostRequest({ event: 'test', data: {} }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('Service temporarily unavailable');
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('api/qa/log route - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireSuperAdmin).mockResolvedValue({ 
      id: 'test-user', 
      tenantId: 'test-org', 
      role: 'SUPER_ADMIN', 
      email: 'admin@test.com' 
    });
  });

  it('returns logs scoped to caller org', async () => {
    const mod = vi.mocked(mongodbUnified);

    const logs = [
      { event: 'event1', orgId: 'test-org', timestamp: new Date() },
      { event: 'event2', orgId: 'test-org', timestamp: new Date() },
    ];

    const toArray = vi.fn().mockResolvedValue(logs);
    const limit = vi.fn().mockReturnValue({ toArray });
    const sort = vi.fn().mockReturnValue({ limit });
    const find = vi.fn().mockReturnValue({ sort });
    const collection = vi.fn().mockReturnValue({ find });
    const nativeDb = { collection } as any;
    mod.getDatabase.mockResolvedValue(nativeDb);

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.logs).toHaveLength(2);
    expect(body.logs[0].event).toBe('event1');
    expect(body.logs[0].orgId).toBe('test-org');
    
    // Verify org-scoped query
    expect(find).toHaveBeenCalledWith({ orgId: 'test-org' });
    expect(sort).toHaveBeenCalledWith({ timestamp: -1 });
    expect(limit).toHaveBeenCalledWith(100); // Default limit
  });

  it('filters by event type when provided', async () => {
    const mod = vi.mocked(mongodbUnified);

    const toArray = vi.fn().mockResolvedValue([]);
    const limit = vi.fn().mockReturnValue({ toArray });
    const sort = vi.fn().mockReturnValue({ limit });
    const find = vi.fn().mockReturnValue({ sort });
    const collection = vi.fn().mockReturnValue({ find });
    const nativeDb = { collection } as any;
    mod.getDatabase.mockResolvedValue(nativeDb);

    const res = await GET(createGetRequest({ event: 'button_click' }));
    expect(res.status).toBe(200);

    expect(find).toHaveBeenCalledWith({ orgId: 'test-org', event: 'button_click' });
  });

  it('respects custom limit parameter (capped at 1000)', async () => {
    const mod = vi.mocked(mongodbUnified);

    const toArray = vi.fn().mockResolvedValue([]);
    const limit = vi.fn().mockReturnValue({ toArray });
    const sort = vi.fn().mockReturnValue({ limit });
    const find = vi.fn().mockReturnValue({ sort });
    const collection = vi.fn().mockReturnValue({ find });
    const nativeDb = { collection } as any;
    mod.getDatabase.mockResolvedValue(nativeDb);

    // Request 50 logs
    await GET(createGetRequest({ limit: '50' }));
    expect(limit).toHaveBeenCalledWith(50);

    // Request 5000 logs (should be capped at 1000)
    await GET(createGetRequest({ limit: '5000' }));
    expect(limit).toHaveBeenCalledWith(1000);
  });

  it('returns mock response when DB is unavailable', async () => {
    const mod = vi.mocked(mongodbUnified);
    mod.getDatabase.mockRejectedValue(new Error('DB connection failed'));

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ logs: [], mock: true });
    expect(logger.warn).toHaveBeenCalled();
  });
});
