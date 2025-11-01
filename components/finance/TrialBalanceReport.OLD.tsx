'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

// ============================================================================
// INTERFACES
// ============================================================================

interface ITrialBalanceAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
  level: number; // For hierarchical display (0 = parent, 1 = child, etc.)
  hasChildren: boolean;
}

interface ITrialBalanceData {
  year: number;
  period: number;
  asOfDate: string;
  accounts: ITrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  difference: number;
}

interface ITrialBalanceReportProps {
  initialYear?: number;
  initialPeriod?: number;
  onExport?: (data: ITrialBalanceData) => void;
}

export default function TrialBalanceReport({
  initialYear = new Date().getFullYear(),
  initialPeriod = new Date().getMonth() + 1,
  onExport
}: ITrialBalanceReportProps) {
  const { t } = useTranslation();

  // Filter state
  const [year, setYear] = useState<number>(initialYear);
  const [period, setPeriod] = useState<number>(initialPeriod);
  const [showZeroBalances, setShowZeroBalances] = useState<boolean>(false);
  const [groupByType, setGroupByType] = useState<boolean>(true);

  // Data state
  const [data, setData] = useState<ITrialBalanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(
    new Set(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'])
  );

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadTrialBalance();
  }, [year, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTrialBalance = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/finance/ledger/trial-balance?year=${year}&period=${period}`);
      
      if (!response.ok) {
        throw new Error('Failed to load trial balance');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error loading trial balance:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // DATA FILTERING & GROUPING
  // ============================================================================

  const getFilteredAccounts = (): ITrialBalanceAccount[] => {
    if (!data) return [];

    let accounts = data.accounts;

    // Filter zero balances
    if (!showZeroBalances) {
      accounts = accounts.filter(acc => Math.abs(acc.balance) > 0.01);
    }

    return accounts;
  };

  const getAccountsByType = (): Record<string, ITrialBalanceAccount[]> => {
    const filtered = getFilteredAccounts();
    const grouped: Record<string, ITrialBalanceAccount[]> = {};

    filtered.forEach(acc => {
      if (!grouped[acc.accountType]) {
        grouped[acc.accountType] = [];
      }
      grouped[acc.accountType].push(acc);
    });

    return grouped;
  };

  // ============================================================================
  // TYPE EXPANSION
  // ============================================================================

  const toggleTypeExpansion = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const expandAll = () => {
    if (data) {
      const allTypes = new Set<string>();
      data.accounts.forEach(acc => allTypes.add(acc.accountType));
      setExpandedTypes(allTypes);
    }
  };

  const collapseAll = () => {
    setExpandedTypes(new Set());
  };

  // ============================================================================
  // EXPORT FUNCTIONALITY
  // ============================================================================

  const handleExport = (format: 'csv' | 'excel') => {
    if (!data) return;

    if (onExport) {
      onExport(data);
      return;
    }

    // Default CSV export
    if (format === 'csv') {
      exportToCSV();
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    const headers = ['Account Code', 'Account Name', 'Type', 'Debit', 'Credit', 'Balance'];
    const rows = data.accounts.map(acc => [
      acc.accountCode,
      acc.accountName,
      acc.accountType,
      acc.debit.toFixed(2),
      acc.credit.toFixed(2),
      acc.balance.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${year}-${period}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderAccountRow = (account: ITrialBalanceAccount) => {
    const indent = account.level * 20;
    
    return (
      <tr key={account.accountId} className="hover:bg-muted">
        <td className="px-4 py-2 text-sm" style={{ paddingLeft: `${16 + indent}px` }}>
          <span className={account.level > 0 ? 'text-muted-foreground' : 'font-medium'}>
            {account.accountCode}
          </span>
        </td>
        <td className="px-4 py-2 text-sm">
          <span className={account.level > 0 ? 'text-foreground' : 'font-medium'}>
            {account.accountName}
          </span>
        </td>
        <td className="px-4 py-2 text-sm text-right">
          {account.debit > 0 ? account.debit.toFixed(2) : '-'}
        </td>
        <td className="px-4 py-2 text-sm text-right">
          {account.credit > 0 ? account.credit.toFixed(2) : '-'}
        </td>
        <td className="px-4 py-2 text-sm text-right font-medium">
          {account.balance.toFixed(2)}
        </td>
      </tr>
    );
  };

  const renderGroupedAccounts = () => {
    const grouped = getAccountsByType();
    const types = Object.keys(grouped).sort();

    return types.map(type => {
      const accounts = grouped[type];
      const typeTotal = accounts.reduce((sum, acc) => sum + acc.balance, 0);
      const typeDebits = accounts.reduce((sum, acc) => sum + acc.debit, 0);
      const typeCredits = accounts.reduce((sum, acc) => sum + acc.credit, 0);
      const isExpanded = expandedTypes.has(type);

      return (
        <React.Fragment key={type}>
          {/* Type Header */}
          <tr className="bg-muted border-t-2 border-border cursor-pointer" onClick={() => toggleTypeExpansion(type)}>
            <td colSpan={2} className="px-4 py-3 text-sm font-bold text-foreground">
              <span className="inline-block mr-2">{isExpanded ? '▼' : '▶'}</span>
              {t(type)}
            </td>
            <td className="px-4 py-3 text-sm font-bold text-right">
              {typeDebits.toFixed(2)}
            </td>
            <td className="px-4 py-3 text-sm font-bold text-right">
              {typeCredits.toFixed(2)}
            </td>
            <td className="px-4 py-3 text-sm font-bold text-right">
              {typeTotal.toFixed(2)}
            </td>
          </tr>
          
          {/* Type Accounts */}
          {isExpanded && accounts.map(account => renderAccountRow(account))}
        </React.Fragment>
      );
    });
  };

  const renderFlatAccounts = () => {
    const accounts = getFilteredAccounts();
    return accounts.map(account => renderAccountRow(account));
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-card shadow-md rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('Trial Balance Report')}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
              disabled={!data || loading}
            >
              📊 {t('Export CSV')}
            </button>
            <button
              onClick={() => loadTrialBalance()}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? t('Loading...') : '🔄 ' + t('Refresh')}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('Fiscal Year')}
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-2xl"
              disabled={loading}
            >
              {[...Array(5)].map((_, i) => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('Period')}
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-2xl"
              disabled={loading}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })} ({i + 1})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showZeroBalances}
                onChange={(e) => setShowZeroBalances(e.target.checked)}
                className="w-4 h-4 text-primary accent-primary rounded"
              />
              <span className="text-sm text-foreground">{t('Show Zero Balances')}</span>
            </label>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={groupByType}
                onChange={(e) => setGroupByType(e.target.checked)}
                className="w-4 h-4 text-primary accent-primary rounded"
              />
              <span className="text-sm text-foreground">{t('Group by Type')}</span>
            </label>
          </div>
        </div>

        {/* Expand/Collapse Controls */}
        {groupByType && data && (
          <div className="flex gap-2 border-t pt-4">
            <button
              onClick={expandAll}
              className="px-3 py-1 text-sm bg-muted text-foreground rounded-md hover:bg-muted/80"
            >
              {t('Expand All')}
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1 text-sm bg-muted text-foreground rounded-md hover:bg-muted/80"
            >
              {t('Collapse All')}
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-card shadow-md rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">{t('Loading trial balance...')}</p>
        </div>
      )}

      {/* Trial Balance Table */}
      {!loading && data && (
        <div className="bg-card shadow-md rounded-2xl overflow-hidden">
          {/* Report Header */}
          <div className="bg-muted p-4 border-b">
            <h3 className="font-semibold text-lg">{t('Trial Balance')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('As of')} {data.asOfDate} | {t('Period')} {period}/{year}
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('Account Code')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('Account Name')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('Debit')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('Credit')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('Balance')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {groupByType ? renderGroupedAccounts() : renderFlatAccounts()}
              </tbody>
              
              {/* Totals Footer */}
              <tfoot className="bg-muted border-t-2 border-border">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-bold text-foreground">
                    {t('TOTAL')}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-right">
                    {data.totalDebits.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-right">
                    {data.totalCredits.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-right">
                    {(data.totalDebits - data.totalCredits).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Balance Status */}
          <div className={`p-4 border-t ${data.isBalanced ? 'bg-green-600/10' : 'bg-destructive/10'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-semibold ${data.isBalanced ? 'text-green-700 dark:text-green-600' : 'text-destructive'}`}>
                  {data.isBalanced ? (
                    <span>✓ {t('Trial Balance is Balanced')}</span>
                  ) : (
                    <span>✗ {t('Trial Balance is Out of Balance')}</span>
                  )}
                </p>
                {!data.isBalanced && (
                  <p className="text-sm text-destructive mt-1">
                    {t('Difference')}: {Math.abs(data.difference).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="text-right text-sm">
                <p className="text-muted-foreground">
                  {t('Total Accounts')}: {data.accounts.length}
                </p>
                <p className="text-muted-foreground">
                  {t('Displayed')}: {getFilteredAccounts().length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !data && !error && (
        <div className="bg-card shadow-md rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">{t('No trial balance data available')}</p>
          <button
            onClick={() => loadTrialBalance()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            {t('Load Trial Balance')}
          </button>
        </div>
      )}
    </div>
  );
}
