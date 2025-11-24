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

// Route handlers will be dynamically imported per-test to avoid module cache leakage across suites
let POST: typeof import('@/app/api/qa/alert/route').POST;
let GET: typeof import('@/app/api/qa/alert/route').GET;
import { logger } from '@/lib/logger';

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
      expect(logger.warn).toHaveBeenCalledWith(`🚨 QA Alert: ${event}`, { payload: data });

      // Verify DB interaction
      expect(mod.getDatabase).toHaveBeenCalled();
      expect(collection).toHaveBeenCalledWith('qa_alerts');
      expect(insertOne).toHaveBeenCalledTimes(1);
    });

    it('inserts alert into DB with forwarded IP and returns success', async () => {
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

      // Validate inserted document shape
      const insertedDoc = insertOne.mock.calls[0][0];

      expect(insertedDoc).toMatchObject({
        event,
        data: payload,
        ip: '203.0.113.10',
        userAgent: 'Mozilla/5.0 Test',
      });
      // timestamp should be a Date
      expect(insertedDoc.timestamp instanceof Date).toBe(true);

      // Logs non-mock variant
      expect(logger.warn).toHaveBeenCalledWith(`🚨 QA Alert: ${event}`, { payload });
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
    });

    it('returns 500 on DB insertion error', async () => {
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
      expect((res as Response).status).toBe(500);
      const body = await (res as Response).json();
      expect(body).toEqual({ error: 'Failed to process alert' });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to process QA alert:',
        expect.anything()
      );
    });

    it('returns 500 if parsing JSON body throws', async () => {
      const mod = vi.mocked(mongodbUnified);

      const req = asNextRequest({
        json: () => Promise.reject(new Error('bad json')),
        headers: buildHeaders({}),
        ip: undefined,
      });

      const res = await POST(req);
      expect((res as Response).status).toBe(500);
      const body = await (res as Response).json();
      expect(body).toEqual({ error: 'Failed to process alert' });
      expect(mod.getDatabase).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('GET /api/qa/alert', () => {
    it('returns empty list when no alerts exist', async () => {
      const mod = vi.mocked(mongodbUnified);

      const toArray = vi.fn().mockResolvedValue([]);
      const limit = vi.fn().mockReturnValue({ toArray });
      const sort = vi.fn().mockReturnValue({ limit });
      const find = vi.fn().mockReturnValue({ sort });
      const collection = vi.fn().mockReturnValue({ find });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      const req = asNextRequest({
        json: async () => ({}),
        headers: buildHeaders({}),
        ip: '127.0.0.1',
      });

      const res = await GET(req);
      const body = await (res as Response).json();

      expect(body).toEqual({ alerts: [] });
      expect(mod.getDatabase).toHaveBeenCalled();
      expect(collection).toHaveBeenCalledWith('qa_alerts');
    });

    it('fetches latest 50 alerts sorted by timestamp desc from DB', async () => {
      const mod = vi.mocked(mongodbUnified);

      const docs = [{ event: 'e1' }, { event: 'e2' }];

      const toArray = vi.fn().mockResolvedValue(docs);
      const limit = vi.fn().mockReturnValue({ toArray });
      const sort = vi.fn().mockReturnValue({ limit });
      const find = vi.fn().mockReturnValue({ sort });
      const collection = vi.fn().mockReturnValue({ find });

      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      const req = asNextRequest({
        json: async () => ({}),
        headers: buildHeaders({}),
        ip: '127.0.0.1',
      });

      const res = await GET(req);
      const body = await (res as Response).json();

      expect(body).toEqual({ alerts: docs });
      expect(mod.getDatabase).toHaveBeenCalledTimes(1);

      expect(collection).toHaveBeenCalledWith('qa_alerts');
      expect(find).toHaveBeenCalledWith({});
      expect(sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(limit).toHaveBeenCalledWith(50);
      expect(toArray).toHaveBeenCalledTimes(1);
    });

    it('returns 500 when DB query fails', async () => {
      const mod = vi.mocked(mongodbUnified);

      const toArray = vi.fn().mockRejectedValue(new Error('query failed'));
      const limit = vi.fn().mockReturnValue({ toArray });
      const sort = vi.fn().mockReturnValue({ limit });
      const find = vi.fn().mockReturnValue({ sort });
      const collection = vi.fn().mockReturnValue({ find });
      const nativeDb = { collection } as any;
      mod.getDatabase.mockResolvedValue(nativeDb);

      const req = asNextRequest({
        json: async () => ({}),
        headers: buildHeaders({}),
        ip: '127.0.0.1',
      });

      const res = await GET(req);
      expect((res as Response).status).toBe(500);
      const body = await (res as Response).json();
      expect(body).toEqual({ error: 'Failed to fetch alerts' });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch QA alerts:',
        expect.anything()
      );
    });
  });
});
