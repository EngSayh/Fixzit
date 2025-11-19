'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Plus, Eye, Users } from 'lucide-react';
import ClientDate from '@/components/ClientDate';
import { logger } from '@/lib/logger';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';

type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, { key: string; fallback: string }> = {
  ACTIVE: { key: 'hr.employees.status.active', fallback: 'Active' },
  INACTIVE: { key: 'hr.employees.status.inactive', fallback: 'Inactive' },
  ON_LEAVE: { key: 'hr.employees.status.onLeave', fallback: 'On Leave' },
  TERMINATED: { key: 'hr.employees.status.terminated', fallback: 'Terminated' },
};

interface EmployeeCompensation {
  baseSalary?: number;
  housingAllowance?: number;
  transportAllowance?: number;
  currency?: string;
}

interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  jobTitle: string;
  departmentId?: string;
  hireDate: string;
  employmentStatus: EmploymentStatus;
  compensation?: EmployeeCompensation;
}

export default function DirectoryPage() {
  const auto = useAutoTranslator('fm.hr.directory');
  const { t } = useTranslation();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({ moduleId: 'hr' });
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EmploymentStatus>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    void fetchEmployees();
  }, [orgId]);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/hr/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      } else {
        throw new Error(auto('Failed to load employees.', 'errors.fetch'));
      }
    } catch (_error) {
      logger.error('Error fetching employees:', _error);
      setError(
        _error instanceof Error ? _error.message : auto('Failed to load employees.', 'errors.fetch')
      );
    } finally {
      setLoading(false);
    }
  };

  const statusOptions: { value: EmploymentStatus; label: string }[] = useMemo(
    () =>
      (Object.keys(EMPLOYMENT_STATUS_LABELS) as EmploymentStatus[]).map((status) => {
        const { key, fallback } = EMPLOYMENT_STATUS_LABELS[status];
        return { value: status, label: t(key, fallback) };
      }),
    [t]
  );

  const filteredEmployees = employees.filter((employee) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      employee.employeeCode.toLowerCase().includes(query) ||
      employee.firstName.toLowerCase().includes(query) ||
      employee.lastName.toLowerCase().includes(query) ||
      employee.jobTitle.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'all' || employee.employmentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatSalary = (comp?: EmployeeCompensation) => {
    if (!comp?.baseSalary) return t('common.notAvailable', 'N/A');
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: comp.currency || 'SAR',
      minimumFractionDigits: 2,
    }).format(comp.baseSalary);
  };

  const getStatusColor = (status: EmploymentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success/10 text-success-foreground border-success/40';
      case 'INACTIVE':
        return 'bg-muted text-muted-foreground border-border';
      case 'ON_LEAVE':
        return 'bg-warning/10 text-warning-foreground border-warning/40';
      case 'TERMINATED':
        return 'bg-destructive/10 text-destructive-foreground border-destructive/40';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="hr" />
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t('fm.org.supportContext', 'Support context: {{name}}', { name: supportOrg.name })}
        </div>
      )}
      
        <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {auto('Employee Directory', 'header.title')}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {auto('Browse and search employee information', 'header.subtitle')}
          </p>
        </div>
        <Button onClick={() => router.push('/fm/hr/directory/new')}>
          <Plus className="w-4 h-4 me-2" />
          {auto('Add Employee', 'actions.addEmployee')}
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={auto('Search by name, code, or job title...', 'search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
          >
            {t('common.all', 'All')}
          </Button>
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              variant={statusFilter === option.value ? 'default' : 'outline'}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive md:flex-row md:items-center md:justify-between">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => void fetchEmployees()} disabled={loading}>
            {loading ? auto('Retrying...', 'errors.retrying') : auto('Retry', 'errors.retry')}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery || statusFilter !== 'all'
              ? auto('No employees found matching your criteria', 'noResults')
              : auto('No employees in the directory yet', 'empty')}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <Card key={employee._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {employee.firstName} {employee.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{employee.employeeCode}</p>
                  </div>
                  <Badge className={getStatusColor(employee.employmentStatus)}>
                    {t(EMPLOYMENT_STATUS_LABELS[employee.employmentStatus].key, EMPLOYMENT_STATUS_LABELS[employee.employmentStatus].fallback)}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('hr.employees.jobTitle', 'Job Title')}</span>
                    <span className="font-medium">{employee.jobTitle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('hr.employees.hireDate', 'Hire Date')}</span>
                    <ClientDate date={employee.hireDate} format="date-only" />
                  </div>
                  {employee.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('common.email', 'Email')}</span>
                      <span className="text-xs truncate max-w-[150px]">{employee.email}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('hr.employees.salary', 'Salary')}</span>
                    <span className="font-medium">{formatSalary(employee.compensation)}</span>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="w-4 h-4 me-2" />
                  {t('common.viewDetails', 'View Details')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredEmployees.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          {auto('Showing {{count}} employees', 'results.count', { count: filteredEmployees.length })}
        </div>
      )}
    </div>
  );
}
