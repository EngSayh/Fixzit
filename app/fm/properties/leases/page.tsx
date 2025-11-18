'use client';

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

export default function PropertiesLeasesPage() {
  const { t } = useTranslation();
  const leases = [
    {
      id: 'L-001',
      unit: 'Tower A / 1204',
      tenant: 'John Smith',
      type: 'Residential',
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      monthlyRent: 'SAR 8,500',
      status: 'Active',
      securityDeposit: 'SAR 17,000',
      paymentStatus: 'Paid'
    },
    {
      id: 'L-002',
      unit: 'Tower B / 901',
      tenant: 'Sarah Johnson',
      type: 'Residential',
      startDate: '2024-03-15',
      endDate: '2025-03-14',
      monthlyRent: 'SAR 12,000',
      status: 'Active',
      securityDeposit: 'SAR 24,000',
      paymentStatus: 'Paid'
    },
    {
      id: 'L-003',
      unit: 'Villa 9',
      tenant: 'Ahmed Al-Rashid',
      type: 'Residential',
      startDate: '2024-06-01',
      endDate: '2025-05-31',
      monthlyRent: 'SAR 25,000',
      status: 'Expiring Soon',
      securityDeposit: 'SAR 50,000',
      paymentStatus: 'Paid'
    },
    {
      id: 'L-004',
      unit: 'Tower A / 1001',
      tenant: 'Available',
      type: 'Commercial',
      startDate: null,
      endDate: null,
      monthlyRent: 'SAR 15,000',
      status: 'Vacant',
      securityDeposit: null,
      paymentStatus: 'N/A'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-success/10 text-success border-[hsl(var(--success)) / 0.1]';
      case 'Expiring Soon': return 'bg-accent/10 text-accent border-accent/20';
      case 'Expired': return 'bg-destructive/10 text-destructive border-[hsl(var(--destructive)) / 0.1]';
      case 'Vacant': return 'bg-muted text-foreground border-border';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-success/10 text-success border-[hsl(var(--success)) / 0.1]';
      case 'Pending': return 'bg-accent/10 text-accent border-accent/20';
      case 'Overdue': return 'bg-destructive/10 text-destructive border-[hsl(var(--destructive)) / 0.1]';
      case 'N/A': return 'bg-muted text-foreground border-border';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const getStatusTranslation = (status: string) => {
    const translations: { [key: string]: string } = {
      'Active': t('properties.leases.active', 'Active'),
      'Expiring Soon': t('properties.leases.expiringSoon', 'Expiring Soon'),
      'Expired': t('properties.leases.expired', 'Expired'),
      'Vacant': t('properties.leases.vacant', 'Vacant'),
      'Paid': t('properties.leases.paid', 'Paid'),
      'Pending': t('properties.leases.pending', 'Pending'),
      'Overdue': t('properties.leases.overdue', 'Overdue'),
      'N/A': t('properties.leases.na', 'N/A'),
    };
    return translations[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('properties.leases.title', 'Lease Management')}</h1>
          <p className="text-muted-foreground">{t('properties.leases.subtitle', 'Manage property leases and rental agreements')}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">{t('properties.leases.templates', 'Lease Templates')}</button>
          <button className="btn-primary">+ {t('properties.leases.newLease', 'New Lease')}</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('properties.leases.activeLeases', 'Active Leases')}</p>
              <p className="text-2xl font-bold text-success">142</p>
            </div>
            <div className="text-success">📄</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('properties.leases.expiringSoon', 'Expiring Soon')}</p>
              <p className="text-2xl font-bold text-accent">8</p>
            </div>
            <div className="text-accent">⚠️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('properties.leases.monthlyRevenue', 'Monthly Revenue')}</p>
              <p className="text-2xl font-bold text-primary">SAR 1.2M</p>
            </div>
            <div className="text-primary">💰</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('properties.leases.avgLeaseTerm', 'Avg. Lease Term')}</p>
              <p className="text-2xl font-bold text-[hsl(var(--secondary))]">18 {t('properties.leases.months', 'months')}</p>
            </div>
            <div className="text-secondary">📅</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
              <option>{t('properties.leases.allProperties', 'All Properties')}</option>
              <option>Tower A</option>
              <option>Tower B</option>
              <option>Villa Complex</option>
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
              <option>{t('properties.leases.allTypes', 'All Types')}</option>
              <option>{t('properties.leases.residential', 'Residential')}</option>
              <option>{t('properties.leases.commercial', 'Commercial')}</option>
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
              <option>{t('properties.leases.allStatus', 'All Status')}</option>
              <option>{t('properties.leases.active', 'Active')}</option>
              <option>{t('properties.leases.expiringSoon', 'Expiring Soon')}</option>
              <option>{t('properties.leases.expired', 'Expired')}</option>
              <option>{t('properties.leases.vacant', 'Vacant')}</option>
            </select>
          </div>
          <button className="btn-primary">{t('workOrders.filter', 'Filter')}</button>
        </div>
      </div>

      {/* Leases Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('properties.leases.overview', 'Lease Overview')}</h3>
          <div className="flex gap-2">
            <button className="btn-ghost">📄 {t('workOrders.export', 'Export')}</button>
            <button className="btn-ghost">📊 {t('common.analytics', 'Analytics')}</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('properties.leases.leaseId', 'Lease ID')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('properties.leases.unit', 'Unit')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('properties.leases.tenant', 'Tenant')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('properties.leases.type', 'Type')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('properties.leases.startDate', 'Start Date')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('properties.leases.endDate', 'End Date')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('properties.leases.monthlyRent', 'Monthly Rent')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('properties.leases.leaseStatus', 'Lease Status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('properties.leases.paymentStatus', 'Payment Status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('properties.leases.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {leases.map(lease => (
                <tr key={lease.id} className="hover:bg-muted">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">{lease.id}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{lease.unit}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{lease.tenant}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{lease.type}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{lease.startDate || 'N/A'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{lease.endDate || 'N/A'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{lease.monthlyRent}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(lease.status)}`}>
                      {getStatusTranslation(lease.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPaymentStatusColor(lease.paymentStatus)}`}>
                      {getStatusTranslation(lease.paymentStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button className="text-primary hover:text-primary">{t('common.view', 'View')}</button>
                      <button className="text-success hover:text-success-foreground">{t('common.edit', 'Edit')}</button>
                      <button className="text-warning hover:text-warning">{t('properties.leases.renew', 'Renew')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Renewals */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">{t('properties.leases.upcomingRenewals', 'Upcoming Renewals')}</h3>
        <div className="space-y-3">
          {[
            { unit: 'A-101', tenant: 'Ahmed Al-Mansouri', date: '2025-12-15', days: 31 },
            { unit: 'B-305', tenant: 'Sarah Johnson', date: '2025-12-22', days: 38 },
            { unit: 'C-202', tenant: 'Mohammed Ali', date: '2026-01-01', days: 48 },
          ].map((renewal) => (
            <div key={renewal.unit} className="flex items-center justify-between p-3 bg-accent/10 rounded-2xl border border-warning/20">
              <div>
                <p className="font-medium">{renewal.unit} - {renewal.tenant}</p>
                <p className="text-sm text-muted-foreground">{t('properties.leases.expires', 'Expires')}: {renewal.date} ({renewal.days} {t('common.days', 'days')})</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost text-sm">{t('properties.leases.renew', 'Renew')}</button>
                <button className="btn-ghost text-sm">{t('properties.leases.contact', 'Contact')}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">{t('common.quickActions', 'Quick Actions')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📄</div>
            <div className="text-sm font-medium">{t('properties.leases.newLease', 'New Lease')}</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">🔄</div>
            <div className="text-sm font-medium">{t('properties.leases.renewals', 'Renewals')}</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm font-medium">{t('properties.leases.rentCollection', 'Rent Collection')}</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium">{t('properties.leases.templates', 'Templates')}</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">{t('common.reports', 'Reports')}</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">{t('common.settings', 'Settings')}</div>
          </button>
        </div>
      </div>
    </div>
  );
}

