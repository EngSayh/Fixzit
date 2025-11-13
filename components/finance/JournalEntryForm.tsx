'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDebounce } from '@/hooks/useDebounce';
import { logger } from '@/lib/logger';

// ============================================================================
// INTERFACES
// ============================================================================

interface IJournalLine {
  id: string;
  lineNumber: number;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  propertyId?: string;
  unitId?: string;
}

interface IChartAccount {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  type: string;
  balance?: number;
}

interface IJournalEntryFormProps {
/* eslint-disable no-unused-vars */
  onSubmit?: (data: IJournalEntryData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<IJournalEntryData>;
/* eslint-enable no-unused-vars */
  mode?: 'create' | 'edit';
}

interface IJournalEntryData {
  journalDate: string;
  description: string;
  sourceType: string;
  sourceNumber?: string;
  lines: IJournalLine[];
}

export default function JournalEntryForm({
  onSubmit,
  onCancel,
  initialData,
  mode = 'create'
}: IJournalEntryFormProps) {
  const { t } = useTranslation();

  // Form state
  const [journalDate, setJournalDate] = useState<string>(
    initialData?.journalDate || new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [sourceType, setSourceType] = useState<string>(initialData?.sourceType || 'MANUAL');
  const [sourceNumber, setSourceNumber] = useState<string>(initialData?.sourceNumber || '');

  // Lines state
  const [lines, setLines] = useState<IJournalLine[]>(
    initialData?.lines || [
      {
        id: '1',
        lineNumber: 1,
        accountId: '',
        accountCode: '',
        accountName: '',
        description: '',
        debit: 0,
        credit: 0
      },
      {
        id: '2',
        lineNumber: 2,
        accountId: '',
        accountCode: '',
        accountName: '',
        description: '',
        debit: 0,
        credit: 0
      }
    ]
  );

  // Data lookups
  const [chartAccounts, setChartAccounts] = useState<IChartAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Record<string, IChartAccount[]>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Calculate totals with useMemo for performance optimization
  // Only recalculate when lines array changes
  const { totalDebit, totalCredit, isBalanced, balanceDifference } = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const credit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    const difference = debit - credit;
    const balanced = Math.abs(difference) < 0.01 && debit > 0;
    
    return {
      totalDebit: debit,
      totalCredit: credit,
      isBalanced: balanced,
      balanceDifference: difference
    };
  }, [lines]);

  // ============================================================================
  // LIFECYCLE & DATA LOADING
  // ============================================================================

  const loadChartOfAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true);
      const response = await fetch('/api/finance/accounts?active=true');
      if (response.ok) {
        const data = await response.json();
        setChartAccounts(data.accounts || []);
        
        // Initialize filtered accounts for each line
        const initial: Record<string, IChartAccount[]> = {};
        lines.forEach(line => {
          initial[line.id] = data.accounts || [];
        });
        setFilteredAccounts(initial);
      }
    } catch (error) {
      import('../../lib/logger').then(({ logError }) => {
        logError('Error loading accounts', error as Error, {
          component: 'JournalEntryForm',
          action: 'loadAccounts',
          linesCount: lines.length,
        });
      }).catch(err => {
        logger.error('Failed to load logger:', { error: err });
      });
      setErrors({ ...errors, accounts: 'Failed to load chart of accounts' });
    } finally {
      setLoadingAccounts(false);
    }
  }, [errors, lines]);

  useEffect(() => {
    loadChartOfAccounts();
  }, [loadChartOfAccounts]);

  // ============================================================================
  // LINE MANAGEMENT
  // ============================================================================

  const addLine = () => {
    const newLine: IJournalLine = {
      id: Date.now().toString(),
      lineNumber: lines.length + 1,
      accountId: '',
      accountCode: '',
      accountName: '',
      description: '',
      debit: 0,
      credit: 0
    };
    setLines([...lines, newLine]);
    setFilteredAccounts({ ...filteredAccounts, [newLine.id]: chartAccounts });
  };

  const removeLine = (id: string) => {
    if (lines.length > 2) {
      const updatedLines = lines.filter(line => line.id !== id);
      // Renumber lines
      updatedLines.forEach((line, index) => {
        line.lineNumber = index + 1;
      });
      setLines(updatedLines);
      
      // Clean up filtered accounts
      const newFiltered = { ...filteredAccounts };
      delete newFiltered[id];
      setFilteredAccounts(newFiltered);
    }
  };

  const updateLine = (id: string, field: keyof IJournalLine, value: string | number) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;

      const updated = { ...line, [field]: value };

      // If account changed, update code and name
      if (field === 'accountId') {
        const account = chartAccounts.find(acc => acc.id === value);
        if (account) {
          updated.accountCode = account.code;
          updated.accountName = account.name;
        }
      }

      // Ensure debit/credit are mutually exclusive
      if (field === 'debit' && (Number(value) || 0) > 0) {
        updated.credit = 0;
      }
      if (field === 'credit' && (Number(value) || 0) > 0) {
        updated.debit = 0;
      }

      return updated;
    }));
  };

  // ============================================================================
  // ACCOUNT SEARCH WITH DEBOUNCE
  // ============================================================================

  const handleAccountSearch = (lineId: string, searchTerm: string) => {
    setSearchTerms({ ...searchTerms, [lineId]: searchTerm });
  };

  // Debounce account filtering (300ms) to improve performance during typing
  const debouncedSearchTerms = useDebounce(searchTerms, 300);

  useEffect(() => {
    // Batch all state updates together
    const newFilteredAccounts: Record<string, IChartAccount[]> = {};

    Object.entries(debouncedSearchTerms).forEach(([lineId, searchTerm]) => {
      if (!searchTerm.trim()) {
        newFilteredAccounts[lineId] = chartAccounts;
        return;
      }

      const term = searchTerm.toLowerCase();
      newFilteredAccounts[lineId] = chartAccounts.filter(acc =>
        acc.code.toLowerCase().includes(term) ||
        acc.name.toLowerCase().includes(term) ||
        (acc.nameAr && acc.nameAr.includes(term))
      );
    });

    setFilteredAccounts(prev => ({ ...prev, ...newFilteredAccounts }));
  }, [debouncedSearchTerms, chartAccounts]);

  // ============================================================================
  // QUICK BALANCE HELPERS
  // ============================================================================

  const balanceEntry = () => {
    if (lines.length < 2) return;

    // Simple heuristic: if first line has debit, balance with credit on second line
    const firstLine = lines[0];
    const hasDebit = (Number(firstLine.debit) || 0) > 0;
    
    if (hasDebit) {
      const amount = Number(firstLine.debit) || 0;
      updateLine(lines[1].id, 'credit', amount);
      updateLine(lines[1].id, 'debit', 0);
    } else {
      const amount = Number(firstLine.credit) || 0;
      updateLine(lines[1].id, 'debit', amount);
      updateLine(lines[1].id, 'credit', 0);
    }
  };

  const clearAllAmounts = () => {
    setLines(lines.map(line => ({ ...line, debit: 0, credit: 0 })));
  };

  // ============================================================================
  // FORM VALIDATION
  // ============================================================================

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!journalDate) newErrors.journalDate = 'Journal date is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    
    // Validate lines
    if (lines.length < 2) {
      newErrors.lines = 'At least 2 journal lines are required';
    }

    lines.forEach((line, index) => {
      if (!line.accountId) {
        newErrors[`line_${index}_account`] = 'Account is required';
      }
      const lineTotal = (Number(line.debit) || 0) + (Number(line.credit) || 0);
      if (lineTotal === 0) {
        newErrors[`line_${index}_amount`] = 'Either debit or credit must be greater than 0';
      }
      if ((Number(line.debit) || 0) > 0 && (Number(line.credit) || 0) > 0) {
        newErrors[`line_${index}_both`] = 'Line cannot have both debit and credit';
      }
    });

    // Balance validation
    if (!isBalanced) {
      newErrors.balance = `Journal entry is out of balance by ${Math.abs(balanceDifference).toFixed(2)}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: IJournalEntryData = {
        journalDate,
        description,
        sourceType,
        sourceNumber: sourceNumber || undefined,
        lines: lines.map(line => ({
          id: line.id,
          lineNumber: line.lineNumber,
          accountId: line.accountId,
          accountCode: line.accountCode,
          accountName: line.accountName,
          description: line.description,
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          propertyId: line.propertyId,
          unitId: line.unitId
        }))
      };

      if (onSubmit) {
        await onSubmit(payload);
      } else {
        // Default API call
        const response = await fetch('/api/finance/journals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          setErrors({ submit: errorData.error || 'Failed to create journal entry' });
        }
      }
    } catch (error) {
      import('../../lib/logger').then(({ logError }) => {
        logError('Error submitting journal entry', error as Error, {
          component: 'JournalEntryForm',
          action: 'handleSubmit',
          linesCount: lines.length,
        });
      }).catch(err => {
        logger.error('Failed to load logger:', { error: err });
      });
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <div className="bg-card shadow-md rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">{t('finance.journal.entryDetails', 'Journal Entry Details')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('finance.journal.journalDate', 'Journal Date')} <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={journalDate}
              onChange={(e) => setJournalDate(e.target.value)}
              className={`w-full px-3 py-2 border rounded-2xl ${errors.journalDate ? 'border-destructive' : 'border-border'}`}
              required
            />
            {errors.journalDate && <p className="text-xs text-destructive mt-1">{errors.journalDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('finance.journal.sourceType', 'Source Type')}
            </label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-2xl"
            >
              <option value="MANUAL">{t('finance.journal.sourceType.manual', 'Manual Entry')}</option>
              <option value="ADJUSTMENT">{t('finance.journal.sourceType.adjustment', 'Adjustment')}</option>
              <option value="WORK_ORDER">{t('finance.journal.sourceType.workOrder', 'Work Order')}</option>
              <option value="INVOICE">{t('finance.journal.sourceType.invoice', 'Invoice')}</option>
              <option value="PAYMENT">{t('finance.journal.sourceType.payment', 'Payment')}</option>
              <option value="RENT">{t('finance.journal.sourceType.rent', 'Rent')}</option>
              <option value="EXPENSE">{t('finance.journal.sourceType.expense', 'Expense')}</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('common.description', 'Description')} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-3 py-2 border rounded-2xl ${errors.description ? 'border-destructive' : 'border-border'}`}
              placeholder={t('finance.journal.descriptionPlaceholder', 'Brief description of the journal entry')}
              required
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
          </div>

          {sourceType !== 'MANUAL' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('finance.journal.sourceReference', 'Source Reference Number')}
              </label>
              <input
                type="text"
                value={sourceNumber}
                onChange={(e) => setSourceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-2xl"
                placeholder={t('common.optional', 'Optional')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Journal Lines */}
      <div className="bg-card shadow-md rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold">{t('finance.journal.journalLines', 'Journal Lines')}</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={balanceEntry}
              className="px-3 py-1 text-sm bg-primary/10 text-primary rounded hover:bg-primary/20"
              disabled={lines.length < 2}
            >
              {t('finance.journal.quickBalance', 'Quick Balance')}
            </button>
            <button
              type="button"
              onClick={clearAllAmounts}
              className="px-3 py-1 text-sm bg-muted text-foreground rounded hover:bg-muted"
            >
              {t('finance.journal.clearAmounts', 'Clear Amounts')}
            </button>
            <button
              type="button"
              onClick={addLine}
              className="px-3 py-1 text-sm bg-success text-white rounded hover:bg-success"
            >
              + {t('finance.journal.addLine', 'Add Line')}
            </button>
          </div>
        </div>

        {errors.lines && (
          <div className="bg-red-50 border border-destructive/20 rounded p-2">
            <p className="text-sm text-destructive">{errors.lines}</p>
          </div>
        )}

        {/* Lines Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground uppercase w-12">
                  #
                </th>
                <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground uppercase">
                  {t('finance.account', 'Account')}
                </th>
                <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground uppercase">
                  {t('common.description', 'Description')}
                </th>
                <th className="px-2 py-2 text-end text-xs font-medium text-muted-foreground uppercase w-28">
                  {t('finance.debit', 'Debit')}
                </th>
                <th className="px-2 py-2 text-end text-xs font-medium text-muted-foreground uppercase w-28">
                  {t('finance.credit', 'Credit')}
                </th>
                <th className="px-2 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {lines.map((line, index) => (
                <tr key={line.id}>
                  <td className="px-2 py-2 text-sm text-foreground">
                    {line.lineNumber}
                  </td>
                  <td className="px-2 py-2">
                    {/* Searchable account selector: use filteredAccounts per line (falls back to full chartAccounts) */}
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={searchTerms[line.id] || ''}
                        onChange={(e) => handleAccountSearch(line.id, e.target.value)}
                        placeholder={loadingAccounts ? String(t('common.loading', 'Loading...')) : String(t('finance.journal.searchAccount', 'Search account by code or name'))}
                        className="w-full px-2 py-1 text-sm border border-border rounded"
                        disabled={loadingAccounts}
                        aria-label={String(t('finance.journal.searchAccountLabel', 'Search account'))}
                      />

                      <select
                        value={line.accountId}
                        onChange={(e) => updateLine(line.id, 'accountId', e.target.value)}
                        className={`w-full px-2 py-1 text-sm border rounded ${errors[`line_${index}_account`] ? 'border-destructive' : 'border-border'}`}
                        disabled={loadingAccounts}
                      >
                        <option value="">{loadingAccounts ? t('common.loading', 'Loading...') : t('finance.journal.selectAccount', 'Select Account')}</option>
                        {(filteredAccounts[line.id] ?? chartAccounts).map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>

                      {errors[`line_${index}_account`] && (
                        <p className="text-xs text-destructive mt-1">{errors[`line_${index}_account`]}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-border rounded"
                      placeholder={t('finance.journal.lineDescription', 'Line description')}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.debit || ''}
                      onChange={(e) => updateLine(line.id, 'debit', Number(e.target.value) || 0)}
                      className={`w-full px-2 py-1 text-sm text-end border rounded ${errors[`line_${index}_amount`] || errors[`line_${index}_both`] ? 'border-destructive' : 'border-border'}`}
                      disabled={(Number(line.credit) || 0) > 0}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.credit || ''}
                      onChange={(e) => updateLine(line.id, 'credit', Number(e.target.value) || 0)}
                      className={`w-full px-2 py-1 text-sm text-end border rounded ${errors[`line_${index}_amount`] || errors[`line_${index}_both`] ? 'border-destructive' : 'border-border'}`}
                      disabled={(Number(line.debit) || 0) > 0}
                    />
                  </td>
                  <td className="px-2 py-2">
                    {lines.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="text-destructive hover:text-destructive"
                        title={t('finance.journal.removeLine', 'Remove line')}
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted border-t-2 border-border">
              <tr>
                <td colSpan={3} className="px-2 py-2 text-sm font-semibold text-end">
                  {t('common.totals', 'Totals')}:
                </td>
                <td className="px-2 py-2 text-sm font-bold text-end">
                  {totalDebit.toFixed(2)}
                </td>
                <td className="px-2 py-2 text-sm font-bold text-end">
                  {totalCredit.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Balance Status */}
        <div className={`p-4 rounded-2xl ${isBalanced ? 'bg-green-50 border border-success/20' : 'bg-red-50 border border-destructive/20'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-semibold ${isBalanced ? 'text-success' : 'text-destructive'}`}>
                {isBalanced ? (
                  <span>✓ {t('finance.journal.entryBalanced', 'Entry is Balanced')}</span>
                ) : (
                  <span>✗ {t('finance.journal.entryUnbalanced', 'Entry is Out of Balance')}</span>
                )}
              </p>
              {!isBalanced && totalDebit > 0 && (
                <p className="text-sm text-destructive mt-1">
                  {balanceDifference > 0 
                    ? t('finance.journal.debitsExceed', 'Debits exceed credits by') + ` ${balanceDifference.toFixed(2)}`
                    : t('finance.journal.creditsExceed', 'Credits exceed debits by') + ` ${Math.abs(balanceDifference).toFixed(2)}`
                  }
                </p>
              )}
            </div>
            <div className="text-end">
              <p className="text-sm text-muted-foreground">{t('finance.journal.totalLines', 'Total Lines')}: {lines.length}</p>
              <p className="text-sm text-muted-foreground">{t('finance.journal.difference', 'Difference')}: {Math.abs(balanceDifference).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {errors.balance && (
          <div className="bg-red-50 border border-destructive/20 rounded p-2">
            <p className="text-sm text-destructive">{errors.balance}</p>
          </div>
        )}
      </div>

      {/* Submit Actions */}
      <div className="flex justify-end gap-3 bg-card shadow-md rounded-2xl p-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-border rounded-2xl text-foreground hover:bg-muted"
            disabled={isSubmitting}
          >
            {t('common.cancel', 'Cancel')}
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2 bg-primary text-white rounded-2xl hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting || !isBalanced || loadingAccounts}
        >
          {isSubmitting ? t('common.saving', 'Saving...') : mode === 'create' ? t('finance.journal.createEntry', 'Create Journal Entry') : t('common.saveChanges', 'Save Changes')}
        </button>
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-destructive/20 rounded-2xl p-4">
          <p className="text-sm text-destructive">{errors.submit}</p>
        </div>
      )}
    </div>
  );
}
