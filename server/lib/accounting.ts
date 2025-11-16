export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export function normalizeBalance(type: AccountType, debit: bigint, credit: bigint): bigint {
  if (type === 'ASSET' || type === 'EXPENSE') return debit - credit;
  return credit - debit;
}
