import { describe, it, expect, beforeEach, vi } from 'vitest';
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

vi.mock('@/app/api/fm/utils/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/app/api/fm/utils/tenant')>(
    '@/app/api/fm/utils/tenant',
  );
  return {
    ...actual,
    resolveTenantId: vi.fn(() => ({ tenantId: 'tenant-1', source: 'session' })),
  };
});

vi.mock('@/app/api/fm/utils/fm-auth', () => ({
  requireFmAbility: vi.fn(),
}));

import { GET } from '@/app/api/fm/work-orders/stats/route';
import { makeGetRequest } from '@/tests/helpers/request';
import { getDatabase } from '@/lib/mongodb-unified';
import { resolveTenantId } from '@/app/api/fm/utils/tenant';
import { requireFmAbility } from '@/app/api/fm/utils/fm-auth';
import { FMErrors } from '@/app/api/fm/errors';

describe('api/fm/work-orders/stats route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDatabase as unknown as vi.Mock).mockReset();
    (resolveTenantId as vi.Mock).mockReset();
    (requireFmAbility as vi.Mock).mockReset();
  });

  it('returns guard response when ability denies access', async () => {
    const guardResponse = NextResponse.json({ error: 'forbidden' }, { status: 403 });
    (requireFmAbility as vi.Mock).mockImplementation(() => async () => guardResponse);
    const req = createRequest();
    const res = await GET(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it('returns guard response when tenant resolution fails', async () => {
    mockAbility();
    (resolveTenantId as vi.Mock).mockReturnValue({ error: FMErrors.forbidden('mismatch') });
    const req = createRequest();
    const res = await GET(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it('aggregates stats when guards pass', async () => {
    mockAbility();
    (resolveTenantId as vi.Mock).mockReturnValue({ tenantId: 'tenant-1', source: 'session' });
    mockDb();
    const req = createRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(5);
    expect(body.data.overdueCount).toBe(2);
  });
});

function mockAbility() {
  (requireFmAbility as vi.Mock).mockImplementation(() => async () => ({
    id: 'user-1',
    orgId: 'tenant-1',
    tenantId: 'tenant-1',
  }));
}

function mockDb() {
  const pipelineResult = [{ _id: 'OPEN', count: 3 }];
  const completionResult = [{
    avgCompletionTime: 5,
    totalCompleted: 2,
    slaMet: 1,
    slaDefinedCount: 2,
  }];
  const aggregateMock = vi.fn()
    .mockImplementationOnce(() => ({ toArray: vi.fn().mockResolvedValue(pipelineResult) }))
    .mockImplementationOnce(() => ({ toArray: vi.fn().mockResolvedValue(pipelineResult) }))
    .mockImplementationOnce(() => ({ toArray: vi.fn().mockResolvedValue(completionResult) }));

  const collectionMock = {
    countDocuments: vi.fn()
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2),
    aggregate: aggregateMock,
  };

  const db = {
    collection: vi.fn(() => collectionMock),
  };
  (getDatabase as vi.Mock).mockResolvedValue(db);
}

function createRequest() {
  const url = new URL('https://fixzit.test/api/fm/work-orders/stats');
  return makeGetRequest(url.toString());
}
