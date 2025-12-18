/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/finance/journals/post/route';

// Mock dependencies
vi.mock('@/lib/auth/authGuard', () => ({
  withAuth: (handler: any) => handler,
}));

vi.mock('@/lib/auth/rbacGuard', () => ({
  enforceRole: () => (handler: any) => handler,
}));

vi.mock('@/lib/api/rate-limit', () => ({
  enforceRateLimit: () => Promise.resolve({ allowed: true }),
}));

vi.mock('@/lib/db/mongoose', () => ({
  default: {
    connection: { readyState: 1 },
    startSession: vi.fn(() => ({
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    })),
  },
}));

vi.mock('@/models/finance/JournalEntry', () => ({
  default: {
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('@/models/finance/Account', () => ({
  default: {
    bulkWrite: vi.fn(),
    findOne: vi.fn(),
  },
}));

const mockSession = {
  user: {
    id: 'user-123',
    email: 'accountant@fixzit.com',
    role: 'finance_manager',
    orgId: 'org-123',
  },
};

describe('Finance Journal Posting API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/finance/journals/post', () => {
    it('should post journal entry and update account balances', async () => {
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      const Account = (await import('@/models/finance/Account')).default;
      
      const mockJournalEntry = {
        _id: 'journal-1',
        entryNumber: 'JE-2024-001',
        status: 'draft',
        lines: [
          { accountCode: '1000', accountName: 'Cash', debit: 1000, credit: 0 },
          { accountCode: '4000', accountName: 'Revenue', debit: 0, credit: 1000 },
        ],
        totalDebits: 1000,
        totalCredits: 1000,
        orgId: 'org-123',
      };

      vi.mocked(JournalEntry.findOne).mockResolvedValue(mockJournalEntry as any);
      vi.mocked(JournalEntry.findByIdAndUpdate).mockResolvedValue({
        ...mockJournalEntry,
        status: 'posted',
      } as any);
      vi.mocked(Account.bulkWrite).mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/finance/journals/post', {
        method: 'POST',
        body: JSON.stringify({
          journalId: 'journal-1',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.journalEntry.status).toBe('posted');
      expect(Account.bulkWrite).toHaveBeenCalled();
    });

    it('should reject unbalanced journal entries', async () => {
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      
      vi.mocked(JournalEntry.findOne).mockResolvedValue({
        _id: 'journal-1',
        status: 'draft',
        lines: [
          { accountCode: '1000', debit: 1000, credit: 0 },
          { accountCode: '4000', debit: 0, credit: 500 }, // Unbalanced!
        ],
        totalDebits: 1000,
        totalCredits: 500,
        orgId: 'org-123',
      } as any);

      const request = new NextRequest('http://localhost/api/finance/journals/post', {
        method: 'POST',
        body: JSON.stringify({
          journalId: 'journal-1',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('balanced');
    });

    it('should reject already posted journals', async () => {
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      
      vi.mocked(JournalEntry.findOne).mockResolvedValue({
        _id: 'journal-1',
        status: 'posted',
        orgId: 'org-123',
      } as any);

      const request = new NextRequest('http://localhost/api/finance/journals/post', {
        method: 'POST',
        body: JSON.stringify({
          journalId: 'journal-1',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('already posted');
    });

    it('should return 404 for non-existent journal', async () => {
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      
      vi.mocked(JournalEntry.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/journals/post', {
        method: 'POST',
        body: JSON.stringify({
          journalId: 'non-existent',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it('should enforce tenant scope', async () => {
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      
      vi.mocked(JournalEntry.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/journals/post', {
        method: 'POST',
        body: JSON.stringify({
          journalId: 'journal-1',
        }),
      });
      (request as any).auth = mockSession;

      await POST(request);

      expect(JournalEntry.findOne).toHaveBeenCalledWith({
        _id: 'journal-1',
        orgId: 'org-123',
      });
    });

    it('should update account balances correctly', async () => {
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      const Account = (await import('@/models/finance/Account')).default;
      
      const mockJournalEntry = {
        _id: 'journal-1',
        status: 'draft',
        lines: [
          { accountCode: '1000', debit: 1000, credit: 0 },
          { accountCode: '4000', debit: 0, credit: 1000 },
        ],
        totalDebits: 1000,
        totalCredits: 1000,
        orgId: 'org-123',
      };

      vi.mocked(JournalEntry.findOne).mockResolvedValue(mockJournalEntry as any);
      vi.mocked(JournalEntry.findByIdAndUpdate).mockResolvedValue({} as any);
      vi.mocked(Account.bulkWrite).mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/finance/journals/post', {
        method: 'POST',
        body: JSON.stringify({
          journalId: 'journal-1',
        }),
      });
      (request as any).auth = mockSession;

      await POST(request);

      expect(Account.bulkWrite).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            updateOne: expect.objectContaining({
              filter: expect.objectContaining({
                code: '1000',
                orgId: 'org-123',
              }),
            }),
          }),
        ]),
        expect.anything()
      );
    });

    it('should rollback on account update failure', async () => {
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      const Account = (await import('@/models/finance/Account')).default;
      const mongoose = (await import('@/lib/db/mongoose')).default;
      
      const mockMongooseSession = {
        startTransaction: vi.fn(),
        abortTransaction: vi.fn(),
        endSession: vi.fn(),
      };

      vi.mocked(mongoose.startSession).mockResolvedValue(mockMongooseSession as any);
      vi.mocked(JournalEntry.findOne).mockResolvedValue({
        _id: 'journal-1',
        status: 'draft',
        lines: [
          { accountCode: '1000', debit: 1000, credit: 0 },
          { accountCode: '4000', debit: 0, credit: 1000 },
        ],
        totalDebits: 1000,
        totalCredits: 1000,
        orgId: 'org-123',
      } as any);
      vi.mocked(JournalEntry.findByIdAndUpdate).mockResolvedValue({} as any);
      vi.mocked(Account.bulkWrite).mockRejectedValue(new Error('Account update failed'));

      const request = new NextRequest('http://localhost/api/finance/journals/post', {
        method: 'POST',
        body: JSON.stringify({
          journalId: 'journal-1',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(500);
      expect(mockMongooseSession.abortTransaction).toHaveBeenCalled();
    });

    it('should set posting date and user', async () => {
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(JournalEntry.findOne).mockResolvedValue({
        _id: 'journal-1',
        status: 'draft',
        lines: [
          { accountCode: '1000', debit: 1000, credit: 0 },
          { accountCode: '4000', debit: 0, credit: 1000 },
        ],
        totalDebits: 1000,
        totalCredits: 1000,
        orgId: 'org-123',
      } as any);
      vi.mocked(JournalEntry.findByIdAndUpdate).mockResolvedValue({} as any);
      vi.mocked(Account.bulkWrite).mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/finance/journals/post', {
        method: 'POST',
        body: JSON.stringify({
          journalId: 'journal-1',
        }),
      });
      (request as any).auth = mockSession;

      await POST(request);

      expect(JournalEntry.findByIdAndUpdate).toHaveBeenCalledWith(
        'journal-1',
        expect.objectContaining({
          status: 'posted',
          postedBy: 'user-123',
          postedAt: expect.any(Date),
        }),
        expect.anything()
      );
    });
  });
});
