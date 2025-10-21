'use client';

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

export default function NewPaymentPage() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">{t('finance.payment.title', 'Record Payment')}</h1>
          <p className="text-[var(--fixzit-text-secondary)]">{t('finance.payment.subtitle', 'Record a new payment or income transaction')}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">{t('common.save', 'Save Draft')}</button>
          <button className="btn-primary">{t('finance.payment.recordPayment', 'Record Payment')}</button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.payment.details', 'Payment Details')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.payment.reference', 'Payment Reference')} *
                </label>
                <input
                  type="text"
                  placeholder="PAY-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.payment.date', 'Payment Date')} *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.payment.method', 'Payment Method')} *
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>{t('finance.payment.selectMethod', 'Select Method')}</option>
                  <option>{t('finance.payment.bankTransfer', 'Bank Transfer')}</option>
                  <option>{t('finance.payment.cash', 'Cash')}</option>
                  <option>{t('finance.payment.cheque', 'Cheque')}</option>
                  <option>{t('finance.payment.creditCard', 'Credit Card')}</option>
                  <option>{t('finance.payment.onlinePayment', 'Online Payment')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.currency', 'Currency')}
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>SAR - Saudi Riyal</option>
                  <option>USD - US Dollar</option>
                  <option>EUR - Euro</option>
                  <option>GBP - British Pound</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.payment.from', 'Payment From')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.payment.payerCustomer', 'Payer/Customer')} *
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>{t('finance.payment.selectPayer', 'Select Payer')}</option>
                  <option>John Smith - Tower A</option>
                  <option>Sarah Johnson - Tower B</option>
                  <option>Ahmed Al-Rashid - Villa 9</option>
                  <option>ABC Company Ltd</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('finance.payment.description', 'Payment Description')}
                </label>
                <input
                  type="text"
                  placeholder={t('finance.payment.descriptionPlaceholder', 'Monthly rent payment, Service fee, etc...')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.payment.amount', 'Payment Amount')}</h3>
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
                  {t('finance.payment.category', 'Category')}
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>{t('finance.payment.rentPayment', 'Rent Payment')}</option>
                  <option>{t('finance.payment.serviceFee', 'Service Fee')}</option>
                  <option>{t('finance.payment.securityDeposit', 'Security Deposit')}</option>
                  <option>{t('finance.payment.lateFee', 'Late Fee')}</option>
                  <option>{t('finance.payment.otherIncome', 'Other Income')}</option>
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
              <p className="text-sm text-gray-600">{t('finance.uploadReceipt', 'Upload receipt or supporting document')}</p>
              <button className="mt-2 text-sm text-[var(--fixzit-blue)] hover:underline">
                {t('finance.chooseFile', 'Choose File')}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.payment.summary', 'Payment Summary')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('finance.amount', 'Amount')}</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('finance.payment.processingFee', 'Processing Fee')}</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('finance.vat', 'VAT')} ({t('common.ifApplicable', 'if applicable')})</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-semibold">
                <span>{t('finance.payment.netAmount', 'Net Amount')}</span>
                <span>SAR 0.00</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.payment.recent', 'Recent Payments')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">PAY-247</p>
                  <p className="text-xs text-gray-600">John Smith</p>
                </div>
                <span className="text-sm font-medium">SAR 8,500</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">PAY-246</p>
                  <p className="text-xs text-gray-600">Sarah Johnson</p>
                </div>
                <span className="text-sm font-medium">SAR 12,000</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">PAY-245</p>
                  <p className="text-xs text-gray-600">Ahmed Al-Rashid</p>
                </div>
                <span className="text-sm font-medium">SAR 25,000</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('workOrders.quickActions', 'Quick Actions')}</h3>
            <div className="space-y-2">
              <button className="w-full btn-ghost text-left">
                📊 {t('finance.payment.generateReceipt', 'Generate Receipt')}
              </button>
              <button className="w-full btn-ghost text-left">
                💰 {t('finance.payment.bulkEntry', 'Bulk Payment Entry')}
              </button>
              <button className="w-full btn-ghost text-left">
                📋 {t('finance.payment.templates', 'Payment Templates')}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">{t('finance.recentActivity', 'Recent Activity')}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--fixzit-success-light)] rounded-full"></div>
                <span className="text-gray-600">{t('finance.formAutoSaved', 'Form auto-saved')}</span>
                <span className="text-gray-400 ml-auto">1m ago</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--fixzit-primary-light)] rounded-full"></div>
                <span className="text-gray-600">{t('finance.payment.payerCustomer', 'Payer')} {t('common.selected', 'selected')}</span>
                <span className="text-gray-400 ml-auto">3m ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

