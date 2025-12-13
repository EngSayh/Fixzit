"use client";

import useSWR from "swr";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { FileText, Loader2, RefreshCw } from "lucide-react";
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

type PolicyStatus = "DRAFT" | "UNDER_REVIEW" | "ACTIVE" | "RETIRED";
type PolicyCategory =
  | "OPERATIONS"
  | "FINANCE"
  | "HR"
  | "SAFETY"
  | "COMPLIANCE"
  | "VENDOR";

type CompliancePolicy = {
  _id: string;
  title: string;
  owner: string;
  status: PolicyStatus;
  category: PolicyCategory;
  version: string;
  summary?: string;
  effectiveFrom?: string;
  reviewDate?: string;
  tags?: string[];
  acknowledgements?: number;
};

type PolicyResponse = {
  policies: CompliancePolicy[];
  stats: {
    active: number;
    drafts: number;
    underReview: number;
    dueForReview: number;
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error ?? "Failed to load policies");
  }
  return (await response.json()) as PolicyResponse;
};

const STATUS_OPTIONS: Array<{ value: PolicyStatus | "ALL"; key: string }> = [
  { value: "ALL", key: "filters.status.all" },
  { value: "ACTIVE", key: "filters.status.active" },
  { value: "UNDER_REVIEW", key: "filters.status.review" },
  { value: "DRAFT", key: "filters.status.draft" },
  { value: "RETIRED", key: "filters.status.retired" },
];

const CATEGORY_OPTIONS: Array<{ value: PolicyCategory | "ALL"; key: string }> =
  [
    { value: "ALL", key: "filters.category.all" },
    { value: "COMPLIANCE", key: "filters.category.compliance" },
    { value: "OPERATIONS", key: "filters.category.operations" },
    { value: "HR", key: "filters.category.hr" },
    { value: "FINANCE", key: "filters.category.finance" },
    { value: "SAFETY", key: "filters.category.safety" },
    { value: "VENDOR", key: "filters.category.vendor" },
  ];

const STATUS_BADGES: Record<PolicyStatus, string> = {
  ACTIVE:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  UNDER_REVIEW:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  DRAFT: "bg-slate-100 text-slate-900 dark:bg-slate-900/40 dark:text-slate-100",
  RETIRED: "bg-gray-200 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300",
};

export default function CompliancePoliciesPage() {
  const auto = useAutoTranslator("fm.compliance.policies.list");
  const { data: session } = useSession();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({
    moduleId: "compliance",
  });

  const [statusFilter, setStatusFilter] = useState<PolicyStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<PolicyCategory | "ALL">(
    "ALL",
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "100");
    if (statusFilter !== "ALL") {
      params.set("status", statusFilter);
    }
    if (categoryFilter !== "ALL") {
      params.set("category", categoryFilter);
    }
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    }
    return `/api/compliance/policies?${params.toString()}`;
  }, [statusFilter, categoryFilter, debouncedSearch]);

  const { data, error, isLoading, mutate } = useSWR<PolicyResponse>(
    orgId ? query : null,
    fetcher,
  );

  if (!session) {
    return (
      <div className="space-y-6">
        <ModuleViewTabs moduleId="compliance" />
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {auto("Sign in to load policy data.", "states.requireSession")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  const policies = data?.policies ?? [];
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="compliance" />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {auto("Policy governance", "header.kicker")}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {auto("Policy library", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Track compliance, HR, and finance policies with review cadence.",
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
            <Link href="/fm/administration/policies/new">
              <FileText className="me-2 h-4 w-4" />
              {auto("Draft policy", "actions.newPolicy")}
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
        <PolicyStat
          label={auto("Active policies", "stats.active")}
          value={stats?.active ?? 0}
        />
        <PolicyStat
          label={auto("Under review", "stats.review")}
          value={stats?.underReview ?? 0}
          tone="amber"
        />
        <PolicyStat
          label={auto("Drafts", "stats.drafts")}
          value={stats?.drafts ?? 0}
          tone="slate"
        />
        <PolicyStat
          label={auto("Due for review", "stats.overdue")}
          value={stats?.dueForReview ?? 0}
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
                setStatusFilter(value as PolicyStatus | "ALL")
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={auto("All statuses", "filters.status.all")}
                />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {auto(
                      option.value === "ALL" ? "All statuses" : option.value,
                      option.key,
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {auto("Category", "filters.categoryLabel")}
            </p>
            <Select
              value={categoryFilter}
              onValueChange={(value) =>
                setCategoryFilter(value as PolicyCategory | "ALL")
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={auto("All categories", "filters.category.all")}
                />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {auto(
                      option.value === "ALL"
                        ? "All categories"
                        : option.value.charAt(0) +
                            option.value.slice(1).toLowerCase(),
                      option.key,
                    )}
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
                "Search policy or owner…",
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
            <p>{error.message}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{auto("Policy register", "list.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="me-2 h-5 w-5 animate-spin" />
              {auto("Loading policies…", "states.loading")}
            </div>
          )}
          {!isLoading && policies.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
              {auto(
                "No policies found. Draft one or adjust filters.",
                "states.empty",
              )}
            </div>
          )}
          {policies.map((policy) => (
            <div
              key={policy._id}
              className="rounded-xl border border-border/80 p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {policy.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {auto("Owner: {{owner}}", "list.owner", {
                      owner: policy.owner,
                    })}
                  </p>
                </div>
                <Badge className={STATUS_BADGES[policy.status]}>
                  {auto(policy.status, `status.${policy.status.toLowerCase()}`)}
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide">
                    {auto("Category", "list.category")}
                  </p>
                  <p className="text-foreground">
                    {auto(
                      policy.category,
                      `categories.${policy.category.toLowerCase()}`,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide">
                    {auto("Version", "list.version")}
                  </p>
                  <p className="text-foreground">{policy.version}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide">
                    {auto("Next review", "list.review")}
                  </p>
                  <p className="text-foreground">
                    {policy.reviewDate ? (
                      <ClientDate date={policy.reviewDate} format="date-only" />
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              </div>
              {policy.tags && policy.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {policy.tags.map((tag) => (
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

function PolicyStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "amber" | "slate" | "destructive";
}) {
  const classes: Record<"default" | "amber" | "slate" | "destructive", string> =
    {
      default:
        "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
      amber:
        "bg-amber-50 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
      slate:
        "bg-slate-50 text-slate-900 dark:bg-slate-900/40 dark:text-slate-200",
      destructive:
        "bg-red-50 text-red-900 dark:bg-red-900/40 dark:text-red-200",
    };
  return (
    <Card className={classes[tone]}>
      <CardContent className="py-5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
