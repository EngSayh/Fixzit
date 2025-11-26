import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import type { Mock } from 'vitest';

process.env.SKIP_ENV_VALIDATION = 'true';
process.env.NEXTAUTH_SECRET = 'test-secret';

type JsonBody = { error?: string } | Record<string, string | number | boolean | null | object>;
type JsonResponse = { status: number; body: JsonBody };

vi.mock('next/server', () => {
  return {
    NextRequest: class {},
    NextResponse: {
      json: (body: JsonBody, init?: ResponseInit): JsonResponse => ({
        status: init?.status ?? 200,
        body
      })
    }
  };
});

vi.mock('@/lib/mongodb-unified', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/lib/ats/rbac', () => ({
  atsRBAC: vi.fn(),
}));

vi.mock('@/server/security/rateLimit', () => ({
  rateLimit: vi.fn().mockReturnValue({ allowed: true })
}));

vi.mock('@/server/utils/errorResponses', () => ({
  rateLimitError: vi.fn()
}));

vi.mock('@/server/security/headers', () => ({
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  createSecureResponse: vi.fn()
}));

const queryChain = () => ({
  populate: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  skip: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue([])
});

const ApplicationMock = {
  find: vi.fn().mockReturnValue(queryChain()),
  countDocuments: vi.fn().mockResolvedValue(0),
  findById: vi.fn()
};

vi.mock('@/server/models/Application', () => ({
  Application: ApplicationMock
}));

let GET: (req: NextRequest) => Promise<JsonResponse> | JsonResponse;
let atsRBAC: Mock;

describe('API /api/ats/applications', () => {
  beforeAll(async () => {
    ({ GET } = await import('@/app/api/ats/applications/route'));
    ({ atsRBAC } = await import('@/lib/ats/rbac'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    ApplicationMock.find.mockReturnValue(queryChain());
    ApplicationMock.countDocuments.mockResolvedValue(0);
    atsRBAC.mockResolvedValue({
      authorized: true,
      orgId: 'org-1',
      atsModule: {
        enabled: true,
        jobPostLimit: Number.MAX_SAFE_INTEGER,
        seats: Number.MAX_SAFE_INTEGER,
        seatUsage: 0,
      },
    });
  });

  const callGET = async (query: string) => {
    const req = { url: `https://example.com/api/ats/applications${query}` } as NextRequest;
    return GET(req);
  };

  it('rejects invalid page parameter', async () => {
    const res = await callGET('?page=abc');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid page');
  });

  it('casts jobId and candidateId filters to ObjectId when valid', async () => {
    const jobId = new Types.ObjectId().toHexString();
    const candidateId = new Types.ObjectId().toHexString();
    const res = await callGET(`?jobId=${jobId}&candidateId=${candidateId}&stage=screening&page=2&limit=75`);

    expect(res.status).toBe(200);
    expect(ApplicationMock.find).toHaveBeenCalledTimes(1);
    const filter = ApplicationMock.find.mock.calls[0][0];
    expect(filter.orgId).toBe('org-1');
    expect(filter.stage).toBe('screening');
    expect(filter.jobId).toBeInstanceOf(Types.ObjectId);
    expect(filter.jobId.toString()).toBe(jobId);
    expect(filter.candidateId.toString()).toBe(candidateId);
    expect(ApplicationMock.countDocuments).toHaveBeenCalledWith(filter);
  });

  it('returns 403 when user lacks ATS access', async () => {
    // Mock atsRBAC to return unauthorized with response object
    const { atsRBAC } = await import('@/lib/ats/rbac');
    (atsRBAC as Mock).mockResolvedValue({
      authorized: false,
      response: {
        status: 403,
        body: { error: 'Access denied' }
      }
    });

    const res = await callGET('?page=1');

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access denied');
    expect(ApplicationMock.find).not.toHaveBeenCalled();
  });

  it('returns 403 when user is not from correct org', async () => {
    // Mock atsRBAC to return unauthorized with response object
    const { atsRBAC } = await import('@/lib/ats/rbac');
    (atsRBAC as Mock).mockResolvedValue({
      authorized: false,
      response: {
        status: 403,
        body: { error: 'Access denied - organization mismatch' }
      }
    });

    const res = await callGET('?page=1');

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access denied');
  });
});
