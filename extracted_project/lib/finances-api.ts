import api from './api';
import { 
  Payment, 
  Invoice, 
  Expense, 
  Transaction,
  Budget,
  FinancialReport,
  FinancialStats,
  PaymentStats,
  ExpenseStats,
  FinancialDashboardData,
  FinancialAnalytics,
  PaymentFilters,
  InvoiceFilters,
  ExpenseFilters,
  PaymentFormData,
  InvoiceFormData,
  ExpenseFormData,
  BulkPaymentAction,
  BulkInvoiceAction,
  ReportType,
  ReportPeriod,
  ExportFormat
} from '@/types/finances';

// Financial Dashboard API
export async function getFinancialDashboard(): Promise<FinancialDashboardData> {
  try {
    const response = await fetch('/api/finances/dashboard');
    if (!response.ok) throw new Error('Failed to fetch financial dashboard');
    return await response.json();
  } catch (error) {
    console.error('Error fetching financial dashboard:', error);
    throw error;
  }
}

export async function getFinancialStats(): Promise<FinancialStats> {
  try {
    const response = await fetch('/api/finances/stats');
    if (!response.ok) throw new Error('Failed to fetch financial stats');
    return await response.json();
  } catch (error) {
    console.error('Error fetching financial stats:', error);
    throw error;
  }
}

export async function getFinancialAnalytics(period: ReportPeriod = 'monthly'): Promise<FinancialAnalytics> {
  try {
    const response = await fetch(`/api/finances/analytics?period=${period}`);
    if (!response.ok) throw new Error('Failed to fetch financial analytics');
    return await response.json();
  } catch (error) {
    console.error('Error fetching financial analytics:', error);
    throw error;
  }
}

// Payment Management API
export async function getPayments(filters?: PaymentFilters, page = 1, limit = 20): Promise<{ payments: Payment[]; total: number; page: number; totalPages: number }> {
  try {
    const searchParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, v.toString()));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }
    searchParams.append('page', page.toString());
    searchParams.append('limit', limit.toString());
    
    const response = await fetch(`/api/finances/payments?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch payments');
    return await response.json();
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
}

export async function getPayment(id: string): Promise<Payment> {
  try {
    const response = await fetch(`/api/finances/payments/${id}`);
    if (!response.ok) throw new Error('Failed to fetch payment');
    return await response.json();
  } catch (error) {
    console.error('Error fetching payment:', error);
    throw error;
  }
}

export async function createPayment(payment: PaymentFormData): Promise<Payment> {
  try {
    const response = await fetch('/api/finances/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    if (!response.ok) throw new Error('Failed to create payment');
    return await response.json();
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
}

export async function updatePayment(id: string, payment: Partial<PaymentFormData>): Promise<Payment> {
  try {
    const response = await fetch(`/api/finances/payments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    if (!response.ok) throw new Error('Failed to update payment');
    return await response.json();
  } catch (error) {
    console.error('Error updating payment:', error);
    throw error;
  }
}

export async function deletePayment(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/finances/payments/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete payment');
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
}

export async function getPaymentStats(): Promise<PaymentStats> {
  try {
    const response = await fetch('/api/finances/payment-stats');
    if (!response.ok) throw new Error('Failed to fetch payment stats');
    return await response.json();
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    throw error;
  }
}

export async function bulkUpdatePayments(action: BulkPaymentAction): Promise<void> {
  try {
    const response = await fetch('/api/finances/payments/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    if (!response.ok) throw new Error('Failed to bulk update payments');
  } catch (error) {
    console.error('Error bulk updating payments:', error);
    throw error;
  }
}

// Invoice Management API
export async function getInvoices(filters?: InvoiceFilters, page = 1, limit = 20): Promise<{ invoices: Invoice[]; total: number; page: number; totalPages: number }> {
  try {
    const searchParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, v.toString()));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }
    searchParams.append('page', page.toString());
    searchParams.append('limit', limit.toString());
    
    const response = await fetch(`/api/finances/invoices?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch invoices');
    return await response.json();
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
}

export async function getInvoice(id: string): Promise<Invoice> {
  try {
    const response = await fetch(`/api/finances/invoices/${id}`);
    if (!response.ok) throw new Error('Failed to fetch invoice');
    return await response.json();
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
}

export async function createInvoice(invoice: InvoiceFormData): Promise<Invoice> {
  try {
    const response = await fetch('/api/finances/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    if (!response.ok) throw new Error('Failed to create invoice');
    return await response.json();
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}

export async function updateInvoice(id: string, invoice: Partial<InvoiceFormData>): Promise<Invoice> {
  try {
    const response = await fetch(`/api/finances/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    if (!response.ok) throw new Error('Failed to update invoice');
    return await response.json();
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
}

export async function deleteInvoice(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/finances/invoices/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete invoice');
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
}

export async function sendInvoice(id: string, email?: string): Promise<void> {
  try {
    const response = await fetch(`/api/finances/invoices/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error('Failed to send invoice');
  } catch (error) {
    console.error('Error sending invoice:', error);
    throw error;
  }
}

export async function generateInvoicePDF(id: string): Promise<Blob> {
  try {
    const response = await fetch(`/api/finances/invoices/${id}/pdf`);
    if (!response.ok) throw new Error('Failed to generate invoice PDF');
    return await response.blob();
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw error;
  }
}

export async function duplicateInvoice(id: string): Promise<Invoice> {
  try {
    const response = await fetch(`/api/finances/invoices/${id}/duplicate`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to duplicate invoice');
    return await response.json();
  } catch (error) {
    console.error('Error duplicating invoice:', error);
    throw error;
  }
}

export async function bulkUpdateInvoices(action: BulkInvoiceAction): Promise<void> {
  try {
    const response = await fetch('/api/finances/invoices/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    if (!response.ok) throw new Error('Failed to bulk update invoices');
  } catch (error) {
    console.error('Error bulk updating invoices:', error);
    throw error;
  }
}

// Expense Management API
export async function getExpenses(filters?: ExpenseFilters, page = 1, limit = 20): Promise<{ expenses: Expense[]; total: number; page: number; totalPages: number }> {
  try {
    const searchParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, v.toString()));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }
    searchParams.append('page', page.toString());
    searchParams.append('limit', limit.toString());
    
    const response = await fetch(`/api/finances/expenses?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch expenses');
    return await response.json();
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }
}

export async function getExpense(id: string): Promise<Expense> {
  try {
    const response = await fetch(`/api/finances/expenses/${id}`);
    if (!response.ok) throw new Error('Failed to fetch expense');
    return await response.json();
  } catch (error) {
    console.error('Error fetching expense:', error);
    throw error;
  }
}

export async function createExpense(expense: ExpenseFormData): Promise<Expense> {
  try {
    const formData = new FormData();
    Object.entries(expense).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'receipt' && value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    const response = await fetch('/api/finances/expenses', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to create expense');
    return await response.json();
  } catch (error) {
    console.error('Error creating expense:', error);
    throw error;
  }
}

export async function updateExpense(id: string, expense: Partial<ExpenseFormData>): Promise<Expense> {
  try {
    const response = await fetch(`/api/finances/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    if (!response.ok) throw new Error('Failed to update expense');
    return await response.json();
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
}

export async function deleteExpense(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/finances/expenses/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete expense');
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
}

export async function getExpenseStats(): Promise<ExpenseStats> {
  try {
    const response = await fetch('/api/finances/expenses/stats');
    if (!response.ok) throw new Error('Failed to fetch expense stats');
    return await response.json();
  } catch (error) {
    console.error('Error fetching expense stats:', error);
    throw error;
  }
}

// Transaction Management API
export async function getTransactions(page = 1, limit = 20, filters?: any): Promise<{ transactions: Transaction[]; total: number; page: number; totalPages: number }> {
  try {
    const searchParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }
    searchParams.append('page', page.toString());
    searchParams.append('limit', limit.toString());
    
    const response = await fetch(`/api/finances/transactions?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return await response.json();
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

// Budget Management API
export async function getBudgets(): Promise<Budget[]> {
  try {
    const response = await fetch('/api/finances/budgets');
    if (!response.ok) throw new Error('Failed to fetch budgets');
    return await response.json();
  } catch (error) {
    console.error('Error fetching budgets:', error);
    throw error;
  }
}

export async function createBudget(budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'actualSpent'>): Promise<Budget> {
  try {
    const response = await fetch('/api/finances/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(budget),
    });
    if (!response.ok) throw new Error('Failed to create budget');
    return await response.json();
  } catch (error) {
    console.error('Error creating budget:', error);
    throw error;
  }
}

export async function updateBudget(id: string, budget: Partial<Budget>): Promise<Budget> {
  try {
    const response = await fetch(`/api/finances/budgets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(budget),
    });
    if (!response.ok) throw new Error('Failed to update budget');
    return await response.json();
  } catch (error) {
    console.error('Error updating budget:', error);
    throw error;
  }
}

export async function deleteBudget(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/finances/budgets/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete budget');
  } catch (error) {
    console.error('Error deleting budget:', error);
    throw error;
  }
}

// Financial Reports API
export async function generateReport(
  type: ReportType,
  period: ReportPeriod,
  startDate: string,
  endDate: string,
  propertyIds?: string[]
): Promise<FinancialReport> {
  try {
    const response = await fetch('/api/finances/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        period,
        startDate,
        endDate,
        propertyIds
      }),
    });
    if (!response.ok) throw new Error('Failed to generate report');
    return await response.json();
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

export async function getReports(): Promise<FinancialReport[]> {
  try {
    const response = await fetch('/api/finances/reports');
    if (!response.ok) throw new Error('Failed to fetch reports');
    return await response.json();
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw error;
  }
}

export async function getReport(id: string): Promise<FinancialReport> {
  try {
    const response = await fetch(`/api/finances/reports/${id}`);
    if (!response.ok) throw new Error('Failed to fetch report');
    return await response.json();
  } catch (error) {
    console.error('Error fetching report:', error);
    throw error;
  }
}

export async function deleteReport(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/finances/reports/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete report');
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
}

export async function exportReport(id: string, format: ExportFormat): Promise<Blob> {
  try {
    const response = await fetch(`/api/finances/reports/${id}/export?format=${format}`);
    if (!response.ok) throw new Error('Failed to export report');
    return await response.blob();
  } catch (error) {
    console.error('Error exporting report:', error);
    throw error;
  }
}

// Utility functions
export function formatCurrency(amount: number, currency = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function calculateLateFee(amount: number, daysPastDue: number, lateFeePercentage = 5): number {
  if (daysPastDue <= 0) return 0;
  return (amount * lateFeePercentage / 100) * Math.ceil(daysPastDue / 30);
}

export function calculateDaysPastDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function isPaymentOverdue(dueDate: string): boolean {
  return calculateDaysPastDue(dueDate) > 0;
}

export function getPaymentStatusColor(status: string): string {
  const colors = {
    received: 'text-green-600',
    pending: 'text-yellow-600',
    overdue: 'text-red-600',
    partial: 'text-orange-600',
    cancelled: 'text-gray-600',
    refunded: 'text-purple-600'
  };
  return colors[status as keyof typeof colors] || 'text-gray-600';
}

export function getInvoiceStatusColor(status: string): string {
  const colors = {
    draft: 'text-gray-600',
    sent: 'text-blue-600',
    viewed: 'text-indigo-600',
    paid: 'text-green-600',
    overdue: 'text-red-600',
    cancelled: 'text-gray-600',
    refunded: 'text-purple-600'
  };
  return colors[status as keyof typeof colors] || 'text-gray-600';
}

// Role-based dashboard configuration
export function getFinancialDashboardConfig(userRole: string) {
  const baseConfig = {
    showKPIs: true,
    showCharts: true,
    showQuickActions: true,
    showRecentTransactions: true
  };

  switch (userRole) {
    case 'super_admin':
      return {
        ...baseConfig,
        kpis: ['totalRevenue', 'totalExpenses', 'netIncome', 'profitMargin', 'outstandingPayments', 'overdueAmount'],
        charts: ['revenueChart', 'paymentStatusChart', 'expenseBreakdown', 'propertyPerformance', 'cashFlowProjection'],
        quickActions: ['record-payment', 'create-invoice', 'add-expense', 'generate-report'],
        sections: ['payments', 'invoices', 'expenses', 'reports', 'budgets']
      };
    
    case 'admin':
      return {
        ...baseConfig,
        kpis: ['totalRevenue', 'totalExpenses', 'netIncome', 'outstandingPayments', 'overdueAmount'],
        charts: ['revenueChart', 'paymentStatusChart', 'expenseBreakdown', 'propertyPerformance'],
        quickActions: ['record-payment', 'create-invoice', 'add-expense'],
        sections: ['payments', 'invoices', 'expenses', 'reports']
      };
    
    case 'accountant':
      return {
        ...baseConfig,
        kpis: ['totalRevenue', 'totalExpenses', 'netIncome', 'profitMargin'],
        charts: ['revenueChart', 'expenseBreakdown', 'cashFlowProjection'],
        quickActions: ['record-payment', 'create-invoice', 'add-expense', 'generate-report'],
        sections: ['payments', 'invoices', 'expenses', 'reports', 'budgets']
      };
    
    case 'property_manager':
      return {
        ...baseConfig,
        kpis: ['totalRevenue', 'outstandingPayments', 'overdueAmount'],
        charts: ['revenueChart', 'paymentStatusChart', 'propertyPerformance'],
        quickActions: ['record-payment', 'create-invoice'],
        sections: ['payments', 'invoices', 'expenses']
      };
    
    case 'tenant':
      return {
        showKPIs: false,
        showCharts: false,
        showQuickActions: true,
        showRecentTransactions: true,
        quickActions: ['view-invoices', 'payment-history'],
        sections: ['payments', 'invoices']
      };
    
    default:
      return {
        ...baseConfig,
        kpis: ['outstandingPayments', 'overdueAmount'],
        charts: ['paymentStatusChart'],
        quickActions: ['record-payment'],
        sections: ['payments']
      };
  }
}