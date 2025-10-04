/**
import { vi } from 'vitest';
 * Note on testing framework:
 * These tests are written for Vitest (https://@jest/globals.dev) using Node-like runtime with global fetch/Response.
 * If your repository uses Jest instead, replace @jest/globals imports with @jest/globals and adapt vi to jest.fn/vi.spyOn.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import route handlers
// Adjust the path if your route file lives elsewhere (e.g., src/app/api/qa/alert/route.ts).
import { POST, GET } from "@/app/api/qa/alert/route";

// We will mock the mongo module used by the route

vi.mock('@/lib/mongodb-unified', () => {
  return {
    getDatabase: vi.fn(),
    connectToDatabase: vi.fn(),
  };
});

// Type helper for building minimal NextRequest-like object

type HeadersLike = {
  get: (key: string) => string | null;
};
type NextRequestLike = {
  json: () => Promise<any>;
  headers: HeadersLike;
  ip?: string | null;
};

const asNextRequest = (obj: Partial<NextRequestLike>): any => obj as any;

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
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  // Pull mocked exports for type-safe updates inside tests

  const mongoMod = () => require('@/lib/mongodb-unified') as {
    getDatabase: ReturnType<typeof jest.fn>;
    connectToDatabase: ReturnType<typeof jest.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Spy on console
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mod = mongoMod();
    mod.getDatabase.mockReset();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('POST /api/qa/alert', () => {
    it('returns success with mock flag and logs when using mock DB', async () => {
      const mod = mongoMod();

      const event = 'button_click';
      const data = { id: 123, label: 'Save' };

      const req = asNextRequest({
        json: () => Promise.resolve({ event, data }),
        headers: buildHeaders({
          'x-forwarded-for': '1.2.3.4',
          'user-agent': '@jest/globals-agent',
        }),
        ip: '5.6.7.8',
      });

      const res = await POST(req);
      // NextResponse extends Response, so we can parse JSON like a standard Response
      const body = await (res as Response).json();

      expect(body).toEqual({ success: true, mock: true });
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('🚨 QA Alert (Mock): ' + event), data);

      // Ensure DB is not touched in mock mode
      expect(mod.getDatabase).not.toHaveBeenCalled();
    });

    it('inserts alert into DB with forwarded IP and returns success', async () => {
      const mod = mongoMod();

      // Setup the chained collection/find/insertOne mock structure
      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection };
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
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('🚨 QA Alert: ' + event), payload);
    });

    it('uses req.ip when x-forwarded-for header is missing', async () => {
      const mod = mongoMod();

      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection };
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
      expect(insertedDoc?.ip).toBe('10.0.0.1');
      expect(insertedDoc?.userAgent).toBe('UA-123');
    });

    it('returns 500 on DB insertion error', async () => {
      const mod = mongoMod();

      const insertOne = vi.fn().mockRejectedValue(new Error('insert failed'));
      const collection = vi.fn().mockReturnValue({ insertOne });
      const nativeDb = { collection };
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
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to process QA alert:',
        expect.anything()
      );
    });

    it('returns 500 if parsing JSON body throws', async () => {
      const mod = mongoMod();

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
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('GET /api/qa/alert', () => {
    it('returns empty list with mock flag when using mock DB', async () => {
      const mod = mongoMod();

      const req = asNextRequest({
        json: async () => ({}),
        headers: buildHeaders({}),
        ip: '127.0.0.1',
      });

      const res = await GET(req);
      const body = await (res as Response).json();

      expect(body).toEqual({ alerts: [], mock: true });
      expect(mod.getDatabase).not.toHaveBeenCalled();
    });

    it('fetches latest 50 alerts sorted by timestamp desc from DB', async () => {
      const mod = mongoMod();

      const docs = [{ event: 'e1' }, { event: 'e2' }];

      const toArray = vi.fn().mockResolvedValue(docs);
      const limit = vi.fn().mockReturnValue({ toArray });
      const sort = vi.fn().mockReturnValue({ limit });
      const find = vi.fn().mockReturnValue({ sort });
      const collection = vi.fn().mockReturnValue({ find });

      const nativeDb = { collection };
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
      const mod = mongoMod();

      const toArray = vi.fn().mockRejectedValue(new Error('query failed'));
      const limit = vi.fn().mockReturnValue({ toArray });
      const sort = vi.fn().mockReturnValue({ limit });
      const find = vi.fn().mockReturnValue({ sort });
      const collection = vi.fn().mockReturnValue({ find });
      const nativeDb = { collection };
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
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch QA alerts:',
        expect.anything()
      );
    });
  });
});
