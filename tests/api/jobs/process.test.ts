import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

const mockAuth = vi.fn();
const mockClaimJob = vi.fn();
const mockCompleteJob = vi.fn();
const mockFailJob = vi.fn();
const mockRetryStuckJobs = vi.fn();
const mockGetStats = vi.fn();
const mockDeleteObject = vi.fn();
const mockSend = vi.fn();
const mockSetApiKey = vi.fn();

vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/jobs/queue', () => ({
  JobQueue: {
    claimJob: (...args: unknown[]) => mockClaimJob(...args),
    completeJob: (...args: unknown[]) => mockCompleteJob(...args),
    failJob: (...args: unknown[]) => mockFailJob(...args),
    retryStuckJobs: (...args: unknown[]) => mockRetryStuckJobs(...args),
    getStats: (...args: unknown[]) => mockGetStats(...args),
  },
}));

vi.mock('@/lib/storage/s3', () => ({
  deleteObject: (...args: unknown[]) => mockDeleteObject(...args),
}));

vi.mock('@/lib/sendgrid-config', () => ({
  getSendGridConfig: () => ({
    apiKey: 'sendgrid-key',
    from: { email: 'no-reply@test.local' },
  }),
}));

vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: (...args: unknown[]) => mockSetApiKey(...args),
    send: (...args: unknown[]) => mockSend(...args),
  },
}));

const buildRequest = (body: Record<string, unknown>) =>
  ({
    headers: new Headers(),
    json: async () => body,
  } as unknown as Request);

describe('/api/jobs/process POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } });
    mockClaimJob.mockReset();
    mockDeleteObject.mockReset();
    mockRetryStuckJobs.mockResolvedValue(0);
    mockGetStats.mockResolvedValue({ queued: 0, processing: 0, completed: 0, failed: 0, total: 0 });
    mockCompleteJob.mockResolvedValue(undefined);
    mockFailJob.mockResolvedValue(undefined);
    mockSend.mockResolvedValue(undefined);
    mockSetApiKey.mockReturnValue(undefined);
  });

  it('processes s3-cleanup jobs and marks success', async () => {
    const jobId = 'job-1';
    mockClaimJob.mockResolvedValueOnce({
      _id: { toString: () => jobId },
      type: 's3-cleanup',
      payload: { keys: ['a', 'b'] },
    });
    mockClaimJob.mockResolvedValueOnce(null);
    mockDeleteObject.mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/jobs/process/route');

    const res = await POST(buildRequest({ type: 's3-cleanup', maxJobs: 1 }) as any);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(200);
    expect(mockClaimJob).toHaveBeenCalled();
    expect(json.processed.success).toBe(1);
    expect(mockCompleteJob).toHaveBeenCalledWith(jobId);
    expect(mockFailJob).not.toHaveBeenCalled();
    expect(mockDeleteObject).toHaveBeenCalledTimes(2);
  });

  it('marks s3-cleanup job failed when deletion errors', async () => {
    const jobId = 'job-2';
    mockClaimJob
      .mockImplementationOnce(async () => ({
        _id: { toString: () => jobId },
        type: 's3-cleanup',
        payload: { keys: ['x'] },
      }))
      .mockImplementationOnce(async () => null);
    mockDeleteObject.mockRejectedValueOnce(new Error('boom'));

    const { POST } = await import('@/app/api/jobs/process/route');

    const res = await POST(buildRequest({ type: 's3-cleanup', maxJobs: 1 }) as any);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(200);
    expect(mockClaimJob).toHaveBeenCalled();
    expect(json.processed).toBeDefined();
    expect(json.processed.failed).toBe(1);
    expect(mockDeleteObject).toHaveBeenCalled();
    expect(mockFailJob).toHaveBeenCalledWith(jobId, expect.stringContaining('Failed to delete'));
    expect(mockCompleteJob).not.toHaveBeenCalled();
  });

  it('processes email invitations with jobId payload present', async () => {
    const jobId = 'job-email-1';
    mockClaimJob
      .mockImplementationOnce(async () => ({
        _id: { toString: () => jobId },
        type: 'email-invitation',
        payload: {
          inviteId: 'inv-123',
          email: 'user@test.local',
          firstName: 'Test',
          lastName: 'User',
          role: 'ADMIN',
        },
      }))
      .mockImplementationOnce(async () => null);

    const { POST } = await import('@/app/api/jobs/process/route');

    const res = await POST(buildRequest({ type: 'email-invitation', maxJobs: 1 }) as any);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(200);
    expect(mockClaimJob).toHaveBeenCalled();
    expect(json.processed).toBeDefined();
    expect(json.processed.success).toBe(1);
    expect(mockSetApiKey).toHaveBeenCalledWith('sendgrid-key');
    expect(mockSend).toHaveBeenCalled();
    expect(mockCompleteJob).toHaveBeenCalledWith(jobId);
  });
});
