'use client';

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import useSWR from 'swr';
import SLATimer from '@/components/SLATimer';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(r => r.json());

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
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">
            {t('workOrders.sla.watchlist', 'SLA Watchlist')}
          </h1>
          <p className="text-[var(--fixzit-text-secondary)]">
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
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">
                {t('workOrders.sla.breached', 'Breached')}
              </p>
              <p className="text-3xl font-bold text-red-700">{data?.breached || 0}</p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>
        
        <div className="card bg-red-50 border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">
                {t('workOrders.sla.critical', 'Critical (<2h)')}
              </p>
              <p className="text-3xl font-bold text-red-600">{data?.critical || 0}</p>
            </div>
            <div className="text-4xl">⏰</div>
          </div>
        </div>
        
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700">
                {t('workOrders.sla.warning', 'Warning (<4h)')}
              </p>
              <p className="text-3xl font-bold text-yellow-800">{data?.warning || 0}</p>
            </div>
            <div className="text-4xl">⚡</div>
          </div>
        </div>
        
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">
                {t('workOrders.sla.safe', 'Safe (>4h)')}
              </p>
              <p className="text-3xl font-bold text-green-800">{data?.safe || 0}</p>
            </div>
            <div className="text-4xl">✓</div>
          </div>
        </div>
      </div>

      {/* Breached WOs (Highest Priority) */}
      {breached.length > 0 && (
        <div className="card border-red-300 bg-red-50">
          <h2 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
            <span>⚠️</span>
            {t('workOrders.sla.breachedList', 'SLA BREACHED')} ({breached.length})
          </h2>
          <div className="space-y-2">
            {breached.map(wo => (
              <Link 
                key={wo.woNumber} 
                href={`/work-orders/${wo.woNumber}`}
                className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-red-300 hover:border-red-400 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="font-mono font-bold text-red-700">{wo.woNumber}</div>
                  <div className="text-gray-900">{wo.title}</div>
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 border">
                    {wo.status}
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
        <div className="card border-red-200">
          <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
            <span>🔥</span>
            {t('workOrders.sla.criticalList', 'CRITICAL - Due Within 2 Hours')} ({critical.length})
          </h2>
          <div className="space-y-2">
            {critical.map(wo => (
              <Link 
                key={wo.woNumber} 
                href={`/work-orders/${wo.woNumber}`}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200 hover:border-red-300 hover:shadow transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="font-mono font-semibold text-red-600">{wo.woNumber}</div>
                  <div className="text-gray-900">{wo.title}</div>
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 border">
                    {wo.status}
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
        <div className="card border-yellow-200">
          <h2 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2">
            <span>⚡</span>
            {t('workOrders.sla.warningList', 'WARNING - Due Within 4 Hours')} ({warning.length})
          </h2>
          <div className="space-y-2">
            {warning.map(wo => (
              <Link 
                key={wo.woNumber} 
                href={`/work-orders/${wo.woNumber}`}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200 hover:border-yellow-300 hover:shadow transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="font-mono font-semibold text-yellow-700">{wo.woNumber}</div>
                  <div className="text-gray-900">{wo.title}</div>
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 border">
                    {wo.status}
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
        <details className="card border-green-200">
          <summary className="text-lg font-semibold text-green-800 cursor-pointer flex items-center gap-2">
            <span>✓</span>
            {t('workOrders.sla.safeList', 'SAFE - More than 4 Hours')} ({safe.length})
          </summary>
          <div className="space-y-2 mt-4">
            {safe.slice(0, 10).map(wo => (
              <Link 
                key={wo.woNumber} 
                href={`/work-orders/${wo.woNumber}`}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-100 hover:border-green-200 hover:shadow transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="font-mono font-semibold text-green-700">{wo.woNumber}</div>
                  <div className="text-gray-900">{wo.title}</div>
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 border">
                    {wo.status}
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
              <div className="text-center text-sm text-gray-500 pt-2">
                ... and {safe.length - 10} more
              </div>
            )}
          </div>
        </details>
      )}

      {/* Empty State */}
      {workOrders.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">✓</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('workOrders.sla.noActive', 'No Active Work Orders')}
          </h3>
          <p className="text-gray-600">
            {t('workOrders.sla.allClear', 'All work orders are either completed or have no SLA deadlines set.')}
          </p>
        </div>
      )}
    </div>
  );
}
