import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { postingService } from "@/server/services/finance/postingService";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock models
vi.mock("@/server/models/finance/Journal", () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock("@/server/models/finance/LedgerEntry", () => ({
  default: {
    insertMany: vi.fn(),
    find: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
    getAccountBalance: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("@/server/models/finance/ChartAccount", () => ({
  default: {
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock("@/server/lib/numbering", () => ({
  nextNumber: vi.fn().mockResolvedValue("JE-0001"),
}));

describe("postingService", () => {
  const orgId = new Types.ObjectId();
  const userId = new Types.ObjectId();
  const accountId1 = new Types.ObjectId();
  const accountId2 = new Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe("createJournal", () => {
    it("should create a draft journal with balanced entries", async () => {
      const JournalModel = (await import("@/server/models/finance/Journal"))
        .default;
      const ChartAccountModel = (
        await import("@/server/models/finance/ChartAccount")
      ).default;

      const accounts = [
        {
          _id: accountId1,
          orgId,
          isActive: true,
          accountCode: "1000",
          accountName: "Cash",
          accountType: "ASSET",
        },
        {
          _id: accountId2,
          orgId,
          isActive: true,
          accountCode: "2000",
          accountName: "Payable",
          accountType: "LIABILITY",
        },
      ];

      vi.mocked(ChartAccountModel.find).mockResolvedValue(accounts as never);

      vi.mocked(JournalModel.create).mockResolvedValue({
        _id: new Types.ObjectId(),
        journalNumber: "JE-0001",
        status: "DRAFT",
        lines: [
          { accountId: accountId1, debit: 500, credit: 0 },
          { accountId: accountId2, debit: 0, credit: 500 },
        ],
      } as never);

      const result = await postingService.createJournal({
        orgId,
        journalDate: new Date(),
        description: "Test journal",
        sourceType: "MANUAL",
        lines: [
          { accountId: accountId1, debit: 500, credit: 0 },
          { accountId: accountId2, debit: 0, credit: 500 },
        ],
        userId,
      });

      expect(JournalModel.create).toHaveBeenCalled();
      expect(result.status).toBe("DRAFT");
    });

    it("should reject unbalanced journal entries", async () => {
      await expect(
        postingService.createJournal({
          orgId,
          journalDate: new Date(),
          description: "Unbalanced",
          sourceType: "MANUAL",
          lines: [
            { accountId: accountId1, debit: 500, credit: 0 },
            { accountId: accountId2, debit: 0, credit: 400 },
          ],
          userId,
        })
      ).rejects.toThrow("Journal entries must balance");
    });

    it("should require at least 2 journal lines", async () => {
      await expect(
        postingService.createJournal({
          orgId,
          journalDate: new Date(),
          description: "Single line",
          sourceType: "MANUAL",
          lines: [{ accountId: accountId1, debit: 100, credit: 0 }],
          userId,
        })
      ).rejects.toThrow("At least 2 journal lines required");
    });
  });

  describe("postJournal", () => {
    it("should post journal and create ledger entries", async () => {
      const JournalModel = (await import("@/server/models/finance/Journal"))
        .default;
      const LedgerEntryModel = (
        await import("@/server/models/finance/LedgerEntry")
      ).default;
      const ChartAccountModel = (
        await import("@/server/models/finance/ChartAccount")
      ).default;

      const journalDoc = {
        _id: new Types.ObjectId(),
        status: "DRAFT",
        isBalanced: true,
        orgId,
        journalNumber: "JE-0001",
        journalDate: new Date(),
        fiscalYear: 2025,
        fiscalPeriod: 1,
        createdBy: userId,
        updatedBy: userId,
        lines: [
          {
            accountId: accountId1,
            accountCode: "1000",
            accountName: "Cash",
            debit: 500,
            credit: 0,
          },
          {
            accountId: accountId2,
            accountCode: "2000",
            accountName: "Payable",
            debit: 0,
            credit: 500,
          },
        ],
        save: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(JournalModel.findById).mockResolvedValue(journalDoc as never);
      vi.mocked(ChartAccountModel.find).mockReturnValue({
        session: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          {
            _id: accountId1,
            orgId,
            accountType: "ASSET",
            accountCode: "1000",
            accountName: "Cash",
            balance: 0,
            save: vi.fn().mockResolvedValue(undefined),
          },
          {
            _id: accountId2,
            orgId,
            accountType: "LIABILITY",
            accountCode: "2000",
            accountName: "Payable",
            balance: 0,
            save: vi.fn().mockResolvedValue(undefined),
          },
        ]),
      } as never);

      vi.mocked(LedgerEntryModel.create).mockResolvedValue({} as never);

      const result = await postingService.postJournal(journalDoc._id);
      expect(result.journal.status).toBe("POSTED");
      expect(result.ledgerEntries.length).toBeGreaterThan(0);
    });

    it("should reject posting already-posted journal", async () => {
      const JournalModel = (await import("@/server/models/finance/Journal"))
        .default;
      vi.mocked(JournalModel.findById).mockResolvedValue({
        _id: new Types.ObjectId(),
        status: "POSTED",
        isBalanced: true,
      } as never);

      await expect(postingService.postJournal(new Types.ObjectId())).rejects.toThrow(
        "Only DRAFT journals can be posted"
      );
    });

    it("should reject when journal is missing", async () => {
      const JournalModel = (await import("@/server/models/finance/Journal"))
        .default;
      vi.mocked(JournalModel.findById).mockResolvedValue(null as never);

      await expect(postingService.postJournal(new Types.ObjectId())).rejects.toThrow(
        "Journal entry not found"
      );
    });
  });

  describe("voidJournal", () => {
    it("should reject voiding when journal not found", async () => {
      const JournalModel = (await import("@/server/models/finance/Journal"))
        .default;
      vi.mocked(JournalModel.findById).mockResolvedValue(null as never);

      await expect(
        postingService.voidJournal(new Types.ObjectId(), userId, "Mistake")
      ).rejects.toThrow("Journal entry not found");
    });

    it("should reject voiding when journal is not posted", async () => {
      const JournalModel = (await import("@/server/models/finance/Journal"))
        .default;
      vi.mocked(JournalModel.findById).mockResolvedValue({
        _id: new Types.ObjectId(),
        status: "DRAFT",
      } as never);

      await expect(
        postingService.voidJournal(new Types.ObjectId(), userId, "Mistake")
      ).rejects.toThrow("Only posted journals can be voided");
    });
  });
});
