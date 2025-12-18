/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/finance/payments/process/route';

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

vi.mock('@/models/finance/Payment', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/finance/Invoice', () => ({
  default: {
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('@/models/finance/JournalEntry', () => ({
  default: {
    create: vi.fn(),
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

describe('Finance Payment Processing API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/finance/payments/process', () => {
    it('should process payment and update invoice', async () => {
      const Payment = (await import('@/models/finance/Payment')).default;
      const Invoice = (await import('@/models/finance/Invoice')).default;
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      
      const mockInvoice = {
        _id: 'inv-1',
        invoiceNumber: 'INV-2024-001',
        total: 1150,
        amountPaid: 0,
        status: 'sent',
        orgId: 'org-123',
      };

      const mockPayment = {
        _id: 'payment-1',
        invoiceId: 'inv-1',
        amount: 1150,
        method: 'bank_transfer',
        status: 'completed',
        orgId: 'org-123',
      };

      vi.mocked(Invoice.findOne).mockResolvedValue(mockInvoice as any);
      vi.mocked(Payment.create).mockResolvedValue([mockPayment] as any);
      vi.mocked(Invoice.findByIdAndUpdate).mockResolvedValue({ ...mockInvoice, status: 'paid' } as any);
      vi.mocked(JournalEntry.create).mockResolvedValue([{}] as any);

      const request = new NextRequest('http://localhost/api/finance/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: 'inv-1',
          amount: 1150,
          method: 'bank_transfer',
          reference: 'TXN-123456',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.payment._id).toBe('payment-1');
      expect(data.invoice.status).toBe('paid');
    });

    it('should handle partial payments', async () => {
      const Payment = (await import('@/models/finance/Payment')).default;
      const Invoice = (await import('@/models/finance/Invoice')).default;
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      
      const mockInvoice = {
        _id: 'inv-1',
        total: 1150,
        amountPaid: 0,
        status: 'sent',
        orgId: 'org-123',
      };

      vi.mocked(Invoice.findOne).mockResolvedValue(mockInvoice as any);
      vi.mocked(Payment.create).mockResolvedValue([{ amount: 500 }] as any);
      vi.mocked(Invoice.findByIdAndUpdate).mockResolvedValue({
        ...mockInvoice,
        amountPaid: 500,
        status: 'partially_paid',
      } as any);
      vi.mocked(JournalEntry.create).mockResolvedValue([{}] as any);

      const request = new NextRequest('http://localhost/api/finance/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: 'inv-1',
          amount: 500,
          method: 'cash',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.invoice.status).toBe('partially_paid');
      expect(data.invoice.amountPaid).toBe(500);
    });

    it('should reject overpayment', async () => {
      const Invoice = (await import('@/models/finance/Invoice')).default;
      
      vi.mocked(Invoice.findOne).mockResolvedValue({
        _id: 'inv-1',
        total: 1150,
        amountPaid: 1000,
        orgId: 'org-123',
      } as any);

      const request = new NextRequest('http://localhost/api/finance/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: 'inv-1',
          amount: 500,
          method: 'cash',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('overpayment');
    });

    it('should reject payment for non-existent invoice', async () => {
      const Invoice = (await import('@/models/finance/Invoice')).default;
      
      vi.mocked(Invoice.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: 'non-existent',
          amount: 1150,
          method: 'cash',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it('should enforce tenant scope', async () => {
      const Invoice = (await import('@/models/finance/Invoice')).default;
      
      vi.mocked(Invoice.findOne).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/finance/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: 'inv-1',
          amount: 1150,
          method: 'cash',
        }),
      });
      (request as any).auth = mockSession;

      await POST(request);

      expect(Invoice.findOne).toHaveBeenCalledWith({
        _id: 'inv-1',
        orgId: 'org-123',
      });
    });

    it('should create journal entries for payment', async () => {
      const Payment = (await import('@/models/finance/Payment')).default;
      const Invoice = (await import('@/models/finance/Invoice')).default;
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      
      vi.mocked(Invoice.findOne).mockResolvedValue({
        _id: 'inv-1',
        total: 1150,
        amountPaid: 0,
        orgId: 'org-123',
      } as any);
      vi.mocked(Payment.create).mockResolvedValue([{}] as any);
      vi.mocked(Invoice.findByIdAndUpdate).mockResolvedValue({} as any);
      vi.mocked(JournalEntry.create).mockResolvedValue([{}] as any);

      const request = new NextRequest('http://localhost/api/finance/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: 'inv-1',
          amount: 1150,
          method: 'bank_transfer',
        }),
      });
      (request as any).auth = mockSession;

      await POST(request);

      expect(JournalEntry.create).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'payment',
            orgId: 'org-123',
          }),
        ]),
        expect.anything()
      );
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost/api/finance/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          // Missing invoiceId and amount
          method: 'cash',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should rollback on journal entry failure', async () => {
      const Payment = (await import('@/models/finance/Payment')).default;
      const Invoice = (await import('@/models/finance/Invoice')).default;
      const JournalEntry = (await import('@/models/finance/JournalEntry')).default;
      const mongoose = (await import('@/lib/db/mongoose')).default;
      
      const mockMongooseSession = {
        startTransaction: vi.fn(),
        abortTransaction: vi.fn(),
        endSession: vi.fn(),
      };

      vi.mocked(mongoose.startSession).mockResolvedValue(mockMongooseSession as any);
      vi.mocked(Invoice.findOne).mockResolvedValue({
        _id: 'inv-1',
        total: 1150,
        amountPaid: 0,
        orgId: 'org-123',
      } as any);
      vi.mocked(Payment.create).mockResolvedValue([{}] as any);
      vi.mocked(Invoice.findByIdAndUpdate).mockResolvedValue({} as any);
      vi.mocked(JournalEntry.create).mockRejectedValue(new Error('Journal entry failed'));

      const request = new NextRequest('http://localhost/api/finance/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: 'inv-1',
          amount: 1150,
          method: 'cash',
        }),
      });
      (request as any).auth = mockSession;

      const response = await POST(request);
      expect(response.status).toBe(500);
      expect(mockMongooseSession.abortTransaction).toHaveBeenCalled();
    });
  });
});
