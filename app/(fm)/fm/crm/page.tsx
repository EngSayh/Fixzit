"use client";

import useSWR from "swr";
import { useMemo, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  Briefcase,
  PhoneCall,
  Mail,
} from "@/components/ui/icons";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import ClientDate from "@/components/ClientDate";

type StageStat = { stage: string; total: number };
type TopAccount = {
  id: string;
  company: string;
  revenue: number;
  segment: string | null;
  owner: string | null;
  notes: string | null;
};
type Activity = {
  id: string;
  type: string;
  summary: string;
  performedAt: string;
  contactName: string | null;
  company: string | null;
  leadStage: string | null;
};

type OverviewResponse = {
  totals: {
    leads: number;
    pipelineValue: number;
    avgDealSize: number;
    conversionRate: number;
    activeAccounts: number;
  };
  stages: StageStat[];
  topAccounts: TopAccount[];
  recentActivities: Activity[];
  activityCounters: {
    calls7d: number;
    emails7d: number;
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error ?? "Failed to load CRM overview");
  }
  return (await response.json()) as OverviewResponse;
};

const currency = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "SAR",
  maximumFractionDigits: 0,
});

export default function CrmOverviewPage() {
  const auto = useAutoTranslator("fm.crm.dashboard");
  const { data: session } = useSession();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({
    moduleId: "crm",
  });
  const { data, error, isLoading, mutate } = useSWR<OverviewResponse>(
    orgId ? "/api/crm/overview" : null,
    fetcher,
  );

  const totals = data?.totals;
  const stageTotal = useMemo(
    () => data?.stages.reduce((sum, stage) => sum + stage.total, 0) ?? 0,
    [data?.stages],
  );

  if (!session) {
    return (
      <div className="space-y-6">
        <ModuleViewTabs moduleId="crm" />
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {auto("Sign in to view CRM insights.", "states.requireSession")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="crm" />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {auto("Revenue operations", "header.kicker")}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {auto("CRM overview", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Monitor pipeline health, key accounts, and recent activity.",
              "header.subtitle",
            )}
          </p>
        </div>
        <Button variant="outline" onClick={() => mutate()} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="me-2 h-4 w-4" />
          )}
          {auto("Refresh", "actions.refresh")}
        </Button>
      </div>

      {supportOrg && (
        <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {auto("Support context: {{name}}", "support.activeOrg", {
            name: supportOrg.name,
          })}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={auto("Open leads", "stats.leads")}
          value={totals?.leads ?? 0}
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <MetricCard
          title={auto("Pipeline value", "stats.pipeline")}
          value={currency.format(totals?.pipelineValue ?? 0)}
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
        />
        <MetricCard
          title={auto("Conversion rate", "stats.conversion")}
          value={`${totals?.conversionRate ?? 0}%`}
          icon={<Briefcase className="h-5 w-5 text-primary" />}
        />
        <MetricCard
          title={auto("Avg. deal size", "stats.avgDeal")}
          value={currency.format(totals?.avgDealSize ?? 0)}
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>
                {auto("Stage distribution", "stages.title")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {auto("Leads grouped by current stage", "stages.subtitle")}
              </p>
            </div>
            <Badge variant="outline">
              {auto("{{count}} active", "stages.total", { count: stageTotal })}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {data?.stages.length ? (
              data.stages.map((stage) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-medium capitalize">
                      {stage.stage.toLowerCase().replace(/_/g, " ")}
                    </p>
                    <p>{stage.total}</p>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${stageTotal ? Math.max((stage.total / stageTotal) * 100, 4) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {auto(
                  "Stages will appear after leads are captured.",
                  "stages.empty",
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Activity (last 7 days)", "activities.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <PhoneCall className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {auto("Calls logged", "activities.callCount")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {auto("Last 7 days", "activities.window")}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-semibold">
                {data?.activityCounters.calls7d ?? 0}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {auto("Emails sent", "activities.emailCount")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {auto("Last 7 days", "activities.window")}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-semibold">
                {data?.activityCounters.emails7d ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{auto("Top accounts", "topAccounts.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.topAccounts.length ? (
              data.topAccounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-lg border border-border/70 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {account.company}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {auto("Segment: {{segment}}", "topAccounts.segment", {
                          segment:
                            account.segment ??
                            auto(
                              "Uncategorized",
                              "topAccounts.segment.unknown",
                            ),
                        })}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-lg font-semibold">
                        {currency.format(account.revenue ?? 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {auto("Ann. revenue", "topAccounts.revenue")}
                      </p>
                    </div>
                  </div>
                  {account.notes && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {account.notes}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {auto(
                  "Accounts will appear after they are created in CRM.",
                  "topAccounts.empty",
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Recent activity", "activities.feedTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data?.recentActivities.length ? (
              data.recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="border-b border-border/50 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-medium capitalize">
                      {auto(
                        activity.type.toUpperCase(),
                        `activity.type.${activity.type.toUpperCase()}`,
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <ClientDate date={activity.performedAt} />
                    </p>
                  </div>
                  <p className="text-sm text-foreground">{activity.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.contactName
                      ? auto("With {{contact}}", "activity.contact", {
                          contact: activity.contactName,
                        })
                      : auto("Company: {{company}}", "activity.company", {
                          company: activity.company ?? "—",
                        })}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {auto(
                  "Log calls or emails to build your activity timeline.",
                  "activities.empty",
                )}
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className="rounded-full bg-primary/10 p-3">{icon}</div>
      </CardContent>
    </Card>
  );
}
