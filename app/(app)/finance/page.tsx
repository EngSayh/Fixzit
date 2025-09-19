"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getFinancialDashboard,
  getFinancialStats,
  getFinancialDashboardConfig,
  formatCurrency,
  formatPercentage,
  getExpenses,
  createExpense,
  getExpenseStats,
  getInvoices,
  createInvoice,
  sendInvoice,
  getPayments,
  createPayment,
  getPaymentStats,
  getFinancialReports,
  generateFinancialReport,
  getFinancialAnalytics,
  formatDate
} from "../../../lib/finances-api";
import { AnimatedKPI } from "../../../src/components/theme";
import SimpleChart from "../../../src/components/shared/SimpleChart";
import KPICard from "../../../src/components/shared/KPICard";
import {
  FinancialDashboardData,
  FinancialStats,
  Payment,
  Invoice,
  Transaction,
  Expense,
  ExpenseFilters,
  ExpenseStats,
  InvoiceFilters,
  PaymentFilters,
  PaymentStats,
  FinancialReport,
  ReportFilters,
  FinancialAnalytics
} from "../../../types/finances";
import { useTranslation } from "../../../contexts/I18nContext";
import {
  TrendingUp, TrendingDown, DollarSign, Receipt, CreditCard, FileText,
  BarChart3, PieChart, LineChart, Plus, Download, Search, Filter,
  Building, Wrench, Zap, Shield, Megaphone, MoreHorizontal, Eye,
  Edit, Trash2, Upload, Calendar, Target, CheckCircle, Clock,
  AlertTriangle, Send, Mail, Copy, RefreshCw, Loader2, X, ArrowUpDown
} from "lucide-react";

// Tab configuration
const FINANCE_TABS = [
  { id: 'overview', name: 'Overview', icon: BarChart3, description: 'Financial dashboard and KPIs' },
  { id: 'expenses', name: 'Expenses', icon: Receipt, description: 'Track and manage expenses' },
  { id: 'invoices', name: 'Invoices', icon: FileText, description: 'Create and send invoices' },
  { id: 'payments', name: 'Payments', icon: CreditCard, description: 'Payment tracking and history' },
  { id: 'reports', name: 'Reports', icon: PieChart, description: 'Financial reports and analytics' }
];

// Status and category configurations
const categoryIcons = {
  maintenance: <Wrench className="w-4 h-4" />,
  utilities: <Zap className="w-4 h-4" />,
  management: <Building className="w-4 h-4" />,
  insurance: <Shield className="w-4 h-4" />,
  marketing: <Megaphone className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />
};

const categoryColors = {
  maintenance: 'bg-orange-50 text-orange-700 border-orange-200',
  utilities: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  management: 'bg-blue-50 text-blue-700 border-blue-200',
  insurance: 'bg-purple-50 text-purple-700 border-purple-200',
  marketing: 'bg-pink-50 text-pink-700 border-pink-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200'
};

const statusColors = {
  draft: 'bg-gray-50 text-gray-700 border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
  received: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  partial: 'bg-orange-50 text-orange-700 border-orange-200'
};

const paymentMethodColors = {
  bank_transfer: 'bg-blue-50 text-blue-700',
  cash: 'bg-green-50 text-green-700',
  check: 'bg-purple-50 text-purple-700',
  card: 'bg-indigo-50 text-indigo-700',
  digital_wallet: 'bg-pink-50 text-pink-700',
  online_payment: 'bg-cyan-50 text-cyan-700'
};

export default function FinancePage() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Overview state
  const [dashboardData, setDashboardData] = useState<FinancialDashboardData | null>(null);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  
  // Expenses state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseStats, setExpenseStats] = useState<ExpenseStats | null>(null);
  const [showNewExpenseForm, setShowNewExpenseForm] = useState(false);
  const [expenseFilters, setExpenseFilters] = useState<ExpenseFilters>({
    category: [],
    propertyId: '',
    unitId: '',
    search: ''
  });
  
  // Invoices state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showNewInvoiceForm, setShowNewInvoiceForm] = useState(false);
  const [invoiceFilters, setInvoiceFilters] = useState<InvoiceFilters>({
    status: [],
    type: [],
    propertyId: '',
    tenantId: '',
    search: ''
  });
  
  // Payments state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [showNewPaymentForm, setShowNewPaymentForm] = useState(false);
  const [paymentFilters, setPaymentFilters] = useState<PaymentFilters>({
    status: [],
    propertyId: '',
    tenantId: '',
    search: ''
  });
  
  // Reports state
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [analytics, setAnalytics] = useState<FinancialAnalytics | null>(null);
  const [showGenerateReportForm, setShowGenerateReportForm] = useState(false);
  const [reportFilters, setReportFilters] = useState<ReportFilters>({
    type: '',
    period: '',
    propertyIds: [],
    search: ''
  });
  
  // Common state
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("admin");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  
  const intervalRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Polling helpers
  const startPolling = (fn: () => void) => {
    stopPolling();
    fn();
    intervalRef.current = window.setInterval(() => {
      if (!document.hidden) fn();
    }, 5 * 60 * 1000);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Data fetchers based on active tab
  const fetchTabData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      switch (activeTab) {
        case 'overview':
          const [dashboard, financialStats] = await Promise.all([
            getFinancialDashboard(),
            getFinancialStats()
          ]);
          setDashboardData(dashboard);
          setStats(financialStats);
          break;
          
        case 'expenses':
          const [expensesData, expStats] = await Promise.all([
            getExpenses(expenseFilters),
            getExpenseStats()
          ]);
          setExpenses(expensesData.expenses || []);
          setExpenseStats(expStats);
          break;
          
        case 'invoices':
          const invoicesData = await getInvoices(invoiceFilters);
          setInvoices(invoicesData.invoices || []);
          break;
          
        case 'payments':
          const [paymentsData, payStats] = await Promise.all([
            getPayments(paymentFilters),
            getPaymentStats()
          ]);
          setPayments(paymentsData.payments || []);
          setPaymentStats(payStats);
          break;
          
        case 'reports':
          const [reportsData, analyticsData] = await Promise.all([
            getFinancialReports(reportFilters),
            getFinancialAnalytics('monthly')
          ]);
          setReports(reportsData);
          setAnalytics(analyticsData);
          break;
      }
      
      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      setError(err?.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchTabData();
  }, [activeTab, expenseFilters, invoiceFilters, paymentFilters, reportFilters]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling(fetchTabData);
      }
    };

    startPolling(fetchTabData);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stopPolling();
      abortRef.current?.abort();
    };
  }, []);

  // Helper functions
  const getStatusColor = (status: string) => statusColors[status] || 'text-gray-700 bg-gray-50';

  // Overview Tab Component
  const OverviewTab = () => {
    if (!dashboardData || !stats) {
      return <div className="p-8 text-center">Loading overview...</div>;
    }

    const kpiData = [
      {
        title: "Total Revenue",
        value: formatCurrency(stats.totalRevenue),
        change: { value: stats.revenueGrowth || 8.2, type: stats.revenueGrowth > 0 ? "increase" : "decrease", period: "vs last month" },
        icon: <DollarSign className="w-6 h-6" />,
        color: "green" as const
      },
      {
        title: "Total Expenses",
        value: formatCurrency(stats.totalExpenses),
        change: { value: Math.abs(stats.expensesGrowth || 3.5), type: stats.expensesGrowth < 0 ? "decrease" : "increase", period: "vs last month" },
        icon: <Receipt className="w-6 h-6" />,
        color: "red" as const
      },
      {
        title: "Net Income",
        value: formatCurrency(stats.netIncome),
        change: { value: stats.netIncomeGrowth || 12.1, type: stats.netIncomeGrowth > 0 ? "increase" : "decrease", period: "vs last month" },
        icon: <TrendingUp className="w-6 h-6" />,
        color: "blue" as const
      },
      {
        title: "Profit Margin",
        value: `${stats.profitMargin?.toFixed(1) || 0}%`,
        change: { value: 2.4, type: "increase", period: "vs last month" },
        icon: <BarChart3 className="w-6 h-6" />,
        color: "purple" as const
      }
    ];

    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiData.map((kpi) => (
            <AnimatedKPI key={kpi.title} {...kpi} loading={loading} />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Expenses Trend</h3>
            <SimpleChart
              data={dashboardData.monthlyData?.map(item => ({
                label: item.month,
                revenue: item.revenue / 1000,
                expenses: item.expenses / 1000
              })) || []}
              type="line"
              title="Monthly Performance (K SAR)"
              height={300}
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Sources</h3>
            <SimpleChart
              data={[
                { label: 'Rent', value: 75 },
                { label: 'Services', value: 15 },
                { label: 'Fees', value: 7 },
                { label: 'Other', value: 3 }
              ]}
              type="donut"
              title="Revenue Breakdown (%)"
              height={300}
            />
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dashboardData.recentTransactions?.slice(0, 5).map((transaction, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{formatDate(transaction.date)}</td>
                    <td className="px-6 py-4 text-sm">{transaction.description}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{formatCurrency(transaction.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                        getStatusColor(transaction.status || 'pending')
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Expenses Tab Component
  const ExpensesTab = () => {
    const expenseKPIs = expenseStats ? [
      {
        title: "Total Expenses",
        value: formatCurrency(expenseStats.totalExpenses),
        change: { value: 8.3, type: "increase", period: "vs last month" },
        icon: <DollarSign className="w-6 h-6" />,
        color: "red" as const
      },
      {
        title: "Monthly Average",
        value: formatCurrency(expenseStats.monthlyAverage),
        change: { value: 5.2, type: "decrease", period: "vs last quarter" },
        icon: <Calendar className="w-6 h-6" />,
        color: "blue" as const
      },
      {
        title: "Budget Utilization",
        value: `${expenseStats.budgetUtilization.toFixed(1)}%`,
        change: { value: 2.5, type: "increase", period: "vs target" },
        icon: <Target className="w-6 h-6" />,
        color: "orange" as const
      },
      {
        title: "Cost Per Unit",
        value: formatCurrency(expenseStats.costPerUnit),
        change: { value: 3.1, type: "decrease", period: "vs last month" },
        icon: <BarChart3 className="w-6 h-6" />,
        color: "purple" as const
      }
    ] : [];

    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewExpenseForm(true)}
              className="px-4 py-2 bg-[#F6851F] text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* KPIs */}
        {expenseStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {expenseKPIs.map((kpi) => (
              <KPICard key={kpi.title} {...kpi} loading={loading} />
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={expenseFilters.search}
                  onChange={(e) => setExpenseFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={expenseFilters.category?.[0] || ''}
                onChange={(e) => setExpenseFilters(prev => ({ 
                  ...prev, 
                  category: e.target.value ? [e.target.value] : []
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Categories</option>
                <option value="maintenance">Maintenance</option>
                <option value="utilities">Utilities</option>
                <option value="management">Management</option>
                <option value="insurance">Insurance</option>
                <option value="marketing">Marketing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
              <select
                value={expenseFilters.propertyId || ''}
                onChange={(e) => setExpenseFilters(prev => ({ ...prev, propertyId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Properties</option>
                <option value="1">Riyadh Business Center</option>
                <option value="2">Al Nakheel Residential</option>
                <option value="3">Olaya Towers</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setExpenseFilters({ category: [], propertyId: '', unitId: '', search: '' })}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 inline mr-2" />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Expense Records</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium">No expenses found</p>
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">{expense.description}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                          categoryColors[expense.category]
                        }`}>
                          {categoryIcons[expense.category]}
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{expense.property?.name}</td>
                      <td className="px-6 py-4 text-sm font-medium">{formatCurrency(expense.amount)}</td>
                      <td className="px-6 py-4 text-sm">{formatDate(expense.expenseDate)}</td>
                      <td className="px-6 py-4 text-sm">{expense.vendor}</td>
                      <td className="px-6 py-4">
                        <button className="text-[#0061A8] hover:text-[#004c86] mr-2">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Invoices Tab Component  
  const InvoicesTab = () => {
    const getInvoiceStats = () => {
      const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const paidAmount = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const overdueAmount = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.remainingAmount, 0);
      const pendingAmount = invoices.filter(inv => ['sent', 'partial'].includes(inv.status)).reduce((sum, inv) => sum + inv.remainingAmount, 0);
      
      return { totalAmount, paidAmount, overdueAmount, pendingAmount };
    };
    
    const invoiceStats = getInvoiceStats();

    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewInvoiceForm(true)}
              className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004c86] transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Invoice
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export All
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoiced</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(invoiceStats.totalAmount)}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Amount Collected</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(invoiceStats.paidAmount)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(invoiceStats.pendingAmount)}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(invoiceStats.overdueAmount)}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={invoiceFilters.search}
                  onChange={(e) => setInvoiceFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={invoiceFilters.status?.[0] || ''}
                onChange={(e) => setInvoiceFilters(prev => ({ 
                  ...prev, 
                  status: e.target.value ? [e.target.value] : []
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="partial">Partial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={invoiceFilters.type?.[0] || ''}
                onChange={(e) => setInvoiceFilters(prev => ({ 
                  ...prev, 
                  type: e.target.value ? [e.target.value] : []
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Types</option>
                <option value="rent">Rent</option>
                <option value="utilities">Utilities</option>
                <option value="service_charges">Service Charges</option>
                <option value="late_fees">Late Fees</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
              <select
                value={invoiceFilters.propertyId || ''}
                onChange={(e) => setInvoiceFilters(prev => ({ ...prev, propertyId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Properties</option>
                <option value="1">Riyadh Business Center</option>
                <option value="2">Al Nakheel Residential</option>
                <option value="3">Olaya Towers</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setInvoiceFilters({ status: [], type: [], propertyId: '', tenantId: '', search: '' })}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 inline mr-2" />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Invoice List</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium">No invoices found</p>
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium">{invoice.invoiceNumber}</td>
                      <td className="px-6 py-4 text-sm">
                        {invoice.tenant?.firstName} {invoice.tenant?.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm">{invoice.property?.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.type === 'rent' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {invoice.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">{formatCurrency(invoice.totalAmount)}</td>
                      <td className="px-6 py-4 text-sm">{formatDate(invoice.dueDate)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                          statusColors[invoice.status]
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-[#0061A8] hover:text-[#004c86] mr-2">
                          <Eye className="w-4 h-4" />
                        </button>
                        {invoice.status === 'draft' && (
                          <button className="text-green-600 hover:text-green-800 mr-2">
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button className="text-gray-600 hover:text-gray-900">
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Payments Tab Component
  const PaymentsTab = () => {
    const paymentKPIs = paymentStats ? [
      {
        title: "Total Received",
        value: formatCurrency(paymentStats.totalReceived),
        change: { value: 8.2, type: "increase", period: "vs last month" },
        icon: <DollarSign className="w-6 h-6" />,
        color: "green" as const
      },
      {
        title: "Total Pending",
        value: formatCurrency(paymentStats.totalPending),
        change: { value: 12.5, type: "decrease", period: "vs last month" },
        icon: <Clock className="w-6 h-6" />,
        color: "yellow" as const
      },
      {
        title: "Total Overdue",
        value: formatCurrency(paymentStats.totalOverdue),
        change: { value: 5.3, type: "decrease", period: "vs last month" },
        icon: <AlertTriangle className="w-6 h-6" />,
        color: "red" as const
      },
      {
        title: "On-time Rate",
        value: `${paymentStats.onTimePaymentRate.toFixed(1)}%`,
        change: { value: 2.1, type: "increase", period: "vs last month" },
        icon: <TrendingUp className="w-6 h-6" />,
        color: "blue" as const
      }
    ] : [];

    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewPaymentForm(true)}
              className="px-4 py-2 bg-[#00A859] text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Record Payment
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* KPIs */}
        {paymentStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {paymentKPIs.map((kpi) => (
              <KPICard key={kpi.title} {...kpi} loading={loading} />
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search payments..."
                  value={paymentFilters.search}
                  onChange={(e) => setPaymentFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={paymentFilters.status?.[0] || ''}
                onChange={(e) => setPaymentFilters(prev => ({ 
                  ...prev, 
                  status: e.target.value ? [e.target.value] : []
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Status</option>
                <option value="received">Received</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="partial">Partial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
              <select
                value={paymentFilters.propertyId || ''}
                onChange={(e) => setPaymentFilters(prev => ({ ...prev, propertyId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Properties</option>
                <option value="1">Riyadh Business Center</option>
                <option value="2">Al Nakheel Residential</option>
                <option value="3">Olaya Towers</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setPaymentFilters({ status: [], propertyId: '', tenantId: '', search: '' })}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 inline mr-2" />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium">No payments found</p>
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">
                        {payment.tenant?.firstName} {payment.tenant?.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm">{payment.property?.name}</td>
                      <td className="px-6 py-4 text-sm font-medium">{formatCurrency(payment.amount)}</td>
                      <td className="px-6 py-4 text-sm">{formatDate(payment.dueDate)}</td>
                      <td className="px-6 py-4 text-sm">{payment.paymentDate ? formatDate(payment.paymentDate) : '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                          statusColors[payment.status]
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          paymentMethodColors[payment.method]
                        }`}>
                          {payment.method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-[#0061A8] hover:text-[#004c86] mr-2">View</button>
                        <button className="text-gray-600 hover:text-gray-900">Edit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Reports Tab Component
  const ReportsTab = () => {
    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGenerateReportForm(true)}
              className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004c86] transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Generate Report
            </button>
            <button 
              onClick={fetchTabData}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Analytics Charts */}
        {analytics && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Expenses Trend</h3>
                <SimpleChart
                  data={analytics.revenueTrend.map((item, index) => ({
                    label: item.period,
                    revenue: item.amount / 1000,
                    expenses: analytics.expenseTrend[index]?.amount / 1000 || 0
                  }))}
                  type="line"
                  title="Financial Performance (K SAR)"
                  height={300}
                />
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profitability Trend</h3>
                <SimpleChart
                  data={analytics.profitabilityTrend.map(item => ({
                    label: item.period,
                    value: item.margin
                  }))}
                  type="line"
                  title="Profit Margin Trend (%)"
                  height={300}
                />
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods Distribution</h3>
                <SimpleChart
                  data={analytics.paymentPatterns.map(item => ({
                    label: item.method,
                    value: item.amount
                  }))}
                  type="donut"
                  title="Payment Methods"
                  height={300}
                />
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Seasonal Performance</h3>
                <SimpleChart
                  data={analytics.seasonalTrends.map(item => ({
                    label: item.month,
                    value: item.seasonalIndex * 100
                  }))}
                  type="bar"
                  title="Seasonal Index"
                  height={300}
                />
              </div>
            </div>

            {/* Benchmark Analysis */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Industry Benchmark Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{analytics.benchmarkData.performanceRank}%</div>
                  <div className="text-sm text-gray-600">Performance Rank</div>
                  <div className="text-xs text-gray-500 mt-1">Top 15% in region</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{analytics.benchmarkData.industryAvgMargin}%</div>
                  <div className="text-sm text-gray-600">Industry Avg Margin</div>
                  <div className="text-xs text-green-600 mt-1">+4.9% vs your performance</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{analytics.benchmarkData.industryAvgOccupancy}%</div>
                  <div className="text-sm text-gray-600">Industry Occupancy</div>
                  <div className="text-xs text-green-600 mt-1">+4.5% vs your properties</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{formatCurrency(analytics.benchmarkData.industryAvgRent)}</div>
                  <div className="text-sm text-gray-600">Industry Avg Rent</div>
                  <div className="text-xs text-green-600 mt-1">+8.4% vs your rates</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Reports List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Generated Reports</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Properties</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generated Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium">No reports found</p>
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium">{report.name}</td>
                      <td className="px-6 py-4 text-sm">{report.type.replace('_', ' ')}</td>
                      <td className="px-6 py-4 text-sm">{report.period}</td>
                      <td className="px-6 py-4 text-sm">{report.propertyIds.length} properties</td>
                      <td className="px-6 py-4 text-sm">{formatDate(report.generatedAt)}</td>
                      <td className="px-6 py-4">
                        <button className="text-[#0061A8] hover:text-[#004c86] mr-2">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Finance Management</h1>
              <p className="text-gray-600">Comprehensive financial tracking and reporting</p>
            </div>
            {lastUpdated && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Last updated</p>
                <p className="text-xs text-gray-400">{formatDate(lastUpdated)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {FINANCE_TABS.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#0061A8] text-[#0061A8]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 mr-2 ${
                    activeTab === tab.id ? 'text-[#0061A8]' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  <div className="text-left">
                    <div>{tab.name}</div>
                    <div className="text-xs text-gray-400 font-normal">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'expenses' && <ExpensesTab />}
        {activeTab === 'invoices' && <InvoicesTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>

      {/* Modals */}
      {/* Add similar modal components for showNewExpenseForm, showNewInvoiceForm, showNewPaymentForm, showGenerateReportForm */}
    </div>
  );
}