'use client';

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

export default function NewExpensePage() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">{t('finance.expense.title', 'New Expense')}</h1>
          <p className="text-[var(--fixzit-text-secondary)]">{t('finance.expense.subtitle', 'Record a new business expense or cost')}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">{t('common.save', 'Save Draft')}</button>
          <button className="btn-primary">{t('finance.expense.recordExpense', 'Record Expense')}</button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.expense.details', 'Expense Details')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.expense.reference', 'Expense Reference')} *
                </label>
                <input
                  type="text"
                  placeholder="EXP-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.expense.date', 'Expense Date')} *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.expense.category', 'Expense Category')} *
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>{t('finance.expense.selectCategory', 'Select Category')}</option>
                  <option>{t('finance.expense.maintenance', 'Maintenance & Repairs')}</option>
                  <option>{t('finance.expense.utilities', 'Utilities')}</option>
                  <option>{t('finance.expense.officeSupplies', 'Office Supplies')}</option>
                  <option>{t('finance.expense.equipment', 'Equipment')}</option>
                  <option>{t('finance.expense.insurance', 'Insurance')}</option>
                  <option>{t('finance.expense.professional', 'Professional Services')}</option>
                  <option>{t('finance.expense.marketing', 'Marketing')}</option>
                  <option>{t('finance.expense.travel', 'Travel & Transportation')}</option>
                  <option>{t('finance.expense.other', 'Other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('workOrders.property', 'Property')}
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>{t('finance.allProperties', 'All Properties')}</option>
                  <option>Tower A</option>
                  <option>Tower B</option>
                  <option>Villa Complex</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.expense.information', 'Expense Information')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.expense.description', 'Description')} *
                </label>
                <input
                  type="text"
                  placeholder={t('finance.expense.descriptionPlaceholder', 'Brief description of the expense...')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.expense.vendorSupplier', 'Vendor/Supplier')}
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>{t('finance.expense.selectVendor', 'Select Vendor')}</option>
                  <option>ABC Maintenance LLC</option>
                  <option>Electrical Solutions Co.</option>
                  <option>Plumbing Services Ltd</option>
                  <option>Office Supplies Direct</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.expense.amountPayment', 'Amount & Payment')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.amount', 'Amount')} *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">SAR</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.paymentMethod', 'Payment Method')}
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>{t('finance.payment.cash', 'Cash')}</option>
                  <option>{t('finance.payment.bankTransfer', 'Bank Transfer')}</option>
                  <option>{t('finance.payment.cheque', 'Cheque')}</option>
                  <option>{t('finance.payment.creditCard', 'Credit Card')}</option>
                  <option>{t('finance.payment.onlinePayment', 'Online Payment')}</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('finance.notes', 'Notes')}
              </label>
              <textarea
                rows={3}
                placeholder={t('finance.notesPlaceholder', 'Additional notes...')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
              />
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.receiptDocumentation', 'Receipt & Documentation')}</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="text-gray-400 mb-2">📎</div>
              <p className="text-sm text-gray-600">{t('finance.uploadInvoice', 'Upload receipt or invoice')}</p>
              <button className="mt-2 text-sm text-[var(--fixzit-blue)] hover:underline">
                {t('finance.chooseFile', 'Choose File')}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.expense.summary', 'Expense Summary')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('finance.amount', 'Amount')}</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('finance.vat', 'VAT')} (15%)</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('finance.total', 'Total')}</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.expense.budgetStatus', 'Budget Status')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('finance.expense.maintenanceBudget', 'Maintenance Budget')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 rounded">
                    <div className="w-3/4 h-full bg-[var(--fixzit-success-light)] rounded"></div>
                  </div>
                  <span className="text-xs text-gray-500">75%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('finance.expense.utilitiesBudget', 'Utilities Budget')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 rounded">
                    <div className="w-1/2 h-full bg-[var(--fixzit-accent-light)] rounded"></div>
                  </div>
                  <span className="text-xs text-gray-500">50%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.expense.recent', 'Recent Expenses')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">EXP-247</p>
                  <p className="text-xs text-gray-600">AC Maintenance</p>
                </div>
                <span className="text-sm font-medium text-[var(--fixzit-danger)]">-SAR 150</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">EXP-246</p>
                  <p className="text-xs text-gray-600">Office Supplies</p>
                </div>
                <span className="text-sm font-medium text-[var(--fixzit-danger)]">-SAR 85</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">EXP-245</p>
                  <p className="text-xs text-gray-600">Electrical Repair</p>
                </div>
                <span className="text-sm font-medium text-[var(--fixzit-danger)]">-SAR 320</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('workOrders.quickActions', 'Quick Actions')}</h3>
            <div className="space-y-2">
              <button className="w-full btn-ghost text-left">
                📊 {t('finance.expense.viewBudget', 'View Budget')}
              </button>
              <button className="w-full btn-ghost text-left">
                📋 {t('finance.expense.bulkEntry', 'Bulk Expense Entry')}
              </button>
              <button className="w-full btn-ghost text-left">
                📄 {t('finance.expense.templates', 'Expense Templates')}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.recentActivity', 'Recent Activity')}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--fixzit-success-light)] rounded-full"></div>
                <span className="text-gray-600">{t('finance.formAutoSaved', 'Form auto-saved')}</span>
                <span className="text-gray-400 ml-auto">2m ago</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--fixzit-primary-light)] rounded-full"></div>
                <span className="text-gray-600">{t('finance.expense.category', 'Category')} {t('common.selected', 'selected')}</span>
                <span className="text-gray-400 ml-auto">4m ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

