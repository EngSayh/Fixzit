import { postJournal } from "./posting.service";
import { RequestContext } from "../lib/authContext";
import { nextNumber } from "../lib/numbering";
import Journal from "../models/finance/Journal";
import ChartAccount from "../models/finance/ChartAccount";
import { minorToDecimal128 } from "../lib/money";

export async function postFromWorkOrder(
  ctx: RequestContext,
  woId: string,
  costs: { expense: number; billable: number },
) {
  const findAccount = (code: string) =>
    ChartAccount.findOne({
      orgId: ctx.orgId,
      $or: [{ code }, { accountCode: code }],
    });
  const expenseAcc = await findAccount("5000");
  const apAcc = await findAccount("2000");
  const arAcc = await findAccount("1200");
  const revAcc = await findAccount("4300");
  if (!expenseAcc || !apAcc || !arAcc || !revAcc)
    throw new Error("Accounts not found");

  const number = await nextNumber(ctx.orgId, "JE");
  const toMinor = (value: number) =>
    minorToDecimal128(BigInt(Math.round(value * 100)));
  const postings = [
    {
      accountId: expenseAcc._id,
      debitMinor: toMinor(costs.expense),
      creditMinor: minorToDecimal128(0n),
      currency: "SAR",
      dimensions: { workOrderId: woId },
    },
    {
      accountId: apAcc._id,
      debitMinor: minorToDecimal128(0n),
      creditMinor: toMinor(costs.expense),
      currency: "SAR",
      dimensions: { workOrderId: woId },
    },
  ];
  if (costs.billable > 0) {
    postings.push(
      {
        accountId: arAcc._id,
        debitMinor: toMinor(costs.billable),
        creditMinor: minorToDecimal128(0n),
        currency: "SAR",
        dimensions: { workOrderId: woId },
      },
      {
        accountId: revAcc._id,
        debitMinor: minorToDecimal128(0n),
        creditMinor: toMinor(costs.billable),
        currency: "SAR",
        dimensions: { workOrderId: woId },
      },
    );
  }
  const j = await Journal.create({
    orgId: ctx.orgId,
    number,
    journalNumber: number,
    journalDate: new Date(),
    description: `WO ${woId}`,
    sourceType: "WORK_ORDER",
    postings,
    createdBy: ctx.userId,
    status: "DRAFT",
  });
  await postJournal(ctx, j._id.toString());
  return j;
}
