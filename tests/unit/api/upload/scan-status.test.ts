import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/lib/mongodb-unified', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('@/server/middleware/withAuthRbac', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('@/server/security/rateLimit', () => ({
  rateLimit: vi.fn(() => ({ allowed: true })),
}));

vi.mock('@/server/utils/errorResponses', () => ({
  rateLimitError: vi.fn(() => NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })),
}));

vi.mock('@/server/security/rateLimitKey', () => ({
  buildRateLimitKey: vi.fn(() => 'test-key'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { GET, POST } from '@/app/api/upload/scan-status/route';
import { makeGetRequest, makePostRequest } from '@/tests/helpers/request';
import { getDatabase } from '@/lib/mongodb-unified';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { rateLimit } from '@/server/security/rateLimit';

describe('GET /api/upload/scan-status', () => {
  const mockUser = { id: 'user-123', tenantId: 'tenant-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    (getSessionUser as vi.Mock).mockResolvedValue(mockUser);
    (rateLimit as vi.Mock).mockReturnValue({ allowed: true });
    process.env.SCAN_STATUS_TOKEN_REQUIRED = 'false';
    delete process.env.SCAN_STATUS_TOKEN;
  });

  it('enforces rate limiting', async () => {
    (rateLimit as vi.Mock).mockReturnValue({ allowed: false });

    const req = createRequest('https://test.com/api/upload/scan-status?key=test.jpg');
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it('requires authentication', async () => {
    (getSessionUser as vi.Mock).mockResolvedValue(null);

    const req = createRequest('https://test.com/api/upload/scan-status?key=test.jpg');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('allows token-based access without auth', async () => {
    (getSessionUser as vi.Mock).mockResolvedValue(null);
    process.env.SCAN_STATUS_TOKEN_REQUIRED = 'true';
    process.env.SCAN_STATUS_TOKEN = 'secret';
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              next: vi.fn().mockResolvedValue({ key: 'token-file', status: 'clean' }),
            }),
          }),
        }),
      }),
    };
    (getDatabase as vi.Mock).mockResolvedValue(mockDb);
    process.env.SCAN_STATUS_TOKEN = 'secret';

    const req = createRequest('https://test.com/api/upload/scan-status?key=token-file', {
      'x-scan-token': 'secret',
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('clean');
  });

  it('validates key parameter is provided', async () => {
    const req = createRequest('https://test.com/api/upload/scan-status');
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing key');
  });

  it('returns scan status with cache headers', async () => {
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              next: vi.fn().mockResolvedValue({
                key: 'test.jpg',
                status: 'clean',
                scannedAt: new Date(),
              }),
            }),
          }),
        }),
      }),
    };
    (getDatabase as vi.Mock).mockResolvedValue(mockDb);

    const req = createRequest('https://test.com/api/upload/scan-status?key=test.jpg');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.key).toBe('test.jpg');
    expect(body.status).toBe('clean');

    // Verify cache headers are present
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=5');
    expect(res.headers.get('CDN-Cache-Control')).toBe('max-age=5');
  });

  it('normalizes status to valid enum values', async () => {
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              next: vi.fn().mockResolvedValue({
                key: 'test.jpg',
                status: 'invalid-status', // Invalid status
              }),
            }),
          }),
        }),
      }),
    };
    (getDatabase as vi.Mock).mockResolvedValue(mockDb);

    const req = createRequest('https://test.com/api/upload/scan-status?key=test.jpg');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('pending'); // Defaults to pending
  });

  it('returns pending when no scan record exists', async () => {
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              next: vi.fn().mockResolvedValue(null), // No record
            }),
          }),
        }),
      }),
    };
    (getDatabase as vi.Mock).mockResolvedValue(mockDb);

    const req = createRequest('https://test.com/api/upload/scan-status?key=new-file.jpg');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('pending');
    expect(body.key).toBe('new-file.jpg');
  });
});

describe('POST /api/upload/scan-status', () => {
  const mockUser = { id: 'user-123', tenantId: 'tenant-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    (getSessionUser as vi.Mock).mockResolvedValue(mockUser);
    (rateLimit as vi.Mock).mockReturnValue({ allowed: true });
    process.env.SCAN_STATUS_TOKEN_REQUIRED = 'false';
    delete process.env.SCAN_STATUS_TOKEN;
  });

  it('validates key in request body', async () => {
    const req = createPostRequest({});
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing key');
  });

  it('returns scan status with cache headers', async () => {
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              next: vi.fn().mockResolvedValue({
                key: 'test.jpg',
                status: 'infected',
                findings: ['virus.exe'],
              }),
            }),
          }),
        }),
      }),
    };
    (getDatabase as vi.Mock).mockResolvedValue(mockDb);

    const req = createPostRequest({ key: 'test.jpg' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('infected');
    expect(body.findings).toEqual(['virus.exe']);

    // Verify cache headers
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=5');
    expect(res.headers.get('CDN-Cache-Control')).toBe('max-age=5');
  });

  it('enforces rate limiting on POST', async () => {
    (rateLimit as vi.Mock).mockReturnValue({ allowed: false });
    process.env.SCAN_STATUS_TOKEN_REQUIRED = 'false';

    const req = createPostRequest({ key: 'test.jpg' });
    const res = await POST(req);

    expect(res.status).toBe(429);
  });

  it('requires token when token-required flag set', async () => {
    process.env.SCAN_STATUS_TOKEN_REQUIRED = 'true';
    process.env.SCAN_STATUS_TOKEN = 'secret';
    (getSessionUser as vi.Mock).mockResolvedValue(null);

    const req = createPostRequest({ key: 'test.jpg' });
    const res = await POST(req);

    expect(res.status).toBe(401);

    const reqWithToken = createPostRequest({ key: 'test.jpg' }, { 'x-scan-token': 'secret' });
    const res2 = await POST(reqWithToken);
    expect(res2.status).toBe(200);
  });
});

// Helper functions
const createRequest = (url: string, headers: Record<string, string> = {}) => makeGetRequest(url, headers);

const createPostRequest = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  makePostRequest('https://test.com/api/upload/scan-status', body, headers);
