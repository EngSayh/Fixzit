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

const { abilityUser, requireAbilityMock } = vi.hoisted(() => {
  const abilityUser = {
    id: 'ability-user',
    orgId: 'tenant-1',
    tenantId: 'tenant-1',
  };

  const requireAbilityMock = vi.fn().mockImplementation(() => async () => abilityUser);
  return { abilityUser, requireAbilityMock };
});

vi.mock('@/server/middleware/withAuthRbac', () => {
  class MockUnauthorizedError extends Error {}
  return {
    getSessionUser: vi.fn(),
    UnauthorizedError: MockUnauthorizedError,
    requireAbility: requireAbilityMock,
  };
});

vi.mock('@/app/api/fm/work-orders/utils', async () => {
  const actual = await vi.importActual<typeof import('@/app/api/fm/work-orders/utils')>(
    '@/app/api/fm/work-orders/utils'
  );
  return {
    ...actual,
    resolveTenantId: vi.fn(() => ({ tenantId: 'tenant-1' })),
    recordTimelineEntry: vi.fn(),
  };
});

import { POST } from '@/app/api/fm/work-orders/[id]/transition/route';
import { WOStatus } from '@/domain/fm/fm.behavior';
import { getDatabase } from '@/lib/mongodb-unified';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

const WORK_ORDER_ID = '507f1f77bcf86cd799439011';

describe('api/fm/work-orders/[id]/transition route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDatabase.mockReset();
    getSessionUser.mockReset();
    requireAbilityMock.mockClear();
    abilityUser.id = 'ability-user';
    abilityUser.orgId = 'tenant-1';
    abilityUser.tenantId = 'tenant-1';
  });

  it('returns descriptive media requirement errors when missing BEFORE photos', async () => {
    const workOrder = {
      _id: new ObjectId(WORK_ORDER_ID),
      tenantId: 'tenant-1',
      orgId: 'tenant-1',
      status: WOStatus.ASSESSMENT,
      attachments: [],
    };

    mockSession({
      id: 'user-1',
      role: 'TECHNICIAN',
      subscriptionPlan: 'PRO',
      orgId: 'tenant-1',
    });
    mockDatabase(workOrder);

    const req = createMockRequest(
      { toStatus: WOStatus.ESTIMATE_PENDING },
      { 'x-tenant-id': 'tenant-1' }
    );
    const res = await POST(req as any, { params: { id: WORK_ORDER_ID } });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe('validation-error');
    expect(body.message).toContain('BEFORE');
    expect(body.details?.required).toContain('BEFORE');
  });

  it('blocks technicians from starting work when no assignment exists', async () => {
    const workOrder = {
      _id: new ObjectId(WORK_ORDER_ID),
      tenantId: 'tenant-1',
      orgId: 'tenant-1',
      status: WOStatus.APPROVED,
      attachments: [{ category: 'BEFORE' }],
      assignment: {},
    };

    mockSession({
      id: 'user-1',
      role: 'TECHNICIAN',
      subscriptionPlan: 'STANDARD',
      orgId: 'tenant-1',
    });
    mockDatabase(workOrder, { ...workOrder, status: WOStatus.IN_PROGRESS });

    const req = createMockRequest(
      { toStatus: WOStatus.IN_PROGRESS },
      { 'x-tenant-id': 'tenant-1' }
    );
    const res = await POST(req as any, { params: { id: WORK_ORDER_ID } });
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error).toBe('forbidden');
    expect(body.message).toContain('cannot perform action start_work');
  });
});

type SessionInput = {
  id?: string;
  role?: string;
  subscriptionPlan?: string;
  orgId?: string;
  tenantId?: string;
  email?: string;
  name?: string;
};

function mockSession(user: SessionInput) {
  getSessionUser.mockResolvedValue({
    id: user.id ?? 'user-1',
    role: user.role ?? 'TECHNICIAN',
    subscriptionPlan: user.subscriptionPlan ?? 'STANDARD',
    orgId: user.orgId ?? 'tenant-1',
    tenantId: user.tenantId ?? user.orgId ?? 'tenant-1',
    email: user.email ?? 'user@example.com',
    name: user.name ?? 'Test User',
    permissions: [],
    roles: [],
  } as any);
  abilityUser.id = user.id ?? 'user-1';
  abilityUser.orgId = user.orgId ?? 'tenant-1';
  abilityUser.tenantId = user.tenantId ?? user.orgId ?? 'tenant-1';
}

function mockDatabase(workOrder: any, updatedDoc?: any) {
  const workordersCollection = {
    findOne: vi.fn().mockResolvedValue(workOrder),
    findOneAndUpdate: vi.fn().mockResolvedValue({ value: updatedDoc ?? workOrder }),
  };

  const timelineCollection = {
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'timeline-1' }),
  };

  const usersCollection = {
    findOne: vi.fn().mockResolvedValue(null),
  };

  getDatabase.mockResolvedValue({
    collection: vi.fn((name: string) => {
      if (name === 'workorders') return workordersCollection;
      if (name === 'workorder_timeline') return timelineCollection;
      if (name === 'users') return usersCollection;
      throw new Error(`Unknown collection ${name}`);
    }),
  } as any);
}

type Headers = Record<string, string>;

function createMockRequest(body: unknown, headers: Headers = {}) {
  const normalized = Object.entries(headers).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[key.toLowerCase()] = value;
      return acc;
    },
    {}
  );

  return {
    headers: {
      get: (key: string) => normalized[key.toLowerCase()] ?? null,
    },
    json: async () => body,
  };
}
