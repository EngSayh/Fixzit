/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/finance/reports/balance-sheet/route';

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

vi.mock('@/models/finance/Account', () => ({
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

describe('Balance Sheet API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/finance/reports/balance-sheet', () => {
    it('should generate balance sheet for specific date', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      const mockResults = [
        {
          _id: 'asset',
          type: 'asset',
          total: 200000,
          accounts: [
            { code: '1000', name: 'Cash', balance: 50000 },
            { code: '1200', name: 'Accounts Receivable', balance: 150000 },
          ],
        },
        {
          _id: 'liability',
          type: 'liability',
          total: 80000,
          accounts: [
            { code: '2000', name: 'Accounts Payable', balance: 80000 },
          ],
        },
        {
          _id: 'equity',
          type: 'equity',
          total: 120000,
          accounts: [
            { code: '3000', name: 'Owner Equity', balance: 120000 },
          ],
        },
      ];

      vi.mocked(Account.aggregate).mockResolvedValue(mockResults as any);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/balance-sheet?date=2024-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.assets).toBe(200000);
      expect(data.liabilities).toBe(80000);
      expect(data.equity).toBe(120000);
      expect(data.assets).toBe(data.liabilities + data.equity);
    });

    it('should default to current date if no date provided', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.aggregate).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/finance/reports/balance-sheet');
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      expect(Account.aggregate).toHaveBeenCalled();
    });

    it('should enforce tenant scope in aggregation', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.aggregate).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/balance-sheet?date=2024-12-31'
      );
      (request as any).auth = mockSession;

      await GET(request);

      expect(Account.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({ orgId: 'org-123' }),
          }),
        ])
      );
    });

    it('should calculate accounting equation balance', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      const mockResults = [
        { _id: 'asset', type: 'asset', total: 200000, accounts: [] },
        { _id: 'liability', type: 'liability', total: 80000, accounts: [] },
        { _id: 'equity', type: 'equity', total: 120000, accounts: [] },
      ];

      vi.mocked(Account.aggregate).mockResolvedValue(mockResults as any);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/balance-sheet?date=2024-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.balanced).toBe(true);
      expect(Math.abs(data.assets - (data.liabilities + data.equity))).toBeLessThan(0.01);
    });

    it('should categorize assets as current/non-current', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      const mockResults = [
        {
          _id: 'asset',
          type: 'asset',
          total: 200000,
          accounts: [
            { code: '1000', name: 'Cash', category: 'current_asset', balance: 50000 },
            { code: '1500', name: 'Equipment', category: 'fixed_asset', balance: 150000 },
          ],
        },
      ];

      vi.mocked(Account.aggregate).mockResolvedValue(mockResults as any);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/balance-sheet?date=2024-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.currentAssets).toBeDefined();
      expect(data.nonCurrentAssets).toBeDefined();
    });

    it('should support comparison with previous period', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.aggregate).mockResolvedValue([
        { _id: 'asset', type: 'asset', total: 200000, accounts: [] },
      ]);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/balance-sheet?date=2024-12-31&compare=true&compareDate=2023-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.current).toBeDefined();
      expect(data.comparison).toBeDefined();
    });

    it('should apply maxTimeMS to aggregation', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.aggregate).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/balance-sheet?date=2024-12-31'
      );
      (request as any).auth = mockSession;

      await GET(request);

      expect(Account.aggregate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ maxTimeMS: expect.any(Number) })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle aggregation errors', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.aggregate).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest(
        'http://localhost/api/finance/reports/balance-sheet?date=2024-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(500);
    });

    it('should validate date format', async () => {
      const request = new NextRequest(
        'http://localhost/api/finance/reports/balance-sheet?date=invalid-date'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(400);
    });
  });
});
