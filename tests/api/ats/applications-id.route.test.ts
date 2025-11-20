import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

process.env.SKIP_ENV_VALIDATION = 'true';
process.env.NEXTAUTH_SECRET = 'test-secret';

vi.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: any, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      body
    })
  }
}));

vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn()
  })),
  getServerSession: vi.fn(async () => ({
    user: { id: 'user-1', role: 'ADMIN', orgId: 'org-1' }
  }))
}));

vi.mock('@/lib/mongodb-unified', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/lib/ats/rbac', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ats/rbac')>('@/lib/ats/rbac');
  return {
    ...actual,
    atsRBAC: vi.fn()
  };
});

vi.mock('@/server/security/rateLimit', () => ({
  rateLimit: vi.fn().mockReturnValue({ allowed: true })
}));

vi.mock('@/server/security/headers', () => ({
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  createSecureResponse: vi.fn()
}));

vi.mock('@/server/utils/errorResponses', () => ({
  rateLimitError: vi.fn()
}));

const ApplicationMock = {
  findById: vi.fn(),
  find: vi.fn(),
  countDocuments: vi.fn()
};

vi.mock('@/server/models/Application', () => ({
  Application: ApplicationMock
}));

let PATCH: any;
let atsRBAC: any;

describe('API /api/ats/applications/[id] PATCH', () => {
  beforeAll(async () => {
    ({ PATCH } = await import('@/app/api/ats/applications/[id]/route'));
    ({ atsRBAC } = await import('@/lib/ats/rbac'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    atsRBAC.mockResolvedValue({
      authorized: true,
      orgId: 'org-1',
      userId: 'user-1',
      isSuperAdmin: false,
      atsModule: {
        enabled: true,
        jobPostLimit: Number.MAX_SAFE_INTEGER,
        seats: Number.MAX_SAFE_INTEGER,
        seatUsage: 0,
      },
    });
    ApplicationMock.findById.mockResolvedValue({
      _id: 'app-1',
      stage: 'applied',
      orgId: 'org-1',
      history: [],
      notes: [],
      save: vi.fn().mockResolvedValue(undefined)
    });
  });

  const callPATCH = async (body: any) => {
    const req = {
      url: 'https://example.com/api/ats/applications/app-1',
      json: async () => body
    } as unknown as NextRequest;
    return PATCH(req, { params: Promise.resolve({ id: 'app-1' }) });
  };

  it('returns allowed transitions when invalid stage move attempted', async () => {
    const res: any = await callPATCH({ stage: 'hired' });
    expect(res.status).toBe(400);
    expect(res.body.allowedTransitions).toEqual(['screening', 'rejected', 'withdrawn']);
  });
});
