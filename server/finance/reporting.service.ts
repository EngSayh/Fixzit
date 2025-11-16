import { Types } from 'mongoose';
import LedgerEntry from '../models/finance/LedgerEntry';
import { decimal128ToMinor } from '../lib/money';
import { normalizeBalance, type AccountType } from '../lib/accounting';
import { RequestContext } from '../lib/authContext';
import { ForbiddenError } from '../lib/errors';

type AccountName = string | { en?: string; ar?: string };

type TrialBalanceRow = {
  accountId: Types.ObjectId;
  code?: string;
  accountCode?: string;
  name?: AccountName;
  accountName?: AccountName;
  type: AccountType;
  debit: Types.Decimal128;
  credit: Types.Decimal128;
};

function toMinor(value: Types.Decimal128 | undefined): bigint {
  return decimal128ToMinor(value ?? Types.Decimal128.fromString('0'));
}

export async function trialBalance(ctx: RequestContext, from: Date, to: Date) {
  if (!['Finance', 'Admin'].includes(ctx.role)) {
    throw new ForbiddenError('Only Finance/Admin can view trial balance');
  }

  const rows = await LedgerEntry.aggregate<TrialBalanceRow>([
    {
      $match: {
        orgId: ctx.orgId,
        date: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: '$accountId',
        debit: { $sum: '$baseDebitMinor' },
        credit: { $sum: '$baseCreditMinor' },
      },
    },
    {
      $lookup: {
        from: 'chartaccounts',
        localField: '_id',
        foreignField: '_id',
        as: 'acc',
      },
    },
    { $unwind: '$acc' },
    {
      $project: {
        accountId: '$_id',
        code: '$acc.code',
        accountCode: '$acc.accountCode',
        name: '$acc.name',
        accountName: '$acc.accountName',
        type: '$acc.accountType',
        debit: '$debit',
        credit: '$credit',
      },
    },
    { $sort: { code: 1 } },
  ]);

  const totDr = rows.reduce((sum, row) => sum + toMinor(row.debit), 0n);
  const totCr = rows.reduce((sum, row) => sum + toMinor(row.credit), 0n);

  return { rows, totDr, totCr, balanced: totDr === totCr };
}

export async function incomeStatement(ctx: RequestContext, from: Date, to: Date) {
  const tb = await trialBalance(ctx, from, to);

  const revenue = tb.rows
    .filter(row => row.type === 'REVENUE')
    .reduce((sum, row) => sum + normalizeBalance('REVENUE', toMinor(row.debit), toMinor(row.credit)), 0n);

  const expense = tb.rows
    .filter(row => row.type === 'EXPENSE')
    .reduce((sum, row) => sum + normalizeBalance('EXPENSE', toMinor(row.debit), toMinor(row.credit)), 0n);

  const net = revenue - expense;

  return { revenue, expense, net, rows: tb.rows };
}

export async function balanceSheet(ctx: RequestContext, asOf: Date) {
  const tb = await trialBalance(ctx, new Date(0), asOf);

  const assets = tb.rows
    .filter(row => row.type === 'ASSET')
    .reduce((sum, row) => sum + normalizeBalance('ASSET', toMinor(row.debit), toMinor(row.credit)), 0n);

  const liabilities = tb.rows
    .filter(row => row.type === 'LIABILITY')
    .reduce((sum, row) => sum + normalizeBalance('LIABILITY', toMinor(row.debit), toMinor(row.credit)), 0n);

  const equity = tb.rows
    .filter(row => row.type === 'EQUITY')
    .reduce((sum, row) => sum + normalizeBalance('EQUITY', toMinor(row.debit), toMinor(row.credit)), 0n);

  return { assets, liab: liabilities, equity, equationOk: assets === liabilities + equity };
}

export async function ownerStatement(ctx: RequestContext, propertyId: string, from: Date, to: Date) {
  if (!['Owner', 'Finance', 'Admin'].includes(ctx.role)) {
    throw new ForbiddenError('Only Owner/Finance/Admin can view statements');
  }

  const rows = await LedgerEntry.aggregate<TrialBalanceRow>([
    {
      $match: {
        orgId: ctx.orgId,
        date: { $gte: from, $lte: to },
        'dimensions.propertyId': propertyId,
      },
    },
    {
      $group: {
        _id: '$accountId',
        debit: { $sum: '$baseDebitMinor' },
        credit: { $sum: '$baseCreditMinor' },
      },
    },
    {
      $lookup: {
        from: 'chartaccounts',
        localField: '_id',
        foreignField: '_id',
        as: 'acc',
      },
    },
    { $unwind: '$acc' },
    {
      $project: {
        accountId: '$_id',
        code: '$acc.code',
        accountCode: '$acc.accountCode',
        name: '$acc.name',
        accountName: '$acc.accountName',
        type: '$acc.accountType',
        debit: '$debit',
        credit: '$credit',
      },
    },
  ]);

  const openingAgg = await LedgerEntry.aggregate([
    {
      $match: {
        orgId: ctx.orgId,
        date: { $lt: from },
        'dimensions.propertyId': propertyId,
      },
    },
    {
      $group: {
        _id: null,
        balance: { $sum: '$balanceMinor' },
      },
    },
  ]);

  const opening = openingAgg.length ? toMinor(openingAgg[0].balance as Types.Decimal128) : 0n;

  const charges = rows
    .filter(row => row.type === 'REVENUE')
    .reduce((sum, row) => sum + normalizeBalance('REVENUE', toMinor(row.debit), toMinor(row.credit)), 0n);

  const receipts = rows
    .filter(row => row.type === 'ASSET' && row.code?.startsWith('11'))
    .reduce((sum, row) => sum + normalizeBalance('ASSET', toMinor(row.debit), toMinor(row.credit)), 0n);

  const ending = opening + charges + receipts;

  return { propertyId, from, to, opening, charges, receipts, ending, lines: rows };
}
