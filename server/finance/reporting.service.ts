import { Types } from 'mongoose';
import LedgerEntry from '../models/finance/LedgerEntry';
import { decimal128ToMinor } from '../lib/money';
import { normalizeBalance, AccountType } from '../lib/accounting';
import { RequestContext } from '../lib/authContext';
import { ForbiddenError } from '../lib/errors';

export async function trialBalance(ctx: RequestContext, from: Date, to: Date) {
  if (!['Finance', 'Admin'].includes(ctx.role)) throw new ForbiddenError('Only Finance/Admin can view trial balance');
  const rows = await (LedgerEntry as any).aggregate([
    { $match: { orgId: ctx.orgId, date: { $gte: from, $lte: to } } },
    { $group: { _id: '$accountId', debit: { $sum: '$baseDebitMinor' }, credit: { $sum: '$baseCreditMinor' } } },
    { $lookup: { from: 'chartaccounts', localField: '_id', foreignField: '_id', as: 'acc' } },
    { $unwind: '$acc' },
    { $project: { accountId: '$_id', code: '$acc.accountCode', name: '$acc.accountName', type: '$acc.accountType', debit: 1, credit: 1 } },
    { $sort: { code: 1 } },
  ]);
  const totDr = rows.reduce((a: bigint, r: any) => a + decimal128ToMinor((r.debit as Types.Decimal128) ?? Types.Decimal128.fromString('0')), 0n);
  const totCr = rows.reduce((a: bigint, r: any) => a + decimal128ToMinor((r.credit as Types.Decimal128) ?? Types.Decimal128.fromString('0')), 0n);
  return { rows, totDr, totCr, balanced: totDr === totCr };
}

export async function incomeStatement(ctx: RequestContext, from: Date, to: Date) {
  const tb = await trialBalance(ctx, from, to);
  const revenue = tb.rows.filter((r: any) => r.type === 'INCOME').reduce((a: bigint, r: any) => a + normalizeBalance(r.type as AccountType, decimal128ToMinor((r.debit as Types.Decimal128) ?? Types.Decimal128.fromString('0')), decimal128ToMinor((r.credit as Types.Decimal128) ?? Types.Decimal128.fromString('0'))), 0n);
  const expense = tb.rows.filter((r: any) => r.type === 'EXPENSE').reduce((a: bigint, r: any) => a + normalizeBalance(r.type as AccountType, decimal128ToMinor((r.debit as Types.Decimal128) ?? Types.Decimal128.fromString('0')), decimal128ToMinor((r.credit as Types.Decimal128) ?? Types.Decimal128.fromString('0'))), 0n);
  const net = revenue - expense;
  return { revenue, expense, net, rows: tb.rows };
}

export async function balanceSheet(ctx: RequestContext, asOf: Date) {
  const tb = await trialBalance(ctx, new Date(0), asOf);
  const assets = tb.rows.filter((r: any) => r.type === 'ASSET').reduce((a: bigint, r: any) => a + normalizeBalance(r.type as AccountType, decimal128ToMinor((r.debit as Types.Decimal128) ?? Types.Decimal128.fromString('0')), decimal128ToMinor((r.credit as Types.Decimal128) ?? Types.Decimal128.fromString('0'))), 0n);
  const liab = tb.rows.filter((r: any) => r.type === 'LIABILITY').reduce((a: bigint, r: any) => a + normalizeBalance(r.type as AccountType, decimal128ToMinor((r.debit as Types.Decimal128) ?? Types.Decimal128.fromString('0')), decimal128ToMinor((r.credit as Types.Decimal128) ?? Types.Decimal128.fromString('0'))), 0n);
  const equity = tb.rows.filter((r: any) => r.type === 'EQUITY').reduce((a: bigint, r: any) => a + normalizeBalance(r.type as AccountType, decimal128ToMinor((r.debit as Types.Decimal128) ?? Types.Decimal128.fromString('0')), decimal128ToMinor((r.credit as Types.Decimal128) ?? Types.Decimal128.fromString('0'))), 0n);
  return { assets, liab, equity, equationOk: assets === (liab + equity) };
}

export async function ownerStatement(ctx: RequestContext, propertyId: string, from: Date, to: Date) {
  if (!['Owner', 'Finance', 'Admin'].includes(ctx.role)) throw new ForbiddenError('Only Owner/Finance/Admin can view statements');
  const rows = await (LedgerEntry as any).aggregate([
    { $match: { orgId: ctx.orgId, date: { $gte: from, $lte: to }, 'dimensions.propertyId': propertyId } },
    { $group: { _id: '$accountId', debit: { $sum: '$baseDebitMinor' }, credit: { $sum: '$baseCreditMinor' } } },
    { $lookup: { from: 'chartaccounts', localField: '_id', foreignField: '_id', as: 'acc' } },
    { $unwind: '$acc' },
    { $project: { accountId: '$_id', code: '$acc.accountCode', name: '$acc.accountName', type: '$acc.accountType', debit: 1, credit: 1 } },
  ]);
  const openingAgg = await (LedgerEntry as any).aggregate([
    { $match: { orgId: ctx.orgId, date: { $lt: from }, 'dimensions.propertyId': propertyId } },
    { $group: { _id: null, balance: { $sum: '$balanceMinor' } } }
  ]);
  const opening = decimal128ToMinor(openingAgg[0]?.balance || Types.Decimal128.fromString('0'));
  const charges = rows.filter((r: any) => r.type === 'INCOME').reduce((a: bigint, r: any) => a + normalizeBalance(r.type as AccountType, decimal128ToMinor((r.debit as Types.Decimal128) ?? Types.Decimal128.fromString('0')), decimal128ToMinor((r.credit as Types.Decimal128) ?? Types.Decimal128.fromString('0'))), 0n);
  const receipts = rows.filter((r: any) => r.type === 'ASSET' && r.code?.startsWith('11')).reduce((a: bigint, r: any) => a + normalizeBalance(r.type as AccountType, decimal128ToMinor((r.debit as Types.Decimal128) ?? Types.Decimal128.fromString('0')), decimal128ToMinor((r.credit as Types.Decimal128) ?? Types.Decimal128.fromString('0'))), 0n);
  const ending = opening + charges + receipts;
  return { propertyId, from, to, opening, charges, receipts, ending, lines: rows };
}
