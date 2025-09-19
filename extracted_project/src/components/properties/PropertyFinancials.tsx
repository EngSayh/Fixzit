'use client';

import React, { useState } from 'react';
import { Property } from '../../../types/properties';

interface PropertyFinancialsProps {
  property: Property;
}

// Mock financial data
const mockFinancialData = {
  monthly: {
    totalRevenue: 185000,
    totalExpenses: 45000,
    netIncome: 140000,
    occupancyRate: 93.3,
    maintenanceCosts: 25000,
    utilityCosts: 12000,
    insuranceCosts: 5000,
    managementFees: 3000
  },
  yearly: {
    totalRevenue: 2220000,
    totalExpenses: 540000,
    netIncome: 1680000,
    maintenanceCosts: 300000,
    utilityCosts: 144000,
    insuranceCosts: 60000,
    managementFees: 36000
  },
  revenueHistory: [
    { month: 'Jan 2024', revenue: 175000, expenses: 42000, netIncome: 133000 },
    { month: 'Feb 2024', revenue: 180000, expenses: 43000, netIncome: 137000 },
    { month: 'Mar 2024', revenue: 185000, expenses: 45000, netIncome: 140000 },
    { month: 'Apr 2024', revenue: 182000, expenses: 44000, netIncome: 138000 },
    { month: 'May 2024', revenue: 188000, expenses: 46000, netIncome: 142000 },
    { month: 'Jun 2024', revenue: 190000, expenses: 47000, netIncome: 143000 }
  ],
  unitRevenue: [
    { unitNumber: 'A101', tenant: 'Ahmed Al-Rashid', monthlyRent: 4500, status: 'paid', dueDate: '2024-03-01' },
    { unitNumber: 'A102', tenant: 'Vacant', monthlyRent: 3800, status: 'vacant', dueDate: null },
    { unitNumber: 'B201', tenant: 'Fatima Al-Zahra', monthlyRent: 6000, status: 'paid', dueDate: '2024-03-01' },
    { unitNumber: 'B202', tenant: 'Omar Al-Sayed', monthlyRent: 5800, status: 'overdue', dueDate: '2024-02-01' },
    { unitNumber: 'C301', tenant: 'Sarah Al-Mahmoud', monthlyRent: 4200, status: 'pending', dueDate: '2024-03-05' }
  ],
  expenses: [
    { category: 'Maintenance', amount: 25000, percentage: 55.6, trend: 'up' },
    { category: 'Utilities', amount: 12000, percentage: 26.7, trend: 'stable' },
    { category: 'Insurance', amount: 5000, percentage: 11.1, trend: 'stable' },
    { category: 'Management', amount: 3000, percentage: 6.7, trend: 'down' }
  ]
};

export default function PropertyFinancials({ property }: PropertyFinancialsProps) {
  const [viewPeriod, setViewPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedTab, setSelectedTab] = useState('overview');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const currentData = viewPeriod === 'monthly' ? mockFinancialData.monthly : mockFinancialData.yearly;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'revenue', label: 'Revenue', icon: '💰' },
    { id: 'expenses', label: 'Expenses', icon: '💸' },
    { id: 'units', label: 'Unit Revenue', icon: '🏠' },
    { id: 'trends', label: 'Trends', icon: '📈' }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(currentData.totalRevenue)}</div>
          <div className="text-sm text-gray-600">{viewPeriod === 'monthly' ? 'Monthly' : 'Annual'} Revenue</div>
          <div className="text-xs text-green-600 mt-1">+5.2% vs last {viewPeriod === 'monthly' ? 'month' : 'year'}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{formatCurrency(currentData.totalExpenses)}</div>
          <div className="text-sm text-gray-600">{viewPeriod === 'monthly' ? 'Monthly' : 'Annual'} Expenses</div>
          <div className="text-xs text-red-600 mt-1">+2.1% vs last {viewPeriod === 'monthly' ? 'month' : 'year'}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-[#0061A8]">{formatCurrency(currentData.netIncome)}</div>
          <div className="text-sm text-gray-600">Net Income</div>
          <div className="text-xs text-green-600 mt-1">+7.8% vs last {viewPeriod === 'monthly' ? 'month' : 'year'}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{formatPercentage(currentData.occupancyRate)}</div>
          <div className="text-sm text-gray-600">Occupancy Rate</div>
          <div className="text-xs text-green-600 mt-1">+1.3% vs last {viewPeriod === 'monthly' ? 'month' : 'year'}</div>
        </div>
      </div>

      {/* Revenue vs Expenses Chart Placeholder */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue vs Expenses</h3>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Interactive Chart</h4>
          <p className="text-sm text-gray-500">
            Revenue vs expenses chart will be displayed here using Chart.js or similar library.
          </p>
        </div>
      </div>

      {/* Profit Margin Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profit Margin Analysis</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Gross Profit Margin</span>
              <span className="text-sm font-bold text-green-600">
                {formatPercentage((currentData.netIncome / currentData.totalRevenue) * 100)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${(currentData.netIncome / currentData.totalRevenue) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Operating Expense Ratio</span>
              <span className="text-sm font-bold text-orange-600">
                {formatPercentage((currentData.totalExpenses / currentData.totalRevenue) * 100)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full" 
                style={{ width: `${(currentData.totalExpenses / currentData.totalRevenue) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUnitRevenue = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockFinancialData.unitRevenue.map((unit, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {unit.unitNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {unit.tenant}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0061A8]">
                    {formatCurrency(unit.monthlyRent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      unit.status === 'paid' ? 'bg-green-100 text-green-800' :
                      unit.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      unit.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {unit.status === 'paid' ? '✅ Paid' :
                       unit.status === 'overdue' ? '⚠️ Overdue' :
                       unit.status === 'pending' ? '⏳ Pending' :
                       '⚪ Vacant'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {unit.dueDate ? new Date(unit.dueDate).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Expense Breakdown</h3>
          <div className="space-y-4">
            {mockFinancialData.expenses.map((expense, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{expense.category}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{formatCurrency(expense.amount)}</div>
                    <div className="text-xs text-gray-500">{formatPercentage(expense.percentage)}</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${expense.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${
                    expense.trend === 'up' ? 'text-red-600' :
                    expense.trend === 'down' ? 'text-green-600' :
                    'text-gray-600'
                  }`}>
                    {expense.trend === 'up' ? '↗️ Increasing' :
                     expense.trend === 'down' ? '↘️ Decreasing' :
                     '➡️ Stable'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Chart Placeholder */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Expense Distribution</h3>
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <div className="w-32 h-32 mx-auto bg-gray-300 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">📊</span>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Pie Chart</h4>
            <p className="text-sm text-gray-500">
              Expense distribution pie chart will be displayed here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTrends = () => (
    <div className="space-y-6">
      {/* Revenue History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">6-Month Revenue Trend</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Income</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockFinancialData.revenueHistory.map((record, index) => {
                const prevRecord = index > 0 ? mockFinancialData.revenueHistory[index - 1] : null;
                const growth = prevRecord ? ((record.netIncome - prevRecord.netIncome) / prevRecord.netIncome) * 100 : 0;
                
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(record.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      {formatCurrency(record.expenses)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0061A8]">
                      {formatCurrency(record.netIncome)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {index > 0 && (
                        <span className={`font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {growth >= 0 ? '↗️' : '↘️'} {formatPercentage(Math.abs(growth))}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'overview':
        return renderOverview();
      case 'units':
        return renderUnitRevenue();
      case 'expenses':
        return renderExpenses();
      case 'trends':
        return renderTrends();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Financial Overview</h2>
          <p className="text-sm text-gray-600">Track revenue, expenses, and profitability for this property</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewPeriod('monthly')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewPeriod === 'monthly' ? 'bg-white text-[#0061A8] shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewPeriod('yearly')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewPeriod === 'yearly' ? 'bg-white text-[#0061A8] shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
            </button>
          </div>
          
          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === tab.id
                  ? 'border-[#0061A8] text-[#0061A8]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}