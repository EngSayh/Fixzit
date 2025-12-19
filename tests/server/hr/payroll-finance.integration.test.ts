import { describe, it, expect, beforeEach, vi } from "vitest";
import { Types } from "mongoose";
import { PayrollRun } from "@/server/models/hr.models";

const findOneMock = vi.hoisted(() => vi.fn());
vi.mock("@/server/models/finance/ChartAccount", () => ({
  __esModule: true,
  default: { findOne: findOneMock },
}));

const createJournalMock = vi.hoisted(() => vi.fn());
const postJournalMock = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/finance/postingService", () => ({
  __esModule: true,
  default: {
    createJournal: createJournalMock,
    postJournal: postJournalMock,
  },
}));

import { PayrollFinanceIntegration } from "@/server/services/hr/payroll-finance.integration";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("PayrollFinanceIntegration", () => {
  const orgId = new Types.ObjectId();

  beforeEach(() => {
    vi.restoreAllMocks();
    findOneMock.mockReset();
    createJournalMock.mockReset();
    postJournalMock.mockReset();
  });

  it("creates a balanced journal entry and marks the payroll run as posted", async () => {
    const accounts = {
      "5200": {
        _id: new Types.ObjectId(),
        accountCode: "5200",
        accountType: "EXPENSE",
      },
      "2100": {
        _id: new Types.ObjectId(),
        accountCode: "2100",
        accountType: "LIABILITY",
      },
      "2101": {
        _id: new Types.ObjectId(),
        accountCode: "2101",
        accountType: "LIABILITY",
      },
      "2105": {
        _id: new Types.ObjectId(),
        accountCode: "2105",
        accountType: "LIABILITY",
      },
      "1010": {
        _id: new Types.ObjectId(),
        accountCode: "1010",
        accountType: "ASSET",
      },
    };

    findOneMock.mockImplementation(
      ({ accountCode }: { accountCode: keyof typeof accounts }) => ({
        lean: vi.fn().mockResolvedValue(accounts[accountCode]),
      }),
    );

    const journalId = new Types.ObjectId();
    createJournalMock.mockResolvedValue({
      _id: journalId,
      journalNumber: "JE-2025-001",
    });
    postJournalMock.mockResolvedValue(undefined);

    const updateExecMock = vi.fn().mockResolvedValue({});
    const updateOneSpy = vi
      .spyOn(PayrollRun, "updateOne")
      .mockReturnValue({ exec: updateExecMock } as any);

    const run = {
      _id: new Types.ObjectId(),
      orgId,
      name: "Payroll Oct-2025",
      periodStart: new Date("2025-10-01"),
      periodEnd: new Date("2025-10-31"),
      status: "LOCKED",
      financePosted: false,
      lines: [
        {
          employeeId: new Types.ObjectId(),
          employeeCode: "EMP-1",
          employeeName: "Alice",
          baseSalary: 1000,
          allowances: 200,
          overtimeAmount: 100,
          deductions: 100,
          gosiContribution: 30,
          gosiBreakdown: {
            annuitiesEmployee: 20,
            sanedEmployee: 10,
            annuitiesEmployer: 25,
            sanedEmployer: 5,
            occupationalHazards: 5,
          },
          netPay: 1200,
        },
      ],
      totals: {
        baseSalary: 1000,
        allowances: 200,
        overtime: 100,
        deductions: 100,
        gosi: 30,
        net: 1200,
      },
    } as any;

    await PayrollFinanceIntegration.postRun(run);

    expect(createJournalMock).toHaveBeenCalledTimes(1);
    const journalInput = createJournalMock.mock.calls[0][0];
    expect(journalInput.lines).toEqual([
      expect.objectContaining({
        accountId: accounts["5200"]._id,
        debit: 1335,
        credit: 0,
      }),
      expect.objectContaining({
        accountId: accounts["2100"]._id,
        debit: 0,
        credit: 30,
      }),
      expect.objectContaining({
        accountId: accounts["2101"]._id,
        debit: 0,
        credit: 35,
      }),
      expect.objectContaining({
        accountId: accounts["2105"]._id,
        debit: 0,
        credit: 70,
      }),
      expect.objectContaining({
        accountId: accounts["1010"]._id,
        debit: 0,
        credit: 1200,
      }),
    ]);

    expect(postJournalMock).toHaveBeenCalledWith(journalId);
    expect(updateOneSpy).toHaveBeenCalledWith(
      { _id: run._id },
      expect.objectContaining({
        financePosted: true,
        financeJournalId: journalId,
        financeReference: "JE-2025-001",
      }),
    );
    expect(updateExecMock).toHaveBeenCalled();
  });

  it("skips posting when payroll run is already marked as posted", async () => {
    const run = {
      _id: new Types.ObjectId(),
      orgId,
      financePosted: true,
    } as any;

    await PayrollFinanceIntegration.postRun(run);

    expect(createJournalMock).not.toHaveBeenCalled();
    expect(postJournalMock).not.toHaveBeenCalled();
  });
});
