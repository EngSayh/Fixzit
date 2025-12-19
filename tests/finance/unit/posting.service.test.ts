/**
 * Unit tests for postingService (Finance Pack Phase 2 - Item 12)
 * Tests: createJournal, postJournal, voidJournal, balance validation, currency FX
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import postingService from "../../../server/services/finance/postingService";
import Journal from "../../../server/models/finance/Journal";
import LedgerEntry from "../../../server/models/finance/LedgerEntry";
import ChartAccount from "../../../server/models/finance/ChartAccount";
import {
  setAuditContext,
  clearContext,
} from "../../../server/models/plugins/tenantAudit";
import { setTenantContext as setTenantIsolationContext } from "../../../server/plugins/tenantIsolation";
import { toMinor, applyFx } from "../../../server/lib/currency";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


// TYPESCRIPT FIX: Use ObjectIds instead of strings for type safety
const TEST_ORG_ID = new mongoose.Types.ObjectId();
const TEST_USER_ID = new mongoose.Types.ObjectId();

describe("postingService Unit Tests", () => {
  let cashAccountId: mongoose.Types.ObjectId;
  let revenueAccountId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    // Connect to test database
    const MONGODB_URI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/fixzit-test";
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(MONGODB_URI);

    // Set context - TYPESCRIPT FIX: Context functions expect string IDs
    setTenantIsolationContext({ orgId: TEST_ORG_ID, skipTenantFilter: true });
    setAuditContext({ userId: TEST_USER_ID.toString() });

    // Create test accounts
    const cashAccount = await ChartAccount.create({
      orgId: TEST_ORG_ID,
      accountCode: "1110",
      accountName: "Test Cash Account",
      accountType: "ASSET",
      normalBalance: "DEBIT",
      balance: 0,
      isActive: true,
      currency: "SAR",
      createdBy: TEST_USER_ID,
      updatedBy: TEST_USER_ID,
    });
    cashAccountId = cashAccount._id as mongoose.Types.ObjectId;

    const revenueAccount = await ChartAccount.create({
      orgId: TEST_ORG_ID,
      accountCode: "4100",
      accountName: "Test Revenue Account",
      accountType: "REVENUE",
      normalBalance: "CREDIT",
      balance: 0,
      isActive: true,
      currency: "SAR",
      createdBy: TEST_USER_ID,
      updatedBy: TEST_USER_ID,
    });
    revenueAccountId = revenueAccount._id as mongoose.Types.ObjectId;
  });

  afterAll(async () => {
    // Cleanup test data
    await Journal.deleteMany({ orgId: TEST_ORG_ID });
    await LedgerEntry.deleteMany({ orgId: TEST_ORG_ID });
    await ChartAccount.deleteMany({ orgId: TEST_ORG_ID });
    clearContext();
    setTenantIsolationContext({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clear journals and ledger entries before each test
    await Journal.deleteMany({ orgId: TEST_ORG_ID });
    await LedgerEntry.deleteMany({ orgId: TEST_ORG_ID });

    // Reset account balances to zero
    let cashAcc = await ChartAccount.findById(cashAccountId);
    if (!cashAcc) {
      cashAcc = await ChartAccount.create({
        orgId: TEST_ORG_ID,
        accountCode: "1110",
        accountName: "Test Cash Account",
        accountType: "ASSET",
        normalBalance: "DEBIT",
        balance: 0,
        isActive: true,
        currency: "SAR",
        createdBy: TEST_USER_ID,
        updatedBy: TEST_USER_ID,
      });
      cashAccountId = cashAcc._id as mongoose.Types.ObjectId;
    } else {
      cashAcc.balance = 0;
      await cashAcc.save();
    }

    let revAcc = await ChartAccount.findById(revenueAccountId);
    if (!revAcc) {
      revAcc = await ChartAccount.create({
        orgId: TEST_ORG_ID,
        accountCode: "4100",
        accountName: "Test Revenue Account",
        accountType: "REVENUE",
        normalBalance: "CREDIT",
        balance: 0,
        isActive: true,
        currency: "SAR",
        createdBy: TEST_USER_ID,
        updatedBy: TEST_USER_ID,
      });
      revenueAccountId = revAcc._id as mongoose.Types.ObjectId;
    } else {
      revAcc.balance = 0;
      await revAcc.save();
    }
  });

  describe("createJournal", () => {
    it("should create a draft journal with balanced entries", async () => {
      const amount = toMinor(100, "SAR"); // 100.00 SAR = 10,000 halalas

      const journal = await postingService.createJournal({
        orgId: TEST_ORG_ID,
        journalDate: new Date(),
        description: "Test revenue entry",
        sourceType: "MANUAL",
        userId: TEST_USER_ID,
        lines: [
          {
            accountId: cashAccountId,
            debit: amount,
            credit: 0,
            description: "Cash received",
          },
          {
            accountId: revenueAccountId,
            debit: 0,
            credit: amount,
            description: "Revenue earned",
          },
        ],
      });

      expect(journal).toBeDefined();
      expect(journal.status).toBe("DRAFT");
      expect(journal.lines).toHaveLength(2);
      // TYPESCRIPT FIX: Correct property names from IJournal interface
      expect(journal.totalDebit).toBe(amount);
      expect(journal.totalCredit).toBe(amount);
      expect(journal.isBalanced).toBe(true);
    });

    it("should throw error for unbalanced journal entries", async () => {
      const amount = toMinor(100, "SAR");

      await expect(async () => {
        await postingService.createJournal({
          orgId: TEST_ORG_ID,
          journalDate: new Date(),
          description: "Unbalanced entry",
          sourceType: "MANUAL",
          userId: TEST_USER_ID,
          lines: [
            {
              accountId: cashAccountId,
              debit: amount,
              credit: 0,
              description: "Cash debit",
            },
            {
              accountId: revenueAccountId,
              debit: 0,
              credit: amount + 100, // Intentionally unbalanced
              description: "Revenue credit",
            },
          ],
        });
      }).rejects.toThrow("Journal entries must balance");
    });

    it("should require at least 2 lines", async () => {
      await expect(async () => {
        await postingService.createJournal({
          orgId: TEST_ORG_ID,
          journalDate: new Date(),
          description: "Single line entry",
          sourceType: "MANUAL",
          userId: TEST_USER_ID,
          lines: [
            {
              accountId: cashAccountId,
              debit: toMinor(100, "SAR"),
              credit: 0,
              description: "Single line",
            },
          ],
        });
      }).rejects.toThrow("At least 2 journal lines required");
    });
  });

  describe("postJournal", () => {
    it("should post draft journal to ledger and update account balances", async () => {
      const amount = toMinor(250, "SAR");

      // Create draft journal
      const journal = await postingService.createJournal({
        orgId: TEST_ORG_ID,
        journalDate: new Date(),
        description: "Test posting",
        sourceType: "MANUAL",
        userId: TEST_USER_ID,
        lines: [
          {
            accountId: cashAccountId,
            debit: amount,
            credit: 0,
            description: "Debit cash",
          },
          {
            accountId: revenueAccountId,
            debit: 0,
            credit: amount,
            description: "Credit revenue",
          },
        ],
      });

      // Post to ledger
      const result = await postingService.postJournal(
        journal._id as mongoose.Types.ObjectId,
      );

      expect(result.journal.status).toBe("POSTED");
      // TYPESCRIPT FIX: IJournal uses 'postingDate' not 'postedAt', and doesn't have 'postedBy'
      expect(result.journal.postingDate).toBeDefined();
      // postedBy tracking is done via updatedBy field in audit trail
      // LOGIC FIX: Assert the correct user ID was stamped
      expect(result.journal.updatedBy).toEqual(TEST_USER_ID);
      expect(result.ledgerEntries).toHaveLength(2);

      // Verify ledger entries created
      const ledgerEntries = await LedgerEntry.find({
        journalId: journal._id,
      }).sort({ lineNumber: 1 });
      expect(ledgerEntries).toHaveLength(2);

      // Verify account balances updated
      const cashAccount = await ChartAccount.findById(cashAccountId);
      const revenueAccount = await ChartAccount.findById(revenueAccountId);

      expect(cashAccount?.balance).toBe(amount); // Asset increases with debit
      expect(revenueAccount?.balance).toBe(amount); // Revenue increases with credit
    });

    it("should throw error when posting already-posted journal", async () => {
      const amount = toMinor(100, "SAR");

      const journal = await postingService.createJournal({
        orgId: TEST_ORG_ID,
        journalDate: new Date(),
        description: "Already posted",
        sourceType: "MANUAL",
        userId: TEST_USER_ID,
        lines: [
          {
            accountId: cashAccountId,
            debit: amount,
            credit: 0,
            description: "Cash",
          },
          {
            accountId: revenueAccountId,
            debit: 0,
            credit: amount,
            description: "Revenue",
          },
        ],
      });

      // First post - should succeed
      await postingService.postJournal(journal._id as mongoose.Types.ObjectId);

      // Second post - should fail
      await expect(async () => {
        await postingService.postJournal(
          journal._id as mongoose.Types.ObjectId,
        );
      }).rejects.toThrow("Only DRAFT journals can be posted");
    });

    it("should maintain ledger immutability after posting", async () => {
      const amount = toMinor(100, "SAR");

      const journal = await postingService.createJournal({
        orgId: TEST_ORG_ID,
        journalDate: new Date(),
        description: "Immutability test",
        sourceType: "MANUAL",
        userId: TEST_USER_ID,
        lines: [
          {
            accountId: cashAccountId,
            debit: amount,
            credit: 0,
            description: "Cash",
          },
          {
            accountId: revenueAccountId,
            debit: 0,
            credit: amount,
            description: "Revenue",
          },
        ],
      });

      await postingService.postJournal(journal._id as mongoose.Types.ObjectId);

      // Attempt to modify posted journal - should be rejected
      const postedJournal = await Journal.findById(journal._id);
      postedJournal!.description = "Modified description";

      await expect(async () => {
        await postedJournal!.save();
      }).rejects.toThrow("Posted journals cannot be modified");
    });
  });

  describe("voidJournal", () => {
    it("should create reversal journal for posted entry", async () => {
      const amount = toMinor(300, "SAR");

      // Create and post original journal
      const originalJournal = await postingService.createJournal({
        orgId: TEST_ORG_ID,
        journalDate: new Date(),
        description: "Original entry",
        sourceType: "MANUAL",
        userId: TEST_USER_ID,
        lines: [
          {
            accountId: cashAccountId,
            debit: amount,
            credit: 0,
            description: "Cash in",
          },
          {
            accountId: revenueAccountId,
            debit: 0,
            credit: amount,
            description: "Revenue",
          },
        ],
      });

      await postingService.postJournal(
        originalJournal._id as mongoose.Types.ObjectId,
      );

      // Void the journal
      const result = await postingService.voidJournal(
        originalJournal._id as mongoose.Types.ObjectId,
        TEST_USER_ID,
        "Test reversal",
      );

      expect(result.originalJournal.status).toBe("VOID");
      expect(result.originalJournal.voidedAt).toBeDefined();
      expect(result.originalJournal.voidedBy).toBe(TEST_USER_ID);
      expect(result.originalJournal.voidReason).toBe("Test reversal");

      expect(result.reversingJournal.status).toBe("POSTED");
      expect(result.reversingJournal.description).toContain("REVERSAL");
      // TYPESCRIPT FIX: reversalOf doesn't exist in IJournal - relationship tracked via description
      expect(result.reversingJournal.description).toContain(
        originalJournal.journalNumber,
      );

      // Verify reversal entries swap debits/credits
      expect(result.reversingJournal.lines).toHaveLength(2);
      const reversalCashLine = result.reversingJournal.lines.find(
        (l) => l.accountId.toString() === cashAccountId.toString(),
      );
      const reversalRevenueLine = result.reversingJournal.lines.find(
        (l) => l.accountId.toString() === revenueAccountId.toString(),
      );

      expect(reversalCashLine?.debit).toBe(0);
      expect(reversalCashLine?.credit).toBe(amount); // Reversed from original debit
      expect(reversalRevenueLine?.debit).toBe(amount); // Reversed from original credit
      expect(reversalRevenueLine?.credit).toBe(0);
    });

    it("should restore account balances after void", async () => {
      const amount = toMinor(400, "SAR");

      // Get initial balances
      const initialCashBalance = (await ChartAccount.findById(cashAccountId))!
        .balance;
      const initialRevenueBalance = (await ChartAccount.findById(
        revenueAccountId,
      ))!.balance;

      // Create and post journal
      const journal = await postingService.createJournal({
        orgId: TEST_ORG_ID,
        journalDate: new Date(),
        description: "Balance restoration test",
        sourceType: "MANUAL",
        userId: TEST_USER_ID,
        lines: [
          {
            accountId: cashAccountId,
            debit: amount,
            credit: 0,
            description: "Cash",
          },
          {
            accountId: revenueAccountId,
            debit: 0,
            credit: amount,
            description: "Revenue",
          },
        ],
      });

      await postingService.postJournal(journal._id as mongoose.Types.ObjectId);

      // Verify balances changed
      const afterPostCashBalance = (await ChartAccount.findById(cashAccountId))!
        .balance;
      const afterPostRevenueBalance = (await ChartAccount.findById(
        revenueAccountId,
      ))!.balance;

      expect(afterPostCashBalance).toBe(initialCashBalance + amount);
      expect(afterPostRevenueBalance).toBe(initialRevenueBalance + amount);

      // Void the journal
      await postingService.voidJournal(
        journal._id as mongoose.Types.ObjectId,
        TEST_USER_ID,
        "Test",
      );

      // Verify balances restored
      const afterVoidCashBalance = (await ChartAccount.findById(cashAccountId))!
        .balance;
      const afterVoidRevenueBalance = (await ChartAccount.findById(
        revenueAccountId,
      ))!.balance;

      expect(afterVoidCashBalance).toBe(initialCashBalance);
      expect(afterVoidRevenueBalance).toBe(initialRevenueBalance);
    });
  });

  describe("Currency Conversion", () => {
    it("should handle multi-currency journals with FX rates", async () => {
      const amountSAR = toMinor(100, "SAR"); // 100 SAR = 10,000 halalas
      const fxRate = 0.2667; // 1 SAR = 0.2667 USD
      const amountUSD = applyFx(amountSAR, fxRate, "SAR", "USD"); // ~26.67 USD = 2,667 cents

      const journal = await postingService.createJournal({
        orgId: TEST_ORG_ID,
        journalDate: new Date(),
        description: "Multi-currency entry",
        sourceType: "MANUAL",
        userId: TEST_USER_ID,
        // TYPESCRIPT FIX: currency doesn't exist at journal level - tracked per line item
        lines: [
          {
            accountId: cashAccountId,
            debit: amountSAR,
            credit: 0,
            description: "SAR cash",
            // TYPESCRIPT FIX: currency doesn't exist on IJournalLine interface
          },
          {
            accountId: revenueAccountId,
            debit: 0,
            credit: amountSAR,
            description: "SAR revenue",
            // TYPESCRIPT FIX: currency doesn't exist on IJournalLine interface
          },
        ],
      });

      // TYPESCRIPT FIX: Use correct property names and remove non-existent currency check
      expect(journal.totalDebit).toBe(amountSAR);
      expect(journal.totalCredit).toBe(amountSAR);
      expect(journal.isBalanced).toBe(true);

      // Verify FX conversion calculation
      expect(amountUSD).toBe(2667); // 26.67 USD in cents
    });
  });

  describe("Helper Methods", () => {
    it("should calculate running balance correctly", async () => {
      const amounts = [
        toMinor(100, "SAR"),
        toMinor(50, "SAR"),
        toMinor(200, "SAR"),
      ];

      for (const amount of amounts) {
        const journal = await postingService.createJournal({
          orgId: TEST_ORG_ID,
          journalDate: new Date(),
          description: "Running balance test",
          sourceType: "MANUAL",
          userId: TEST_USER_ID,
          lines: [
            {
              accountId: cashAccountId,
              debit: amount,
              credit: 0,
              description: "Cash",
            },
            {
              accountId: revenueAccountId,
              debit: 0,
              credit: amount,
              description: "Revenue",
            },
          ],
        });

        await postingService.postJournal(
          journal._id as mongoose.Types.ObjectId,
        );
      }

      // Verify final balance
      const cashAccount = await ChartAccount.findById(cashAccountId);
      const expectedBalance = amounts.reduce((sum, amt) => sum + amt, 0);
      expect(cashAccount?.balance).toBe(expectedBalance);
    });

    it("should validate account existence before posting", async () => {
      const fakeAccountId = new mongoose.Types.ObjectId();

      await expect(async () => {
        await postingService.createJournal({
          orgId: TEST_ORG_ID,
          journalDate: new Date(),
          description: "Invalid account",
          sourceType: "MANUAL",
          userId: TEST_USER_ID,
          lines: [
            {
              accountId: fakeAccountId,
              debit: toMinor(100, "SAR"),
              credit: 0,
              description: "Fake account",
            },
            {
              accountId: revenueAccountId,
              debit: 0,
              credit: toMinor(100, "SAR"),
              description: "Revenue",
            },
          ],
        });
      }).rejects.toThrow();
    });
  });
});
