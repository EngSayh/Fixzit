'use client';

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

export default function NewBudgetPage() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">New Budget</h1>
          <p className="text-[var(--fixzit-text-secondary)]">Create a new budget for expense tracking and control</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">{t('common.save', 'Save Draft')}</button>
          <button className="btn-primary">Create Budget</button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Budget Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Name *
                </label>
                <input
                  type="text"
                  placeholder="Q1 2025 Maintenance Budget"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Period *
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>Select Period</option>
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Semi-Annual</option>
                  <option>Annual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>All Properties</option>
                  <option>Tower A</option>
                  <option>Tower B</option>
                  <option>Villa Complex</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Owner
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>Select Owner</option>
                  <option>Property Manager</option>
                  <option>Maintenance Manager</option>
                  <option>Finance Manager</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Budget Categories & Amounts</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-700 border-b pb-2">
                <div className="col-span-6">Category</div>
                <div className="col-span-3">Budgeted Amount</div>
                <div className="col-span-2">Percentage</div>
                <div className="col-span-1">Actions</div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <select className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                    <option>Select Category</option>
                    <option>Maintenance & Repairs</option>
                    <option>Utilities</option>
                    <option>Insurance</option>
                    <option>Property Management</option>
                    <option>Security</option>
                    <option>Landscaping</option>
                    <option>Administrative</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full px-2 py-2 pr-12 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">SAR</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                  />
                </div>
                <div className="col-span-1">
                  <button className="text-red-600 hover:text-red-900">🗑️</button>
                </div>
              </div>

              <button className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400">
                + Add Category
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Budget Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="alerts"
                  className="mr-3 h-4 w-4 text-[var(--fixzit-blue)] focus:ring-[var(--fixzit-blue)] border-gray-300 rounded"
                />
                <label htmlFor="alerts" className="text-sm text-gray-700">
                  Enable budget alerts when spending exceeds 80% of category budget
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="approvals"
                  className="mr-3 h-4 w-4 text-[var(--fixzit-blue)] focus:ring-[var(--fixzit-blue)] border-gray-300 rounded"
                />
                <label htmlFor="approvals" className="text-sm text-gray-700">
                  Require approval for expenses exceeding SAR 5,000
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="carryover"
                  className="mr-3 h-4 w-4 text-[var(--fixzit-blue)] focus:ring-[var(--fixzit-blue)] border-gray-300 rounded"
                />
                <label htmlFor="carryover" className="text-sm text-gray-700">
                  Allow unused budget to carry over to next period
                </label>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Notes & Description</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Description
              </label>
              <textarea
                rows={3}
                placeholder="Describe the purpose and scope of this budget..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Budget Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Budget</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Allocated</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Remaining</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Available</span>
                <span>SAR 0.00</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Budget Template</h3>
            <div className="space-y-2">
              <button className="w-full btn-ghost text-left">
                📋 Copy from Previous Budget
              </button>
              <button className="w-full btn-ghost text-left">
                📊 Use Standard Template
              </button>
              <button className="w-full btn-ghost text-left">
                🔄 Import from Excel
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Existing Budgets</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">Q4 2024 Budget</p>
                  <p className="text-xs text-gray-600">Oct-Dec 2024</p>
                </div>
                <span className="text-sm font-medium">SAR 500K</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">Q3 2024 Budget</p>
                  <p className="text-xs text-gray-600">Jul-Sep 2024</p>
                </div>
                <span className="text-sm font-medium">SAR 480K</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">Q2 2024 Budget</p>
                  <p className="text-xs text-gray-600">Apr-Jun 2024</p>
                </div>
                <span className="text-sm font-medium">SAR 520K</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full btn-ghost text-left">
                📊 Budget vs Actual Report
              </button>
              <button className="w-full btn-ghost text-left">
                💰 Expense Tracking
              </button>
              <button className="w-full btn-ghost text-left">
                📋 Budget Templates
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Form auto-saved</span>
                <span className="text-gray-400 ml-auto">1m ago</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Budget period set</span>
                <span className="text-gray-400 ml-auto">3m ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

