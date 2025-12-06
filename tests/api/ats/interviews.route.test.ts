import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import type { Mock } from 'vitest';

process.env.SKIP_ENV_VALIDATION = 'true';
process.env.NEXTAUTH_SECRET = 'test-secret';

type JsonBody = { error?: string } | Record<string, string | number | boolean | null | object>;
type JsonResponse = { status: number; body: JsonBody };
type InterviewRequestBody = {
  applicationId: string;
  scheduledAt: string;
  stage: string;
  status: string;
  duration: number;
  interviewers: string[];
  metadata?: Record<string, string | number | boolean | null | object>;
  feedback?: Record<string, string | number | boolean | null | object>;
};

// Increase timeouts for this suite; Mongo/route wiring can take longer when run inside the full CI matrix
vi.setConfig({ hookTimeout: 120000, testTimeout: 120000 });

vi.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: JsonBody, init?: ResponseInit): JsonResponse => ({
      status: init?.status ?? 200,
      body
    })
  }
}));

vi.mock('@/lib/mongodb-unified', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/lib/ats/rbac', () => ({
  atsRBAC: vi.fn(),
}));

vi.mock('@/server/security/rateLimit', () => ({
  rateLimit: vi.fn().mockReturnValue({ allowed: true }),
  smartRateLimit: vi.fn(async () => ({ allowed: true }))
}));

vi.mock('@/server/security/headers', () => ({
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  createSecureResponse: vi.fn()
}));

vi.mock('@/server/utils/errorResponses', () => ({
  rateLimitError: vi.fn()
}));

const createFindOneChain = () => ({
  select: vi.fn().mockReturnThis(),
  lean: vi.fn()
});

const ApplicationMock = {
  findOne: vi.fn()
};

const queryChain = () => ({
  select: vi.fn().mockReturnThis(),
  populate: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  skip: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue([])
});

const InterviewMock = {
  find: vi.fn().mockReturnValue(queryChain()),
  countDocuments: vi.fn().mockResolvedValue(0),
  create: vi.fn()
};

vi.mock('@/server/models/Application', () => ({
  Application: ApplicationMock
}));

vi.mock('@/server/models/ats/Interview', () => ({
  Interview: InterviewMock
}));

let GET: any;
let POST: any;
let atsRBAC: any;

describe('API /api/ats/interviews', () => {
  beforeAll(async () => {
    ({ GET, POST } = await import('@/app/api/ats/interviews/route'));
    ({ atsRBAC } = await import('@/lib/ats/rbac'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    InterviewMock.find.mockReturnValue(queryChain());
    InterviewMock.countDocuments.mockResolvedValue(0);
    atsRBAC.mockResolvedValue({
      authorized: true,
      orgId: 'org-1',
      userId: 'user-1',
      atsModule: {
        enabled: true,
        jobPostLimit: Number.MAX_SAFE_INTEGER,
        seats: Number.MAX_SAFE_INTEGER,
        seatUsage: 0,
      },
    });
  });

  const getRequest = (query: string): NextRequest => ({
    url: `https://example.com/api/ats/interviews${query}`
  }) as NextRequest;

  it('rejects invalid from date values', async () => {
    const res = await GET(getRequest('?from=not-a-date'));
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid from date');
  });

  it('derives job and candidate from application when creating interviews', async () => {
    const appId = new Types.ObjectId();
    const jobId = new Types.ObjectId();
    const candidateId = new Types.ObjectId();
    const query = createFindOneChain();
    query.lean.mockResolvedValueOnce({ _id: appId, jobId, candidateId, orgId: 'org-1' });
    ApplicationMock.findOne.mockReturnValueOnce(query);
    InterviewMock.create.mockResolvedValueOnce({ _id: 'int-1' });

    const req = {
      url: 'https://example.com/api/ats/interviews',
      json: async (): Promise<InterviewRequestBody> => ({
        applicationId: appId.toHexString(),
        scheduledAt: '2024-01-01T00:00:00.000Z',
        stage: 'technical',
        status: 'completed',
        duration: 45,
        interviewers: ['mentor'],
        metadata: { source: 'panel' },
        feedback: { overall: 5 }
      })
    } as unknown as NextRequest;

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(InterviewMock.create).toHaveBeenCalledTimes(1);
    const payload = InterviewMock.create.mock.calls[0][0];
    expect(payload.applicationId.toString()).toBe(appId.toHexString());
    expect(payload.jobId.toString()).toBe(jobId.toHexString());
    expect(payload.candidateId.toString()).toBe(candidateId.toHexString());
    expect(payload.orgId).toBe('org-1');
    expect(payload.createdBy).toBe('user-1');
    expect(payload.stage).toBe('technical');
    expect(payload.status).toBe('completed');
    expect(payload.scheduledAt).toBeInstanceOf(Date);
    expect(payload.metadata).toEqual({ source: 'panel' });
  });

  it('returns 403 when user lacks ATS access on POST', async () => {
    // Mock atsRBAC to return unauthorized with response object
    const { atsRBAC } = await import('@/lib/ats/rbac');
    (atsRBAC as Mock).mockResolvedValue({
      authorized: false,
      response: {
        status: 403,
        body: { error: 'Access denied' }
      }
    });

    const appId = new Types.ObjectId();
    const req = {
      url: 'https://example.com/api/ats/interviews',
      json: async () => ({
        applicationId: appId.toHexString(),
        scheduledAt: '2025-01-20T10:00:00Z',
        stage: 'technical',
        status: 'scheduled',
        duration: 60,
        interviewers: [],
      } as InterviewRequestBody)
    } as NextRequest;

    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access denied');
    expect(InterviewMock.create).not.toHaveBeenCalled();
  });

  it('returns 403 when user tries to access other org interviews', async () => {
    const { atsRBAC } = await import('@/lib/ats/rbac');
    (atsRBAC as Mock).mockResolvedValue({
      authorized: false,
      response: {
        status: 403,
        body: { error: 'Organization mismatch' }
      }
    });

    const appId = new Types.ObjectId();
    const req = {
      url: 'https://example.com/api/ats/interviews',
      json: async () => ({
        applicationId: appId.toHexString(),
        scheduledAt: '2025-01-20T10:00:00Z',
        stage: 'technical',
        status: 'scheduled',
        duration: 60,
        interviewers: [],
      } as InterviewRequestBody)
    } as NextRequest;

    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Organization mismatch');
  });
});
