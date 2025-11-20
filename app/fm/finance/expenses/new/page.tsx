'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useFormState } from '@/contexts/FormStateContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { logger } from '@/lib/logger';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';
// ============================================================================
// INTERFACES
// ============================================================================

interface IExpenseLineItem {
  id: string;
  description: string;
  category: string;
  accountId: string;
  accountCode: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxable: boolean;
  taxRate: number;
  taxAmount: number;
}

interface IReceipt {
  id: string;
  file: File;
  preview: string;
}

interface IBudgetInfo {
  budgetId: string;
  category: string;
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
}

interface IVendor {
  id: string;
  name: string;
  type: string;
}

interface IChartAccount {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  type: string;
}

const CATEGORY_LABELS: Record<string, { key: string; fallback: string }> = {
  MAINTENANCE_REPAIR: { key: 'finance.category.maintenance', fallback: 'Maintenance & Repair' },
  UTILITIES: { key: 'finance.category.utilities', fallback: 'Utilities' },
  OFFICE_SUPPLIES: { key: 'finance.category.officeSupplies', fallback: 'Office Supplies' },
  HVAC: { key: 'finance.category.hvac', fallback: 'HVAC' },
  PLUMBING: { key: 'finance.category.plumbing', fallback: 'Plumbing' },
  ELECTRICAL: { key: 'finance.category.electrical', fallback: 'Electrical' },
  OTHER: { key: 'finance.category.other', fallback: 'Other' },
};

export default function NewExpensePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { registerForm, unregisterForm } = useFormState();
  const { hasOrgContext, guard, orgId, supportBanner } = useFmOrgGuard({ moduleId: 'finance' });
  const missingOrg = !hasOrgContext || !orgId;

  // Core form state
  const [expenseType, setExpenseType] = useState<string>('OPERATIONAL');
  const [expenseDate, setExpenseDate] = useState<string>(''); // ✅ HYDRATION FIX: Initialize empty
  const [dueDate, setDueDate] = useState<string>('');
  const [vendorId, setVendorId] = useState<string>('');
  const [vendorName, setVendorName] = useState<string>('');
  const [propertyId, setPropertyId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [currency, setCurrency] = useState<string>('SAR');
  
  // Line items state
  const [lineItems, setLineItems] = useState<IExpenseLineItem[]>([
    {
      id: '1',
      description: '',
      category: 'MAINTENANCE_REPAIR',
      accountId: '',
      accountCode: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      taxable: true,
      taxRate: 0.15,
      taxAmount: 0
    }
  ]);

  // Receipts state (multiple files)
  const [receipts, setReceipts] = useState<IReceipt[]>([]);

  // Data lookups
  const [vendors, setVendors] = useState<IVendor[]>([]);
  const [chartAccounts, setChartAccounts] = useState<IChartAccount[]>([]);
  const [budgetInfo, setBudgetInfo] = useState<IBudgetInfo[]>([]);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Calculate totals from line items
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalAmount = subtotal + totalTax;
  const getCategoryLabel = (category: string) => {
    const lookup = CATEGORY_LABELS[category.toUpperCase()] ?? CATEGORY_LABELS.OTHER;
    return t(lookup.key, lookup.fallback);
  };

  // ============================================================================
  // LIFECYCLE & DATA LOADING
  // ============================================================================

  // ✅ HYDRATION FIX: Set default date after client hydration
  useEffect(() => {
    if (!expenseDate) {
      setExpenseDate(new Date().toISOString().split('T')[0]);
    }
  }, [expenseDate]);

  // Register form
  useEffect(() => {
    const formId = 'new-expense-form';
    registerForm(formId);
    return () => unregisterForm(formId);
  }, [registerForm, unregisterForm]);

  // Load vendors
  useEffect(() => {
    const loadVendors = async () => {
      try {
        setLoadingVendors(true);
        const response = await fetch('/api/vendors');
        if (response.ok) {
          const data = await response.json();
          setVendors(data.vendors || []);
        }
      } catch (_error) {
        logger.error('Error loading vendors:', _error);
      } finally {
        setLoadingVendors(false);
      }
    };
    loadVendors();
  }, []);

  // Load chart of accounts
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoadingAccounts(true);
        const response = await fetch('/api/finance/accounts');
        if (response.ok) {
          const data = await response.json();
          setChartAccounts(data.accounts || []);
        }
      } catch (_error) {
        logger.error('Error loading accounts:', _error);
      } finally {
        setLoadingAccounts(false);
      }
    };
    loadAccounts();
  }, []);

  // Load budget info when property or line items change
  useEffect(() => {
    const loadBudgetInfo = async () => {
      if (!propertyId || lineItems.length === 0) {
        setBudgetInfo([]);
        return;
      }

      try {
        const categories = [...new Set(lineItems.map(item => item.category))];
        const budgets: IBudgetInfo[] = [];

        for (const category of categories) {
          const response = await fetch(
            `/api/finance/budgets?propertyId=${propertyId}&category=${category}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.budget) {
              budgets.push({
                budgetId: data.budget.id,
                category,
                budgetedAmount: data.budget.amount,
                spentAmount: data.budget.spent,
                remainingAmount: data.budget.remaining,
                percentage: (data.budget.spent / data.budget.amount) * 100
              });
            }
          }
        }

        setBudgetInfo(budgets);
      } catch (_error) {
        logger.error('Error loading budget info:', _error);
      }
    };

    loadBudgetInfo();
  }, [propertyId, lineItems]);

  // ============================================================================
  // LINE ITEMS MANAGEMENT
  // ============================================================================

  const addLineItem = () => {
    const newItem: IExpenseLineItem = {
      id: Date.now().toString(),
      description: '',
      category: 'MAINTENANCE_REPAIR',
      accountId: '',
      accountCode: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      taxable: true,
      taxRate: 0.15,
      taxAmount: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof IExpenseLineItem, value: string | number | boolean) => {
    setLineItems(lineItems.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      // Recalculate amounts
      if (field === 'quantity' || field === 'unitPrice') {
        updated.amount = updated.quantity * updated.unitPrice;
        updated.taxAmount = updated.taxable ? updated.amount * updated.taxRate : 0;
      }

      if (field === 'taxable' || field === 'taxRate') {
        updated.taxAmount = updated.taxable ? updated.amount * updated.taxRate : 0;
      }

      // Update account code when account changes
      if (field === 'accountId') {
        const account = chartAccounts.find(a => a.id === value);
        if (account) {
          updated.accountCode = account.code;
        }
      }

      return updated;
    }));
  };

  // ============================================================================
  // RECEIPTS MANAGEMENT (MULTIPLE FILES)
  // ============================================================================

  const handleReceiptsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newReceipts: IReceipt[] = Array.from(e.target.files).map(file => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file)
      }));
      setReceipts([...receipts, ...newReceipts]);
    }
  };

  const removeReceipt = (id: string) => {
    const receipt = receipts.find(r => r.id === id);
    if (receipt) {
      URL.revokeObjectURL(receipt.preview);
    }
    setReceipts(receipts.filter(r => r.id !== id));
  };

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!expenseDate) {
      newErrors.expenseDate = t('finance.expense.dateRequired', 'Expense date is required');
    }

    if (!vendorName.trim()) {
      newErrors.vendorName = t('finance.expense.vendorRequired', 'Vendor name is required');
    }

    if (!description.trim()) {
      newErrors.description = t('finance.expense.descriptionRequired', 'Description is required');
    }

    if (lineItems.length === 0) {
      newErrors.lineItems = t('finance.expense.lineItemsRequired', 'At least one line item is required');
    }

    // Validate each line item
    lineItems.forEach((item, index) => {
      if (!item.description.trim()) {
        newErrors[`lineItem.${index}.description`] = t('finance.expense.lineItemDescRequired', 'Description required');
      }
      if (item.quantity <= 0) {
        newErrors[`lineItem.${index}.quantity`] = t('finance.expense.lineItemQtyInvalid', 'Quantity must be > 0');
      }
      if (item.unitPrice <= 0) {
        newErrors[`lineItem.${index}.unitPrice`] = t('finance.expense.lineItemPriceInvalid', 'Price must be > 0');
      }
    });

    if (totalAmount <= 0) {
      newErrors.totalAmount = t('finance.expense.totalInvalid', 'Total amount must be greater than zero');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  const handleSaveDraft = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const payload = {
        expenseType,
        status: 'DRAFT',
        expenseDate,
        dueDate: dueDate || undefined,
        vendorId: vendorId || undefined,
        vendorName,
        propertyId: propertyId || undefined,
        description,
        notes,
        paymentMethod,
        currency,
        lineItems: lineItems.map(item => ({
          description: item.description,
          category: item.category,
          accountId: item.accountId || undefined,
          accountCode: item.accountCode || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          taxable: item.taxable,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount
        })),
        subtotal,
        totalTax,
        totalAmount
      };

      const response = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save draft');
      }

      const data = await response.json();

      // Upload receipts if any
      if (receipts.length > 0 && data.expense?.id) {
        await uploadReceipts(data.expense.id);
      }

      toast.success(t('finance.expense.draftSaved', 'Expense draft saved successfully'));
      if (data?.expense?.id) {
        router.push(`/finance/expenses/${data.expense.id}`);
      }
    } catch (_error) {
      logger.error('Error saving draft:', _error);
      toast.error(t('common.error', 'An error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const payload = {
        expenseType,
        status: 'SUBMITTED',
        expenseDate,
        dueDate: dueDate || undefined,
        vendorId: vendorId || undefined,
        vendorName,
        propertyId: propertyId || undefined,
        description,
        notes,
        paymentMethod,
        currency,
        lineItems: lineItems.map(item => ({
          description: item.description,
          category: item.category,
          accountId: item.accountId || undefined,
          accountCode: item.accountCode || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          taxable: item.taxable,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount
        })),
        subtotal,
        totalTax,
        totalAmount,
        requiresApproval: true
      };

      const response = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit expense');
      }

      const data = await response.json();

      // Upload receipts if any
      if (receipts.length > 0 && data.expense?.id) {
        await uploadReceipts(data.expense.id);
      }

      toast.success(t('finance.expense.submitted', 'Expense submitted for approval'));
      if (data?.expense?.id) {
        router.push(`/finance/expenses/${data.expense.id}`);
      }
    } catch (_error) {
      logger.error('Error submitting expense:', _error);
      toast.error(t('common.error', 'An error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadReceipts = async (expenseId: string) => {
    try {
      for (const receipt of receipts) {
        const formData = new FormData();
        formData.append('file', receipt.file);
        formData.append('expenseId', expenseId);

        await fetch('/api/finance/expenses/receipts', {
          method: 'POST',
          body: formData
        });
      }
    } catch (_error) {
      logger.error('Error uploading receipts:', _error);
      // Don't throw - expense is already created
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (missingOrg) {
    return (
      <div className="space-y-6">
        <ModuleViewTabs moduleId="finance" />
        {guard}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="finance" />
      {supportBanner}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('finance.expense.title', 'New Expense')}</h1>
          <p className="text-muted-foreground">{t('finance.expense.subtitle', 'Record a new business expense with line items and approvals')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSaveDraft} 
            disabled={isSubmitting}
            className="btn-secondary"
          >
            💾 {t('common.save', 'Save Draft')}
          </button>
          <button 
            onClick={handleSubmitForApproval} 
            disabled={isSubmitting}
            className="btn-primary"
          >
            ✓ {t('finance.expense.submitForApproval', 'Submit for Approval')}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expense Details */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.expense.details', 'Expense Details')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('finance.expense.type', 'Expense Type')} *
                </label>
                <select 
                  value={expenseType}
                  onChange={(e) => setExpenseType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="OPERATIONAL">{t('finance.expense.operational', 'Operational')}</option>
                  <option value="MAINTENANCE">{t('finance.expense.maintenance', 'Maintenance')}</option>
                  <option value="CAPITAL">{t('finance.expense.capital', 'Capital')}</option>
                  <option value="UTILITY">{t('finance.expense.utility', 'Utility')}</option>
                  <option value="ADMINISTRATIVE">{t('finance.expense.administrative', 'Administrative')}</option>
                  <option value="OTHER">{t('finance.expense.other', 'Other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('finance.expense.date', 'Expense Date')} *
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent ${errors.expenseDate ? 'border-destructive' : 'border-border'}`}
                />
                {errors.expenseDate && <p className="text-destructive text-xs mt-1">{errors.expenseDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('finance.expense.dueDate', 'Due Date')}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('workOrders.property', 'Property')}
                </label>
                <select 
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t('finance.allProperties', 'All Properties')}</option>
                  <option value="prop1">Tower A</option>
                  <option value="prop2">Tower B</option>
                  <option value="prop3">Villa Complex</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vendor Information */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.expense.vendorInfo', 'Vendor Information')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('finance.expense.vendorSupplier', 'Vendor/Supplier')} *
                </label>
                <select 
                  value={vendorId}
                  onChange={(e) => {
                    setVendorId(e.target.value);
                    const vendor = vendors.find(v => v.id === e.target.value);
                    if (vendor) setVendorName(vendor.name);
                  }}
                  className={`w-full px-3 py-2 border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent ${errors.vendorName ? 'border-destructive' : 'border-border'}`}
                  disabled={loadingVendors}
                >
                  <option value="">{loadingVendors ? t('common.loading', 'Loading...') : t('finance.expense.selectVendor', 'Select Vendor')}</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
                {errors.vendorName && <p className="text-destructive text-xs mt-1">{errors.vendorName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('finance.expense.vendorName', 'Vendor Name')}
                </label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder={t('finance.expense.vendorNamePlaceholder', 'Enter vendor name')}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.expense.information', 'Expense Information')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('finance.expense.description', 'Description')} *
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('finance.expense.descriptionPlaceholder', 'Brief description of the expense...')}
                  className={`w-full px-3 py-2 border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent ${errors.description ? 'border-destructive' : 'border-border'}`}
                />
                {errors.description && <p className="text-destructive text-xs mt-1">{errors.description}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('finance.notes', 'Notes')}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('finance.notesPlaceholder', 'Additional notes...')}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* LINE ITEMS EDITOR (NEW) */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('finance.expense.lineItems', 'Line Items')}</h3>
              <button 
                onClick={addLineItem}
                className="btn-sm btn-primary"
              >
                + {t('finance.expense.addLineItem', 'Add Item')}
              </button>
            </div>
            
            {errors.lineItems && <p className="text-destructive text-sm mb-2">{errors.lineItems}</p>}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-2 text-start">{t('finance.expense.description', 'Description')}</th>
                    <th className="px-2 py-2 text-start">{t('finance.expense.category', 'Category')}</th>
                    <th className="px-2 py-2 text-start">{t('finance.expense.account', 'GL Account')}</th>
                    <th className="px-2 py-2 text-end">{t('finance.expense.qty', 'Qty')}</th>
                    <th className="px-2 py-2 text-end">{t('finance.expense.unitPrice', 'Unit Price')}</th>
                    <th className="px-2 py-2 text-center">{t('finance.expense.taxable', 'Tax')}</th>
                    <th className="px-2 py-2 text-end">{t('finance.expense.amount', 'Amount')}</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                          placeholder={t('finance.expense.itemDescription', 'Item description')}
                          className={`w-full px-2 py-1 text-sm border rounded ${errors[`lineItem.${index}.description`] ? 'border-destructive' : 'border-border'}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={item.category}
                          onChange={(e) => updateLineItem(item.id, 'category', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-border rounded"
                        >
                          <option value="MAINTENANCE_REPAIR">{t('finance.category.maintenance', 'Maintenance')}</option>
                          <option value="UTILITIES">{t('finance.category.utilities', 'Utilities')}</option>
                          <option value="OFFICE_SUPPLIES">{t('finance.category.officeSupplies', 'Office Supplies')}</option>
                          <option value="HVAC">{t('finance.category.hvac', 'HVAC')}</option>
                          <option value="PLUMBING">{t('finance.category.plumbing', 'Plumbing')}</option>
                          <option value="ELECTRICAL">{t('finance.category.electrical', 'Electrical')}</option>
                          <option value="OTHER">{t('finance.category.other', 'Other')}</option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={item.accountId}
                          onChange={(e) => updateLineItem(item.id, 'accountId', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-border rounded"
                          disabled={loadingAccounts}
                        >
                          <option value="">{loadingAccounts ? t('common.loading', 'Loading...') : t('finance.selectAccount', 'Select Account')}</option>
                          {chartAccounts
                            .filter(a => a.type === 'EXPENSE')
                            .map(account => (
                              <option key={account.id} value={account.id}>
                                {account.code} - {account.name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                          min="1"
                          step="1"
                          className={`w-20 px-2 py-1 text-sm text-end border rounded ${errors[`lineItem.${index}.quantity`] ? 'border-destructive' : 'border-border'}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className={`w-24 px-2 py-1 text-sm text-end border rounded ${errors[`lineItem.${index}.unitPrice`] ? 'border-destructive' : 'border-border'}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={item.taxable}
                          onChange={(e) => updateLineItem(item.id, 'taxable', e.target.checked)}
                          className="rounded"
                        />
                        {item.taxable && <span className="text-xs text-muted-foreground ms-1">15%</span>}
                      </td>
                      <td className="px-2 py-2 text-end font-medium">
                        {currency} {(item.amount + item.taxAmount).toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        {lineItems.length > 1 && (
                          <button
                            onClick={() => removeLineItem(item.id)}
                            className="text-destructive hover:text-destructive"
                            title={t('common.remove', 'Remove')}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MULTIPLE RECEIPTS UPLOAD (NEW) */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.receiptDocumentation', 'Receipts & Documentation')}</h3>
            
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-2xl p-6 text-center mb-4">
              <div className="text-muted-foreground mb-2">📎 {t('finance.uploadMultipleReceipts', 'Upload multiple receipts')}</div>
              <p className="text-sm text-muted-foreground mb-2">{t('finance.supportedFormats', 'Supported: Images, PDF')}</p>
              <input 
                type="file" 
                id="receipt-upload" 
                onChange={handleReceiptsChange} 
                className="hidden" 
                accept="image/*,application/pdf"
                multiple
              />
              <button 
                type="button" 
                onClick={() => document.getElementById('receipt-upload')?.click()}
                className="btn-sm btn-secondary"
              >
                {t('finance.chooseFiles', 'Choose Files')}
              </button>
            </div>

            {receipts.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {receipts.map((receipt) => (
                  <div key={receipt.id} className="relative border border-border rounded-2xl p-2">
                    {receipt.file.type.startsWith('image/') ? (
                      <>
                        <img src={receipt.preview} alt={receipt.file.name} className="w-full h-32 object-cover rounded" />
                      </>
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-muted rounded">
                        <span className="text-4xl">📄</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 truncate">{receipt.file.name}</p>
                    <button
                      onClick={() => removeReceipt(receipt.id)}
                      className="absolute top-1 end-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/90"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.expense.paymentDetails', 'Payment Details')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('finance.paymentMethod', 'Payment Method')}
                </label>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="CASH">{t('finance.payment.cash', 'Cash')}</option>
                  <option value="BANK_TRANSFER">{t('finance.payment.bankTransfer', 'Bank Transfer')}</option>
                  <option value="CHEQUE">{t('finance.payment.cheque', 'Cheque')}</option>
                  <option value="CARD">{t('finance.payment.card', 'Card')}</option>
                  <option value="CREDIT">{t('finance.payment.credit', 'Credit')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('finance.currency', 'Currency')}
                </label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="SAR">SAR - Saudi Riyal</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="AED">AED - UAE Dirham</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Expense Summary */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.expense.summary', 'Expense Summary')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('finance.subtotal', 'Subtotal')}</span>
                <span className="font-medium">{currency} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('finance.vat', 'VAT')} (15%)</span>
                <span className="font-medium">{currency} {totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-foreground font-semibold">{t('finance.total', 'Total')}</span>
                <span className="font-bold text-lg">{currency} {totalAmount.toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {lineItems.length} {t('finance.expense.items', 'item(s)')}
              </div>
            </div>
          </div>

          {/* REAL-TIME BUDGET TRACKING (NEW) */}
          {budgetInfo.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">{t('finance.expense.budgetStatus', 'Budget Status')}</h3>
              <div className="space-y-3">
                {budgetInfo.map((budget) => (
                  <div key={budget.budgetId}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-muted-foreground">{getCategoryLabel(budget.category)}</span>
                      <span className="text-xs text-muted-foreground">{budget.percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          budget.percentage < 70 
                            ? 'bg-success' 
                            : budget.percentage < 90 
                            ? 'bg-warning' 
                            : 'bg-destructive'
                        }`}
                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{currency} {budget.spentAmount.toFixed(0)} / {budget.budgetedAmount.toFixed(0)}</span>
                      <span>{currency} {budget.remainingAmount.toFixed(0)} {t('finance.remaining', 'remaining')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.expense.budgetStatus', 'Budget Status')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('finance.expense.maintenanceBudget', 'Maintenance Budget')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-muted rounded">
                    <div className="w-3/4 h-full bg-success/20 rounded"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">75%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('finance.expense.utilitiesBudget', 'Utilities Budget')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-muted rounded">
                    <div className="w-1/2 h-full bg-accent/20 rounded"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">50%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.expense.recent', 'Recent Expenses')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <div>
                  <p className="text-sm font-medium">EXP-247</p>
                  <p className="text-xs text-muted-foreground">AC Maintenance</p>
                </div>
                <span className="text-sm font-medium text-destructive">-SAR 150</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <div>
                  <p className="text-sm font-medium">EXP-246</p>
                  <p className="text-xs text-muted-foreground">Office Supplies</p>
                </div>
                <span className="text-sm font-medium text-destructive">-SAR 85</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <div>
                  <p className="text-sm font-medium">EXP-245</p>
                  <p className="text-xs text-muted-foreground">Electrical Repair</p>
                </div>
                <span className="text-sm font-medium text-destructive">-SAR 320</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('workOrders.quickActions', 'Quick Actions')}</h3>
            <div className="space-y-2">
              <button className="w-full btn-ghost text-start">
                📊 {t('finance.expense.viewBudget', 'View Budget')}
              </button>
              <button className="w-full btn-ghost text-start">
                📋 {t('finance.expense.bulkEntry', 'Bulk Expense Entry')}
              </button>
              <button className="w-full btn-ghost text-start">
                📄 {t('finance.expense.templates', 'Expense Templates')}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.recentActivity', 'Recent Activity')}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success/20 rounded-full"></div>
                <span className="text-muted-foreground">{t('finance.formAutoSaved', 'Form auto-saved')}</span>
                <span className="text-muted-foreground ms-auto">2m ago</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary/20 rounded-full"></div>
                <span className="text-muted-foreground">{t('finance.expense.category', 'Category')} {t('common.selected', 'selected')}</span>
                <span className="text-muted-foreground ms-auto">4m ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
