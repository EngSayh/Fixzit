/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/finance/reports/income-statement/route';

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
  },
}));

vi.mock('@/models/finance/JournalEntry', () => ({
  default: {
    aggregate: vi.fn(),
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

describe('Income Statement API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/finance/reports/income-statement', () => {
    it('should generate income statement for date range', async () => {
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      
      const mockResults = [
        {
          _id: 'revenue',
          accountType: 'revenue',
          total: 100000,
          accounts: [
            { accountCode: '4000', accountName: 'Sales Revenue', amount: 100000 },
          ],
        },
        {
          _id: 'expense',
          accountType: 'expense',
          total: 60000,
          accounts: [
            { accountCode: '5000', accountName: 'Cost of Goods Sold', amount: 40000 },
            { accountCode: '5100', accountName: 'Operating Expenses', amount: 20000 },
          ],
        },
      ];

      vi.mocked(JournalEntry.aggregate).mockResolvedValue(mockResults as any);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/income-statement?startDate=2024-01-01&endDate=2024-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.revenue).toBe(100000);
      expect(data.expenses).toBe(60000);
      expect(data.netIncome).toBe(40000);
      expect(data.sections).toHaveLength(2);
    });

    it('should require startDate and endDate', async () => {
      const request = new NextRequest('http://localhost/api/finance/reports/income-statement');
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('startDate');
    });

    it('should enforce tenant scope in aggregation', async () => {
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      
      vi.mocked(JournalEntry.aggregate).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/income-statement?startDate=2024-01-01&endDate=2024-12-31'
      );
      (request as any).auth = mockSession;

      await GET(request);

      expect(JournalEntry.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({ orgId: 'org-123' }),
          }),
        ])
      );
    });

    it('should handle zero revenue/expenses', async () => {
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      
      vi.mocked(JournalEntry.aggregate).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/income-statement?startDate=2024-01-01&endDate=2024-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.revenue).toBe(0);
      expect(data.expenses).toBe(0);
      expect(data.netIncome).toBe(0);
    });

    it('should support comparison periods', async () => {
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      
      vi.mocked(JournalEntry.aggregate).mockResolvedValue([
        { _id: 'revenue', accountType: 'revenue', total: 100000, accounts: [] },
        { _id: 'expense', accountType: 'expense', total: 60000, accounts: [] },
      ]);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/income-statement?startDate=2024-01-01&endDate=2024-12-31&compare=true&compareStartDate=2023-01-01&compareEndDate=2023-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.current).toBeDefined();
      expect(data.comparison).toBeDefined();
    });

    it('should validate date format', async () => {
      const request = new NextRequest(
        'http://localhost/api/finance/reports/income-statement?startDate=invalid&endDate=2024-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('should apply maxTimeMS to aggregation', async () => {
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      
      vi.mocked(JournalEntry.aggregate).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/income-statement?startDate=2024-01-01&endDate=2024-12-31'
      );
      (request as any).auth = mockSession;

      await GET(request);

      expect(JournalEntry.aggregate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ maxTimeMS: expect.any(Number) })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle aggregation errors', async () => {
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      
      vi.mocked(JournalEntry.aggregate).mockRejectedValue(new Error('Aggregation failed'));

      const request = new NextRequest(
        'http://localhost/api/finance/reports/income-statement?startDate=2024-01-01&endDate=2024-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(500);
    });
  });
});
