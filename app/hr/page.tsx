'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, Calendar, Clock } from 'lucide-react';
import { logger } from '@/lib/logger';

interface HrStats {
  totalEmployees: number;
  activeEmployees: number;
  latestPayroll: number;
  pendingLeave: number;
}

interface EmployeesResponseItem {
  employmentStatus?: string;
}

interface EmployeesResponse {
  employees?: EmployeesResponseItem[];
}

export default function HRDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<HrStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    latestPayroll: 0,
    pendingLeave: 0,
  });

  useEffect(() => {
    void fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [employeesRes, payrollRes, leaveRes] = await Promise.all([
        fetch('/api/hr/employees?limit=200'),
        fetch('/api/hr/payroll/runs'),
        fetch('/api/hr/leaves?status=PENDING'),
      ]);

      const [employeesData, payrollData, leaveData] = await Promise.all([
        employeesRes.ok ? employeesRes.json() : Promise.resolve({ employees: [] }),
        payrollRes.ok ? payrollRes.json() : Promise.resolve({ runs: [] }),
        leaveRes.ok ? leaveRes.json() : Promise.resolve({ requests: [] }),
      ]);

      const employees = (employeesData as EmployeesResponse).employees || [];
      const activeEmployees = employees.filter((emp) => emp.employmentStatus === 'ACTIVE').length;
      const latestRun = (payrollData.runs || [])[0];
      const pendingLeave = (leaveData.requests || []).length;

      setStats({
        totalEmployees: employees.length,
        activeEmployees,
        latestPayroll: latestRun?.totals?.net || 0,
        pendingLeave,
      });
    } catch (error) {
      logger.error('Failed to load HR dashboard stats:', error);
    }
  };

  const statCards = [
    {
      key: 'totalEmployees',
      title: t('hr.stats.totalEmployees', 'Total Employees'),
      value: stats.totalEmployees.toString(),
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      key: 'monthlyPayroll',
      title: t('hr.stats.monthlyPayroll', 'Monthly Payroll'),
      value: new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(stats.latestPayroll),
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      key: 'pendingLeave',
      title: t('hr.stats.pendingLeave', 'Pending Leave Requests'),
      value: stats.pendingLeave.toString(),
      icon: Calendar,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      key: 'attendance',
      title: t('hr.stats.attendance', 'Today\'s Attendance'),
      value: `${stats.activeEmployees}/${stats.totalEmployees}`,
      icon: Clock,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.key}>
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
            <button className="p-4 border border-border rounded-2xl hover:bg-muted text-start transition-colors">
              <div className="text-2xl mb-2">👤</div>
              <div className="font-semibold">{t('hr.actions.addEmployee', 'Add Employee')}</div>
              <div className="text-sm text-muted-foreground">{t('hr.actions.addEmployeeDesc', 'Register a new employee')}</div>
            </button>
            <button className="p-4 border border-border rounded-2xl hover:bg-muted text-start transition-colors">
              <div className="text-2xl mb-2">💰</div>
              <div className="font-semibold">{t('hr.actions.processPayroll', 'Process Payroll')}</div>
              <div className="text-sm text-muted-foreground">{t('hr.actions.processPayrollDesc', 'Run monthly payroll')}</div>
            </button>
            <button className="p-4 border border-border rounded-2xl hover:bg-muted text-start transition-colors">
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
