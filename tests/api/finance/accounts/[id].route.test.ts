/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/finance/accounts/[id]/route';

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

vi.mock('@/models/finance/Account', () => ({
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

describe('Finance Account Detail API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/finance/accounts/[id]', () => {
    it('should return account details', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      const mockAccount = {
        _id: 'account-1',
        code: '1000',
        name: 'Cash',
        type: 'asset',
        category: 'current_asset',
        balance: 50000,
        orgId: 'org-123',
        createdAt: new Date(),
      };

      vi.mocked(Account.findOne).mockResolvedValue(mockAccount as any);

      const request = new NextRequest('http://localhost/api/finance/accounts/account-1');
      (request as any).auth = mockSession;

      const response = await GET(request, { params: { id: 'account-1' } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.account._id).toBe('account-1');
      expect(data.account.code).toBe('1000');
    });

    it('should return 404 for non-existent account', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/accounts/non-existent');
      (request as any).auth = mockSession;

      const response = await GET(request, { params: { id: 'non-existent' } });
      expect(response.status).toBe(404);
    });

    it('should enforce tenant scope', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/accounts/account-1');
      (request as any).auth = mockSession;

      await GET(request, { params: { id: 'account-1' } });

      expect(Account.findOne).toHaveBeenCalledWith({
        _id: 'account-1',
        orgId: 'org-123',
      });
    });
  });

  describe('PATCH /api/finance/accounts/[id]', () => {
    it('should update account successfully', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      const updatedAccount = {
        _id: 'account-1',
        code: '1000',
        name: 'Cash - Updated',
        type: 'asset',
        orgId: 'org-123',
      };

      vi.mocked(Account.findByIdAndUpdate).mockResolvedValue(updatedAccount as any);

      const request = new NextRequest('http://localhost/api/finance/accounts/account-1', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Cash - Updated',
          description: 'Main cash account',
        }),
      });
      (request as any).auth = mockSession;

      const response = await PATCH(request, { params: { id: 'account-1' } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.account.name).toBe('Cash - Updated');
    });

    it('should prevent code updates on active accounts', async () => {
      const request = new NextRequest('http://localhost/api/finance/accounts/account-1', {
        method: 'PATCH',
        body: JSON.stringify({
          code: '1001', // Attempting to change code
        }),
      });
      (request as any).auth = mockSession;

      const response = await PATCH(request, { params: { id: 'account-1' } });
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent account', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.findByIdAndUpdate).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/accounts/non-existent', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      });
      (request as any).auth = mockSession;

      const response = await PATCH(request, { params: { id: 'non-existent' } });
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/finance/accounts/[id]', () => {
    it('should delete account successfully', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.findOne).mockResolvedValue({
        _id: 'account-1',
        balance: 0,
        orgId: 'org-123',
      } as any);

      vi.mocked(Account.findByIdAndDelete).mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/finance/accounts/account-1', {
        method: 'DELETE',
      });
      (request as any).auth = mockSession;

      const response = await DELETE(request, { params: { id: 'account-1' } });
      expect(response.status).toBe(200);
    });

    it('should prevent deletion of accounts with balance', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.findOne).mockResolvedValue({
        _id: 'account-1',
        balance: 5000,
        orgId: 'org-123',
      } as any);

      const request = new NextRequest('http://localhost/api/finance/accounts/account-1', {
        method: 'DELETE',
      });
      (request as any).auth = mockSession;

      const response = await DELETE(request, { params: { id: 'account-1' } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('balance');
    });

    it('should return 404 for non-existent account', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/accounts/non-existent', {
        method: 'DELETE',
      });
      (request as any).auth = mockSession;

      const response = await DELETE(request, { params: { id: 'non-existent' } });
      expect(response.status).toBe(404);
    });

    it('should enforce tenant scope on delete', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/accounts/account-1', {
        method: 'DELETE',
      });
      (request as any).auth = mockSession;

      await DELETE(request, { params: { id: 'account-1' } });

      expect(Account.findOne).toHaveBeenCalledWith({
        _id: 'account-1',
        orgId: 'org-123',
      });
    });
  });
});
