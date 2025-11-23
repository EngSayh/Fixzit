import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';

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

vi.mock('@/app/api/fm/permissions', () => ({
  requireFmPermission: vi.fn(),
}));

vi.mock('@/app/api/fm/utils/tenant', () => ({
  resolveTenantId: vi.fn(() => ({ tenantId: 'tenant-1', source: 'session' })),
}));

import { GET, POST, PATCH, DELETE } from '@/app/api/fm/properties/route';
import { getDatabase } from '@/lib/mongodb-unified';
import { requireFmPermission } from '@/app/api/fm/permissions';
import { resolveTenantId } from '@/app/api/fm/utils/tenant';
import { FMErrors } from '@/app/api/fm/errors';
import { makeGetRequest, makePostRequest } from '@/tests/helpers/request';

type DbMock = ReturnType<typeof mockDb>;

describe('api/fm/properties route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDatabase as unknown as vi.Mock).mockReset();
    (requireFmPermission as vi.Mock).mockReset();
    (resolveTenantId as vi.Mock).mockReset();
  });

  it('returns paginated properties for tenant scope', async () => {
    mockPermission();
    (resolveTenantId as vi.Mock).mockReturnValue({ tenantId: 'tenant-1', source: 'session' });
    const items = [
      buildProperty({ _id: new ObjectId('507f1f77bcf86cd799439011'), name: 'Tower A' }),
      buildProperty({ _id: new ObjectId('507f1f77bcf86cd799439012'), name: 'Tower B', code: 'PROP-1' }),
    ];
    mockDb({
      findResult: items,
      count: 2,
    });

    const req = createGetRequest({ page: '1', limit: '10' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toMatchObject({
      id: items[0]._id.toString(),
      name: 'Tower A',
      status: 'Active',
    });
    expect(body.pagination).toMatchObject({ page: 1, total: 2, totalPages: 1 });
    const collection = getCollectionMock();
    expect(collection.find).toHaveBeenCalledWith({ org_id: 'tenant-1' });
  });

  it('validates payload when creating properties', async () => {
    mockPermission();
    const req = createPostRequest({});
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe('validation-error');
  });

  it('rejects duplicate property codes', async () => {
    mockPermission();
    mockDb({
      findExisting: true,
    });
    const req = createPostRequest({ name: 'HQ', type: 'Office', code: 'PROP-1' });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe('conflict');
  });

  it('creates property and generates code when absent', async () => {
    mockPermission();
    const db = mockDb();
    const req = createPostRequest({ name: 'HQ', type: 'Office' });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('HQ');
    expect(body.data.code).toMatch(/^PROP-\d{6}-\d{4}$/);
    expect(db.insertOne).toHaveBeenCalledTimes(1);
  });

  it('returns guard response when tenant resolution fails', async () => {
    mockPermission();
    (resolveTenantId as vi.Mock).mockReturnValue({ error: FMErrors.forbidden('mismatch') });
    const req = createGetRequest({});
    const res = await GET(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
  });
  it('updates property fields through PATCH', async () => {
    mockPermission();
    const updated = buildProperty({ _id: new ObjectId('507f1f77bcf86cd799439013'), name: 'Updated', status: 'Inactive' });
    mockDb({ updateValue: updated });
    const req = createPatchRequest('507f1f77bcf86cd799439013', { name: 'Updated', status: 'Inactive' });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Updated');
    const collection = getCollectionMock();
    expect(collection.findOneAndUpdate).toHaveBeenCalled();
  });

  it('deletes property when DELETE invoked', async () => {
    mockPermission();
    mockDb({ deleteValue: buildProperty({ _id: new ObjectId('507f1f77bcf86cd799439014') }) });
    const req = createDeleteRequest('507f1f77bcf86cd799439014');
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('deleted');
  });
});

function mockPermission() {
  (requireFmPermission as vi.Mock).mockResolvedValue({
    id: 'user-1',
    orgId: 'tenant-1',
    tenantId: 'tenant-1',
    isSuperAdmin: false,
    plan: 'STANDARD',
  });
}

type DbOptions = {
  findResult?: any[];
  count?: number;
  findExisting?: boolean;
  updateValue?: Record<string, unknown> | null;
  deleteValue?: Record<string, unknown> | null;
};

let collectionMock: ReturnType<typeof buildCollectionMock>;

function getCollectionMock() {
  if (!collectionMock) {
    throw new Error('Collection mock not initialized');
  }
  return collectionMock;
}

function mockDb(options: DbOptions = {}): DbMock {
  collectionMock = buildCollectionMock(options);
  const db = {
    collection: vi.fn(() => collectionMock),
  };
  (getDatabase as vi.Mock).mockResolvedValue(db);
  return collectionMock;
}

function buildCollectionMock(options: DbOptions) {
  const toArray = vi.fn().mockResolvedValue(options.findResult ?? []);
  const limit = vi.fn().mockReturnValue({ toArray });
  const skip = vi.fn().mockReturnValue({ limit });
  const sort = vi.fn().mockReturnValue({ skip });
  const find = vi.fn().mockReturnValue({ sort });

  const insertOne = vi.fn().mockImplementation((doc) =>
    Promise.resolve({ insertedId: doc._id ?? new ObjectId() })
  );

  const findOne = vi
    .fn()
    .mockResolvedValue(options.findExisting ? { _id: new ObjectId() } : null);

  const countDocuments = vi.fn().mockResolvedValue(options.count ?? (options.findResult?.length ?? 0));
  const findOneAndUpdate = vi.fn().mockResolvedValue({ value: options.updateValue ?? null });
  const findOneAndDelete = vi.fn().mockResolvedValue({ value: options.deleteValue ?? null });

  return {
    find,
    sort,
    skip,
    limit,
    toArray,
    insertOne,
    findOne,
    countDocuments,
    findOneAndUpdate,
    findOneAndDelete,
  };
}

function createGetRequest(params: Record<string, string>) {
  const url = new URL('https://fixzit.test/api/fm/properties');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  const req = makeGetRequest(url.toString());
  return req;
}

function createPostRequest(body: Record<string, unknown>) {
  const url = new URL('https://fixzit.test/api/fm/properties');
  return makePostRequest(url.toString(), body);
}

function createPatchRequest(id: string, body: Record<string, unknown>) {
  const url = new URL('https://fixzit.test/api/fm/properties');
  url.searchParams.set('id', id);
  return new Request(url.toString(), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createDeleteRequest(id: string) {
  const url = new URL('https://fixzit.test/api/fm/properties');
  url.searchParams.set('id', id);
  return new Request(url.toString(), { method: 'DELETE' });
}

function buildProperty(overrides: Partial<PropertyDocument> = {}) {
  return {
    _id: overrides._id ?? new ObjectId(),
    org_id: overrides.org_id ?? 'tenant-1',
    name: overrides.name ?? 'Property',
    code: overrides.code ?? 'PROP-0001',
    type: overrides.type ?? 'Office',
    status: overrides.status ?? 'Active',
    lease_status: overrides.lease_status ?? 'Vacant',
    createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2024-01-02T00:00:00Z'),
  };
}

type PropertyDocument = {
  _id: ObjectId;
  org_id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  lease_status: string;
  createdAt: Date;
  updatedAt: Date;
};
