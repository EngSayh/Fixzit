/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/finance/expenses/[id]/route';

// Mock dependencies
vi.mock('@/lib/auth/authGuard', () => ({
  withAuth: (handler: any) => handler,
}));

vi.mock('@/lib/auth/rbacGuard', () => ({
  enforceRole: () => (handler: any) => handler,
}));

vi.mock('@/lib/db/mongoose', () => ({
  default: {
    connection: { readyState: 1 },
  },
}));

vi.mock('@/models/finance/Expense', () => ({
  default: {
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
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

describe('Finance Expense Detail API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/finance/expenses/[id]', () => {
    it('should return expense with attachments', async () => {
      const Expense = (await import('@/models/finance/Expense')).default;
      
      const mockExpense = {
        _id: 'exp-1',
        expenseNumber: 'EXP-2024-001',
        vendorId: 'vendor-1',
        vendorName: 'Office Supplies Co',
        category: 'office_supplies',
        amount: 250,
        date: new Date('2024-12-15'),
        description: 'Office supplies purchase',
        status: 'approved',
        attachments: ['receipt-1.pdf', 'invoice-1.pdf'],
        orgId: 'org-123',
      };

      vi.mocked(Expense.findOne).mockResolvedValue(mockExpense as any);

      const request = new NextRequest('http://localhost/api/finance/expenses/exp-1');
      (request as any).auth = mockSession;

      const response = await GET(request, { params: { id: 'exp-1' } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.expense._id).toBe('exp-1');
      expect(data.expense.amount).toBe(250);
      expect(data.expense.attachments).toHaveLength(2);
    });

    it('should return 404 for non-existent expense', async () => {
      const Expense = (await import('@/models/finance/Expense')).default;
      
      vi.mocked(Expense.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/expenses/non-existent');
      (request as any).auth = mockSession;

      const response = await GET(request, { params: { id: 'non-existent' } });
      expect(response.status).toBe(404);
    });

    it('should enforce tenant scope', async () => {
      const Expense = (await import('@/models/finance/Expense')).default;
      
      vi.mocked(Expense.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/expenses/exp-1');
      (request as any).auth = mockSession;

      await GET(request, { params: { id: 'exp-1' } });

      expect(Expense.findOne).toHaveBeenCalledWith({
        _id: 'exp-1',
        orgId: 'org-123',
      });
    });
  });

  describe('PATCH /api/finance/expenses/[id]', () => {
    it('should update expense successfully', async () => {
      const Expense = (await import('@/models/finance/Expense')).default;
      
      const updatedExpense = {
        _id: 'exp-1',
        expenseNumber: 'EXP-2024-001',
        status: 'approved',
        amount: 250,
        orgId: 'org-123',
      };

      vi.mocked(Expense.findByIdAndUpdate).mockResolvedValue(updatedExpense as any);

      const request = new NextRequest('http://localhost/api/finance/expenses/exp-1', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'approved',
          approvedBy: 'user-123',
        }),
      });
      (request as any).auth = mockSession;

      const response = await PATCH(request, { params: { id: 'exp-1' } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.expense.status).toBe('approved');
    });

    it('should prevent amount changes on approved expenses', async () => {
      const Expense = (await import('@/models/finance/Expense')).default;
      
      vi.mocked(Expense.findOne).mockResolvedValue({
        _id: 'exp-1',
        status: 'approved',
      } as any);

      const request = new NextRequest('http://localhost/api/finance/expenses/exp-1', {
        method: 'PATCH',
        body: JSON.stringify({
          amount: 300,
        }),
      });
      (request as any).auth = mockSession;

      const response = await PATCH(request, { params: { id: 'exp-1' } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('approved');
    });

    it('should return 404 for non-existent expense', async () => {
      const Expense = (await import('@/models/finance/Expense')).default;
      
      vi.mocked(Expense.findByIdAndUpdate).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/expenses/non-existent', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      });
      (request as any).auth = mockSession;

      const response = await PATCH(request, { params: { id: 'non-existent' } });
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/finance/expenses/[id]', () => {
    it('should delete draft expense', async () => {
      const Expense = (await import('@/models/finance/Expense')).default;
      
      vi.mocked(Expense.findOne).mockResolvedValue({
        _id: 'exp-1',
        status: 'draft',
        orgId: 'org-123',
      } as any);

      vi.mocked(Expense.findByIdAndDelete).mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/finance/expenses/exp-1', {
        method: 'DELETE',
      });
      (request as any).auth = mockSession;

      const response = await DELETE(request, { params: { id: 'exp-1' } });
      expect(response.status).toBe(200);
    });

    it('should prevent deletion of approved expenses', async () => {
      const Expense = (await import('@/models/finance/Expense')).default;
      
      vi.mocked(Expense.findOne).mockResolvedValue({
        _id: 'exp-1',
        status: 'approved',
      } as any);

      const request = new NextRequest('http://localhost/api/finance/expenses/exp-1', {
        method: 'DELETE',
      });
      (request as any).auth = mockSession;

      const response = await DELETE(request, { params: { id: 'exp-1' } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('approved');
    });

    it('should return 404 for non-existent expense', async () => {
      const Expense = (await import('@/models/finance/Expense')).default;
      
      vi.mocked(Expense.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/expenses/non-existent', {
        method: 'DELETE',
      });
      (request as any).auth = mockSession;

      const response = await DELETE(request, { params: { id: 'non-existent' } });
      expect(response.status).toBe(404);
    });

    it('should enforce tenant scope on delete', async () => {
      const Expense = (await import('@/models/finance/Expense')).default;
      
      vi.mocked(Expense.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/expenses/exp-1', {
        method: 'DELETE',
      });
      (request as any).auth = mockSession;

      await DELETE(request, { params: { id: 'exp-1' } });

      expect(Expense.findOne).toHaveBeenCalledWith({
        _id: 'exp-1',
        orgId: 'org-123',
      });
    });
  });
});
