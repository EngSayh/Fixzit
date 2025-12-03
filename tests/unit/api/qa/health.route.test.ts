/**
 * Unit tests for api/qa/health route.
 * Testing framework: Vitest
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type mongoose from 'mongoose';
import * as mongodbUnified from '@/lib/mongodb-unified';
import { makeGetRequest, makePostRequest } from '@/tests/helpers/request';

vi.mock('@/lib/mongodb-unified', () => {
  const connectToDatabase = vi.fn();
  return { connectToDatabase };
});
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

import { POST, GET } from "@/app/api/qa/health/route";
import { logger } from '@/lib/logger';
import { requireSuperAdmin } from '@/lib/authz';

type MongooseLike = {
  connection?: {
    db?: {
      listCollections?: () => { toArray: () => Promise<Array<{ name: string }>> };
    };
  };
};

const HEALTH_URL = 'http://localhost:3000/api/qa/health';

function createGetRequest() {
  return makeGetRequest(HEALTH_URL);
}

function createPostRequest() {
  return makePostRequest(HEALTH_URL, {}, { 'content-type': 'application/json' });
}

describe('api/qa/health route - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__connectToDatabaseMock = vi.mocked(mongodbUnified).connectToDatabase;
    // Reset auth mock to default success
    vi.mocked(requireSuperAdmin).mockResolvedValue({ id: 'test-user', tenantId: 'test-org', role: 'SUPER_ADMIN', email: 'admin@test.com' });
  });

  afterEach(() => {
    delete (process as any).env.npm_package_version;
    delete (globalThis as any).__connectToDatabaseMock;
  });

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

  it('returns healthy with database status when DB connects successfully', async () => {
    const mod = vi.mocked(mongodbUnified);
    const version = '9.9.9-test';
    (process as any).env.npm_package_version = version;

    // Mock mongoose-like connection object
    const toArray = vi.fn().mockResolvedValue([{ name: 'col1' }, { name: 'col2' }]);
    const listCollections = vi.fn().mockReturnValue({ toArray });
    const mockMongoose = {
      connection: {
        db: { listCollections }
      }
    } satisfies MongooseLike;
    mod.connectToDatabase.mockResolvedValue(mockMongoose as unknown as typeof mongoose);

    const memSpy = vi.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 100 * 1024 * 1024,
      heapUsed: 50 * 1024 * 1024,
      heapTotal: 60 * 1024 * 1024,
      external: 5 * 1024 * 1024,
      arrayBuffers: 1 * 1024 * 1024
    });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.status).toBe('healthy');
    expect(body.database).toContain('connected');
    expect(body.database).toContain('2 collections');
    expect(body.version).toBe(version);

    memSpy.mockRestore();
  });

  it('returns critical (503) when DB connection fails', async () => {
    const mod = vi.mocked(mongodbUnified);
    const err = new Error('DB down');
    mod.connectToDatabase.mockRejectedValue(err);

    const res = await GET(createGetRequest());
    expect(logger.error).toHaveBeenCalled();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('critical');
    expect(body.database).toBe('disconnected');
  });
});

describe('api/qa/health route - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__connectToDatabaseMock = vi.mocked(mongodbUnified).connectToDatabase;
    // Reset auth mock to default success
    vi.mocked(requireSuperAdmin).mockResolvedValue({ id: 'test-user', tenantId: 'test-org', role: 'SUPER_ADMIN', email: 'admin@test.com' });
  });

  afterEach(() => {
    delete (globalThis as any).__connectToDatabaseMock;
  });

  it('returns 401 when no authorization header provided', async () => {
    vi.mocked(requireSuperAdmin).mockRejectedValue(
      new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await POST(createPostRequest());
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

    const res = await POST(createPostRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('FORBIDDEN');
  });

  it('returns success when DB reconnects successfully', async () => {
    const mod = vi.mocked(mongodbUnified);
    mod.connectToDatabase.mockResolvedValue({} as unknown as typeof mongoose);

    const res = await POST(createPostRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Database reconnected');
  });

  it('returns failure (500) when DB reconnection fails', async () => {
    const mod = vi.mocked(mongodbUnified);
    const err = new Error('reconnect failed');
    mod.connectToDatabase.mockRejectedValue(err);

    const res = await POST(createPostRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to reconnect database');
  });
});
