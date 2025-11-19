'use client';

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

export default function PropertiesInspectionsPage() {
  const { t } = useTranslation();
  const inspections = [
    {
      id: 'INSP-001',
      title: 'Monthly Safety Inspection',
      property: 'Tower A',
      inspector: 'Safety Team',
      scheduledDate: '2025-01-25',
      status: 'scheduled',
      type: 'Safety',
      lastInspection: '2024-12-25',
      nextDue: '2025-02-25'
    },
    {
      id: 'INSP-002',
      title: 'Fire System Check',
      property: 'Tower B',
      inspector: 'Fire Safety Dept',
      scheduledDate: '2025-01-23',
      status: 'in-progress',
      type: 'Fire Safety',
      lastInspection: '2024-10-15',
      nextDue: '2025-04-15'
    },
    {
      id: 'INSP-003',
      title: 'HVAC System Inspection',
      property: 'Villa Complex',
      inspector: 'Maintenance Team',
      scheduledDate: '2025-01-20',
      status: 'completed',
      type: 'Mechanical',
      lastInspection: '2024-12-20',
      nextDue: '2025-02-20'
    },
    {
      id: 'INSP-004',
      title: 'Electrical Safety Audit',
      property: 'Tower A',
      inspector: 'Electrical Team',
      scheduledDate: '2025-01-18',
      status: 'overdue',
      type: 'Electrical',
      lastInspection: '2024-11-15',
      nextDue: '2025-05-15'
    }
  ];
  const propertyOptions = [
    { value: 'all', key: 'properties.filters.allProperties', fallback: 'All Properties' },
    { value: 'tower-a', key: 'properties.filters.towerA', fallback: 'Tower A' },
    { value: 'tower-b', key: 'properties.filters.towerB', fallback: 'Tower B' },
    { value: 'villa-complex', key: 'properties.filters.villaComplex', fallback: 'Villa Complex' },
  ];

  const inspectionTypeOptions = [
    { value: 'all', key: 'properties.inspections.filters.types.all', fallback: 'All Types' },
    { value: 'safety', key: 'properties.inspections.filters.types.safety', fallback: 'Safety' },
    { value: 'fire', key: 'properties.inspections.filters.types.fireSafety', fallback: 'Fire Safety' },
    { value: 'mechanical', key: 'properties.inspections.filters.types.mechanical', fallback: 'Mechanical' },
    { value: 'electrical', key: 'properties.inspections.filters.types.electrical', fallback: 'Electrical' },
  ];

  const inspectionStatusOptions = [
    { value: 'all', key: 'properties.inspections.filters.status.all', fallback: 'All Status' },
    { value: 'scheduled', key: 'properties.inspections.filters.status.scheduled', fallback: 'Scheduled' },
    { value: 'in-progress', key: 'properties.inspections.filters.status.inProgress', fallback: 'In Progress' },
    { value: 'completed', key: 'properties.inspections.filters.status.completed', fallback: 'Completed' },
    { value: 'overdue', key: 'properties.inspections.filters.status.overdue', fallback: 'Overdue' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success border-[hsl(var(--success)) / 0.1]';
      case 'scheduled': return 'bg-primary/10 text-primary border-[hsl(var(--primary)) / 0.1]';
      case 'in-progress': return 'bg-accent/10 text-accent border-accent/20';
      case 'overdue': return 'bg-destructive/10 text-destructive border-[hsl(var(--destructive)) / 0.1]';
      case 'cancelled': return 'bg-muted text-foreground border-border';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Safety': return 'bg-primary/10 text-primary border-[hsl(var(--primary)) / 0.1]';
      case 'Fire Safety': return 'bg-destructive/10 text-destructive border-[hsl(var(--destructive)) / 0.1]';
      case 'Mechanical': return 'bg-secondary/10 text-secondary border-secondary/30';
      case 'Electrical': return 'bg-accent/10 text-accent border-accent/20';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Property Inspections</h1>
          <p className="text-muted-foreground">Schedule and track property inspections and audits</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Inspection Templates</button>
          <button className="btn-primary">+ Schedule Inspection</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-bold text-primary">12</p>
            </div>
            <div className="text-primary">📅</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-accent">3</p>
            </div>
            <div className="text-accent">🔄</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-success">45</p>
            </div>
            <div className="text-success">✅</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-destructive">2</p>
            </div>
            <div className="text-[hsl(var(--destructive)) / 0.1]">🔴</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
              {propertyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key, option.fallback)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
              {inspectionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key, option.fallback)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
              {inspectionStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key, option.fallback)}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary">{t('common.filter', 'Filter')}</button>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Inspection Schedule</h3>
          <div className="flex gap-2">
            <button className="btn-ghost">📄 Export</button>
            <button className="btn-ghost">📊 Reports</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Inspection ID</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Inspector</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Scheduled Date</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Inspection</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Next Due</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {inspections.map(inspection => (
                <tr key={inspection.id} className="hover:bg-muted">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">{inspection.id}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">{inspection.title}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{inspection.property}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{inspection.inspector}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{inspection.scheduledDate}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getTypeColor(inspection.type)}`}>
                      {inspection.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{inspection.lastInspection}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{inspection.nextDue}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(inspection.status)}`}>
                      {inspection.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button className="text-primary hover:text-primary">{t('common.edit', 'Edit')}</button>
                      <button className="text-success hover:text-success-foreground">Start</button>
                      <button className="text-warning hover:text-warning">Report</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overdue Inspections Alert */}
      <div className="card border-destructive/20 bg-destructive/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-[hsl(var(--destructive)) / 0.1]">🔴</div>
            <div>
              <h3 className="font-semibold text-destructive">Overdue Inspections</h3>
              <p className="text-sm text-destructive">2 inspections are overdue and require immediate attention</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-[hsl(var(--destructive))] text-white rounded-2xl hover:bg-[hsl(var(--destructive)) / 0.9] transition-colors">
            Reschedule Now
          </button>
        </div>
      </div>

      {/* Upcoming Inspections */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Upcoming Inspections</h3>
          <button className="btn-ghost">View Calendar</button>
        </div>
        <div className="space-y-3">
          {inspections.filter(inspection => inspection.status === 'scheduled').map(inspection => (
            <div key={inspection.id} className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="text-primary">📅</div>
                <div>
                  <p className="font-medium text-foreground">{inspection.title}</p>
                  <p className="text-sm text-muted-foreground">{inspection.property} • {inspection.scheduledDate}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary/90">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📅</div>
            <div className="text-sm font-medium">Schedule</div>
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
