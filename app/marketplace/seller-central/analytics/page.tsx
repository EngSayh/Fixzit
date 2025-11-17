'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SalesChart } from '@/components/seller/analytics/SalesChart';
import { ProductPerformanceTable } from '@/components/seller/analytics/ProductPerformanceTable';
import { CustomerInsightsCard } from '@/components/seller/analytics/CustomerInsightsCard';
import { TrafficAnalytics } from '@/components/seller/analytics/TrafficAnalytics';

type Period = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'ytd';

interface SalesData {
  revenue: {
    total: number;
    previousPeriod: number;
    trend: number;
    daily: Array<{ date: string; revenue: number }>;
  };
  orders: {
    total: number;
    previousPeriod: number;
    trend: number;
  };
  averageOrderValue: {
    current: number;
    previousPeriod: number;
    trend: number;
  };
  conversionRate: {
    current: number;
    previousPeriod: number;
    trend: number;
  };
}

interface ProductPerformanceData {
  topProducts: Array<{
    productId: string;
    title: string;
    unitsSold: number;
    revenue: number;
    conversionRate: number;
  }>;
  lowStockCount: number;
  underperformingProducts: Array<{
    productId: string;
    title: string;
    views: number;
    conversionRate: number;
    recommendation: string;
  }>;
}

interface CustomerInsightsData {
  acquisition: {
    newCustomers: number;
    sources: Record<string, number>;
  };
  retention: {
    repeatCustomerRate: number;
    averageLifetimeValue: number;
  };
  geography: {
    topCities: Array<{ city: string; count: number }>;
    topRegions: Array<{ region: string; count: number }>;
  };
  demographics: {
    ageGroups: Record<string, number>;
  };
}

interface TrafficAnalyticsData {
  pageViews: {
    total: number;
    daily: Array<{ date: string; views: number }>;
  };
  sources: {
    direct: number;
    search: number;
    social: number;
    referral: number;
    paid: number;
  };
  engagement: {
    avgSessionDuration: number;
    avgPagesPerSession: number;
    bounceRate: number;
  };
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

interface AnalyticsData {
  sales: SalesData;
  products: ProductPerformanceData;
  customers: CustomerInsightsData;
  traffic: TrafficAnalyticsData;
}

const PERIOD_LABELS: Record<Period, string> = {
  last_7_days: 'Last 7 Days',
  last_30_days: 'Last 30 Days',
  last_90_days: 'Last 90 Days',
  ytd: 'Year to Date',
};

const formatTrendValue = (value: number) => {
  if (!Number.isFinite(value)) {
    return '0%';
  }
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('last_30_days');
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'products' | 'customers' | 'traffic'>('overview');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/souq/analytics/dashboard?period=${period}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const result = await response.json();
        
        if (result.success) {
          setData({
            sales: result.sales,
            products: result.products,
            customers: result.customers,
            traffic: result.traffic,
          });
        } else {
          throw new Error(result.error || 'Unknown error occurred');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Analytics fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
  }, [period]);

  const handleExportCSV = () => {
    const analytics = data;
    if (!analytics) {
      logger.warn('Tried to export analytics before data loaded', { period });
      alert('Analytics data is still loading. Please try again in a moment.');
      return;
    }

    try {
      const { exportToCSV } = require('@/lib/export-utils');
      const { sales, customers } = analytics;
      
      // Prepare export data from current analytics
      const exportData = [
        { metric: 'Total Revenue', value: `${sales.revenue.total.toFixed(2)} SAR`, trend: formatTrendValue(sales.revenue.trend) },
        { metric: 'Total Orders', value: sales.orders.total.toString(), trend: formatTrendValue(sales.orders.trend) },
        { metric: 'Average Order Value', value: `${sales.averageOrderValue.current.toFixed(2)} SAR`, trend: formatTrendValue(sales.averageOrderValue.trend) },
        { metric: 'New Customers', value: customers.acquisition.newCustomers.toString(), trend: 'N/A' },
        { metric: 'Conversion Rate', value: `${sales.conversionRate.current.toFixed(2)}%`, trend: formatTrendValue(sales.conversionRate.trend) },
      ];
      
      const filename = `analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(exportData, filename, [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
        { key: 'trend', label: 'Trend' },
      ]);
      
      logger.info('Analytics exported to CSV', { period, filename });
    } catch (error) {
      logger.error('Failed to export CSV', { error });
      alert('Failed to export data. Please try again.');
    }
  };

  const handleExportPDF = async () => {
    const analytics = data;
    if (!analytics) {
      logger.warn('Tried to export analytics before data loaded', { period, format: 'pdf' });
      alert('Analytics data is still loading. Please try again in a moment.');
      return;
    }

    try {
      const { exportToPDF } = await import('@/lib/export-utils');
      const { sales, customers } = analytics;
      
      // Prepare export data
      const exportData = [
        { metric: 'Total Revenue', value: `${sales.revenue.total.toFixed(2)} SAR`, trend: formatTrendValue(sales.revenue.trend) },
        { metric: 'Total Orders', value: String(sales.orders.total), trend: formatTrendValue(sales.orders.trend) },
        { metric: 'Average Order Value', value: `${sales.averageOrderValue.current.toFixed(2)} SAR`, trend: formatTrendValue(sales.averageOrderValue.trend) },
        { metric: 'New Customers', value: String(customers.acquisition.newCustomers), trend: 'N/A' },
        { metric: 'Conversion Rate', value: `${sales.conversionRate.current.toFixed(2)}%`, trend: formatTrendValue(sales.conversionRate.trend) },
      ];
      
      const filename = `analytics-${period}-${new Date().toISOString().split('T')[0]}.pdf`;
      await exportToPDF(exportData, [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
        { key: 'trend', label: 'Trend' },
      ], filename, {
        title: 'Analytics Dashboard Export',
        subtitle: `Period: ${period.replace('_', ' ')}`,
        orientation: 'portrait',
      });
      
      logger.info('Analytics exported to PDF', { period, filename });
    } catch (error) {
      logger.error('Failed to export PDF', { error });
      alert('Failed to export data. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your store performance and customer insights
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="px-4 py-2 border rounded-lg bg-background"
          >
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p]}
              </option>
            ))}
          </select>

          {/* Export Buttons */}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 border rounded-lg hover:bg-accent"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 border rounded-lg hover:bg-accent"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'sales', label: 'Sales' },
            { id: 'products', label: 'Products' },
            { id: 'customers', label: 'Customers' },
            { id: 'traffic', label: 'Traffic' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive-dark">Error Loading Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive-dark">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive-dark"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!error && (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <SalesChart data={data?.sales ?? null} isLoading={isLoading} period={period} />
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <ProductPerformanceTable data={data?.products ?? null} isLoading={isLoading} />
                </div>
                <div>
                  <CustomerInsightsCard data={data?.customers ?? null} isLoading={isLoading} />
                </div>
              </div>
              <TrafficAnalytics data={data?.traffic ?? null} isLoading={isLoading} />
            </div>
          )}

          {activeTab === 'sales' && (
            <SalesChart data={data?.sales ?? null} isLoading={isLoading} period={period} />
          )}

          {activeTab === 'products' && (
            <ProductPerformanceTable data={data?.products ?? null} isLoading={isLoading} />
          )}

          {activeTab === 'customers' && (
            <CustomerInsightsCard data={data?.customers ?? null} isLoading={isLoading} />
          )}

          {activeTab === 'traffic' && (
            <TrafficAnalytics data={data?.traffic ?? null} isLoading={isLoading} />
          )}
        </>
      )}

      {/* Empty State for Loading */}
      {isLoading && !data && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analytics data...</p>
          </div>
        </div>
      )}
    </div>
  );
}
