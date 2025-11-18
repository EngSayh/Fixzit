/**
 * ATS Analytics Overview Component
 * Placeholder for analytics dashboard
 */

'use client';

import React from 'react';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

interface AnalyticsData {
  totalApplications?: number;
  applicationsThisMonth?: number;
  averageTimeToHire?: number;
  conversionRate?: number;
  topSources?: Array<{ source: string; count: number }>;
}

interface AnalyticsOverviewProps {
  data?: AnalyticsData;
}

export function AnalyticsOverview({ data }: AnalyticsOverviewProps) {
  const auto = useAutoTranslator('ats.analyticsOverview');
  const totalApps = data?.totalApplications || 0;
  const monthlyApps = data?.applicationsThisMonth || 0;
  const avgTime = data?.averageTimeToHire || 0;
  const convRate = data?.conversionRate || 0;

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-semibold mb-2">
          {auto('Analytics Overview', 'header.title')}
        </h2>
        <p className="text-muted-foreground mb-4">
          {auto('Coming soon: Detailed recruitment analytics and insights', 'header.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">
            {auto('Total Applications', 'metrics.totalApplications')}
          </div>
          <div className="text-2xl font-bold">{totalApps}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">
            {auto('This Month', 'metrics.thisMonth')}
          </div>
          <div className="text-2xl font-bold">{monthlyApps}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">
            {auto('Avg. Time to Hire', 'metrics.avgTime')}
          </div>
          <div className="text-2xl font-bold">
            {auto('{{days}} days', 'metrics.avgTimeValue', { days: avgTime })}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">
            {auto('Conversion Rate', 'metrics.conversionRate')}
          </div>
          <div className="text-2xl font-bold">{convRate}%</div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsOverview;
