import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

vi.mock('@/lib/mongodb-unified', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/app/api/fm/utils/tenant', () => ({
  resolveTenantId: vi.fn(() => ({ tenantId: 'tenant-1', source: 'session' })),
}));

vi.mock('@/app/api/fm/utils/auth', () => ({
  requireFmAbility: vi.fn(),
}));

import { GET, POST } from '@/app/api/fm/work-orders/[id]/attachments/route';
import { getDatabase } from '@/lib/mongodb-unified';
import { resolveTenantId } from '@/app/api/fm/utils/tenant';
import { requireFmAbility } from '@/app/api/fm/utils/auth';
import { FMErrors } from '@/app/api/fm/errors';

type DbMock = ReturnType<typeof mockDb>;

describe('api/fm/work-orders/[id]/attachments route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDatabase as unknown as vi.Mock).mockReset();
    (resolveTenantId as vi.Mock).mockReset();
    (requireFmAbility as vi.Mock).mockReset();
  });

  it('returns guard response when tenant resolution fails', async () => {
    mockAbility();
    (resolveTenantId as vi.Mock).mockReturnValue({ error: FMErrors.forbidden('tenant mismatch') });
    const req = createRequest('https://fixzit.test/api/fm/work-orders/507f1f77bcf86cd799439011/attachments');
    const res = await GET(req as any, { params: { id: '507f1f77bcf86cd799439011' } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
  });

  it('returns attachments when ability and tenant guards pass', async () => {
    mockAbility();
    (resolveTenantId as vi.Mock).mockReturnValue({ tenantId: 'tenant-1', source: 'session' });
    const attachments = [
      { _id: new ObjectId('507f1f77bcf86cd799439011'), url: 'https://s3/1.jpg', type: 'attachment', uploadedAt: new Date() },
    ];
    mockDb({ attachments });

    const req = createRequest('https://fixzit.test/api/fm/work-orders/507f1f77bcf86cd799439011/attachments');
    const res = await GET(req as any, { params: { id: '507f1f77bcf86cd799439011' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ id: attachments[0]._id.toHexString(), url: attachments[0].url });
  });

  it('short-circuits when ability guard denies access', async () => {
    (requireFmAbility as vi.Mock).mockImplementation(() => async () => NextResponse.json({ error: 'forbidden' }, { status: 403 }));
    const req = createRequest('https://fixzit.test/api/fm/work-orders/507f1f77bcf86cd799439011/attachments');
    const res = await POST(req as any, { params: { id: '507f1f77bcf86cd799439011' } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
    expect(getDatabase).not.toHaveBeenCalled();
  });
});

function mockAbility(overrides: Record<string, unknown> = {}) {
  (requireFmAbility as vi.Mock).mockImplementation(() => async () => ({
    id: 'user-1',
    orgId: 'tenant-1',
    tenantId: 'tenant-1',
    email: 'user@example.com',
    name: 'User',
    ...overrides,
  }));
}

type DbOptions = {
  attachments?: Array<Record<string, unknown>>;
};

function mockDb(options: DbOptions = {}): DbMock {
  const collectionMock = {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(options.attachments ?? []),
      }),
    }),
    insertOne: vi.fn(),
  };
  (getDatabase as vi.Mock).mockResolvedValue({
    collection: vi.fn(() => collectionMock),
  });
  return collectionMock;
}

function createRequest(url: string) {
  const parsed = new URL(url);
  return {
    url: parsed.toString(),
    headers: new Headers(),
    nextUrl: parsed,
    json: async () => ({
      url: 'https://cdn/new.jpg',
      type: 'attachment',
    }),
  };
}
