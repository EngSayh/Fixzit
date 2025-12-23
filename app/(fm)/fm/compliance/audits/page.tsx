"use client";

import useSWR from "swr";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ClipboardCheck, Loader2, ShieldAlert, RefreshCw } from "@/components/ui/icons";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { useDebounce } from "@/hooks/useDebounce";
import ClientDate from "@/components/ClientDate";

type AuditStatus = "PLANNED" | "IN_PROGRESS" | "FOLLOW_UP" | "COMPLETED";
type AuditRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type ComplianceAudit = {
  _id: string;
  name: string;
  owner: string;
  scope: string;
  status: AuditStatus;
  riskLevel: AuditRisk;
  startDate: string;
  endDate: string;
  findings?: number;
  openIssues?: number;
  tags?: string[];
  supportingTeams?: string[];
};

type AuditListResponse = {
  audits: ComplianceAudit[];
  stats: {
    total: number;
    upcoming: number;
    inProgress: number;
    completed: number;
    highRisk: number;
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error ?? "Failed to load audits");
  }
  return (await response.json()) as AuditListResponse;
};

const STATUS_FILTERS: Array<{
  value: AuditStatus | "ALL";
  label: string;
  translationKey: string;
}> = [
  { value: "ALL", label: "All statuses", translationKey: "filters.status.all" },
  {
    value: "PLANNED",
    label: "Planned",
    translationKey: "filters.status.planned",
  },
  {
    value: "IN_PROGRESS",
    label: "In progress",
    translationKey: "filters.status.inProgress",
  },
  {
    value: "FOLLOW_UP",
    label: "Follow-up",
    translationKey: "filters.status.followUp",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    translationKey: "filters.status.completed",
  },
];

const RISK_FILTERS: Array<{
  value: AuditRisk | "ALL";
  label: string;
  translationKey: string;
}> = [
  {
    value: "ALL",
    label: "All risk levels",
    translationKey: "filters.risk.all",
  },
  { value: "LOW", label: "Low", translationKey: "filters.risk.low" },
  { value: "MEDIUM", label: "Medium", translationKey: "filters.risk.medium" },
  { value: "HIGH", label: "High", translationKey: "filters.risk.high" },
  {
    value: "CRITICAL",
    label: "Critical",
    translationKey: "filters.risk.critical",
  },
];

const STATUS_BADGES: Record<AuditStatus, string> = {
  PLANNED:
    "bg-slate-100 text-slate-900 dark:bg-slate-900/40 dark:text-slate-200",
  IN_PROGRESS:
    "bg-primary/10 text-primary-dark dark:bg-primary/20/40 dark:text-primary-light",
  FOLLOW_UP:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  COMPLETED:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
};

const RISK_BADGES: Record<AuditRisk, string> = {
  LOW: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  MEDIUM:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  HIGH: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
  CRITICAL: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
};

export default function ComplianceAuditsPage() {
  const auto = useAutoTranslator("fm.compliance.audits.list");
  const { data: session } = useSession();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({
    moduleId: "compliance",
  });

  const [statusFilter, setStatusFilter] = useState<AuditStatus | "ALL">("ALL");
  const [riskFilter, setRiskFilter] = useState<AuditRisk | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "100");
    if (statusFilter !== "ALL") {
      params.set("status", statusFilter);
    }
    if (riskFilter !== "ALL") {
      params.set("risk", riskFilter);
    }
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    }
    return `/api/compliance/audits?${params.toString()}`;
  }, [statusFilter, riskFilter, debouncedSearch]);

  const { data, error, isLoading, mutate } = useSWR<AuditListResponse>(
    orgId ? query : null,
    fetcher,
  );

  if (!session) {
    return (
      <div className="space-y-6">
        <ModuleViewTabs moduleId="compliance" />
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {auto("Sign in to load compliance data.", "states.requireSession")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  const audits = data?.audits ?? [];
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="compliance" />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {auto("Audit readiness", "header.kicker")}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {auto("Compliance audits & risk", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Monitor regulatory programs and follow-ups across your portfolio.",
              "header.subtitle",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="me-2 h-4 w-4" />
            )}
            {auto("Refresh", "actions.refresh")}
          </Button>
          <Button asChild>
            <Link href="/fm/compliance/audits/new">
              <ClipboardCheck className="me-2 h-4 w-4" />
              {auto("Plan new audit", "actions.newAudit")}
            </Link>
          </Button>
        </div>
      </div>

      {supportOrg && (
        <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {auto("Support context: {{name}}", "support.activeOrg", {
            name: supportOrg.name,
          })}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat
          label={auto("Upcoming audits", "stats.upcoming")}
          value={stats?.upcoming ?? 0}
          tone="default"
        />
        <SummaryStat
          label={auto("Active engagements", "stats.inProgress")}
          value={stats?.inProgress ?? 0}
          tone="indigo"
        />
        <SummaryStat
          label={auto("Completed", "stats.completed")}
          value={stats?.completed ?? 0}
          tone="emerald"
        />
        <SummaryStat
          label={auto("High-risk programs", "stats.highRisk")}
          value={stats?.highRisk ?? 0}
          tone="destructive"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{auto("Filters", "filters.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {auto("Status", "filters.statusLabel")}
            </p>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as AuditStatus | "ALL")
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={auto("All statuses", "filters.status.all")}
                />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {auto(option.label, option.translationKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {auto("Risk level", "filters.riskLabel")}
            </p>
            <Select
              value={riskFilter}
              onValueChange={(value) =>
                setRiskFilter(value as AuditRisk | "ALL")
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={auto("All risk levels", "filters.risk.all")}
                />
              </SelectTrigger>
              <SelectContent>
                {RISK_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {auto(option.label, option.translationKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {auto("Search", "filters.searchLabel")}
            </p>
            <Input
              placeholder={auto(
                "Search audit, owner, or tag…",
                "filters.searchPlaceholder",
              )}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/60 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            <p>{error.message}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{auto("Audit programs", "list.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="me-2 h-5 w-5 animate-spin" />
              {auto("Loading audits…", "states.loading")}
            </div>
          )}
          {!isLoading && audits.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
              {auto(
                "No audits match the filters. Plan one or adjust filters to see history.",
                "states.empty",
              )}
            </div>
          )}
          {audits.map((audit) => (
            <div
              key={audit._id}
              className="rounded-xl border border-border/80 p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {audit.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {auto("Owner: {{owner}}", "list.owner", {
                      owner: audit.owner,
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={STATUS_BADGES[audit.status]}>
                    {auto(audit.status, `status.${audit.status.toLowerCase()}`)}
                  </Badge>
                  <Badge className={RISK_BADGES[audit.riskLevel]}>
                    {auto(
                      audit.riskLevel,
                      `risk.${audit.riskLevel.toLowerCase()}`,
                    )}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide">
                    {auto("Window", "list.window")}
                  </p>
                  <p>
                    <ClientDate date={audit.startDate} format="date-only" /> —{" "}
                    <ClientDate date={audit.endDate} format="date-only" />
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide">
                    {auto("Scope", "list.scope")}
                  </p>
                  <p className="line-clamp-2 text-foreground">{audit.scope}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide">
                    {auto("Status summary", "list.summary")}
                  </p>
                  <p>
                    {auto(
                      "{{findings}} findings • {{issues}} open issues",
                      "list.findings",
                      {
                        findings: audit.findings ?? 0,
                        issues: audit.openIssues ?? 0,
                      },
                    )}
                  </p>
                </div>
              </div>
              {audit.tags && audit.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {audit.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/70 px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "indigo" | "emerald" | "destructive";
}) {
  const toneClasses: Record<
    "default" | "indigo" | "emerald" | "destructive",
    string
  > = {
    default:
      "bg-slate-50 text-slate-900 dark:bg-slate-900/40 dark:text-slate-200",
    indigo:
      "bg-indigo-50 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200",
    emerald:
      "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
    destructive: "bg-red-50 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  } as Record<typeof tone, string>;

  return (
    <Card className={toneClasses[tone]}>
      <CardContent className="py-5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
