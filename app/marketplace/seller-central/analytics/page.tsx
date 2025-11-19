'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SalesChart } from '@/components/seller/analytics/SalesChart';
import { ProductPerformanceTable } from '@/components/seller/analytics/ProductPerformanceTable';
import { CustomerInsightsCard } from '@/components/seller/analytics/CustomerInsightsCard';
import { TrafficAnalytics } from '@/components/seller/analytics/TrafficAnalytics';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

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

const formatTrendValue = (value: number) => {
  if (!Number.isFinite(value)) {
    return '0%';
  }
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
};

export default function AnalyticsPage() {
  const auto = useAutoTranslator('marketplace.sellerCentral.analytics');
  const PERIOD_LABELS: Record<Period, string> = {
    last_7_days: auto('Last 7 Days', 'periods.last7'),
    last_30_days: auto('Last 30 Days', 'periods.last30'),
    last_90_days: auto('Last 90 Days', 'periods.last90'),
    ytd: auto('Year to Date', 'periods.ytd'),
  };
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
          throw new Error(auto('Failed to fetch analytics data', 'errors.fetch'));
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
          throw new Error(result.error || auto('Unknown error occurred', 'errors.unknown'));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : auto('An error occurred', 'errors.generic'));
        console.error('Analytics fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
  }, [period]);

  const handleExportCSV = async () => {
    const analytics = data;
    if (!analytics) {
      logger.warn('Tried to export analytics before data loaded', { period });
      alert(auto('Analytics data is still loading. Please try again in a moment.', 'alerts.dataLoading'));
      return;
    }

    try {
      const { exportToCSV } = await import('@/lib/export-utils');
      const { sales, customers } = analytics;
      
      // Prepare export data from current analytics
      const exportData = [
        { metric: auto('Total Revenue', 'export.totalRevenue'), value: `${sales.revenue.total.toFixed(2)} SAR`, trend: formatTrendValue(sales.revenue.trend) },
        { metric: auto('Total Orders', 'export.totalOrders'), value: sales.orders.total.toString(), trend: formatTrendValue(sales.orders.trend) },
        { metric: auto('Average Order Value', 'export.avgOrderValue'), value: `${sales.averageOrderValue.current.toFixed(2)} SAR`, trend: formatTrendValue(sales.averageOrderValue.trend) },
        {
          metric: auto('New Customers', 'export.newCustomers'),
          value: customers.acquisition.newCustomers.toString(),
          trend: auto('N/A', 'export.notAvailable'),
        },
        { metric: auto('Conversion Rate', 'export.conversionRate'), value: `${sales.conversionRate.current.toFixed(2)}%`, trend: formatTrendValue(sales.conversionRate.trend) },
      ];
      
      const filename = `analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(exportData, filename, [
        { key: 'metric', label: auto('Metric', 'export.table.metric') },
        { key: 'value', label: auto('Value', 'export.table.value') },
        { key: 'trend', label: auto('Trend', 'export.table.trend') },
      ]);
      
      logger.info('Analytics exported to CSV', { period, filename });
    } catch (error) {
      logger.error('Failed to export CSV', { error });
      alert(auto('Failed to export data. Please try again.', 'alerts.exportFailed'));
    }
  };

  const handleExportPDF = async () => {
    const analytics = data;
    if (!analytics) {
      logger.warn('Tried to export analytics before data loaded', { period, format: 'pdf' });
      alert(auto('Analytics data is still loading. Please try again in a moment.', 'alerts.dataLoading'));
      return;
    }

    try {
      const { exportToPDF } = await import('@/lib/export-utils');
      const { sales, customers } = analytics;
      
      // Prepare export data
      const exportData = [
        {
          metric: auto('Total Revenue', 'export.totalRevenue'),
          value: `${sales.revenue.total.toFixed(2)} SAR`,
          trend: formatTrendValue(sales.revenue.trend),
        },
        {
          metric: auto('Total Orders', 'export.totalOrders'),
          value: String(sales.orders.total),
          trend: formatTrendValue(sales.orders.trend),
        },
        {
          metric: auto('Average Order Value', 'export.avgOrderValue'),
          value: `${sales.averageOrderValue.current.toFixed(2)} SAR`,
          trend: formatTrendValue(sales.averageOrderValue.trend),
        },
        {
          metric: auto('New Customers', 'export.newCustomers'),
          value: String(customers.acquisition.newCustomers),
          trend: auto('N/A', 'export.notAvailable'),
        },
        {
          metric: auto('Conversion Rate', 'export.conversionRate'),
          value: `${sales.conversionRate.current.toFixed(2)}%`,
          trend: formatTrendValue(sales.conversionRate.trend),
        },
      ];
      
      const filename = `analytics-${period}-${new Date().toISOString().split('T')[0]}.pdf`;
      await exportToPDF(exportData, [
        { key: 'metric', label: auto('Metric', 'export.table.metric') },
        { key: 'value', label: auto('Value', 'export.table.value') },
        { key: 'trend', label: auto('Trend', 'export.table.trend') },
      ], filename, {
        title: auto('Analytics Dashboard Export', 'export.pdf.title'),
        subtitle: `${auto('Period:', 'export.pdf.subtitle')} ${period.replace('_', ' ')}`,
        orientation: 'portrait',
      });
      
      logger.info('Analytics exported to PDF', { period, filename });
    } catch (error) {
      logger.error('Failed to export PDF', { error });
      alert(auto('Failed to export data. Please try again.', 'alerts.exportFailed'));
    }
  };

  const tabs = [
    { id: 'overview' as const, label: auto('Overview', 'tabs.overview') },
    { id: 'sales' as const, label: auto('Sales', 'tabs.sales') },
    { id: 'products' as const, label: auto('Products', 'tabs.products') },
    { id: 'customers' as const, label: auto('Customers', 'tabs.customers') },
    { id: 'traffic' as const, label: auto('Traffic', 'tabs.traffic') },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{auto('Analytics Dashboard', 'header.title')}</h1>
          <p className="text-muted-foreground">
            {auto('Monitor your store performance and customer insights', 'header.subtitle')}
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
            {auto('Export CSV', 'actions.exportCsv')}
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 border rounded-lg hover:bg-accent"
          >
            {auto('Export PDF', 'actions.exportPdf')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
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
            <CardTitle className="text-destructive-dark">
              {auto('Error Loading Analytics', 'errors.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive-dark">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive-dark"
            >
              {auto('Retry', 'actions.retry')}
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
            <p className="text-muted-foreground">
              {auto('Loading analytics data...', 'state.loading')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
