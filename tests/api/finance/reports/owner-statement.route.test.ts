/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/finance/reports/owner-statement/route';

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

vi.mock('@/models/finance/OwnerStatement', () => ({
  default: {
    aggregate: vi.fn(),
    findOne: vi.fn(),
  },
}));

const mockSession = {
  user: {
    id: 'user-123',
    email: 'owner@fixzit.com',
    role: 'property_owner',
    orgId: 'org-123',
  },
};

describe('Owner Statement API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/finance/reports/owner-statement', () => {
    it('should generate owner statement with rental income and expenses', async () => {
      const OwnerStatement = (await import('@/models/finance/OwnerStatement')).default;
      
      const mockResults = [
        {
          _id: 'owner-1',
          propertyOwnerId: 'owner-1',
          period: '2024-12',
          rentalIncome: 50000,
          expenses: 15000,
          netIncome: 35000,
          properties: [
            {
              propertyId: 'prop-1',
              propertyName: 'Villa 101',
              rentalIncome: 30000,
              expenses: 8000,
              netIncome: 22000,
            },
            {
              propertyId: 'prop-2',
              propertyName: 'Apartment 205',
              rentalIncome: 20000,
              expenses: 7000,
              netIncome: 13000,
            },
          ],
        },
      ];

      vi.mocked(OwnerStatement.aggregate).mockResolvedValue(mockResults as any);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/owner-statement?ownerId=owner-1&startDate=2024-01-01&endDate=2024-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.totalRentalIncome).toBe(50000);
      expect(data.totalExpenses).toBe(15000);
      expect(data.netIncome).toBe(35000);
      expect(data.properties).toHaveLength(2);
    });

    it('should require ownerId, startDate, and endDate', async () => {
      const request = new NextRequest('http://localhost/api/finance/reports/owner-statement');
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it('should enforce tenant scope (property_owner_id)', async () => {
      const OwnerStatement = (await import('@/models/finance/OwnerStatement')).default;
      
      vi.mocked(OwnerStatement.aggregate).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/owner-statement?ownerId=owner-1&startDate=2024-01-01&endDate=2024-12-31'
      );
      (request as any).auth = mockSession;

      await GET(request);

      expect(OwnerStatement.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              property_owner_id: 'owner-1',
              orgId: 'org-123',
            }),
          }),
        ])
      );
    });

    it('should break down expenses by category', async () => {
      const OwnerStatement = (await import('@/models/finance/OwnerStatement')).default;
      
      const mockResults = [
        {
          _id: 'owner-1',
          rentalIncome: 50000,
          expenses: 15000,
          expenseBreakdown: [
            { category: 'maintenance', amount: 8000 },
            { category: 'utilities', amount: 3000 },
            { category: 'management_fee', amount: 4000 },
          ],
          netIncome: 35000,
          properties: [],
        },
      ];

      vi.mocked(OwnerStatement.aggregate).mockResolvedValue(mockResults as any);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/owner-statement?ownerId=owner-1&startDate=2024-01-01&endDate=2024-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.expenseBreakdown).toBeDefined();
      expect(data.expenseBreakdown).toHaveLength(3);
    });

    it('should support monthly breakdown', async () => {
      const OwnerStatement = (await import('@/models/finance/OwnerStatement')).default;
      
      const mockResults = [
        {
          month: '2024-01',
          rentalIncome: 5000,
          expenses: 1500,
          netIncome: 3500,
        },
        {
          month: '2024-02',
          rentalIncome: 5000,
          expenses: 1200,
          netIncome: 3800,
        },
      ];

      vi.mocked(OwnerStatement.aggregate).mockResolvedValue(mockResults as any);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/owner-statement?ownerId=owner-1&startDate=2024-01-01&endDate=2024-12-31&breakdown=monthly'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.monthly).toBeDefined();
      expect(data.monthly).toHaveLength(2);
    });

    it('should calculate payment due to owner', async () => {
      const OwnerStatement = (await import('@/models/finance/OwnerStatement')).default;
      
      const mockResults = [
        {
          _id: 'owner-1',
          rentalIncome: 50000,
          expenses: 15000,
          netIncome: 35000,
          previousBalance: 5000,
          paymentsMade: 30000,
          currentBalance: 10000,
          properties: [],
        },
      ];

      vi.mocked(OwnerStatement.aggregate).mockResolvedValue(mockResults as any);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/owner-statement?ownerId=owner-1&startDate=2024-01-01&endDate=2024-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.amountDue).toBe(10000);
      expect(data.previousBalance).toBe(5000);
      expect(data.paymentsMade).toBe(30000);
    });

    it('should apply maxTimeMS to aggregation', async () => {
      const OwnerStatement = (await import('@/models/finance/OwnerStatement')).default;
      
      vi.mocked(OwnerStatement.aggregate).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost/api/finance/reports/owner-statement?ownerId=owner-1&startDate=2024-01-01&endDate=2024-12-31'
      );
      (request as any).auth = mockSession;

      await GET(request);

      expect(OwnerStatement.aggregate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ maxTimeMS: expect.any(Number) })
      );
    });

    it('should validate date range (max 1 year)', async () => {
      const request = new NextRequest(
        'http://localhost/api/finance/reports/owner-statement?ownerId=owner-1&startDate=2022-01-01&endDate=2024-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('range');
    });
  });

  describe('Error handling', () => {
    it('should handle aggregation errors', async () => {
      const OwnerStatement = (await import('@/models/finance/OwnerStatement')).default;
      
      vi.mocked(OwnerStatement.aggregate).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest(
        'http://localhost/api/finance/reports/owner-statement?ownerId=owner-1&startDate=2024-01-01&endDate=2024-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(500);
    });

    it('should validate date format', async () => {
      const request = new NextRequest(
        'http://localhost/api/finance/reports/owner-statement?ownerId=owner-1&startDate=invalid&endDate=2024-12-31'
      );
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(400);
    });
  });
});
