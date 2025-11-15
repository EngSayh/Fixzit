'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================
// TYPES
// ==========================================

interface FinanceCounters {
  invoices: {
    total: number;
    unpaid: number;
    overdue: number;
    paid: number;
  };
  revenue: {
    today: number;
    week: number;
    month: number;
    growth: number; // percentage
  };
}

// ==========================================
// FINANCE DASHBOARD - INVOICES TAB
// ==========================================

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState('invoices');
  const [counters, setCounters] = useState<FinanceCounters | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch counters
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/counters');
        if (!response.ok) throw new Error('Failed to fetch counters');
        
        const data = await response.json();
        setCounters({
          invoices: data.invoices || { total: 0, unpaid: 0, overdue: 0, paid: 0 },
          revenue: data.revenue || { today: 0, week: 0, month: 0, growth: 0 },
        });
        setLoading(false);
      } catch (error) {
        logger.error('Failed to load finance data:', error as Error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Tabs
  const tabs = [
    { id: 'invoices', label: 'Invoices', count: counters?.invoices.unpaid },
    { id: 'payments', label: 'Payments' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'budgets', label: 'Budgets' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Finance</h1>
        <p className="text-muted-foreground">
          Manage invoices, payments, and financial reports
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      {activeTab === 'invoices' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Invoices */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Invoices
                </CardTitle>
                <Wallet className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : counters?.invoices.total || 0}
                </div>
              </CardContent>
            </Card>

            {/* Unpaid */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Unpaid
                </CardTitle>
                <AlertCircle className="w-4 h-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {loading ? '...' : counters?.invoices.unpaid || 0}
                </div>
              </CardContent>
            </Card>

            {/* Overdue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Overdue
                </CardTitle>
                <AlertCircle className="w-4 h-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {loading ? '...' : counters?.invoices.overdue || 0}
                </div>
              </CardContent>
            </Card>

            {/* Paid */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Paid
                </CardTitle>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {loading ? '...' : counters?.invoices.paid || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice List Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Invoice list will be displayed here</p>
                <p className="text-sm mt-2">
                  Implement data table with filters, sorting, and actions
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Other tabs (placeholder) */}
      {activeTab !== 'invoices' && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="font-medium">{tabs.find(t => t.id === activeTab)?.label}</p>
              <p className="text-sm mt-2">Content will be implemented here</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
