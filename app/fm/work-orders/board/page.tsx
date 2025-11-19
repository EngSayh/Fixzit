'use client';

import React from 'react';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';
import { useTranslation } from '@/contexts/TranslationContext';

export default function WorkOrdersBoardPage() {
  const { t } = useTranslation();
  const { hasOrgContext, guard, supportOrg } = useFmOrgGuard({ moduleId: 'work_orders' });
  const workOrders = [
    {
      id: 'WO-1001',
      title: 'AC not cooling',
      property: 'Tower A / 1204',
      priority: 'P2',
      status: 'in-progress',
      assignee: 'Ahmed Al-Rashid',
      dueDate: '2025-01-25',
      daysOpen: 3
    },
    {
      id: 'WO-1002',
      title: 'Leak in ceiling',
      property: 'Villa 9',
      priority: 'P1',
      status: 'pending',
      assignee: 'Mohammed Al-Saud',
      dueDate: '2025-01-24',
      daysOpen: 1
    },
    {
      id: 'WO-1003',
      title: 'Elevator maintenance',
      property: 'Tower B / Lobby',
      priority: 'P3',
      status: 'scheduled',
      assignee: 'Omar Al-Fahad',
      dueDate: '2025-01-26',
      daysOpen: 7
    }
  ];

  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P1': return 'bg-[hsl(var(--destructive))] text-white';
      case 'P2': return 'bg-[hsl(var(--warning))] text-white';
      case 'P3': return 'bg-[hsl(var(--accent))] text-foreground';
      case 'P4': return 'bg-success text-white';
      default: return 'bg-muted0 text-white';
    }
  };

  if (!hasOrgContext) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="work_orders" />
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t('fm.org.supportContext', 'Support context: {{name}}', { name: supportOrg.name })}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('workOrders.board.title', 'Work Orders Board')}</h1>
          <p className="text-muted-foreground">{t('workOrders.board.description', 'Track and assign work orders across all properties')}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">{t('workOrders.filter', 'Filter')}</button>
          <button className="btn-primary">+ {t('workOrders.board.newWO', 'New Work Order')}</button>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t('workOrders.pending', 'Pending')}</h3>
            <span className="bg-accent/10 text-accent px-2 py-1 rounded-full text-xs font-medium">2</span>
          </div>
          <div className="space-y-3">
            {workOrders.filter(wo => wo.status === 'pending').map(wo => (
              <div key={wo.id} className="p-3 bg-accent/10 border border-warning/20 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{wo.id}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(wo.priority)}`}>
                    {wo.priority}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground mb-1">{wo.title}</p>
                <p className="text-xs text-muted-foreground">{wo.property}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{wo.assignee}</span>
                  <span className="text-xs text-destructive">{wo.daysOpen}d</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* In Progress */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t('workOrders.inProgress', 'In Progress')}</h3>
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">1</span>
          </div>
          <div className="space-y-3">
            {workOrders.filter(wo => wo.status === 'in-progress').map(wo => (
              <div key={wo.id} className="p-3 bg-primary/10 border border-primary/20 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{wo.id}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(wo.priority)}`}>
                    {wo.priority}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground mb-1">{wo.title}</p>
                <p className="text-xs text-muted-foreground">{wo.property}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{wo.assignee}</span>
                  <span className="text-xs text-primary">{wo.daysOpen}d</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t('workOrders.scheduled', 'Scheduled')}</h3>
            <span className="bg-secondary/10 text-secondary px-2 py-1 rounded-full text-xs font-medium">1</span>
          </div>
          <div className="space-y-3">
            {workOrders.filter(wo => wo.status === 'scheduled').map(wo => (
              <div key={wo.id} className="p-3 bg-secondary/10 border border-secondary/30 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{wo.id}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(wo.priority)}`}>
                    {wo.priority}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground mb-1">{wo.title}</p>
                <p className="text-xs text-muted-foreground">{wo.property}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{wo.assignee}</span>
                  <span className="text-xs text-[hsl(var(--secondary))]">{wo.daysOpen}d</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t('workOrders.completed', 'Completed')}</h3>
            <span className="bg-success/10 text-success px-2 py-1 rounded-full text-xs font-medium">0</span>
          </div>
          <div className="text-center py-8">
            <div className="text-success mb-2">✅</div>
            <p className="text-sm text-muted-foreground">{t('workOrders.board.noCompleted', 'No completed work orders')}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">{t('workOrders.quickActions', 'Quick Actions')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📝</div>
            <div className="text-sm font-medium">{t('workOrders.board.createWO', 'Create WO')}</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm font-medium">{t('workOrders.board.assignTech', 'Assign Tech')}</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📅</div>
            <div className="text-sm font-medium">{t('workOrders.board.schedule', 'Schedule')}</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">{t('workOrders.reports', 'Reports')}</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-sm font-medium">{t('common.search', 'Search')}</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">{t('workOrders.settings', 'Settings')}</div>
          </button>
        </div>
      </div>
    </div>
  );
}
