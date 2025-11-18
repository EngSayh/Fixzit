'use client';

import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { useHrPayrollRuns } from '@/hooks/fm/useHrData';
import {
  AlertCircle,
  Banknote,
  Calculator,
  DollarSign,
  FileSpreadsheet,
  Gauge,
  TrendingUp,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';

export default function HrPayrollControlCenter() {
  const auto = useAutoTranslator('fm.hr.payroll');
  const { runs, isLoading, error, refresh } = useHrPayrollRuns();

  const varianceAlerts: Array<{ title: string; detail: string; severity: 'warning' | 'info' }> = [
    { title: auto('Variance data coming soon', 'variance.placeholder'), detail: auto('Wire treasury sync to surface deltas.', 'variance.detail'), severity: 'info' },
  ];

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="hr" />

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {auto('Payroll Control', 'header.kicker')}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {auto('Payroll command center', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              'Track run readiness, variances, and compliance tasks across all entities.',
              'header.subtitle'
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refresh()}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {auto('Upload adjustments', 'actions.adjustments')}
          </Button>
          <Button>
            <Calculator className="mr-2 h-4 w-4" />
            {auto('Start payroll run', 'actions.startRun')}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Employees in cycle', value: '1,248', icon: UsersIcon },
          { label: 'Total gross', value: 'SAR 9.6M', icon: DollarSign },
          { label: 'Variance vs forecast', value: '+1.6%', icon: TrendingUp },
          { label: 'Compliance tasks', value: '3 pending', icon: Gauge },
        ].map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{auto(metric.label, `metrics.${metric.label}`)}</CardTitle>
              <metric.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                {auto('Updated 5 minutes ago', 'metrics.updated')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{auto('Cycle readiness', 'cycles.title')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto('Monitor reconciliation status before triggering payouts.', 'cycles.subtitle')}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-destructive">
                <p className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  {auto('Unable to load payroll runs.', 'cycles.error')}
                </p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => refresh()}>
                  {auto('Retry', 'cycles.retry')}
                </Button>
              </div>
            ) : (
              runs.map((cycle) => (
                <div
                  key={cycle._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-4"
                >
                  <div>
                    <p className="font-semibold">{cycle.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {auto('Payout', 'cycles.payout')} ·{' '}
                      {format(new Date(cycle.periodEnd), 'PP')}
                    </p>
                  </div>
                  <Badge variant={cycle.status === 'RECONCILED' ? 'default' : 'secondary'}>
                    {cycle.status.toLowerCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {cycle.variance ? `${cycle.variance}%` : auto('Awaiting variance', 'cycles.variancePending')}
                  </span>
                  <Button size="sm" variant="outline">
                    {auto('Open run book', 'cycles.openRun')}
                  </Button>
                </div>
              ))
            )}
            {!isLoading && !error && runs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {auto('No payroll runs yet.', 'cycles.empty')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{auto('Variance alerts', 'variance.title')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto('Escalate high movement before approvals.', 'variance.subtitle')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {varianceAlerts.map((alert) => (
              <div key={alert.title} className="rounded-lg border border-border/70 p-3">
                <div className="flex items-center gap-2">
                  <AlertBadge severity={alert.severity} />
                  <p className="font-medium">{alert.title}</p>
                </div>
                <p className="text-sm text-muted-foreground">{alert.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed border-border/70">
        <CardHeader>
          <CardTitle>{auto('Next steps', 'actions.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto('Connect to /api/hr/payroll and treasury exports to automate this hub.', 'actions.subtitle')}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
              <Banknote className="h-3.5 w-3.5" />
              {auto('Treasury file mapping', 'actions.treasury')}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {auto('Journal templates', 'actions.journal')}
            </span>
          </div>
          <Separator />
          <p>
            {auto(
              'Once live, push approvals to /api/hr/payroll/runs to keep finance, HR, and compliance in sync.',
              'actions.footer'
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersIcon(props: { className?: string }) {
  return <Users className={props.className} />;
}

function AlertBadge({ severity }: { severity: 'warning' | 'info' }) {
  const isWarning = severity === 'warning';
  return (
    <Badge className={isWarning ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground'}>
      {severity === 'warning' ? 'Attention' : 'Info'}
    </Badge>
  );
}
