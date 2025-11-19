'use client';

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import useSWR from 'swr';
import SLATimer from '@/components/SLATimer';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { getWorkOrderStatusLabel } from '@/lib/work-orders/status';

const fetcher = (url: string) => fetch(url)
  .then(r => r.json())
  .catch(error => {
    logger.error('SLA watchlist fetch error', error);
    throw error;
  });

interface SLAWorkOrder {
  woNumber: string;
  title: string;
  status: string;
  priority: string;
  deadline: string;
  urgency: 'safe' | 'warning' | 'critical' | 'breached';
  hoursRemaining: number;
}

export default function SLAWatchlistPage() {
  const { t } = useTranslation();
  
  // Fetch SLA status from API (refreshes every 1 minute)
  const { data: response } = useSWR('/api/work-orders/sla-check', fetcher, {
    refreshInterval: 60000 // Refresh every 1 minute for live updates
  });
  
  const data = response?.data;
  const workOrders: SLAWorkOrder[] = data?.workOrders || [];
  
  // Filter by urgency for display
  const breached = workOrders.filter(wo => wo.urgency === 'breached');
  const critical = workOrders.filter(wo => wo.urgency === 'critical');
  const warning = workOrders.filter(wo => wo.urgency === 'warning');
  const safe = workOrders.filter(wo => wo.urgency === 'safe');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('workOrders.sla.watchlist', 'SLA Watchlist')}
          </h1>
          <p className="text-muted-foreground">
            {t('workOrders.sla.subtitle', 'Monitor work orders approaching or breaching SLA deadlines')}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            className="btn-secondary"
            onClick={() => window.location.reload()}
          >
            🔄 {t('common.refresh', 'Refresh')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-destructive/10 border-destructive/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">
                {t('workOrders.sla.breached', 'Breached')}
              </p>
              <p className="text-3xl font-bold text-destructive">{data?.breached || 0}</p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>
        
        <div className="card bg-destructive/10 border-destructive/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">
                {t('workOrders.sla.critical', 'Critical (<2h)')}
              </p>
              <p className="text-3xl font-bold text-destructive">{data?.critical || 0}</p>
            </div>
            <div className="text-4xl">⏰</div>
          </div>
        </div>
        
        <div className="card bg-warning/10 border-warning/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-warning">
                {t('workOrders.sla.warning', 'Warning (<4h)')}
              </p>
              <p className="text-3xl font-bold text-warning-foreground">{data?.warning || 0}</p>
            </div>
            <div className="text-4xl">⚡</div>
          </div>
        </div>
        
        <div className="card bg-success/10 border-success/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-success">
                {t('workOrders.sla.safe', 'Safe (>4h)')}
              </p>
              <p className="text-3xl font-bold text-success-foreground">{data?.safe || 0}</p>
            </div>
            <div className="text-4xl">✓</div>
          </div>
        </div>
      </div>

      {/* Breached WOs (Highest Priority) */}
      {breached.length > 0 && (
        <div className="card border-destructive/30 bg-destructive/10">
          <h2 className="text-lg font-semibold text-destructive-foreground mb-4 flex items-center gap-2">
            <span>⚠️</span>
            {t('workOrders.sla.breachedList', 'SLA BREACHED')} ({breached.length})
          </h2>
          <div className="space-y-2">
            {breached.map(wo => (
              <Link 
                key={wo.woNumber} 
                href={`/work-orders/${wo.woNumber}`}
                className="flex items-center justify-between p-3 bg-card rounded-2xl border-2 border-destructive/30 hover:border-destructive/40 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="font-mono font-bold text-destructive">{wo.woNumber}</div>
                  <div className="text-foreground">{wo.title}</div>
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-muted border">
                    {getWorkOrderStatusLabel(t, wo.status)}
                  </span>
                </div>
                <SLATimer 
                  dueDate={wo.deadline} 
                  status={wo.status} 
                  priority={wo.priority}
                  size="md"
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Critical WOs */}
      {critical.length > 0 && (
        <div className="card border-destructive/20">
          <h2 className="text-lg font-semibold text-destructive mb-4 flex items-center gap-2">
            <span>🔥</span>
            {t('workOrders.sla.criticalList', 'CRITICAL - Due Within 2 Hours')} ({critical.length})
          </h2>
          <div className="space-y-2">
            {critical.map(wo => (
              <Link 
                key={wo.woNumber} 
                href={`/work-orders/${wo.woNumber}`}
                className="flex items-center justify-between p-3 bg-card rounded-2xl border border-destructive/20 hover:border-destructive/30 hover:shadow transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="font-mono font-semibold text-destructive">{wo.woNumber}</div>
                  <div className="text-foreground">{wo.title}</div>
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-muted border">
                    {getWorkOrderStatusLabel(t, wo.status)}
                  </span>
                </div>
                <SLATimer 
                  dueDate={wo.deadline} 
                  status={wo.status} 
                  priority={wo.priority}
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Warning WOs */}
      {warning.length > 0 && (
        <div className="card border-warning/20">
          <h2 className="text-lg font-semibold text-warning-foreground mb-4 flex items-center gap-2">
            <span>⚡</span>
            {t('workOrders.sla.warningList', 'WARNING - Due Within 4 Hours')} ({warning.length})
          </h2>
          <div className="space-y-2">
            {warning.map(wo => (
              <Link 
                key={wo.woNumber} 
                href={`/work-orders/${wo.woNumber}`}
                className="flex items-center justify-between p-3 bg-card rounded-2xl border border-warning/20 hover:border-warning/40 hover:shadow transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="font-mono font-semibold text-warning">{wo.woNumber}</div>
                  <div className="text-foreground">{wo.title}</div>
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-muted border">
                    {getWorkOrderStatusLabel(t, wo.status)}
                  </span>
                </div>
                <SLATimer 
                  dueDate={wo.deadline} 
                  status={wo.status} 
                  priority={wo.priority}
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Safe WOs (Collapsed by default) */}
      {safe.length > 0 && (
        <details className="card border-success/20">
          <summary className="text-lg font-semibold text-success-foreground cursor-pointer flex items-center gap-2">
            <span>✓</span>
            {t('workOrders.sla.safeList', 'SAFE - More than 4 Hours')} ({safe.length})
          </summary>
          <div className="space-y-2 mt-4">
            {safe.slice(0, 10).map(wo => (
              <Link 
                key={wo.woNumber} 
                href={`/work-orders/${wo.woNumber}`}
                className="flex items-center justify-between p-3 bg-card rounded-2xl border border-success/20 hover:border-success/20 hover:shadow transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="font-mono font-semibold text-success">{wo.woNumber}</div>
                  <div className="text-foreground">{wo.title}</div>
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-muted border">
                    {getWorkOrderStatusLabel(t, wo.status)}
                  </span>
                </div>
                <SLATimer 
                  dueDate={wo.deadline} 
                  status={wo.status} 
                  priority={wo.priority}
                />
              </Link>
            ))}
            {safe.length > 10 && (
              <div className="text-center text-sm text-muted-foreground pt-2">
                {t('workOrders.sla.safeMore', '... and {{count}} more').replace(
                  '{{count}}',
                  String(safe.length - 10)
                )}
              </div>
            )}
          </div>
        </details>
      )}

      {/* Empty State */}
      {workOrders.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">✓</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {t('workOrders.sla.noActive', 'No Active Work Orders')}
          </h3>
          <p className="text-muted-foreground">
            {t('workOrders.sla.allClear', 'All work orders are either completed or have no SLA deadlines set.')}
          </p>
        </div>
      )}
    </div>
  );
}
