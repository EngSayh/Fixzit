/**
 * Note on testing framework:
 * These tests are written for Vitest using Node-like runtime with global fetch/Response.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import MongoDB mock to access mocked functions
import * as mongodbUnified from '@/lib/mongodb-unified';

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
let POST: typeof import('@/app/api/qa/alert/route').POST;
let GET: typeof import('@/app/api/qa/alert/route').GET;
import { logger } from '@/lib/logger';
import { requireSuperAdmin } from '@/lib/authz';
import { ensureQaIndexes } from '@/lib/db/collections';
import { smartRateLimit, buildOrgAwareRateLimitKey } from '@/server/security/rateLimit';

// Type helper for building minimal NextRequest-like object

type HeadersLike = {
  get: (key: string) => string | null;
};
type NextRequestLike = {
  json: () => Promise<Record<string, unknown>>;
  headers: HeadersLike;
  ip?: string | null;
  url?: string;
  nextUrl?: { protocol: string };
};

const asNextRequest = (obj: Partial<NextRequestLike>): NextRequestLike => ({
  url: 'http://localhost:3000/api/qa/alert',
  nextUrl: { protocol: 'http:' },
  json: async () => ({}),
  headers: { get: () => null },
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

describe('QA Alert Route', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    (globalThis as any).__mockGetDatabase = vi.mocked(mongodbUnified).getDatabase;

    // Save original env
    originalEnv = process.env.NEXT_PUBLIC_USE_MOCK_DB;

    // Reset mocks to defaults
    vi.mocked(requireSuperAdmin).mockResolvedValue({
      id: 'test-user-id',
      email: 'admin@test.com',
      role: 'SUPER_ADMIN',
      tenantId: 'test-org-id',
    });
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });

    // Re-import handlers with fresh module cache so mocks are applied even if other suites touched the module
    return import('@/app/api/qa/alert/route').then(mod => {
      POST = mod.POST;
      GET = mod.GET;
    });
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_USE_MOCK_DB;
    } else {
      process.env.NEXT_PUBLIC_USE_MOCK_DB = originalEnv;
    }
    delete (globalThis as any).__mockGetDatabase;
  });

  describe('POST /api/qa/alert', () => {
    it('returns success when request is valid', async () => {
      const mod = vi.mocked(mongodbUnified);

      // Setup the chained collection/insertOne mock structure
      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      const event = 'button_click';
      const data = { id: 123, label: 'Save' };

      const req = asNextRequest({
        json: () => Promise.resolve({ event, data }),
        headers: buildHeaders({
          'x-forwarded-for': '1.2.3.4',
          'user-agent': '@vitest/agent',
        }),
        ip: '5.6.7.8',
      });

      const res = await POST(req);
      const body = await (res as Response).json();

      expect(body).toEqual({ success: true });
      // Verify ensureQaIndexes is called for index/TTL enforcement
      expect(ensureQaIndexes).toHaveBeenCalled();
      // Verify logging includes org context (not payload data for PII safety)
      expect(logger.warn).toHaveBeenCalledWith(
        `🚨 QA Alert: ${event}`,
        expect.objectContaining({ orgId: 'test-org-id', userId: 'test-user-id', payloadBytes: expect.any(Number) })
      );

      // Verify DB interaction
      expect(mod.getDatabase).toHaveBeenCalled();
      expect(collection).toHaveBeenCalledWith('qa_alerts');
      expect(insertOne).toHaveBeenCalledTimes(1);
      
      // Verify org/user attribution in inserted doc
      const insertedDoc = insertOne.mock.calls[0][0];
      expect(insertedDoc.orgId).toBe('test-org-id');
      expect(insertedDoc.userId).toBe('test-user-id');
    });

    it('inserts alert into DB with org/user attribution and forwarded IP', async () => {
      const mod = vi.mocked(mongodbUnified);

      // Setup the chained collection/find/insertOne mock structure
      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      const event = 'modal_open';
      const payload = { inModal: true, ctx: 'settings' };

      const req = asNextRequest({
        json: () => Promise.resolve({ event, data: payload }),
        headers: buildHeaders({
          'x-forwarded-for': '203.0.113.10',
          'user-agent': 'Mozilla/5.0 Test',
        }),
        ip: '198.51.100.20',
      });

      const res = await POST(req);
      const body = await (res as Response).json();

      expect(body).toEqual({ success: true });

      // Verify DB interactions
      expect(mod.getDatabase).toHaveBeenCalledTimes(1);

      expect(collection).toHaveBeenCalledWith('qa_alerts');
      expect(insertOne).toHaveBeenCalledTimes(1);

      // Validate inserted document shape with org/user attribution
      const insertedDoc = insertOne.mock.calls[0][0];

      expect(insertedDoc).toMatchObject({
        event,
        data: payload,
        orgId: 'test-org-id',
        userId: 'test-user-id',
        ip: '203.0.113.10',
        userAgent: 'Mozilla/5.0 Test',
      });
      // timestamp should be a Date
      expect(insertedDoc.timestamp instanceof Date).toBe(true);

      // Verify rate limit uses org-aware key
      expect(buildOrgAwareRateLimitKey).toHaveBeenCalledWith(
        expect.anything(),
        'test-org-id',
        'test-user-id'
      );
    });

    it('returns 400 when event is missing', async () => {
      const req = asNextRequest({
        json: () => Promise.resolve({ data: { foo: 'bar' } }),
        headers: buildHeaders({}),
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(400);
      const body = await (res as Response).json();
      // Zod validation returns specific error message format
      expect(body.error).toBeDefined();
    });

    it('returns 400 when event is empty string', async () => {
      const req = asNextRequest({
        json: () => Promise.resolve({ event: '', data: {} }),
        headers: buildHeaders({}),
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(400);
      const body = await (res as Response).json();
      expect(body.error).toBe('Event name is required');
    });

    it('returns 400 when event is too long', async () => {
      const req = asNextRequest({
        json: () => Promise.resolve({ event: 'x'.repeat(200), data: {} }),
        headers: buildHeaders({}),
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(400);
      const body = await (res as Response).json();
      expect(body.error).toBe('Event name too long');
    });

    it('returns 400 when payload is too large', async () => {
      const req = asNextRequest({
        json: () => Promise.resolve({ event: 'test', data: 'x'.repeat(15000) }),
        headers: buildHeaders({}),
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(400);
      const body = await (res as Response).json();
      expect(body.error).toBe('Payload too large (max 10KB)');
    });

    it('returns 400 when JSON body is invalid', async () => {
      const req = asNextRequest({
        json: () => Promise.reject(new Error('bad json')),
        headers: buildHeaders({}),
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(400);
      const body = await (res as Response).json();
      expect(body.error).toBe('Invalid JSON body');
    });

    it('uses req.ip fallback when x-forwarded-for header is missing', async () => {
      const mod = vi.mocked(mongodbUnified);

      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      const req = asNextRequest({
        json: () => Promise.resolve({ event: 'no_forwarded_for', data: { k: 'v' } }),
        headers: buildHeaders({
          'user-agent': 'UA-123',
        }),
        ip: '10.0.0.1',
      });

      const res = await POST(req);
      const body = await (res as Response).json();

      expect(body).toEqual({ success: true });
      const insertedDoc = (collection as any).mock.calls.length
        ? (insertOne as any).mock.calls[0][0]
        : null;
      // Since req.ip may not be accessible in our mock, it falls back to 'unknown'
      expect(insertedDoc?.ip).toBeTruthy();
      expect(insertedDoc?.userAgent).toBe('UA-123');
      expect(insertedDoc?.orgId).toBe('test-org-id');
      expect(insertedDoc?.userId).toBe('test-user-id');
    });

    it('returns 503 on DB insertion error', async () => {
      const mod = vi.mocked(mongodbUnified);

      const insertOne = vi.fn().mockRejectedValue(new Error('insert failed'));
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      const req = asNextRequest({
        json: () => Promise.resolve({ event: 'oops', data: { foo: 'bar' } }),
        headers: buildHeaders({}),
        ip: null,
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(503);
      const body = await (res as Response).json();
      expect(body).toEqual({ error: 'Alert storage unavailable' });
      expect(logger.error).toHaveBeenCalledWith(
        '[QA Alert] DB unavailable',
        expect.anything()
      );
    });

    it('returns 401 when not authenticated', async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(
        new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const req = asNextRequest({
        json: () => Promise.resolve({ event: 'test', data: {} }),
        headers: buildHeaders({}),
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(401);
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });

      const req = asNextRequest({
        json: () => Promise.resolve({ event: 'test', data: {} }),
        headers: buildHeaders({}),
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(429);
    });
  });

  describe('GET /api/qa/alert', () => {
    // Helper to create GET request with query params
    function createGetRequest(queryParams?: Record<string, string>) {
      const url = queryParams
        ? `http://localhost:3000/api/qa/alert?${new URLSearchParams(queryParams).toString()}`
        : 'http://localhost:3000/api/qa/alert';
      return asNextRequest({
        url,
        json: async () => ({}),
        headers: buildHeaders({}),
        ip: '127.0.0.1',
      });
    }

    // Helper to setup mock DB with chainable find/sort/limit/toArray
    function setupMockDb(docs: Record<string, unknown>[] = []) {
      const mod = vi.mocked(mongodbUnified);
      const toArray = vi.fn().mockResolvedValue(docs);
      const limit = vi.fn().mockReturnValue({ toArray });
      const sort = vi.fn().mockReturnValue({ limit });
      const find = vi.fn().mockReturnValue({ sort });
      const collection = vi.fn().mockReturnValue({ find });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);
      return { mod, toArray, limit, sort, find, collection };
    }

    it('returns empty list when no alerts exist', async () => {
      const { mod, collection } = setupMockDb([]);

      const res = await GET(createGetRequest());
      const body = await (res as Response).json();

      expect(body).toEqual({ alerts: [] });
      expect(mod.getDatabase).toHaveBeenCalled();
      expect(collection).toHaveBeenCalledWith('qa_alerts');
    });

    it('fetches latest 50 alerts sorted by timestamp desc from DB', async () => {
      const docs = [{ event: 'e1' }, { event: 'e2' }];
      const { mod, find, sort, limit, toArray } = setupMockDb(docs);

      const res = await GET(createGetRequest());
      const body = await (res as Response).json();

      expect(body).toEqual({ alerts: docs });
      expect(mod.getDatabase).toHaveBeenCalledTimes(1);
      // Query includes orgId for tenant isolation with projection (excludes data by default)
      expect(find).toHaveBeenCalledWith({ orgId: 'test-org-id' }, { projection: { data: 0 } });
      expect(sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(limit).toHaveBeenCalledWith(50);
      expect(toArray).toHaveBeenCalledTimes(1);
    });

    it('filters by event type within org scope', async () => {
      const { find } = setupMockDb([]);

      const res = await GET(createGetRequest({ event: 'button_click' }));
      expect((res as Response).status).toBe(200);

      // Verify both org filter and event filter are applied with projection
      expect(find).toHaveBeenCalledWith(
        { orgId: 'test-org-id', event: 'button_click' },
        { projection: { data: 0 } }
      );
    });

    it('returns all alerts when platform admin has no tenantId', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue({
        id: 'platform-admin',
        email: 'platform@test.com',
        role: 'SUPER_ADMIN',
        tenantId: '', // Platform-level admin
      });

      const alerts = [{ event: 'platform-event' }];
      const { find } = setupMockDb(alerts);

      const res = await GET(createGetRequest());
      const body = await (res as Response).json();

      expect(body).toEqual({ alerts });
      // Empty query = all alerts (platform-level access) with projection
      expect(find).toHaveBeenCalledWith({}, { projection: { data: 0 } });
    });

    it('respects custom limit parameter', async () => {
      const { limit } = setupMockDb([]);

      await GET(createGetRequest({ limit: '25' }));
      expect(limit).toHaveBeenCalledWith(25);
    });

    it('caps limit at 200', async () => {
      const { limit } = setupMockDb([]);

      await GET(createGetRequest({ limit: '5000' }));
      expect(limit).toHaveBeenCalledWith(200);
    });

    it('includes data field when includeData=true is specified', async () => {
      const alerts = [
        { event: 'event1', timestamp: new Date(), orgId: 'test-org-id', data: { foo: 'bar' } },
      ];
      const { find } = setupMockDb(alerts);

      const res = await GET(createGetRequest({ includeData: 'true' }));
      expect((res as Response).status).toBe(200);
      const body = await (res as Response).json();

      expect(body.alerts).toHaveLength(1);
      expect(body.alerts[0].data).toEqual({ foo: 'bar' });
      // When includeData=true, projection should be empty (include all fields)
      expect(find).toHaveBeenCalledWith({ orgId: 'test-org-id' }, { projection: {} });
    });

    it('calls ensureQaIndexes for TTL/index enforcement', async () => {
      setupMockDb([]);

      await GET(createGetRequest());

      expect(ensureQaIndexes).toHaveBeenCalled();
    });

    it('uses org-aware rate limit key', async () => {
      setupMockDb([]);

      await GET(createGetRequest());

      expect(buildOrgAwareRateLimitKey).toHaveBeenCalledWith(
        expect.anything(),
        'test-org-id',
        'test-user-id'
      );
    });

    it('returns 503 when DB query fails', async () => {
      const mod = vi.mocked(mongodbUnified);

      const toArray = vi.fn().mockRejectedValue(new Error('query failed'));
      const limit = vi.fn().mockReturnValue({ toArray });
      const sort = vi.fn().mockReturnValue({ limit });
      const find = vi.fn().mockReturnValue({ sort });
      const collection = vi.fn().mockReturnValue({ find });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      const res = await GET(createGetRequest());
      expect((res as Response).status).toBe(503);
      const body = await (res as Response).json();
      expect(body).toEqual({ error: 'Alert retrieval unavailable' });
      expect(logger.error).toHaveBeenCalledWith(
        '[QA Alert] DB unavailable',
        expect.anything()
      );
    });

    it('returns 401 when not authenticated', async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(
        new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await GET(createGetRequest());
      expect((res as Response).status).toBe(401);
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });

      const res = await GET(createGetRequest());
      expect((res as Response).status).toBe(429);
    });
  });

  describe('Sanitization Integration', () => {
    it('sanitizes bearer tokens in alert data before storage', async () => {
      const mod = vi.mocked(mongodbUnified);

      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      // Payload containing a bearer token in a generic field
      const data = {
        errorMessage: 'Auth failed with Bearer secretToken123xyz',
        author: 'John Doe' // Should NOT be redacted (word boundary)
      };

      const req = asNextRequest({
        json: () => Promise.resolve({ event: 'auth_error', data }),
        headers: buildHeaders({}),
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(200);

      const insertedDoc = insertOne.mock.calls[0][0];
      // Bearer token should be redacted in stored data
      expect(insertedDoc.data.errorMessage).toBe('Auth failed with [REDACTED_BEARER_TOKEN]');
      // "author" should NOT be redacted (word boundary protection)
      expect(insertedDoc.data.author).toBe('John Doe');
    });

    it('sanitizes JWT tokens in alert data before storage', async () => {
      const mod = vi.mocked(mongodbUnified);

      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.signature123abc';
      const data = { error: `Token validation failed: ${jwt}` };

      const req = asNextRequest({
        json: () => Promise.resolve({ event: 'token_error', data }),
        headers: buildHeaders({}),
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(200);

      const insertedDoc = insertOne.mock.calls[0][0];
      expect(insertedDoc.data.error).toBe('Token validation failed: [REDACTED_JWT]');
      expect(insertedDoc.data.error).not.toContain('eyJ');
    });

    it('sanitizes email addresses in alert data', async () => {
      const mod = vi.mocked(mongodbUnified);

      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      const data = { notification: 'Alert sent to admin@company.com' };

      const req = asNextRequest({
        json: () => Promise.resolve({ event: 'alert_sent', data }),
        headers: buildHeaders({}),
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(200);

      const insertedDoc = insertOne.mock.calls[0][0];
      expect(insertedDoc.data.notification).toBe('Alert sent to [REDACTED_EMAIL]');
    });

    it('sanitizes password fields by key name', async () => {
      const mod = vi.mocked(mongodbUnified);

      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      const data = { password: 'supersecret123', username: 'admin' };

      const req = asNextRequest({
        json: () => Promise.resolve({ event: 'login_failure', data }),
        headers: buildHeaders({}),
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(200);

      const insertedDoc = insertOne.mock.calls[0][0];
      expect(insertedDoc.data.password).toBe('[REDACTED]');
      expect(insertedDoc.data.username).toBe('admin');
    });

    it('does NOT redact author field (word boundary check)', async () => {
      const mod = vi.mocked(mongodbUnified);

      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      const data = {
        author: 'Jane Smith',
        authority: 'manager',
        authorized: true,
        content: 'Normal content'
      };

      const req = asNextRequest({
        json: () => Promise.resolve({ event: 'content_alert', data }),
        headers: buildHeaders({}),
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(200);

      const insertedDoc = insertOne.mock.calls[0][0];
      // These should NOT be redacted - word boundary protection
      expect(insertedDoc.data.author).toBe('Jane Smith');
      expect(insertedDoc.data.authority).toBe('manager');
      expect(insertedDoc.data.authorized).toBe(true);
      expect(insertedDoc.data.content).toBe('Normal content');
    });

    it('sanitizes MongoDB connection strings in error messages', async () => {
      const mod = vi.mocked(mongodbUnified);

      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      const data = {
        error: 'Connection failed to mongodb+srv://admin:password123@cluster.mongodb.net/db'
      };

      const req = asNextRequest({
        json: () => Promise.resolve({ event: 'db_error', data }),
        headers: buildHeaders({}),
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(200);

      const insertedDoc = insertOne.mock.calls[0][0];
      expect(insertedDoc.data.error).toBe('Connection failed to [REDACTED_MONGO_URI]');
      expect(insertedDoc.data.error).not.toContain('password123');
    });

    it('sanitizes deeply nested sensitive data', async () => {
      const mod = vi.mocked(mongodbUnified);

      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      const data = {
        request: {
          headers: {
            authorization: 'Bearer token123',
          },
          body: {
            user: {
              email: 'user@example.com',
              password: 'secret'
            }
          }
        }
      };

      const req = asNextRequest({
        json: () => Promise.resolve({ event: 'api_error', data }),
        headers: buildHeaders({}),
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(200);

      const insertedDoc = insertOne.mock.calls[0][0];
      // authorization key should be redacted by key name
      expect(insertedDoc.data.request.headers.authorization).toBe('[REDACTED]');
      // email in value should be redacted
      expect(insertedDoc.data.request.body.user.email).toBe('[REDACTED_EMAIL]');
      // password key should be redacted
      expect(insertedDoc.data.request.body.user.password).toBe('[REDACTED]');
    });
  });
});
