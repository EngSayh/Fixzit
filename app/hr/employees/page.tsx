'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Plus, Eye } from 'lucide-react';

import { logger } from '@/lib/logger';
import ClientDate from '@/components/ClientDate';
interface Employee {
  id: string;
  employeeCode: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
  };
  employment: {
    department: string;
    position: string;
    joinDate: string;
    status: 'Active' | 'Inactive' | 'On Leave';
  };
  compensation: {
    basicSalary: number;
  };
}

export default function EmployeesPage() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      logger.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      searchQuery === '' ||
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.personalInfo.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.personalInfo.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employment.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || emp.employment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-success/10 text-success-foreground border-success';
      case 'Inactive':
        return 'bg-muted text-foreground border-border';
      case 'On Leave':
        return 'bg-warning/10 text-warning border-warning';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
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

      {/* Filters */}
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
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-primary"
            >
              <option value="all">{t('hr.employees.filter.allStatus', 'All Status')}</option>
              <option value="Active">{t('hr.employees.status.active', 'Active')}</option>
              <option value="Inactive">{t('hr.employees.status.inactive', 'Inactive')}</option>
              <option value="On Leave">{t('hr.employees.status.onLeave', 'On Leave')}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {t('hr.employees.showing', 'Showing')} {filteredEmployees.length} {t('hr.employees.of', 'of')} {employees.length} {t('hr.employees.employees', 'employees')}
      </div>

      {/* Employee List */}
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
            <Card key={employee.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {employee.personalInfo.firstName} {employee.personalInfo.lastName}
                      </h3>
                      <Badge className={getStatusColor(employee.employment.status)}>
                        {employee.employment.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('hr.employees.code', 'Code')}:</span>
                        <span className="ms-2 font-medium">{employee.employeeCode}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('hr.employees.department', 'Department')}:</span>
                        <span className="ms-2 font-medium">{employee.employment.department}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('hr.employees.position', 'Position')}:</span>
                        <span className="ms-2 font-medium">{employee.employment.position}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('hr.employees.joinDate', 'Join Date')}:</span>
                        <span className="ms-2 font-medium">
                          <ClientDate date={employee.employment.joinDate} format="date-only" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ms-4">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 me-2" />
                      {t('common.view', 'View')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
