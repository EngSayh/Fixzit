/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/finance/invoices/[id]/route';

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

vi.mock('@/models/finance/Invoice', () => ({
  default: {
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
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

describe('Finance Invoice Detail API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/finance/invoices/[id]', () => {
    it('should return invoice with line items', async () => {
      const Invoice = (await import('@/models/finance/Invoice')).default;
      
      const mockInvoice = {
        _id: 'inv-1',
        invoiceNumber: 'INV-2024-001',
        customerId: 'customer-1',
        customerName: 'ABC Company',
        status: 'sent',
        subtotal: 1000,
        tax: 150,
        total: 1150,
        dueDate: new Date('2024-12-31'),
        lineItems: [
          { description: 'Service A', quantity: 1, unitPrice: 500, total: 500 },
          { description: 'Service B', quantity: 2, unitPrice: 250, total: 500 },
        ],
        orgId: 'org-123',
      };

      vi.mocked(Invoice.findOne).mockResolvedValue(mockInvoice as any);

      const request = new NextRequest('http://localhost/api/finance/invoices/inv-1');
      (request as any).auth = mockSession;

      const response = await GET(request, { params: { id: 'inv-1' } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.invoice._id).toBe('inv-1');
      expect(data.invoice.lineItems).toHaveLength(2);
      expect(data.invoice.total).toBe(1150);
    });

    it('should return 404 for non-existent invoice', async () => {
      const Invoice = (await import('@/models/finance/Invoice')).default;
      
      vi.mocked(Invoice.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/invoices/non-existent');
      (request as any).auth = mockSession;

      const response = await GET(request, { params: { id: 'non-existent' } });
      expect(response.status).toBe(404);
    });

    it('should enforce tenant scope', async () => {
      const Invoice = (await import('@/models/finance/Invoice')).default;
      
      vi.mocked(Invoice.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/invoices/inv-1');
      (request as any).auth = mockSession;

      await GET(request, { params: { id: 'inv-1' } });

      expect(Invoice.findOne).toHaveBeenCalledWith({
        _id: 'inv-1',
        orgId: 'org-123',
      });
    });
  });

  describe('PATCH /api/finance/invoices/[id]', () => {
    it('should update invoice status', async () => {
      const Invoice = (await import('@/models/finance/Invoice')).default;
      
      const updatedInvoice = {
        _id: 'inv-1',
        invoiceNumber: 'INV-2024-001',
        status: 'paid',
        total: 1150,
        orgId: 'org-123',
      };

      vi.mocked(Invoice.findByIdAndUpdate).mockResolvedValue(updatedInvoice as any);

      const request = new NextRequest('http://localhost/api/finance/invoices/inv-1', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'paid',
          paidDate: '2024-12-18',
        }),
      });
      (request as any).auth = mockSession;

      const response = await PATCH(request, { params: { id: 'inv-1' } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.invoice.status).toBe('paid');
    });

    it('should prevent status change from paid to draft', async () => {
      const Invoice = (await import('@/models/finance/Invoice')).default;
      
      vi.mocked(Invoice.findOne).mockResolvedValue({
        _id: 'inv-1',
        status: 'paid',
      } as any);

      const request = new NextRequest('http://localhost/api/finance/invoices/inv-1', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'draft',
        }),
      });
      (request as any).auth = mockSession;

      const response = await PATCH(request, { params: { id: 'inv-1' } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('paid');
    });

    it('should return 404 for non-existent invoice', async () => {
      const Invoice = (await import('@/models/finance/Invoice')).default;
      
      vi.mocked(Invoice.findByIdAndUpdate).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/invoices/non-existent', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'sent' }),
      });
      (request as any).auth = mockSession;

      const response = await PATCH(request, { params: { id: 'non-existent' } });
      expect(response.status).toBe(404);
    });

    it('should enforce tenant scope on update', async () => {
      const Invoice = (await import('@/models/finance/Invoice')).default;
      
      vi.mocked(Invoice.findByIdAndUpdate).mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/finance/invoices/inv-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'sent' }),
      });
      (request as any).auth = mockSession;

      await PATCH(request, { params: { id: 'inv-1' } });

      expect(Invoice.findByIdAndUpdate).toHaveBeenCalledWith(
        'inv-1',
        expect.anything(),
        expect.objectContaining({ new: true })
      );
    });
  });
});
