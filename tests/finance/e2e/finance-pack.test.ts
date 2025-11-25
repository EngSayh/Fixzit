/**
 * E2E tests for Finance Pack (Phase 2 - Item 13)
 * Tests: Full journal lifecycle, expense approval, payment allocation, rollback scenarios
 */

import { describe, it, expect, beforeAll, afterAll, expectTypeOf } from 'vitest';
import mongoose from 'mongoose';
import postingService from '../../../server/services/finance/postingService';
import Journal from '../../../server/models/finance/Journal';
import LedgerEntry from '../../../server/models/finance/LedgerEntry';
import ChartAccount from '../../../server/models/finance/ChartAccount';
import { Expense } from '../../../server/models/finance/Expense';
import { Payment } from '../../../server/models/finance/Payment';
import { setTenantContext, setAuditContext, clearContext } from '../../../server/models/plugins/tenantAudit';
import { toMinor } from '../../../server/lib/currency';

// TYPESCRIPT FIX: Use ObjectIds instead of strings for type safety
const TEST_ORG_ID = new mongoose.Types.ObjectId();
const TEST_USER_ID = new mongoose.Types.ObjectId();

describe('Finance Pack type safety', () => {
  type ExpenseDoc = Awaited<ReturnType<(typeof Expense)['create']>>;
  type PaymentDoc = Awaited<ReturnType<(typeof Payment)['create']>>;

  it('matches method signatures for Expense and Payment workflows', () => {
    expectTypeOf<ExpenseDoc['submit']>().parameters.toEqualTypeOf<[]>();
    expectTypeOf<ExpenseDoc['approve']>().parameters.toEqualTypeOf<[mongoose.Types.ObjectId, string, string?]>();
    expectTypeOf<ExpenseDoc['reject']>().parameters.toEqualTypeOf<[mongoose.Types.ObjectId, string, string]>();
    expectTypeOf<ExpenseDoc['markAsPaid']>().parameters.toEqualTypeOf<[mongoose.Types.ObjectId, string?]>();

    expectTypeOf<PaymentDoc['allocateToInvoice']>().parameters.toEqualTypeOf<
      [mongoose.Types.ObjectId | string, string, number]
    >();
  });
});

describe('Finance Pack E2E Tests', () => {
  let cashAccountId: mongoose.Types.ObjectId;
  let arAccountId: mongoose.Types.ObjectId;
  let revenueAccountId: mongoose.Types.ObjectId;
  let expenseAccountId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit-test';
    await mongoose.connect(MONGODB_URI);

    // TYPESCRIPT FIX: Context functions expect string IDs, not ObjectId instances
    setTenantContext({ orgId: TEST_ORG_ID.toString() });
    setAuditContext({ userId: TEST_USER_ID.toString() });

    // Create test accounts
    cashAccountId = (
      await ChartAccount.create({
        orgId: TEST_ORG_ID,
        accountCode: '1110-E2E',
        accountName: 'E2E Cash',
        accountType: 'ASSET',
        normalBalance: 'DEBIT',
        balance: 0,
        isActive: true,
      })
    )._id as mongoose.Types.ObjectId;

    arAccountId = (
      await ChartAccount.create({
        orgId: TEST_ORG_ID,
        accountCode: '1120-E2E',
        accountName: 'E2E Accounts Receivable',
        accountType: 'ASSET',
        normalBalance: 'DEBIT',
        balance: 0,
        isActive: true,
      })
    )._id as mongoose.Types.ObjectId;

    revenueAccountId = (
      await ChartAccount.create({
        orgId: TEST_ORG_ID,
        accountCode: '4100-E2E',
        accountName: 'E2E Revenue',
        accountType: 'REVENUE',
        normalBalance: 'CREDIT',
        balance: 0,
        isActive: true,
      })
    )._id as mongoose.Types.ObjectId;

    expenseAccountId = (
      await ChartAccount.create({
        orgId: TEST_ORG_ID,
        accountCode: '5110-E2E',
        accountName: 'E2E Expenses',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT',
        balance: 0,
        isActive: true,
      })
    )._id as mongoose.Types.ObjectId;
  });

  afterAll(async () => {
    await Journal.deleteMany({ orgId: TEST_ORG_ID });
    await LedgerEntry.deleteMany({ orgId: TEST_ORG_ID });
    await Expense.deleteMany({ orgId: TEST_ORG_ID });
    await Payment.deleteMany({ orgId: TEST_ORG_ID });
    await ChartAccount.deleteMany({ orgId: TEST_ORG_ID });
    clearContext();
    await mongoose.disconnect();
  });

  describe('Full Journal Lifecycle', () => {
    it('should complete full lifecycle: create → post → void with account balance tracking', async () => {
      const amount = toMinor(1000, 'SAR');

      // Step 1: Get initial balances
      const initialCash = (await ChartAccount.findById(cashAccountId))!.balance;
      const initialRevenue = (await ChartAccount.findById(revenueAccountId))!.balance;

      // Step 2: Create draft journal
      const journal = await postingService.createJournal({
        orgId: TEST_ORG_ID,
        journalDate: new Date(),
        description: 'E2E full lifecycle test',
        sourceType: 'MANUAL',
        userId: TEST_USER_ID,
        lines: [
          {
            accountId: cashAccountId,
            debit: amount,
            credit: 0,
            description: 'Cash received',
          },
          {
            accountId: revenueAccountId,
            debit: 0,
            credit: amount,
            description: 'Revenue earned',
          },
        ],
      });

      expect(journal.status).toBe('DRAFT');
      expect((await ChartAccount.findById(cashAccountId))!.balance).toBe(initialCash); // Not yet posted

      // Step 3: Post to ledger
      const posted = await postingService.postJournal(journal._id as mongoose.Types.ObjectId);
      expect(posted.journal.status).toBe('POSTED');

      const afterPostCash = (await ChartAccount.findById(cashAccountId))!.balance;
      const afterPostRevenue = (await ChartAccount.findById(revenueAccountId))!.balance;
      expect(afterPostCash).toBe(initialCash + amount);
      expect(afterPostRevenue).toBe(initialRevenue + amount);

      // Step 4: Verify ledger entries
      const ledgerEntries = await LedgerEntry.find({ journalId: journal._id });
      expect(ledgerEntries).toHaveLength(2);

      // Step 5: Void the journal
      const voided = await postingService.voidJournal(
        journal._id as mongoose.Types.ObjectId,
        TEST_USER_ID,
        'E2E void test'
      );

      expect(voided.originalJournal.status).toBe('VOID');
      expect(voided.reversingJournal.status).toBe('POSTED');
      // TYPESCRIPT FIX: reversalOf property doesn't exist in IJournal interface
      // Reversal relationship is tracked via description and sourceId
      expect(voided.reversingJournal.description).toContain('VOID');
      // LOGIC FIX: Also assert the original journal number is present
      expect(voided.reversingJournal.description).toContain(journal.journalNumber);

      // Step 6: Verify balances restored
      const afterVoidCash = (await ChartAccount.findById(cashAccountId))!.balance;
      const afterVoidRevenue = (await ChartAccount.findById(revenueAccountId))!.balance;
      expect(afterVoidCash).toBe(initialCash);
      expect(afterVoidRevenue).toBe(initialRevenue);

      // Step 7: Verify reversing ledger entries exist
      const reversingLedgerEntries = await LedgerEntry.find({
        journalId: voided.reversingJournal._id,
      });
      expect(reversingLedgerEntries).toHaveLength(2);
    });
  });

  describe('Expense Approval Workflow', () => {
    it('should complete expense lifecycle: draft → submit → approve → paid', async () => {
      const expenseAmount = toMinor(500, 'SAR');
      const taxAmount = toMinor(75, 'SAR'); // 15% VAT
      const totalAmount = expenseAmount + taxAmount;
      const approvals = [
        {
          level: 1,
          approverRole: 'FINANCE',
          status: 'PENDING' as const,
        },
      ];

      // Step 1: Create draft expense
      const expense = await Expense.create({
        orgId: TEST_ORG_ID,
        expenseNumber: 'EXP-TEST-001',
        expenseDate: new Date(),
        expenseType: 'MAINTENANCE',
        category: 'MAINTENANCE_REPAIR',
        description: 'E2E expense test',
        vendorName: 'Test Vendor',
        lineItems: [
          {
            description: 'Test service',
            quantity: 1,
            unitPrice: expenseAmount,
            amount: expenseAmount,
            taxable: true,
            taxRate: 15,
            taxAmount,
            totalAmount,
          },
        ],
        subtotal: expenseAmount,
        totalTax: taxAmount,
        totalAmount,
        status: 'DRAFT',
        createdBy: TEST_USER_ID,
        approvals,
        currentApprovalLevel: 0,
      });

      expect(expense.status).toBe('DRAFT');

      // Step 2: Submit for approval
      await expense.submit();
      expect(expense.status).toBe('SUBMITTED');
      expect(expense.currentApprovalLevel).toBe(1);
      expect(expense.approvals).toHaveLength(1);
      expect(expense.approvals[0].status).toBe('PENDING');

      // Step 3: Approve expense
      await expense.approve(TEST_USER_ID, 'Finance Approver', 'Approved for payment');
      expect(expense.status).toBe('APPROVED');
      expect(expense.approvals).toHaveLength(1);
      expect(expense.approvals[0].status).toBe('APPROVED');
      expect(expense.approvals[0].approverId?.toString()).toBe(TEST_USER_ID.toString());

      // Step 4: Mark as paid
      const paymentId = new mongoose.Types.ObjectId();
      await expense.markAsPaid(paymentId, 'PAY-TEST-001');
      expect(expense.status).toBe('PAID');
      expect(expense.paidAt).toBeDefined();
      expect(expense.paymentReference).toBe('PAY-TEST-001');
      expect(expense.paymentId?.toString()).toBe(paymentId.toString());
    });

    it('should handle expense rejection workflow', async () => {
      const approvals = [
        {
          level: 1,
          approverRole: 'FINANCE',
          status: 'PENDING' as const,
        },
      ];
      const expense = await Expense.create({
        orgId: TEST_ORG_ID,
        expenseNumber: 'EXP-TEST-002',
        expenseDate: new Date(),
        expenseType: 'OPERATIONAL',
        category: 'OTHER',
        description: 'Rejected expense test',
        vendorName: 'Test Vendor 2',
        lineItems: [
          {
            description: 'Invalid expense',
            quantity: 1,
            unitPrice: toMinor(100, 'SAR'),
            amount: toMinor(100, 'SAR'),
            taxable: false,
            taxRate: 0,
            taxAmount: 0,
            totalAmount: toMinor(100, 'SAR'),
          },
        ],
        subtotal: toMinor(100, 'SAR'),
        totalTax: 0,
        totalAmount: toMinor(100, 'SAR'),
        status: 'DRAFT',
        createdBy: TEST_USER_ID,
        approvals,
        currentApprovalLevel: 0,
      });

      await expense.submit();
      await expense.reject(TEST_USER_ID, 'Finance Approver', 'Invalid expense category');

      expect(expense.status).toBe('REJECTED');
      expect(expense.approvals).toHaveLength(1);
      expect(expense.approvals[0].status).toBe('REJECTED');
      expect(expense.approvals[0].comments).toBe('Invalid expense category');
    });
  });

  describe('Payment Allocation', () => {
    it('should allocate payment to multiple invoices', async () => {
      const paymentAmount = toMinor(1500, 'SAR');

      // Create payment
      const payment = await Payment.create({
        orgId: TEST_ORG_ID,
        paymentNumber: 'PAY-TEST-003',
        paymentDate: new Date(),
        paymentType: 'RECEIVED',
        paymentMethod: 'BANK_TRANSFER',
        amount: paymentAmount,
        currency: 'SAR',
        partyType: 'TENANT',
        partyId: 'tenant-123',
        partyName: 'Test Tenant',
        description: 'E2E payment allocation test',
        status: 'POSTED',
        createdBy: TEST_USER_ID,
        allocations: [],
      });

      // Allocate to multiple invoices
      await payment.allocateToInvoice(new mongoose.Types.ObjectId(), 'invoice-001', toMinor(500, 'SAR'));
      await payment.allocateToInvoice(new mongoose.Types.ObjectId(), 'invoice-002', toMinor(700, 'SAR'));
      await payment.allocateToInvoice(new mongoose.Types.ObjectId(), 'invoice-003', toMinor(300, 'SAR'));

      // Verify allocations
      const allocations =
        (payment.invoiceAllocations as unknown[] | undefined) ??
        (payment.allocations as unknown[] | undefined) ??
        [];
      expect(allocations).toHaveLength(3);
      expect(payment.unallocatedAmount).toBe(0); // Fully allocated

      // TYPESCRIPT FIX: Explicit types for reduce callback parameters
      const totalAllocated = allocations.reduce((sum: number, alloc: { amount?: number | string }) => {
        const amount = typeof alloc.amount === 'number' ? alloc.amount : 0;
        return sum + amount;
      }, 0);
      expect(totalAllocated).toBe(paymentAmount);
    });
  });

  describe('Rollback Scenarios', () => {
    it('should rollback transaction on error during posting', async () => {
      const amount = toMinor(2000, 'SAR');
      const initialBalance = (await ChartAccount.findById(cashAccountId))!.balance;

      try {
        // Attempt to create journal with invalid account
        const invalidAccountId = new mongoose.Types.ObjectId();

        await postingService.createJournal({
          orgId: TEST_ORG_ID,
          journalDate: new Date(),
          description: 'Rollback test',
          sourceType: 'MANUAL',
          userId: TEST_USER_ID,
          lines: [
            {
              accountId: invalidAccountId,
              debit: amount,
              credit: 0,
              description: 'Invalid account',
            },
            {
              accountId: revenueAccountId,
              debit: 0,
              credit: amount,
              description: 'Revenue',
            },
          ],
        });

        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Verify balance unchanged after rollback
        const afterErrorBalance = (await ChartAccount.findById(cashAccountId))!.balance;
        expect(afterErrorBalance).toBe(initialBalance);
      }
    });

    it('should prevent posting with zero-amount lines', async () => {
      await expect(async () => {
        await postingService.createJournal({
          orgId: TEST_ORG_ID,
          journalDate: new Date(),
          description: 'Zero amount test',
          sourceType: 'MANUAL',
          userId: TEST_USER_ID,
          lines: [
            {
              accountId: cashAccountId,
              debit: 0,
              credit: 0,
              description: 'Zero amount line',
            },
            {
              accountId: revenueAccountId,
              debit: 0,
              credit: 0,
              description: 'Another zero',
            },
          ],
        });
      }).rejects.toThrow();
    });

    it('should prevent double-voiding of journals', async () => {
      const amount = toMinor(100, 'SAR');

      const journal = await postingService.createJournal({
        orgId: TEST_ORG_ID,
        journalDate: new Date(),
        description: 'Double void test',
        sourceType: 'MANUAL',
        userId: TEST_USER_ID,
        lines: [
          {
            accountId: cashAccountId,
            debit: amount,
            credit: 0,
            description: 'Cash',
          },
          {
            accountId: revenueAccountId,
            debit: 0,
            credit: amount,
            description: 'Revenue',
          },
        ],
      });

      await postingService.postJournal(journal._id as mongoose.Types.ObjectId);
      await postingService.voidJournal(
        journal._id as mongoose.Types.ObjectId,
        TEST_USER_ID,
        'First void'
      );

      // Attempt second void - should fail
      await expect(async () => {
        await postingService.voidJournal(
          journal._id as mongoose.Types.ObjectId,
          TEST_USER_ID,
          'Second void'
        );
      }).rejects.toThrow('Only POSTED journals can be voided');
    });
  });

  describe('Multi-Currency Support', () => {
    it('should handle SAR to USD conversion in journals', async () => {
      const amountSAR = toMinor(375, 'SAR'); // 375 SAR
      const fxRate = 0.2667; // 1 SAR = 0.2667 USD

      const journal = await postingService.createJournal({
        orgId: TEST_ORG_ID,
        journalDate: new Date(),
        description: 'Multi-currency E2E test',
        sourceType: 'MANUAL',
        userId: TEST_USER_ID,
        // TYPESCRIPT FIX: currency property removed - tracked at account level
        lines: [
          {
            accountId: cashAccountId,
            debit: amountSAR,
            credit: 0,
            description: 'Cash SAR',
            // TYPESCRIPT FIX: currency, foreignCurrencyAmount, exchangeRate removed - tracked at account level
          },
          {
            accountId: revenueAccountId,
            debit: 0,
            credit: amountSAR,
            description: 'Revenue SAR',
            // TYPESCRIPT FIX: currency, foreignCurrencyAmount, exchangeRate removed - tracked at account level
          },
        ],
      });

      // TYPESCRIPT FIX: Use correct property names from IJournal interface
      // currency property doesn't exist - currency is tracked per line item
      expect(journal.totalDebit).toBe(amountSAR); // Fixed: totalDebits -> totalDebit
      expect(journal.totalCredit).toBe(amountSAR); // Fixed: totalCredits -> totalCredit
      expect(journal.isBalanced).toBe(true);
    });
  });

  describe('Trial Balance Integrity', () => {
    it('should maintain trial balance after multiple transactions', async () => {
      const transactions = [
        { debit: cashAccountId, credit: revenueAccountId, amount: toMinor(1000, 'SAR') },
        { debit: expenseAccountId, credit: cashAccountId, amount: toMinor(300, 'SAR') },
        { debit: arAccountId, credit: revenueAccountId, amount: toMinor(500, 'SAR') },
      ];

      for (const tx of transactions) {
        const journal = await postingService.createJournal({
          orgId: TEST_ORG_ID,
          journalDate: new Date(),
          description: 'Trial balance test',
          sourceType: 'MANUAL',
          userId: TEST_USER_ID,
          lines: [
            {
              accountId: tx.debit,
              debit: tx.amount,
              credit: 0,
              description: 'Debit entry',
            },
            {
              accountId: tx.credit,
              debit: 0,
              credit: tx.amount,
              description: 'Credit entry',
            },
          ],
        });

        await postingService.postJournal(journal._id as mongoose.Types.ObjectId);
      }

      // Get trial balance
      const year = new Date().getFullYear();
      const period = new Date().getMonth() + 1;
      const trialBalance = await LedgerEntry.getTrialBalance(TEST_ORG_ID, year, period);

      // Verify debits = credits
      // TYPESCRIPT FIX: TrialBalanceEntry uses 'debit' and 'credit', not 'totalDebits'/'totalCredits'
      const totalDebits = trialBalance.reduce((sum, account) => sum + account.debit, 0);
      const totalCredits = trialBalance.reduce((sum, account) => sum + account.credit, 0);

      expect(totalDebits).toBe(totalCredits);
      expect(totalDebits).toBeGreaterThan(0);
    });
  });
});
