'use client';

import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import {
  AlertCircle,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Plane,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { useHrLeaveRequests } from '@/hooks/fm/useHrData';

type LeaveRoadmapItem = {
  title: string;
  window: string;
  detail: string;
  status: 'ready' | 'in-flight' | 'blocked';
};

const leaveRoadmap: LeaveRoadmapItem[] = [
  {
    title: 'Ramadan peak coverage',
    window: 'Mar 1 – Apr 15',
    detail: 'Ensure minimum 70% staffing across contact center + field ops.',
    status: 'in-flight',
  },
  {
    title: 'Summer rotations',
    window: 'Jun 10 – Sep 5',
    detail: 'Lock team rotations + approvals by May 31.',
    status: 'ready',
  },
  {
    title: 'Critical teams policy rollout',
    window: 'Q3',
    detail: 'Introduce blackout dates for Facilities & Dispatch units.',
    status: 'blocked',
  },
];

const leaveCoverageByTeam = [
  { team: 'Operations', coverage: 0.78, pending: 6 },
  { team: 'Facilities', coverage: 0.64, pending: 9 },
  { team: 'Support Center', coverage: 0.92, pending: 2 },
  { team: 'Vendors / Rovers', coverage: 0.57, pending: 11 },
];

const leaveTimelineTemplates = [
  { id: 'a', name: 'Employee A', team: 'Operations', offsetDays: 2, durationDays: 6, coverage: 0.68 },
  { id: 'b', name: 'Employee B', team: 'Facilities', offsetDays: 5, durationDays: 8, coverage: 0.74 },
  { id: 'c', name: 'Employee C', team: 'Dispatch', offsetDays: 9, durationDays: 4, coverage: 0.82 },
];

export default function HrLeaveExperience() {
  const auto = useAutoTranslator('fm.hr.leave');
  const { t } = useTranslation();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({ moduleId: 'hr' });
  const { requests, isLoading, error, refresh } = useHrLeaveRequests(undefined, orgId);

  const metrics = useMemo(() => {
    const pending = requests.filter((req) => req.status === 'PENDING');
    const dayMs = 1000 * 60 * 60 * 24;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const approvedThisWeek = requests.filter((req) => {
      if (req.status !== 'APPROVED') return false;
      const approvalSource = req.approvalDate ?? req.updatedAt ?? req.startDate;
      if (!approvalSource) return false;
      const approvalDate = new Date(approvalSource);
      const normalizedApproval = new Date(
        approvalDate.getFullYear(),
        approvalDate.getMonth(),
        approvalDate.getDate(),
      );
      const diff = (today.getTime() - normalizedApproval.getTime()) / dayMs;
      return diff >= 0 && diff <= 7;
    });
    const upcoming = requests.filter((req) => {
      if (req.status !== 'APPROVED') return false;
      const start = new Date(req.startDate);
      const diff = (start.getTime() - today.getTime()) / dayMs;
      return diff >= 0 && diff <= 30;
    });

    return [
      {
        label: auto('Open Requests', 'metrics.open'),
        value: pending.length.toString(),
        hint: auto('Awaiting approval', 'metrics.open.hint'),
        icon: CalendarDays,
      },
      {
        label: auto('Approved this week', 'metrics.approvedWeek'),
        value: approvedThisWeek.length.toString(),
        hint: auto('Rolling 7-day window', 'metrics.approvedWeek.hint'),
        icon: CheckCircle2,
      },
      {
        label: auto('Upcoming PTO', 'metrics.upcoming'),
        value: upcoming.length.toString(),
        hint: auto('Next 30 days', 'metrics.upcoming.hint'),
        icon: Plane,
      },
    ];
  }, [auto, requests]);

  const statusBadges: Record<LeaveRoadmapItem['status'], { label: string; className: string }> = {
    ready: { label: auto('Ready', 'roadmap.status.ready'), className: 'bg-success/15 text-success' },
    'in-flight': {
      label: auto('In progress', 'roadmap.status.inFlight'),
      className: 'bg-warning/15 text-warning',
    },
    blocked: { label: auto('Needs attention', 'roadmap.status.blocked'), className: 'bg-destructive/15 text-destructive' },
  };

  const timelineEntries = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    const today = new Date();
    return leaveTimelineTemplates.map((template, idx) => {
      const start = new Date(today);
      start.setDate(start.getDate() + template.offsetDays);
      const end = new Date(start.getTime());
      end.setDate(end.getDate() + template.durationDays);
      const window = `${formatter.format(start)} – ${formatter.format(end)}`;
      return {
        id: `${template.id}-${idx}`,
        name: template.name,
        team: template.team,
        window,
        coverage: `${Math.round(template.coverage * 100)}%`,
      };
    });
  }, []);

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

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {auto('Leave Management', 'header.kicker')}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {auto('Leave Planning Hub', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              'Balance staffing coverage, approvals, and seasonal policies from a single workspace.',
              'header.subtitle'
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refresh()}>
            <RefreshCw className="me-2 h-4 w-4" />
            {auto('Refresh data', 'actions.refresh')}
          </Button>
          <Button>
            <CalendarRange className="me-2 h-4 w-4" />
            {auto('Launch leave window', 'actions.launchWindow')}
          </Button>
        </div>
      </header>

      {error ? (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">{auto('Failed to load leave metrics.', 'errors.load')}</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => refresh()}>
                {auto('Retry', 'errors.retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="border-border/70">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                <metric.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '—' : metric.value}</div>
                <p className="text-xs text-muted-foreground">{metric.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{auto('Coverage monitor', 'coverage.title')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto('Track which teams need faster approvals to protect SLAs.', 'coverage.subtitle')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {leaveCoverageByTeam.map((team) => (
              <div key={team.team} className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{team.team}</p>
                  <span className="text-sm text-muted-foreground">
                    {team.pending} {auto('pending', 'coverage.pending')}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${
                      team.coverage >= 0.8 ? 'bg-success' : team.coverage >= 0.65 ? 'bg-warning' : 'bg-destructive'
                    }`}
                    style={{ width: `${team.coverage * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {auto('Coverage target', 'coverage.target')}: {Math.round(team.coverage * 100)}%
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="space-y-4">
          <CardHeader>
            <CardTitle>{auto('Roadmap', 'roadmap.title')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto('Align HRBPs and team leads on upcoming leave programs.', 'roadmap.subtitle')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {leaveRoadmap.map((item) => (
              <div key={item.title} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{item.title}</h4>
                  <Badge className={statusBadges[item.status].className}>{statusBadges[item.status].label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.window}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{auto('Next 14 days', 'timeline.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto('Use these insights to rebalance staffing before a gap appears.', 'timeline.subtitle')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {timelineEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-2 rounded-lg border border-border/60 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{entry.name}</p>
                <p className="text-sm text-muted-foreground">{entry.team}</p>
              </div>
              <div className="flex flex-1 items-center justify-between gap-4 text-sm text-muted-foreground md:justify-end">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {entry.window}
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  {auto('Coverage', 'timeline.coverage')}: {entry.coverage}
                </span>
                <Button variant="outline" size="sm">
                  {auto('Review plan', 'timeline.review')}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-dashed border-border/70">
        <CardHeader>
          <CardTitle>{auto('Integrations & next steps', 'nextSteps.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto('Hook this hub to /api/hr/leaves plus payroll accruals to unlock automation.', 'nextSteps.subtitle')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1">
              <Users className="h-3.5 w-3.5" />
              {auto('Org staffing workbook', 'nextSteps.staffing')}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1">
              <CalendarRange className="h-3.5 w-3.5" />
              {auto('Peak window templates', 'nextSteps.templates')}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              {auto('SLA guardrails', 'nextSteps.sla')}
            </span>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            {auto(
              'Need real data? Wire the API client (services/hr/leave-service.ts) or import HRMS feed to hydrate this dashboard.',
              'nextSteps.footer'
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
