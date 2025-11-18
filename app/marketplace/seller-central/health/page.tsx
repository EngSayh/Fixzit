'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MetricCard from '@/components/seller/health/MetricCard';
import HealthScore from '@/components/seller/health/HealthScore';
import ViolationsList from '@/components/seller/health/ViolationsList';
import RecommendationsPanel from '@/components/seller/health/RecommendationsPanel';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

interface HealthSummary {
  current: {
    odr: { rate: number; count: number; target: number };
    lsr: { rate: number; count: number; target: number };
    cr: { rate: number; count: number; target: number };
    rr: { rate: number; count: number; target: number };
    healthScore: number;
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    isAtRisk: boolean;
  };
  trend: 'improving' | 'stable' | 'declining';
  recentViolations: Array<{
    type: string;
    severity: string;
    description: string;
    action: string;
    date: string;
    resolved: boolean;
  }>;
  recommendations: string[];
}

export default function AccountHealthPage() {
  const auto = useAutoTranslator('marketplace.sellerCentral.health');
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'last_7_days' | 'last_30_days' | 'last_90_days'>('last_30_days');

  useEffect(() => {
    fetchHealthSummary();
  }, [period]);

  const fetchHealthSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/souq/seller-central/health/summary?period=${period}`);
      if (!response.ok) throw new Error(auto('Failed to fetch health summary', 'errors.fetch'));
      const { success: _success, ...payload } = await response.json();
      setSummary(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : auto('Unknown error', 'errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {auto('Loading account health...', 'state.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            {error || auto('Failed to load account health', 'errors.load')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {auto('Account Health', 'header.title')}
        </h1>
        <p className="text-gray-600">
          {auto(
            'Monitor your seller performance metrics and maintain excellent account standing.',
            'header.subtitle'
          )}
        </p>
      </div>

      {/* At-Risk Warning */}
      {summary.current.isAtRisk && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            <strong>{auto('Action Required:', 'alerts.atRisk.title')} </strong>
            {auto(
              'Your account health is at risk. Please review the recommendations below to improve your metrics.',
              'alerts.atRisk.description'
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Period Selector */}
      <div className="flex justify-end mb-6">
        <select 
          value={period}
          onChange={(e) => setPeriod(e.target.value as typeof period)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="last_7_days">{auto('Last 7 Days', 'periods.last7')}</option>
          <option value="last_30_days">{auto('Last 30 Days', 'periods.last30')}</option>
          <option value="last_90_days">{auto('Last 90 Days', 'periods.last90')}</option>
        </select>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{auto('Overview', 'tabs.overview')}</TabsTrigger>
          <TabsTrigger value="violations">{auto('Violations', 'tabs.violations')}</TabsTrigger>
          <TabsTrigger value="recommendations">
            {auto('Recommendations', 'tabs.recommendations')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Health Score */}
          <HealthScore 
            score={summary.current.healthScore}
            status={summary.current.status}
            trend={summary.trend}
            isAtRisk={summary.current.isAtRisk}
          />

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
              title={auto('Order Defect Rate', 'metrics.odr.title')}
              value={summary.current.odr.rate}
              count={summary.current.odr.count}
              target={summary.current.odr.target}
              format="percentage"
              tooltip={auto(
                'Percentage of orders with negative feedback, A-to-Z claims, or chargebacks',
                'metrics.odr.tooltip'
              )}
            />
            <MetricCard 
              title={auto('Late Shipment Rate', 'metrics.lsr.title')}
              value={summary.current.lsr.rate}
              count={summary.current.lsr.count}
              target={summary.current.lsr.target}
              format="percentage"
              tooltip={auto(
                'Percentage of orders shipped after the expected ship date',
                'metrics.lsr.tooltip'
              )}
            />
            <MetricCard 
              title={auto('Cancellation Rate', 'metrics.cr.title')}
              value={summary.current.cr.rate}
              count={summary.current.cr.count}
              target={summary.current.cr.target}
              format="percentage"
              tooltip={auto('Percentage of seller-initiated cancellations', 'metrics.cr.tooltip')}
            />
            <MetricCard 
              title={auto('Return Rate', 'metrics.rr.title')}
              value={summary.current.rr.rate}
              count={summary.current.rr.count}
              target={summary.current.rr.target}
              format="percentage"
              tooltip={auto(
                'Percentage of delivered orders that were returned',
                'metrics.rr.tooltip'
              )}
            />
          </div>
        </TabsContent>

        <TabsContent value="violations">
          <Card className="p-6">
            <ViolationsList violations={summary.recentViolations} />
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card className="p-6">
            <RecommendationsPanel 
              recommendations={summary.recommendations}
              healthStatus={summary.current.status}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
