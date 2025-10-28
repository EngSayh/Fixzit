'use client';

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

export default function NewInvoicePage() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">{t('finance.invoice.newInvoice', 'New Invoice')}</h1>
          <p className="text-[var(--fixzit-text-secondary)]">{t('finance.invoice.subtitle', 'Create a new invoice for services or products')}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">{t('common.save', 'Save Draft')}</button>
          <button className="btn-primary">{t('finance.invoice.createInvoice', 'Create Invoice')}</button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.invoice.details', 'Invoice Details')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.invoice.invoiceNumber', 'Invoice Number')} *
                </label>
                <input
                  type="text"
                  placeholder={t('finance.invoice.invoiceNumberPlaceholder', 'INV-001')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.invoice.issueDate', 'Issue Date')} *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.invoice.dueDate', 'Due Date')} *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.currency', 'Currency')}
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>{t('finance.currencySAR', 'SAR - Saudi Riyal')}</option>
                  <option>{t('finance.currencyUSD', 'USD - US Dollar')}</option>
                  <option>{t('finance.currencyEUR', 'EUR - Euro')}</option>
                  <option>{t('finance.currencyGBP', 'GBP - British Pound')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.invoice.billTo', 'Bill To')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.customer', 'Customer')} *
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>{t('finance.selectCustomer', 'Select Customer')}</option>
                  <option>John Smith - Tower A</option>
                  <option>Sarah Johnson - Tower B</option>
                  <option>Ahmed Al-Rashid - Villa 9</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.invoice.billingAddress', 'Billing Address')}
                </label>
                <textarea
                  rows={3}
                  placeholder={t('finance.invoice.billingAddressPlaceholder', 'Enter billing address...')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.invoice.itemsServices', 'Items & Services')}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-700 border-b pb-2">
                <div className="col-span-5">{t('finance.invoice.description', 'Description')}</div>
                <div className="col-span-2">{t('finance.invoice.qty', 'Qty')}</div>
                <div className="col-span-2">{t('finance.invoice.rate', 'Rate')}</div>
                <div className="col-span-2">{t('finance.invoice.amount', 'Amount')}</div>
                <div className="col-span-1">{t('common.actions', 'Actions')}</div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input
                    type="text"
                    placeholder="Item description..."
                    className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="1"
                    className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value="SAR 0.00"
                    readOnly
                    className="w-full px-2 py-2 bg-gray-50 border border-gray-300 rounded"
                  />
                </div>
                <div className="col-span-1">
                  <button className="text-[var(--fixzit-danger)] hover:text-[var(--fixzit-danger-darkest)]">🗑️</button>
                </div>
              </div>

              <button className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400">
                + {t('finance.invoice.addItem', 'Add Item')}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.invoice.notesTerms', 'Notes & Terms')}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('finance.invoice.invoiceNotes', 'Invoice Notes')}
              </label>
              <textarea
                rows={3}
                placeholder={t('finance.invoice.notesPlaceholder', 'Add notes or payment instructions...')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.invoice.summary', 'Invoice Summary')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('finance.subtotal', 'Subtotal')}</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('finance.vat', 'VAT (15%)')}</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('finance.discount', 'Discount')}</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-semibold">
                <span>{t('finance.total', 'Total')}</span>
                <span>SAR 0.00</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.invoice.paymentTerms', 'Payment Terms')}</h3>
            <div className="space-y-2">
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                <option>{t('finance.invoice.net30', 'Net 30 days')}</option>
                <option>{t('finance.invoice.net15', 'Net 15 days')}</option>
                <option>{t('finance.invoice.net7', 'Net 7 days')}</option>
                <option>{t('finance.invoice.dueOnReceipt', 'Due on receipt')}</option>
                <option>{t('finance.invoice.cod', 'Cash on delivery')}</option>
              </select>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('workOrders.quickActions', 'Quick Actions')}</h3>
            <div className="space-y-2">
              <button className="w-full btn-ghost text-left">
                📋 {t('finance.invoice.createFromTemplate', 'Create from Template')}
              </button>
              <button className="w-full btn-ghost text-left">
                📊 {t('finance.invoice.costCalculator', 'View Cost Calculator')}
              </button>
              <button className="w-full btn-ghost text-left">
                💰 {t('finance.invoice.paymentSchedule', 'Payment Schedule')}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.recentActivity', 'Recent Activity')}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--fixzit-success-light)] rounded-full"></div>
                <span className="text-gray-600">{t('finance.formAutoSaved', 'Form auto-saved')}</span>
                <span className="text-gray-400 ml-auto">{t('common.timeAgo2m', '2m ago')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--fixzit-primary-light)] rounded-full"></div>
                <span className="text-gray-600">{t('finance.invoice.customerSelected', 'Customer selected')}</span>
                <span className="text-gray-400 ml-auto">{t('common.timeAgo5m', '5m ago')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

