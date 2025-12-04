/**
 * Unit tests for api/qa/log route.
 * Testing framework: Vitest
 * 
 * Tests rate limiting, POST/GET operations, RBAC, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import MongoDB mock to access mocked functions
import { getDatabase } from '@/lib/mongodb-unified';

// We will mock the mongo module used by the route
vi.mock('@/lib/mongodb-unified');
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }
}));
vi.mock('@/lib/authz', () => ({
  requireSuperAdmin: vi.fn(async () => ({
    id: 'test-user-id',
    email: 'admin@test.com',
    role: 'SUPER_ADMIN',
    tenantId: 'test-org-id',
  })),
}));
vi.mock('@/lib/db/collections', () => ({
  ensureQaIndexes: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/server/security/rateLimit', () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn(() => 'test-rate-limit-key'),
}));

// Route handlers will be dynamically imported per-test to avoid module cache leakage across suites
let POST: typeof import('@/app/api/qa/log/route').POST;
let GET: typeof import('@/app/api/qa/log/route').GET;
import { logger } from '@/lib/logger';
import { requireSuperAdmin } from '@/lib/authz';
import { smartRateLimit, buildOrgAwareRateLimitKey } from '@/server/security/rateLimit';

// Type helper for building minimal NextRequest-like object
type HeadersLike = {
  get: (key: string) => string | null;
};
type CookiesLike = {
  get: (key: string) => { value: string } | undefined;
};
type NextRequestLike = {
  json: () => Promise<unknown>;
  headers: HeadersLike;
  cookies: CookiesLike;
  ip?: string | null;
  url: string;
  nextUrl?: { protocol: string };
};

const LOG_URL = 'http://localhost:3000/api/qa/log';

const asNextRequest = (obj: Partial<NextRequestLike>): NextRequestLike => ({
  url: LOG_URL,
  nextUrl: { protocol: 'http:' },
  json: async () => ({}),
  headers: { get: () => null },
  cookies: { get: () => undefined },
  ip: '127.0.0.1',
  ...obj
});

const buildHeaders = (map: Record<string, string | undefined>) => {
  const norm: Map<string, string> = new Map();
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) {
      norm.set(k.toLowerCase(), v);
    }
  }
  return {
    get: (key: string) => norm.get(key.toLowerCase()) ?? null,
  } as HeadersLike;
};

function createGetRequest(queryParams?: Record<string, string>): NextRequestLike {
  const url = queryParams
    ? `${LOG_URL}?${new URLSearchParams(queryParams).toString()}`
    : LOG_URL;
  return asNextRequest({ url });
}

function createPostRequest(body: Record<string, unknown>): NextRequestLike {
  return asNextRequest({
    json: async () => body,
    headers: buildHeaders({ 'content-type': 'application/json' }),
  });
}

describe('api/qa/log route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Reset mocks to defaults
    vi.mocked(requireSuperAdmin).mockResolvedValue({
      id: 'test-user-id',
      email: 'admin@test.com',
      role: 'SUPER_ADMIN',
      tenantId: 'test-org-id',
    });
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });

    // Re-import handlers with fresh module cache
    return import('@/app/api/qa/log/route').then(mod => {
      POST = mod.POST;
      GET = mod.GET;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('RBAC', () => {
    it('returns 401 when not authenticated (POST)', async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(
        new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 })
      );
      const res = await POST(createPostRequest({ event: 'test', data: {} }));
      expect(res.status).toBe(401);
    });

    it('returns 401 when not authenticated (GET)', async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(
        new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 })
      );
      const res = await GET(createGetRequest());
      expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks SUPER_ADMIN role', async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(
        new Response(JSON.stringify({ error: 'FORBIDDEN' }), { status: 403 })
      );
      const res = await POST(createPostRequest({ event: 'test', data: {} }));
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/qa/log', () => {
    it('returns success when request is valid', async () => {
      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection } as any;
      vi.mocked(getDatabase).mockResolvedValue(nativeDb);

      const event = 'button_click';
      const data = { id: 123, label: 'Save' };

      const res = await POST(createPostRequest({ event, data }));
      const body = await res.json();

      expect(body).toEqual({ success: true });
      expect(logger.info).toHaveBeenCalled();
      expect(getDatabase).toHaveBeenCalled();
      expect(collection).toHaveBeenCalledWith('qa_logs');
      expect(insertOne).toHaveBeenCalledTimes(1);
    });

    it('inserts log into DB with correct fields including orgId, userId, and hashed sessionId', async () => {
      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection } as any;
      vi.mocked(getDatabase).mockResolvedValue(nativeDb);

      const event = 'page_view';
      const data = { page: '/dashboard' };

      const req = asNextRequest({
        json: async () => ({ event, data }),
        headers: buildHeaders({
          'x-forwarded-for': '203.0.113.10',
          'user-agent': 'Mozilla/5.0 Test',
        }),
        cookies: { get: (key: string) => key === 'sessionId' ? { value: 'sess-123' } : undefined },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(body).toEqual({ success: true });

      // Validate inserted document includes org-scoped fields and hashed sessionId
      const insertedDoc = insertOne.mock.calls[0][0];
      expect(insertedDoc).toMatchObject({
        event,
        data,
        orgId: 'test-org-id',
        userId: 'test-user-id',
      });
      // Session ID should be hashed (16 char hex), not raw
      expect(insertedDoc.sessionIdHash).toBeDefined();
      expect(insertedDoc.sessionIdHash).toHaveLength(16);
      expect(insertedDoc.sessionIdHash).not.toBe('sess-123'); // Not raw value
      expect(insertedDoc.sessionId).toBeUndefined(); // No raw sessionId
      expect(insertedDoc.timestamp instanceof Date).toBe(true);
    });

    it('returns 400 when event is missing', async () => {
      const res = await POST(createPostRequest({ data: {} }));
      expect(res.status).toBe(400);
      const body = await res.json();
      // Zod error when event is undefined
      expect(body.error).toBeDefined();
    });

    it('returns 400 when event is not a string', async () => {
      const res = await POST(createPostRequest({ event: 123, data: {} }));
      expect(res.status).toBe(400);
      const body = await res.json();
      // Zod returns a type error message for non-strings
      expect(body.error).toBeDefined();
    });

    it('returns 400 when event is too long', async () => {
      const longEvent = 'x'.repeat(129);
      const res = await POST(createPostRequest({ event: longEvent, data: {} }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Event name too long');
    });

    it('returns 400 when body is not an object', async () => {
      const req = asNextRequest({
        json: async () => 'not-an-object',
        headers: buildHeaders({}),
      });
      
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      // Zod fails when parsing non-object
      expect(body.error).toBeDefined();
    });

    it('returns 400 when JSON parsing fails', async () => {
      const req = asNextRequest({
        json: async () => { throw new SyntaxError('Unexpected token'); },
        headers: buildHeaders({}),
      });
      
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid JSON body');
    });

    it('returns 503 when DB is unavailable', async () => {
      vi.mocked(getDatabase).mockRejectedValue(new Error('DB connection failed'));

      const res = await POST(createPostRequest({ event: 'test', data: {} }));
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body).toEqual({ error: 'Log storage unavailable' });
      expect(logger.error).toHaveBeenCalled();
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });

      const res = await POST(createPostRequest({ event: 'test', data: {} }));
      expect(res.status).toBe(429);
    });

    it('uses org-aware rate limit key', async () => {
      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection } as any;
      vi.mocked(getDatabase).mockResolvedValue(nativeDb);

      await POST(createPostRequest({ event: 'test', data: {} }));

      expect(buildOrgAwareRateLimitKey).toHaveBeenCalled();
    });
  });

  describe('GET /api/qa/log', () => {
    it('returns logs from DB filtered by orgId', async () => {
      const logs = [
        { event: 'event1', timestamp: new Date(), orgId: 'test-org-id' },
        { event: 'event2', timestamp: new Date(), orgId: 'test-org-id' },
      ];

      const toArray = vi.fn().mockResolvedValue(logs);
      const limit = vi.fn().mockReturnValue({ toArray });
      const sort = vi.fn().mockReturnValue({ limit });
      const find = vi.fn().mockReturnValue({ sort });
      const collection = vi.fn().mockReturnValue({ find });
      const nativeDb = { collection } as any;
      vi.mocked(getDatabase).mockResolvedValue(nativeDb);

      const res = await GET(createGetRequest());
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.logs).toHaveLength(2);
      expect(body.logs[0].event).toBe('event1');
      // Verify org-scoped query with projection (excludes data field by default)
      expect(find).toHaveBeenCalledWith({ orgId: 'test-org-id' }, { projection: { data: 0 } });
      expect(sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(limit).toHaveBeenCalledWith(100); // Default limit
    });

    it('filters by event type within org scope', async () => {
      const toArray = vi.fn().mockResolvedValue([]);
      const limit = vi.fn().mockReturnValue({ toArray });
      const sort = vi.fn().mockReturnValue({ limit });
      const find = vi.fn().mockReturnValue({ sort });
      const collection = vi.fn().mockReturnValue({ find });
      const nativeDb = { collection } as any;
      vi.mocked(getDatabase).mockResolvedValue(nativeDb);

      const res = await GET(createGetRequest({ event: 'button_click' }));
      expect(res.status).toBe(200);

      // Verify both org filter and event filter are applied with projection
      expect(find).toHaveBeenCalledWith(
        { orgId: 'test-org-id', event: 'button_click' },
        { projection: { data: 0 } }
      );
    });

    it('returns all logs when platform admin has no tenantId', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue({
        id: 'platform-admin',
        email: 'platform@test.com',
        role: 'SUPER_ADMIN',
        tenantId: '', // Platform-level admin
      });

      const logs = [{ event: 'platform-event' }];
      const toArray = vi.fn().mockResolvedValue(logs);
      const limit = vi.fn().mockReturnValue({ toArray });
      const sort = vi.fn().mockReturnValue({ limit });
      const find = vi.fn().mockReturnValue({ sort });
      const collection = vi.fn().mockReturnValue({ find });
      const nativeDb = { collection } as any;
      vi.mocked(getDatabase).mockResolvedValue(nativeDb);

      const res = await GET(createGetRequest());
      const body = await res.json();

      expect(body).toEqual({ logs });
      // Empty query = all logs (platform-level access) with projection
      expect(find).toHaveBeenCalledWith({}, { projection: { data: 0 } });
    });

    it('respects custom limit parameter', async () => {
      const toArray = vi.fn().mockResolvedValue([]);
      const limit = vi.fn().mockReturnValue({ toArray });
      const sort = vi.fn().mockReturnValue({ limit });
      const find = vi.fn().mockReturnValue({ sort });
      const collection = vi.fn().mockReturnValue({ find });
      const nativeDb = { collection } as any;
      vi.mocked(getDatabase).mockResolvedValue(nativeDb);

      await GET(createGetRequest({ limit: '50' }));
      expect(limit).toHaveBeenCalledWith(50);
    });

    it('caps limit at 200', async () => {
      const toArray = vi.fn().mockResolvedValue([]);
      const limit = vi.fn().mockReturnValue({ toArray });
      const sort = vi.fn().mockReturnValue({ limit });
      const find = vi.fn().mockReturnValue({ sort });
      const collection = vi.fn().mockReturnValue({ find });
      const nativeDb = { collection } as any;
      vi.mocked(getDatabase).mockResolvedValue(nativeDb);

      await GET(createGetRequest({ limit: '5000' }));
      expect(limit).toHaveBeenCalledWith(200);
    });

    it('returns 503 when DB is unavailable', async () => {
      vi.mocked(getDatabase).mockRejectedValue(new Error('DB connection failed'));

      const res = await GET(createGetRequest());
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body).toEqual({ error: 'Log retrieval unavailable' });
      expect(logger.error).toHaveBeenCalled();
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });

      const res = await GET(createGetRequest());
      expect(res.status).toBe(429);
    });
  });
});
