import mongoose, { Types } from 'mongoose';
import Journal from '../models/finance/Journal';
import LedgerEntry from '../models/finance/LedgerEntry';
import ChartAccount from '../models/finance/ChartAccount';
import { getFxRate } from './fx.service';
import { decimal128ToMinor, minorToDecimal128, applyFxMinor } from '../lib/money';
import { ForbiddenError } from '../lib/errors';
import { RequestContext } from '../lib/authContext';
import { log } from '../lib/logger';

export async function postJournal(ctx: RequestContext, data: any) {
  if (!['FINANCE', 'ADMIN', 'SUPER_ADMIN'].includes(ctx.role)) {
    throw new ForbiddenError('Only Finance/Admin can post journals');
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const j = await Journal.findOne({ _id: journalId, orgId: ctx.orgId }).session(session);
    if (!j || j.status !== 'DRAFT') throw new Error('Invalid journal');

    let totalDeb = 0n;
    let totalCre = 0n;
    for (const p of j.postings ?? []) {
      const deb = decimal128ToMinor(p.debitMinor as Types.Decimal128);
      const cre = decimal128ToMinor(p.creditMinor as Types.Decimal128);
      totalDeb += deb;
      totalCre += cre;
    }
    if (totalDeb !== totalCre) throw new Error('Unbalanced');

    for (const p of j.postings ?? []) {
      const debitMinorDec = (p.debitMinor as Types.Decimal128) ?? Types.Decimal128.fromString('0');
      const creditMinorDec = (p.creditMinor as Types.Decimal128) ?? Types.Decimal128.fromString('0');
      const debMinor = decimal128ToMinor(debitMinorDec);
      const creMinor = decimal128ToMinor(creditMinorDec);
      const account = await ChartAccount.findOne({ _id: p.accountId, orgId: ctx.orgId }).session(session);
      if (!account) throw new Error('Account not found');

      const baseCurrency = process.env.FINANCE_BASE_CURRENCY || 'SAR';
      let fxRate = p.fxRate;
      if (!fxRate) {
        if (p.currency === baseCurrency) {
          fxRate = 1;
        } else {
          fxRate = await getFxRate(ctx.orgId, p.currency, baseCurrency, j.journalDate);
        }
      }
      const baseDeb = applyFxMinor(debMinor, fxRate);
      const baseCre = applyFxMinor(creMinor, fxRate);

      const last = await LedgerEntry.findOne({ orgId: ctx.orgId, accountId: p.accountId }).sort({ date: -1 }).session(session);
      const prior = last
        ? last.balanceMinor
          ? decimal128ToMinor(last.balanceMinor as Types.Decimal128)
          : BigInt(Math.round((last.balance || 0) * 100))
        : 0n;
      const next = prior + baseDeb - baseCre;

      const dims = (p.dimensions || {}) as {
        propertyId?: Types.ObjectId;
        unitId?: Types.ObjectId;
        ownerId?: Types.ObjectId;
        tenantId?: Types.ObjectId;
        vendorId?: Types.ObjectId;
      };

      await LedgerEntry.create([
        {
          orgId: ctx.orgId,
          journalId: j._id,
          journalNumber: j.journalNumber,
          journalDate: j.journalDate,
          date: j.journalDate,
          postingDate: j.postingDate || j.journalDate,
          accountId: p.accountId,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          description: j.description,
          debit: Number(debMinor) / 100,
          credit: Number(creMinor) / 100,
          debitMinor: debitMinorDec,
          creditMinor: creditMinorDec,
          baseDebitMinor: minorToDecimal128(baseDeb),
          baseCreditMinor: minorToDecimal128(baseCre),
          baseCurrency,
          currency: p.currency,
          fxRate,
          balanceMinor: minorToDecimal128(next),
          balance: Number(next) / 100,
          dimensions: dims,
          isReversal: j.type === 'REVERSAL',
          propertyId: dims.propertyId,
          unitId: dims.unitId,
          ownerId: dims.ownerId,
          tenantId: dims.tenantId,
          vendorId: dims.vendorId,
          fiscalYear: j.fiscalYear,
          fiscalPeriod: j.fiscalPeriod,
          createdBy: ctx.userId,
          updatedBy: ctx.userId
        }
      ], { session });
    }

    j.status = 'POSTED';
    j.postedAt = new Date();
    j.postedBy = ctx.userId as unknown as Types.ObjectId;
    await j.save({ session });

    await session.commitTransaction();
    log(`Journal ${j.journalNumber} posted`);
  } catch (e) {
    await session.abortTransaction();
    log((e as Error).message, 'error');
    throw e;
  } finally {
    session.endSession();
  }
}
