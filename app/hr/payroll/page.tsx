'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, Download, Eye, Plus } from 'lucide-react';
import ClientDate from '@/components/ClientDate';

import { logger } from '@/lib/logger';
interface PayrollRun {
  id: string;
  period: string; // YYYY-MM format
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'LOCKED';
  employeeCount: number;
  totalBasicPay?: number;
  totalAllowances?: number;
  totalDeductions?: number;
  totalNetPay?: number;
  calculatedAt?: string;
  approvedAt?: string;
}

export default function PayrollPage() {
  const { t } = useTranslation();
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  const fetchPayrollRuns = async () => {
    try {
      const response = await fetch('/api/hr/payroll/runs');
      if (response.ok) {
        const data = await response.json();
        setPayrollRuns(data);
      }
    } catch (error) {
      logger.error('Error fetching payroll runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async (runId: string) => {
    try {
      const response = await fetch(`/api/hr/payroll/runs/${runId}/calculate`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchPayrollRuns(); // Refresh the list
      }
    } catch (error) {
      logger.error('Error calculating payroll:', error);
    }
  };

  const handleExportWPS = async (runId: string) => {
    try {
      const response = await fetch(`/api/hr/payroll/runs/${runId}/export/wps`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll_${runId}_wps.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      logger.error('Error exporting WPS file:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-muted text-foreground border-border';
      case 'CALCULATED':
        return 'bg-primary/10 text-primary-foreground border-primary/30';
      case 'APPROVED':
        return 'bg-success/10 text-success-foreground border-success/30';
      case 'LOCKED':
        return 'bg-secondary/10 text-secondary border-secondary';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
    // Return the date object for ClientDate to format
    return date;
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
            {t('hr.payroll.title', 'Payroll Management')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('hr.payroll.subtitle', 'Create and manage monthly payroll runs')}
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary text-white">
          <Plus className="h-4 w-4 me-2" />
          {t('hr.payroll.createNew', 'Create New Run')}
        </Button>
      </div>

      {/* Payroll Runs List */}
      <div className="grid grid-cols-1 gap-6">
        {payrollRuns.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground text-5xl mb-4">💰</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('hr.payroll.noRuns', 'No payroll runs yet')}
              </h3>
              <p className="text-muted-foreground">
                {t('hr.payroll.noRunsDesc', 'Create your first payroll run to get started')}
              </p>
            </CardContent>
          </Card>
        ) : (
          payrollRuns.map((run) => (
            <Card key={run.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">
                      <ClientDate 
                        date={formatPeriod(run.period)} 
                        formatter={(d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                      />
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {run.employeeCount} {t('hr.payroll.employees', 'employees')}
                    </p>
                  </div>
                  <Badge className={getStatusColor(run.status)}>
                    {run.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Payroll Summary */}
                {run.status !== 'DRAFT' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {t('hr.payroll.basicPay', 'Basic Pay')}
                      </p>
                      <p className="text-lg font-semibold mt-1">
                        {formatCurrency(run.totalBasicPay)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {t('hr.payroll.allowances', 'Allowances')}
                      </p>
                      <p className="text-lg font-semibold mt-1 text-success">
                        +{formatCurrency(run.totalAllowances)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {t('hr.payroll.deductions', 'Deductions')}
                      </p>
                      <p className="text-lg font-semibold mt-1 text-destructive">
                        -{formatCurrency(run.totalDeductions)}
                      </p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {t('hr.payroll.netPay', 'Net Pay')}
                      </p>
                      <p className="text-xl font-bold mt-1 text-primary">
                        {formatCurrency(run.totalNetPay)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Timestamp Info */}
                {run.calculatedAt && (
                  <div className="text-xs text-muted-foreground mb-4">
                    {t('hr.payroll.calculatedAt', 'Calculated at')}: <ClientDate date={run.calculatedAt} format="medium" />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 me-2" />
                    {t('hr.payroll.viewDetails', 'View Details')}
                  </Button>

                  {run.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary text-white"
                      onClick={() => handleCalculate(run.id)}
                    >
                      <Calculator className="h-4 w-4 me-2" />
                      {t('hr.payroll.calculate', 'Calculate Payroll')}
                    </Button>
                  )}

                  {(run.status === 'CALCULATED' || run.status === 'APPROVED') && (
                    <Button
                      size="sm"
                      className="bg-success hover:bg-success text-white"
                      onClick={() => handleExportWPS(run.id)}
                    >
                      <Download className="h-4 w-4 me-2" />
                      {t('hr.payroll.exportWPS', 'Export WPS File')}
                    </Button>
                  )}

                  {run.status === 'CALCULATED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-success border-success hover:bg-success/10"
                    >
                      {t('hr.payroll.approve', 'Approve')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
