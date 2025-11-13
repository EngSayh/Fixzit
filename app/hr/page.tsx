'use client';

import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, Calendar, Clock } from 'lucide-react';

export default function HRDashboard() {
  const { t } = useTranslation();

  const stats = [
    {
      title: t('hr.stats.totalEmployees', 'Total Employees'),
      value: '142',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: t('hr.stats.monthlyPayroll', 'Monthly Payroll'),
      value: 'SAR 1.2M',
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      title: t('hr.stats.pendingLeave', 'Pending Leave Requests'),
      value: '8',
      icon: Calendar,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      title: t('hr.stats.attendance', 'Today\'s Attendance'),
      value: '138/142',
      icon: Clock,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('hr.quickActions', 'Quick Actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-border rounded-2xl hover:bg-muted text-left transition-colors">
              <div className="text-2xl mb-2">👤</div>
              <div className="font-semibold">{t('hr.actions.addEmployee', 'Add Employee')}</div>
              <div className="text-sm text-muted-foreground">{t('hr.actions.addEmployeeDesc', 'Register a new employee')}</div>
            </button>
            <button className="p-4 border border-border rounded-2xl hover:bg-muted text-left transition-colors">
              <div className="text-2xl mb-2">💰</div>
              <div className="font-semibold">{t('hr.actions.processPayroll', 'Process Payroll')}</div>
              <div className="text-sm text-muted-foreground">{t('hr.actions.processPayrollDesc', 'Run monthly payroll')}</div>
            </button>
            <button className="p-4 border border-border rounded-2xl hover:bg-muted text-left transition-colors">
              <div className="text-2xl mb-2">📅</div>
              <div className="font-semibold">{t('hr.actions.approveLeave', 'Approve Leave')}</div>
              <div className="text-sm text-muted-foreground">{t('hr.actions.approveLeaveDesc', 'Review leave requests')}</div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t('hr.recentActivity', 'Recent Activity')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('hr.comingSoon', 'Recent activity will appear here...')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
