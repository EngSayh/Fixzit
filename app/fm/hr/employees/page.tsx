'use client';

import { useState, useEffect, useMemo } from 'react';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Plus, Eye } from 'lucide-react';
import ClientDate from '@/components/ClientDate';
import { logger } from '@/lib/logger';

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

export default function EmployeesPage() {
  const { t } = useTranslation();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({ moduleId: 'hr' });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EmploymentStatus>('all');

  useEffect(() => {
    if (!orgId) return;
    void fetchEmployees();
  }, [orgId]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (_error) {
      logger.error('Error fetching employees:', _error);
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
      case 'ON_LEAVE':
        return 'bg-warning/10 text-warning border-warning/40';
      case 'TERMINATED':
      case 'INACTIVE':
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  const formatEmploymentStatus = (status: EmploymentStatus) => {
    const label = EMPLOYMENT_STATUS_LABELS[status];
    return label ? t(label.key, label.fallback) : status;
  };

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <ModuleViewTabs moduleId="hr" />
        {supportOrg && (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {t('fm.org.supportContext', 'Support context: {{name}}', { name: supportOrg.name })}
          </div>
        )}
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">{t('common.loading', 'Loading...')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="hr" />
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t('fm.org.supportContext', 'Support context: {{name}}', { name: supportOrg.name })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t('hr.employees.title', 'Employee Directory')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('hr.employees.subtitle', 'Manage your organization\'s employees')}
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary text-white">
          <Plus className="h-4 w-4 me-2" />
          {t('hr.employees.addNew', 'Add Employee')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('hr.employees.search', 'Search by name, code, or department...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EmploymentStatus | 'all')}
              className="px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="all">{t('hr.employees.filter.allStatus', 'All Status')}</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        {t('hr.employees.showing', 'Showing')} {filteredEmployees.length} {t('hr.employees.of', 'of')}{' '}
        {employees.length} {t('hr.employees.employees', 'employees')}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground text-5xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('hr.employees.noResults', 'No employees found')}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? t('hr.employees.noResultsFiltered', 'Try adjusting your filters')
                  : t('hr.employees.noResultsEmpty', 'Start by adding your first employee')}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredEmployees.map((employee) => (
            <Card key={employee._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <Badge className={getStatusColor(employee.employmentStatus)}>
                        {formatEmploymentStatus(employee.employmentStatus)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('hr.employees.code', 'Code')}:</span>
                        <span className="ms-2 font-medium">{employee.employeeCode}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('hr.employees.department', 'Department')}:</span>
                        <span className="ms-2 font-medium">{employee.departmentId || t('common.notAvailable', 'N/A')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('hr.employees.position', 'Position')}:</span>
                        <span className="ms-2 font-medium">{employee.jobTitle}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('hr.employees.joinDate', 'Join Date')}:</span>
                        <span className="ms-2 font-medium">
                          <ClientDate date={employee.hireDate} format="date-only" />
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('hr.employees.compensation.base', 'Base Salary')}:</span>
                        <span className="ms-2 font-medium">{formatSalary(employee.compensation)}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 me-2" />
                    {t('common.view', 'View')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
