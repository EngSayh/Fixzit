'use client';

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import useSWR from 'swr';
import { logger } from '@/lib/logger';

const fetcher = (url: string) => fetch(url)
  .then(r => r.json())
  .catch(error => {
    logger.error('PM work orders fetch error', { error });
    throw error;
  });

interface PMPlan {
  id: string;
  planNumber: string;
  title: string;
  propertyId: string;
  category: string;
  recurrencePattern: string;
  nextScheduledDate: string;
  lastGeneratedDate?: string;
  status: string;
  stats?: {
    totalGenerated?: number;
    totalCompleted?: number;
  };
}

export default function PreventiveMaintenancePage() {
  const { t } = useTranslation();
  
  // Fetch PM plans from API
  const { data: response } = useSWR('/api/pm/plans?status=ACTIVE', fetcher, {
    refreshInterval: 30000 // Refresh every 30 seconds
  });
  
  const pmSchedules: PMPlan[] = response?.data || [];
  
  const getStatusForPlan = (plan: PMPlan) => {
    const nextDue = new Date(plan.nextScheduledDate);
    const now = new Date();
    const daysUntil = Math.floor((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 7) return 'due';
    return 'scheduled';
  };
  
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-primary/10 text-primary border-[hsl(var(--primary)) / 0.1]';
      case 'due': return 'bg-warning/10 text-warning border-warning/20';
      case 'overdue': return 'bg-destructive/10 text-destructive border-[hsl(var(--destructive)) / 0.1]';
      case 'completed': return 'bg-success/10 text-success border-[hsl(var(--success)) / 0.1]';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('workOrders.pm.title', 'Preventive Maintenance')}</h1>
          <p className="text-muted-foreground">{t('workOrders.pm.subtitle', 'Schedule and track preventive maintenance activities')}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">{t('workOrders.pm.importSchedule', 'Import Schedule')}</button>
          <button className="btn-primary">+ {t('workOrders.pm.newPM', 'New PM Schedule')}</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('workOrders.scheduled', 'Scheduled')}</p>
              <p className="text-2xl font-bold text-primary">8</p>
            </div>
            <div className="text-primary">📅</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('workOrders.pm.thisMonth', 'Due This Month')}</p>
              <p className="text-2xl font-bold text-accent">3</p>
            </div>
            <div className="text-accent">⚠️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('common.overdue', 'Overdue')}</p>
              <p className="text-2xl font-bold text-destructive">2</p>
            </div>
            <div className="text-[hsl(var(--destructive)) / 0.1]">🔴</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('workOrders.completed', 'Completed')}</p>
              <p className="text-2xl font-bold text-success">15</p>
            </div>
            <div className="text-success">✅</div>
          </div>
        </div>
      </div>

      {/* PM Schedule Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">PM Schedules</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search schedules..."
              className="px-3 py-2 border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <select className="px-3 py-2 border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent">
              <option>All Properties</option>
              <option>Tower A</option>
              <option>Tower B</option>
              <option>Villa Complex</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('workOrders.pm.frequency', 'Frequency')}</th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('workOrders.pm.lastCompleted', 'Last Done')}</th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('workOrders.pm.nextDue', 'Next Due')}</th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned</th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {pmSchedules.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No PM plans found. Create your first preventive maintenance schedule.
                  </td>
                </tr>
              ) : (
                pmSchedules.map(schedule => {
                  const planStatus = getStatusForPlan(schedule);
                  return (
                    <tr key={schedule.id} className="hover:bg-muted">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">{schedule.planNumber}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">{schedule.title}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{schedule.propertyId}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{schedule.recurrencePattern}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(schedule.lastGeneratedDate)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(schedule.nextScheduledDate)}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(planStatus)}`}>
                          {planStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{schedule.stats?.totalGenerated || 0} WOs</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button className="text-primary hover:text-primary">{t('common.edit', 'Edit')}</button>
                          <button className="text-success hover:text-success-foreground">Generate</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📅</div>
            <div className="text-sm font-medium">Schedule PM</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium">Templates</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">Reports</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">🔧</div>
            <div className="text-sm font-medium">Checklists</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">Settings</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📤</div>
            <div className="text-sm font-medium">Export</div>
          </button>
        </div>
      </div>
    </div>
  );
}

