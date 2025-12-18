/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH } from '@/app/api/finance/accounts/route';

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
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
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

describe('Finance Accounts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/finance/accounts', () => {
    it('should list accounts with pagination', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            _id: 'account-1',
            code: '1000',
            name: 'Cash',
            type: 'asset',
            category: 'current_asset',
            balance: 50000,
            orgId: 'org-123',
          },
        ]),
      } as any);

      vi.mocked(Account.countDocuments).mockResolvedValue(1);

      const request = new NextRequest('http://localhost/api/finance/accounts?page=1&limit=20');
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.accounts).toHaveLength(1);
      expect(data.accounts[0].code).toBe('1000');
      expect(data.pagination.total).toBe(1);
    });

    it('should filter accounts by type', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      } as any);

      vi.mocked(Account.countDocuments).mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/finance/accounts?type=asset');
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(200);

      expect(Account.find).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'asset' })
      );
    });

    it('should enforce tenant scope', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      } as any);

      const request = new NextRequest('http://localhost/api/finance/accounts');
      (request as any).auth = mockSession;

      await GET(request);

      expect(Account.find).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org-123' })
      );
    });
  });

  describe('POST /api/finance/accounts', () => {
    it('should create new account with valid data', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      const newAccount = {
        _id: 'account-new',
        code: '1100',
        name: 'Petty Cash',
        type: 'asset',
        category: 'current_asset',
        balance: 5000,
        orgId: 'org-123',
      };

      vi.mocked(Account.findOne).mockResolvedValue(null);
      vi.mocked(Account.create).mockResolvedValue(newAccount as any);

      const request = new NextRequest('http://localhost/api/finance/accounts', {
        method: 'POST',
        body: JSON.stringify({
          code: '1100',
          name: 'Petty Cash',
          type: 'asset',
          category: 'current_asset',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.account.code).toBe('1100');
      expect(data.account.name).toBe('Petty Cash');
    });

    it('should reject duplicate account code', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.findOne).mockResolvedValue({ code: '1000' } as any);

      const request = new NextRequest('http://localhost/api/finance/accounts', {
        method: 'POST',
        body: JSON.stringify({
          code: '1000',
          name: 'Cash',
          type: 'asset',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost/api/finance/accounts', {
        method: 'POST',
        body: JSON.stringify({
          code: '1200',
          // Missing name and type
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should inject orgId from session', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.findOne).mockResolvedValue(null);
      vi.mocked(Account.create).mockResolvedValue({ _id: 'new' } as any);

      const request = new NextRequest('http://localhost/api/finance/accounts', {
        method: 'POST',
        body: JSON.stringify({
          code: '1300',
          name: 'Bank Account',
          type: 'asset',
        }),
      });
      (request as any).auth = mockSession;

      await POST(request);

      expect(Account.create).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org-123' })
      );
    });
  });

  describe('PATCH /api/finance/accounts', () => {
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

      const request = new NextRequest('http://localhost/api/finance/accounts', {
        method: 'PATCH',
        body: JSON.stringify({
          id: 'account-1',
          name: 'Cash - Updated',
        }),
      });
      (request as any).auth = mockSession;

      const response = await PATCH(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.account.name).toBe('Cash - Updated');
    });

    it('should return 404 for non-existent account', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.findByIdAndUpdate).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/accounts', {
        method: 'PATCH',
        body: JSON.stringify({
          id: 'non-existent',
          name: 'Updated Name',
        }),
      });
      (request as any).auth = mockSession;

      const response = await PATCH(request);
      expect(response.status).toBe(404);
    });

    it('should enforce tenant scope on update', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.findByIdAndUpdate).mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/finance/accounts', {
        method: 'PATCH',
        body: JSON.stringify({
          id: 'account-1',
          name: 'Updated',
        }),
      });
      (request as any).auth = mockSession;

      await PATCH(request);

      expect(Account.findByIdAndUpdate).toHaveBeenCalledWith(
        'account-1',
        expect.anything(),
        expect.objectContaining({
          runValidators: true,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const Account = (await import('@/models/finance/Account')).default;
      
      vi.mocked(Account.find).mockRejectedValue(new Error('DB connection failed'));

      const request = new NextRequest('http://localhost/api/finance/accounts');
      (request as any).auth = mockSession;

      const response = await GET(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
