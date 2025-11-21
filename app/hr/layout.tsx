'use client';

import { useTranslation } from '@/contexts/TranslationContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import { Users, DollarSign, Calendar, Clock } from 'lucide-react';

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname() ?? '';
  const router = useRouter();

  // Determine active tab from pathname
  const getActiveTab = () => {
    if (pathname === '/hr') return 'dashboard';
    if (pathname.startsWith('/hr/employees')) return 'employees';
    if (pathname.startsWith('/hr/payroll')) return 'payroll';
    if (pathname.startsWith('/hr/leave')) return 'leave';
    if (pathname.startsWith('/hr/attendance')) return 'attendance';
    return 'dashboard';
  };

  const handleTabChange = (value: string) => {
    const routes: Record<string, string> = {
      dashboard: '/hr',
      employees: '/hr/employees',
      payroll: '/hr/payroll',
      leave: '/hr/leave',
      attendance: '/hr/attendance',
    };
    router.push(routes[value]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold text-foreground">
          {t('hr.title', 'Human Resources')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('hr.description', 'Manage employees, payroll, leave, and attendance')}
        </p>
      </div>

      {/* Tab Navigation */}
      <Tabs value={getActiveTab()} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            {t('hr.tabs.dashboard', 'Dashboard')}
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('hr.tabs.employees', 'Employees')}
          </TabsTrigger>
          <TabsTrigger value="payroll" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t('hr.tabs.payroll', 'Payroll')}
          </TabsTrigger>
          <TabsTrigger value="leave" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('hr.tabs.leave', 'Leave')}
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('hr.tabs.attendance', 'Attendance')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {children}
    </div>
  );
}
