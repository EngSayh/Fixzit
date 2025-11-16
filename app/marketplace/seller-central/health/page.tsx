'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MetricCard from '@/components/seller/health/MetricCard';
import HealthScore from '@/components/seller/health/HealthScore';
import ViolationsList from '@/components/seller/health/ViolationsList';
import RecommendationsPanel from '@/components/seller/health/RecommendationsPanel';

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
      if (!response.ok) throw new Error('Failed to fetch health summary');
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading account health...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Failed to load account health'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Health</h1>
        <p className="text-gray-600">
          Monitor your seller performance metrics and maintain excellent account standing.
        </p>
      </div>

      {/* At-Risk Warning */}
      {summary.current.isAtRisk && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            <strong>Action Required:</strong> Your account health is at risk. 
            Please review the recommendations below to improve your metrics.
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
          <option value="last_7_days">Last 7 Days</option>
          <option value="last_30_days">Last 30 Days</option>
          <option value="last_90_days">Last 90 Days</option>
        </select>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
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
              title="Order Defect Rate"
              value={summary.current.odr.rate}
              count={summary.current.odr.count}
              target={summary.current.odr.target}
              format="percentage"
              tooltip="Percentage of orders with negative feedback, A-to-Z claims, or chargebacks"
            />
            <MetricCard 
              title="Late Shipment Rate"
              value={summary.current.lsr.rate}
              count={summary.current.lsr.count}
              target={summary.current.lsr.target}
              format="percentage"
              tooltip="Percentage of orders shipped after the expected ship date"
            />
            <MetricCard 
              title="Cancellation Rate"
              value={summary.current.cr.rate}
              count={summary.current.cr.count}
              target={summary.current.cr.target}
              format="percentage"
              tooltip="Percentage of seller-initiated cancellations"
            />
            <MetricCard 
              title="Return Rate"
              value={summary.current.rr.rate}
              count={summary.current.rr.count}
              target={summary.current.rr.target}
              format="percentage"
              tooltip="Percentage of delivered orders that were returned"
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
