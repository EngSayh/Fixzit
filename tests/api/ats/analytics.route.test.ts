import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { Types } from 'mongoose';

process.env.SKIP_ENV_VALIDATION = 'true';
process.env.NEXTAUTH_SECRET = 'test-secret';

vi.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => ({
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
  rateLimit: vi.fn().mockReturnValue({ allowed: true })
}));

vi.mock('@/server/security/headers', () => ({
  getClientIP: vi.fn().mockReturnValue('127.0.0.1')
}));

const ApplicationMock = {
  aggregate: vi.fn(),
  countDocuments: vi.fn().mockResolvedValue(0)
};

const InterviewMock = {
  aggregate: vi.fn().mockResolvedValue([]),
  countDocuments: vi.fn().mockResolvedValue(0)
};

const JobMock = {
  countDocuments: vi.fn().mockResolvedValue(0)
};

vi.mock('@/server/models/Application', () => ({
  Application: ApplicationMock
}));

vi.mock('@/server/models/ats/Interview', () => ({
  Interview: InterviewMock
}));

vi.mock('@/server/models/Job', () => ({
  Job: JobMock
}));

type ApiResponse<TBody = Record<string, unknown>> = { status: number; body: TBody };
let GET: (req: NextRequest) => Promise<ApiResponse>;
let atsRBAC: ReturnType<typeof vi.fn>;

describe('API /api/ats/analytics', () => {
  beforeAll(async () => {
    ({ GET } = await import('@/app/api/ats/analytics/route'));
    ({ atsRBAC } = await import('@/lib/ats/rbac'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
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
    ApplicationMock.aggregate.mockReset();
    ApplicationMock.aggregate
      .mockResolvedValueOnce([{ _id: 'applied', count: 2 }])
      .mockResolvedValueOnce([{ _id: '2024-01-01', count: 1 }])
      .mockResolvedValueOnce([{ applied: 2, screening: 1, interview: 1, offer: 0, hired: 0, rejected: 0 }])
      .mockResolvedValueOnce([{ _id: 'applied', avgDays: 1 }])
      .mockResolvedValueOnce([{ jobTitle: 'Engineer', applicationsCount: 2, avgScore: 80 }]);
  });

  const callGET = async (query: string) => {
    const req = { url: `https://example.com/api/ats/analytics${query}` } as NextRequest;
    return GET(req);
  };

  it('rejects invalid period values', async () => {
    const res = await callGET('?period=0') as ApiResponse<{ error: string }>;
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid period');
  });

  it('casts jobId filter when provided', async () => {
    const jobId = new Types.ObjectId().toHexString();
    const res = await callGET(`?period=30&jobId=${jobId}`);
    expect(res.status).toBe(200);

    const matchStage = ApplicationMock.aggregate.mock.calls[0][0][0];
    expect(matchStage.$match.jobId).toBeInstanceOf(Types.ObjectId);
    expect(matchStage.$match.jobId.toString()).toBe(jobId);
  });
});
