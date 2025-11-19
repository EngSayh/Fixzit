'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { logger } from '@/lib/logger';
import ClientDate from '@/components/ClientDate';

// ============================================================================
// INTERFACES
// ============================================================================

interface IAccountTransaction {
  id: string;
  date: string;
  journalNumber: string;
  description: string;
  sourceType: string;
  sourceNumber?: string;
  debit: number;
  credit: number;
  balance: number;
}

interface IAccountActivityData {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  openingBalance: number;
  closingBalance: number;
  transactions: IAccountTransaction[];
  // Optional total when server-side pagination is used
  totalTransactions?: number;
  totalDebits: number;
  totalCredits: number;
  periodStart: string;
  periodEnd: string;
}

interface IAccountActivityViewerProps {
  accountId: string;
  initialStartDate?: string;
  initialEndDate?: string;
  onTransactionClick?: (transaction: IAccountTransaction) => void;
}

export default function AccountActivityViewer({
  accountId,
  initialStartDate,
  initialEndDate,
  onTransactionClick
}: IAccountActivityViewerProps) {
  const { t } = useTranslation();

  // Filter state
  const [startDate, setStartDate] = useState<string>(
    initialStartDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    initialEndDate || new Date().toISOString().split('T')[0]
  );
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('ALL');

  // Data state
  const [data, setData] = useState<IAccountActivityData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(50);
  const [serverSide, setServerSide] = useState<boolean>(false);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (accountId) {
      loadAccountActivity();
    }
  }, [accountId, startDate, endDate, sourceTypeFilter, currentPage]);

  const loadAccountActivity = async () => {
    if (!accountId) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate,
        endDate
      });

      if (sourceTypeFilter !== 'ALL') {
        params.append('sourceType', sourceTypeFilter);
      }

      // Add pagination params for server-side pagination
      params.append('page', String(currentPage));
      params.append('limit', String(pageSize));

      const url = `/api/finance/ledger/account-activity/${accountId}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        // try to get a specific message from the response
        let errMsg = 'Failed to load account activity';
        try {
          const err = await response.json();
          errMsg = err.message || err.error || errMsg;
         
        } catch (_err) {
          // ignore
        }
        throw new Error(errMsg);
      }

      const result = await response.json();

      // If API returned total count, we are using server-side pagination
      if (typeof result.totalTransactions === 'number' || typeof result.total === 'number') {
        setServerSide(true);
      } else {
        setServerSide(false);
      }

      setData(result);
    } catch (err) {
      import('../../lib/logger').then(({ logError }) => {
        logError('Error loading account activity', err as Error, {
          component: 'AccountActivityViewer',
          action: 'loadTransactions',
          accountId,
        });
        }).catch(logErr => logger.error('Failed to load logger:', { error: logErr }));
      setError(err instanceof Error ? err.message : t('common.error.loadData', 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // PAGINATION - MEMOIZED FOR PERFORMANCE
  // ============================================================================

  // Memoize paginated transactions to prevent re-slicing on every render
  const paginatedTransactions = useMemo((): IAccountTransaction[] => {
    if (!data) return [];

    // If server-side pagination is active, the API returns only page transactions
    if (serverSide && (data.transactions?.length ?? 0) > 0) {
      return data.transactions;
    }

    // Client-side pagination fallback: slice the full transactions array
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.transactions.slice(startIndex, endIndex);
  }, [data, serverSide, currentPage, pageSize]);

  // Memoize total pages calculation
  const totalPages = useMemo(() => {
    if (!data) return 0;
    const total = data.totalTransactions ?? data.transactions.length;
    return Math.ceil(total / pageSize);
  }, [data, pageSize]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // ============================================================================
  // DATE PRESETS
  // ============================================================================

  const setDatePreset = (preset: string) => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (preset) {
      case 'today':
        start = today;
        break;
      case 'this-week':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        break;
      case 'this-month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'this-quarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      }
      case 'this-year':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      case 'last-month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last-year':
        start = new Date(today.getFullYear() - 1, 0, 1);
        end = new Date(today.getFullYear() - 1, 11, 31);
        break;
      default:
        start = new Date(today.getFullYear(), 0, 1);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // ============================================================================
  // EXPORT
  // ============================================================================

  const exportToCSV = () => {
    if (!data) return;

    const headers = ['Date', 'Journal #', 'Source', 'Description', 'Debit', 'Credit', 'Balance'];
    const rows = data.transactions.map(txn => [
      new Date(txn.date).toLocaleDateString(),
      txn.journalNumber,
      txn.sourceType,
      txn.description,
      txn.debit.toFixed(2),
      txn.credit.toFixed(2),
      txn.balance.toFixed(2)
    ]);

    // Add opening balance row
    rows.unshift([
      startDate,
      '',
      '',
      'Opening Balance',
      '',
      '',
      data.openingBalance.toFixed(2)
    ]);

    const csvContent = [
      [`Account: ${data.accountCode} - ${data.accountName}`],
      [`Period: ${data.periodStart} to ${data.periodEnd}`],
      [],
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account-activity-${data.accountCode}-${startDate}-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-card shadow-md rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('Account Activity')}</h2>
            {data && (
              <p className="text-sm text-muted-foreground mt-1">
                {data.accountCode} - {data.accountName} ({t(data.accountType)})
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 text-sm bg-success text-white rounded hover:bg-success"
              disabled={!data || loading}
            >
              📊 {t('Export CSV')}
            </button>
            <button
              onClick={() => loadAccountActivity()}
              className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary"
              disabled={loading}
            >
              {loading ? t('Loading...') : '🔄 ' + t('Refresh')}
            </button>
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('Start Date')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-2xl"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('End Date')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-2xl"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('Source Type')}
            </label>
            <select
              value={sourceTypeFilter}
              onChange={(e) => setSourceTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-2xl"
              disabled={loading}
            >
              <option value="ALL">{t('All Types')}</option>
              <option value="MANUAL">{t('Manual')}</option>
              <option value="INVOICE">{t('Invoice')}</option>
              <option value="PAYMENT">{t('Payment')}</option>
              <option value="EXPENSE">{t('Expense')}</option>
              <option value="RENT">{t('Rent')}</option>
              <option value="WORK_ORDER">{t('Work Order')}</option>
              <option value="ADJUSTMENT">{t('Adjustment')}</option>
            </select>
          </div>
        </div>

        {/* Date Presets */}
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <button onClick={() => setDatePreset('today')} className="px-3 py-1 text-sm bg-muted rounded hover:bg-muted">
            {t('Today')}
          </button>
          <button onClick={() => setDatePreset('this-week')} className="px-3 py-1 text-sm bg-muted rounded hover:bg-muted">
            {t('This Week')}
          </button>
          <button onClick={() => setDatePreset('this-month')} className="px-3 py-1 text-sm bg-muted rounded hover:bg-muted">
            {t('This Month')}
          </button>
          <button onClick={() => setDatePreset('this-quarter')} className="px-3 py-1 text-sm bg-muted rounded hover:bg-muted">
            {t('This Quarter')}
          </button>
          <button onClick={() => setDatePreset('this-year')} className="px-3 py-1 text-sm bg-muted rounded hover:bg-muted">
            {t('This Year')}
          </button>
          <button onClick={() => setDatePreset('last-month')} className="px-3 py-1 text-sm bg-muted rounded hover:bg-muted">
            {t('Last Month')}
          </button>
          <button onClick={() => setDatePreset('last-year')} className="px-3 py-1 text-sm bg-muted rounded hover:bg-muted">
            {t('Last Year')}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-card shadow-md rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">{t('Loading account activity...')}</p>
        </div>
      )}

      {/* Activity Table */}
      {!loading && data && (
        <div className="bg-card shadow-md rounded-2xl overflow-hidden">
          {/* Summary Stats */}
          <div className="bg-muted p-4 border-b">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t('Opening Balance')}</p>
                <p className="text-lg font-bold">{data.openingBalance.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Total Debits')}</p>
                <p className="text-lg font-bold text-success">+{data.totalDebits.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Total Credits')}</p>
                <p className="text-lg font-bold text-destructive">-{data.totalCredits.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Closing Balance')}</p>
                <p className="text-lg font-bold">{data.closingBalance.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('Date')}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('Journal #')}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('Source')}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('Description')}
                  </th>
                  <th className="px-4 py-3 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('Debit')}
                  </th>
                  <th className="px-4 py-3 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('Credit')}
                  </th>
                  <th className="px-4 py-3 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('Balance')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {/* Opening Balance Row */}
                <tr className="bg-primary/5">
                  <td className="px-4 py-2 text-sm" colSpan={4}>
                    <strong>{t('Opening Balance')}</strong>
                  </td>
                  <td className="px-4 py-2 text-sm text-end"></td>
                  <td className="px-4 py-2 text-sm text-end"></td>
                  <td className="px-4 py-2 text-sm text-end font-semibold">
                    {data.openingBalance.toFixed(2)}
                  </td>
                </tr>

                {/* Transaction Rows */}
                {paginatedTransactions.map((txn) => (
                  <tr
                    key={txn.id}
                    className="hover:bg-muted cursor-pointer"
                    onClick={() => onTransactionClick && onTransactionClick(txn)}
                  >
                    <td className="px-4 py-2 text-sm">
                      <ClientDate date={txn.date} format="date-only" />
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-primary">
                      {txn.journalNumber}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className="px-2 py-1 text-xs bg-muted rounded">
                        {t(txn.sourceType)}
                      </span>
                      {txn.sourceNumber && (
                        <span className="ms-1 text-xs text-muted-foreground">
                          ({txn.sourceNumber})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-foreground">
                      {txn.description}
                    </td>
                    <td className="px-4 py-2 text-sm text-end text-success font-medium">
                      {txn.debit > 0 ? txn.debit.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-end text-destructive font-medium">
                      {txn.credit > 0 ? txn.credit.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-end font-semibold">
                      {txn.balance.toFixed(2)}
                    </td>
                  </tr>
                ))}

                {/* No Transactions */}
                {data.transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      {t('No transactions found for this period')}
                    </td>
                  </tr>
                )}

                {/* Closing Balance Row */}
                <tr className="bg-primary/5 border-t-2 border-border">
                  <td className="px-4 py-2 text-sm font-bold" colSpan={4}>
                    {t('Closing Balance')}
                  </td>
                  <td className="px-4 py-2 text-sm text-end font-bold text-success">
                    {data.totalDebits.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-sm text-end font-bold text-destructive">
                    {data.totalCredits.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-sm text-end font-bold">
                    {data.closingBalance.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-muted px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-foreground">
                {t('Showing')} {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, data.transactions.length)} {t('of')} {data.transactions.length} {t('transactions')}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('First')}
                </button>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('Previous')}
                </button>
                <span className="px-3 py-1 text-sm">
                  {t('Page')} {currentPage} {t('of')} {totalPages}
                </span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('Next')}
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('Last')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && !data && !error && (
        <div className="bg-card shadow-md rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">{t('Select an account to view activity')}</p>
        </div>
      )}
    </div>
  );
}
