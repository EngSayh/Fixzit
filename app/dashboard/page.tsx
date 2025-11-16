'use client';

import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

export default function DashboardPage() {
  const { t } = useTranslation();
  
  const stats = [
    { labelKey: 'dashboard.totalProperties', value: '42', icon: Users, color: 'bg-fixzit-blue' },
    { labelKey: 'dashboard.openWorkOrders', value: '17', icon: TrendingUp, color: 'bg-fixzit-green' },
    { labelKey: 'dashboard.monthlyRevenue', value: 'SAR 284,500', icon: DollarSign, color: 'bg-fixzit-yellow' },
    { labelKey: 'dashboard.occupancyRate', value: '92%', icon: BarChart3, color: 'bg-fixzit-orange' },
  ];

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title', 'Dashboard')}</h1>
        <p className="text-muted-foreground">{t('dashboard.welcome', 'Welcome back')}, Eng. Sultan</p>
      </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.labelKey} className="bg-card rounded-2xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t(stat.labelKey, stat.labelKey)}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Work Orders */}
          <div className="bg-card rounded-2xl shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">{t('dashboard.recentWorkOrders', 'Recent Work Orders')}</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={`task-${i}`} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">WO-{1000 + i} - {t('dashboard.acMaintenance', 'AC Maintenance')}</p>
                      <p className="text-sm text-muted-foreground">{t('dashboard.propertyTowerA', 'Property Tower A')} - {t('dashboard.unit', 'Unit')} 301</p>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium bg-accent/10 text-accent rounded-full">
                      {t('dashboard.statusInProgress', 'In Progress')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-card rounded-2xl shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">{t('dashboard.recentTransactions', 'Recent Transactions')}</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={`payment-${i}`} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">INV-{2000 + i} - {t('dashboard.monthlyRent', 'Monthly Rent')}</p>
                      <p className="text-sm text-muted-foreground">{t('dashboard.tenant', 'Tenant')}: Acme Corp</p>
                    </div>
                    <span className="font-semibold text-fixzit-green">
                      +SAR {(15000 + i * 1000).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
