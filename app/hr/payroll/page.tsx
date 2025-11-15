'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, Download, Eye, Plus } from 'lucide-react';
import ClientDate from '@/components/ClientDate';
import { logger } from '@/lib/logger';

type PayrollStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'LOCKED' | 'EXPORTED';

interface Totals {
  baseSalary: number;
  allowances: number;
  overtime: number;
  deductions: number;
  gosi: number;
  net: number;
}

interface PayrollRun {
  _id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollStatus;
  employeeCount: number;
  totals: Totals;
  calculatedAt?: string;
}

export default function PayrollPage() {
  const { t } = useTranslation();
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPayrollRuns();
  }, []);

  const fetchPayrollRuns = async () => {
    try {
      const response = await fetch('/api/hr/payroll/runs');
      if (response.ok) {
        const data = await response.json();
        setPayrollRuns(data.runs || []);
      }
    } catch (error) {
      logger.error('Error fetching payroll runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async (runId: string) => {
    try {
      const response = await fetch(`/api/hr/payroll/runs/${runId}/calculate`, { method: 'POST' });
      if (response.ok) {
        await fetchPayrollRuns();
      }
    } catch (error) {
      logger.error('Error calculating payroll:', error);
    }
  };

  const handleExportWPS = async (runId: string) => {
    try {
      const response = await fetch(`/api/hr/payroll/runs/${runId}/export/wps`);
      if (!response.ok) return;
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `payroll_${runId}_wps.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Error exporting WPS file:', error);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return '-';
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPeriod = (run: PayrollRun) => {
    return `${new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
      new Date(run.periodStart)
    )}`;
  };

  const getStatusBadge = (status: PayrollStatus) => {
    const base = 'border px-3 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'DRAFT':
        return `${base} bg-muted text-foreground border-border`;
      case 'IN_REVIEW':
        return `${base} bg-primary/10 text-primary border-primary/30`;
      case 'APPROVED':
        return `${base} bg-success/10 text-success border-success/30`;
      case 'LOCKED':
      case 'EXPORTED':
        return `${base} bg-secondary/10 text-secondary border-secondary/30`;
      default:
        return `${base} bg-muted text-foreground border-border`;
    }
  };

  const formatStatusLabel = (status: PayrollStatus) => {
    const key = `hr.payroll.status.${status.toLowerCase()}`;
    const fallback = status
      .replace('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
    return t(key, fallback);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <Card key={run._id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">{formatPeriod(run)}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {run.employeeCount} {t('hr.payroll.employees', 'employees')}
                    </p>
                  </div>
                  <span className={getStatusBadge(run.status)}>{formatStatusLabel(run.status)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {run.totals && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t('hr.payroll.basicPay', 'Basic Pay')}
                      </p>
                      <p className="text-lg font-semibold mt-1">{formatCurrency(run.totals.baseSalary)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t('hr.payroll.allowances', 'Allowances')}
                      </p>
                      <p className="text-lg font-semibold mt-1 text-success">
                        +{formatCurrency(run.totals.allowances + run.totals.overtime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t('hr.payroll.deductions', 'Deductions')}
                      </p>
                      <p className="text-lg font-semibold mt-1 text-destructive">
                        -{formatCurrency(run.totals.deductions + run.totals.gosi)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t('hr.payroll.netPay', 'Net Pay')}
                      </p>
                      <p className="text-lg font-semibold mt-1">{formatCurrency(run.totals.net)}</p>
                    </div>
                    {run.calculatedAt && (
                      <div className="text-xs text-muted-foreground">
                        {t('hr.payroll.calculatedAt', 'Calculated at')}{' '}
                        <ClientDate date={run.calculatedAt} format="medium" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={run.status !== 'DRAFT'}
                    onClick={() => handleCalculate(run._id)}
                  >
                    <Calculator className="h-4 w-4 me-2" />
                    {t('hr.payroll.actions.calculate', 'Calculate')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={run.status === 'DRAFT'}
                    onClick={() => handleExportWPS(run._id)}
                  >
                    <Download className="h-4 w-4 me-2" />
                    {t('hr.payroll.actions.exportWps', 'Export WPS')}
                  </Button>
                  <Button variant="ghost" size="sm">
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
