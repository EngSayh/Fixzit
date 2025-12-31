"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { toast } from "sonner";
import {
  BarChart,
  Activity,
  Target,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Loader2,
  Download,
} from "@/components/ui/icons";
import { logger } from "@/lib/logger";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import type { TooltipProps } from "recharts";

type ModuleStat = {
  module: string;
  aliases: number;
  missing: number;
  uniqueTargets: number;
  targets: string[];
};

type ReuseEntry = {
  target: string;
  count: number;
  aliasFiles: string[];
  modules: string[];
};

type AliasRecord = {
  module: string;
  aliasFile: string;
  importTarget: string;
  resolvedPath: string | null;
  targetExists: boolean;
};

type DuplicateHistoryEntry = {
  target: string;
  firstSeen: string;
  lastSeen: string;
  resolvedAt: string | null;
  active: boolean;
};

type RouteHealthEntry = {
  target: string;
  pageViews: number;
  errorRate: number;
};

type RouteInsights = {
  duplicateHistory: DuplicateHistoryEntry[];
  averageResolutionDays: number | null;
  routeHealth: RouteHealthEntry[];
};

type RouteMetrics = {
  generatedAt: string;
  totals: {
    aliasFiles: number;
    modules: number;
    reusedTargets: number;
    uniqueTargets: number;
    duplicateAliases: number;
    unresolvedAliases: number;
  };
  modules: ModuleStat[];
  reuse: ReuseEntry[];
  aliases: AliasRecord[];
  insights?: RouteInsights;
};

const AUTO_REFRESH_MS = 5 * 60 * 1000;
const HISTORY_LIMIT = 20;
const HISTORY_GRADIENT_ID = "route-duplication-history";
const formatPercentLabel = (value: number | string) =>
  `${Number(value).toFixed(1)}%`;

type AliasState = {
  owner: string;
  resolved: boolean;
  updatedAt?: string;
};

type RouteHistoryChartDatum = {
  timestamp: string;
  label: string;
  fullLabel: string;
  rate: number;
};

type HistoryTooltipProps = TooltipProps<number, string> & {
  payload?: ReadonlyArray<{ payload?: RouteHistoryChartDatum }>;
};

export default function RouteMetricsPage() {
  const auto = useAutoTranslator("admin.routeMetrics");
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [aliasQuery, setAliasQuery] = useState("");
  const [lastViewedAt, setLastViewedAt] = useState<string | null>(null);
  const [duplicationTrend, setDuplicationTrend] = useState<{
    current: number | null;
    previous: number | null;
  }>({
    current: null,
    previous: null,
  });
  const [history, setHistory] = useState<
    Array<{ timestamp: string; rate: number }>
  >([]);
  const [aliasStates, setAliasStates] = useState<Record<string, AliasState>>(
    {},
  );
  const [workflowLoading, setWorkflowLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("routeMetricsLastRefresh");
    if (stored) {
      setLastViewedAt(stored);
    }
  }, []);

  const loadWorkflowStates = useCallback(async () => {
    setWorkflowLoading(true);
    try {
      const response = await fetch("/api/admin/route-aliases/workflow");
      if (!response.ok) throw new Error("Failed to load workflow state");
      const data = (await response.json()) as Record<string, AliasState>;
      setAliasStates(data);
    } catch {
      toast.error(
        auto("Failed to load workflow states", "aliases.workflow.loadError"),
      );
    } finally {
      setWorkflowLoading(false);
    }
  }, [auto, toast]);

  useEffect(() => {
    if (metrics) {
      void loadWorkflowStates();
    }
  }, [metrics, loadWorkflowStates]);

  const stageAliasState = useCallback(
    (aliasFile: string, updates: Partial<AliasState>) => {
      setAliasStates((prev) => {
        const base = prev[aliasFile] ?? { owner: "", resolved: false };
        return {
          ...prev,
          [aliasFile]: {
            ...base,
            ...updates,
          },
        };
      });
    },
    [],
  );

  const persistAliasState = useCallback(
    async (aliasFile: string) => {
      const current = aliasStates[aliasFile];
      if (!current) return;

      try {
        const response = await fetch("/api/admin/route-aliases/workflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aliasFile,
            owner: current.owner,
            resolved: current.resolved,
          }),
        });

        if (!response.ok) throw new Error("Failed to persist workflow state");
        const saved = (await response.json()) as AliasState;
        setAliasStates((prev) => ({
          ...prev,
          [aliasFile]: saved,
        }));
      } catch (_error) {
        toast.error(
          auto("Failed to update workflow state", "aliases.workflow.error"),
        );
      }
    },
    [aliasStates, auto, toast],
  );

  const appendHistoryEntry = useCallback(
    (rate: number, generatedAt?: string) => {
      setHistory((prev) => {
        const timestamp = generatedAt ?? new Date().toISOString();
        const existingIndex = prev.findIndex(
          (entry) => entry.timestamp === timestamp,
        );
        let next = prev;
        if (existingIndex >= 0) {
          next = prev.map((entry, index) =>
            index === existingIndex ? { timestamp, rate } : entry,
          );
        } else {
          next = [...prev, { timestamp, rate }].slice(-HISTORY_LIMIT);
        }
        const last = next[next.length - 1] ?? null;
        const previous = next.length > 1 ? next[next.length - 2] : null;
        setDuplicationTrend({
          current: last?.rate ?? null,
          previous: previous?.rate ?? null,
        });
        return next;
      });
    },
    [],
  );

  const loadHistorySnapshots = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/route-metrics?history=1");
      if (!response.ok) {
        throw new Error("Failed to load history");
      }
      const payload = await response.json();
      const normalized: Array<{ timestamp: string; rate: number }> =
        Array.isArray(payload.history)
          ? payload.history.map(
              (entry: { generatedAt: string; duplicateRate: number }) => ({
                timestamp: entry.generatedAt,
                rate: entry.duplicateRate ?? 0,
              }),
            )
          : [];
      setHistory(normalized);
      if (normalized.length > 0) {
        const last = normalized[normalized.length - 1];
        const previous =
          normalized.length > 1 ? normalized[normalized.length - 2] : null;
        setDuplicationTrend({
          current: last.rate,
          previous: previous?.rate ?? null,
        });
      } else {
        setDuplicationTrend({ current: null, previous: null });
      }
    } catch (err) {
      logger.error("[RouteMetrics] Failed to load history snapshots", err);
      toast.error(auto("Failed to load history", "history.error"));
    }
  }, [auto]);

  useEffect(() => {
    void loadHistorySnapshots();
  }, [loadHistorySnapshots]);

  const fetchMetrics = useCallback(
    async (
      forceRefresh = false,
      options?: { silent?: boolean; notify?: boolean },
    ) => {
      const silent = options?.silent ?? false;
      if (forceRefresh) {
        if (!silent) setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const url = forceRefresh
          ? "/api/admin/route-metrics?refresh=1"
          : "/api/admin/route-metrics";
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to load metrics");
        const data = await response.json();
        setMetrics(data);
        if (typeof window !== "undefined") {
          const now = new Date().toISOString();
          window.localStorage.setItem("routeMetricsLastRefresh", now);
          setLastViewedAt(now);
        }
        const rate =
          data.totals.aliasFiles > 0
            ? (data.totals.duplicateAliases / data.totals.aliasFiles) * 100
            : 0;
        appendHistoryEntry(rate, data.generatedAt);
        if (options?.notify) {
          toast.success(
            auto("Metrics auto-refreshed", "notifications.autoRefreshed"),
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        if (options?.notify) {
          toast.error(
            auto("Auto-refresh failed", "notifications.autoRefreshError"),
          );
        }
      } finally {
        if (forceRefresh) {
          if (!silent) setRefreshing(false);
        } else if (!silent) {
          setLoading(false);
        }
      }
    },
    [auto, appendHistoryEntry],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchMetrics(true, { silent: true, notify: true });
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  const aliasList = metrics?.aliases ?? [];
  const reuseEntries = metrics?.reuse ?? [];
  const modulesData = metrics?.modules ?? [];
  const insights = metrics?.insights;
  const duplicateHistory = insights?.duplicateHistory ?? [];
  const averageResolutionDays = insights?.averageResolutionDays ?? null;
  const routeHealth = insights?.routeHealth ?? [];

  const duplicationRateValue = metrics?.totals
    ? metrics.totals.aliasFiles > 0
      ? (metrics.totals.duplicateAliases / metrics.totals.aliasFiles) * 100
      : 0
    : 0;
  const duplicationRate = duplicationRateValue.toFixed(1);

  const topReused = useMemo(() => reuseEntries.slice(0, 10), [reuseEntries]);
  const duplicatedTargets = useMemo(
    () => new Set(reuseEntries.map((entry) => entry.target)),
    [reuseEntries],
  );

  const sortedAliases = useMemo(() => {
    return [...aliasList].sort((a, b) => {
      if (a.module === b.module) {
        return a.aliasFile.localeCompare(b.aliasFile);
      }
      return a.module.localeCompare(b.module);
    });
  }, [aliasList]);

  const moduleOptions = useMemo(
    () => modulesData.map((module) => module.module).sort(),
    [modulesData],
  );

  const filteredAliases = useMemo(() => {
    const normalized = aliasQuery.trim().toLowerCase();
    return sortedAliases.filter((alias) => {
      const matchesModule =
        moduleFilter === "all" || alias.module === moduleFilter;
      const matchesSearch =
        !normalized ||
        alias.aliasFile.toLowerCase().includes(normalized) ||
        (alias.resolvedPath?.toLowerCase().includes(normalized) ?? false) ||
        alias.importTarget.toLowerCase().includes(normalized);
      return matchesModule && matchesSearch;
    });
  }, [aliasQuery, moduleFilter, sortedAliases]);

  const duplicationDelta =
    duplicationTrend.previous !== null
      ? duplicationRateValue - duplicationTrend.previous
      : null;
  const trendMax =
    history.length > 0 ? Math.max(...history.map((entry) => entry.rate)) : 0;

  const routeHealthByTarget = useMemo(() => {
    const map = new Map<string, RouteHealthEntry>();
    for (const entry of routeHealth) {
      map.set(entry.target, entry);
    }
    return map;
  }, [routeHealth]);

  const historyChartData = useMemo<RouteHistoryChartDatum[]>(() => {
    return [...history]
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      .map((entry) => {
        const date = new Date(entry.timestamp);
        return {
          timestamp: entry.timestamp,
          label: date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          fullLabel: date.toLocaleString(),
          rate: Number(entry.rate ?? 0),
        };
      });
  }, [history]);

  const renderHistoryTooltip = useCallback(
    (props: HistoryTooltipProps) => {
      if (!props.active || !props.payload?.length) {
        return null;
      }

      const datum = props.payload[0]?.payload as
        | RouteHistoryChartDatum
        | undefined;
      if (!datum) {
        return null;
      }

      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm text-xs space-y-1">
          <div className="text-[0.70rem] uppercase text-muted-foreground">
            {auto("Generated at", "history.chart.tooltip.timestamp")}
          </div>
          <div className="font-semibold text-foreground">{datum.fullLabel}</div>
          <div className="text-[0.70rem] uppercase text-muted-foreground">
            {auto("Duplication rate", "history.chart.tooltip.rate")}
          </div>
          <div className="font-semibold">{formatPercentLabel(datum.rate)}</div>
        </div>
      );
    },
    [auto],
  );

  const highImpactDuplicates = useMemo(() => {
    return topReused
      .map((entry) => {
        const health = routeHealthByTarget.get(entry.target);
        const impact = health
          ? health.pageViews * (1 + health.errorRate * 10)
          : 0;
        return {
          target: entry.target,
          count: entry.count,
          pageViews: health?.pageViews ?? 0,
          errorRate: health?.errorRate ?? 0,
          impact,
        };
      })
      .filter((entry) => entry.pageViews > 0)
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 5);
  }, [routeHealthByTarget, topReused]);

  const recentlyResolved = useMemo(() => {
    return duplicateHistory
      .filter((entry) => !entry.active && entry.resolvedAt)
      .sort(
        (a, b) =>
          new Date(b.resolvedAt ?? 0).getTime() -
          new Date(a.resolvedAt ?? 0).getTime(),
      )
      .slice(0, 3);
  }, [duplicateHistory]);

  const resolvedCount = aliasList.filter((alias) => alias.targetExists).length;
  const unresolvedCount = aliasList.length - resolvedCount;

  const topRiskModules = useMemo(() => {
    return modulesData
      .map((module) => ({
        ...module,
        duplicateAliases: module.aliases - module.uniqueTargets,
        riskScore:
          module.aliases > 0
            ? (module.aliases - module.uniqueTargets) / module.aliases
            : 0,
      }))
      .filter((module) => module.duplicateAliases > 0)
      .sort((a, b) => b.duplicateAliases - a.duplicateAliases)
      .slice(0, 3);
  }, [modulesData]);

  const remediationSuggestions = useMemo(() => {
    if (topRiskModules.length === 0) return [];
    return topRiskModules.map((module) => ({
      module: module.module,
      message: auto(
        "Create {{count}} dedicated pages to eliminate shared targets in {{module}}",
        "suggestions.createDedicatedPages",
        { count: module.duplicateAliases, module: module.module },
      ),
    }));
  }, [auto, topRiskModules]);

  const handleDownload = useCallback(() => {
    if (!metrics) return;
    const blob = new Blob([JSON.stringify(metrics, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `route-metrics-${new Date(metrics.generatedAt).toISOString()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [metrics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">
          {auto("Route Metrics Dashboard", "header.title")}
        </h1>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-8 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">
          {auto("Route Metrics Dashboard", "header.title")}
        </h1>
        <Card className="border-destructive">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="text-destructive">
              {error || auto("Failed to load metrics", "error.load")}
            </p>
            <Button onClick={() => void fetchMetrics()}>
              {auto("Retry", "actions.retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {auto("Route Metrics Dashboard", "header.title")}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {auto(
              "Track route alias architecture and identify UX duplication",
              "header.subtitle",
            )}
          </p>
          {lastViewedAt && (
            <p className="text-xs text-muted-foreground">
              {auto("Last viewed {{time}} (local cache)", "meta.lastViewed", {
                time: new Date(lastViewedAt).toLocaleString(),
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleDownload}
            disabled={!metrics}
          >
            <Download className="w-4 h-4 me-2" />
            {auto("Download JSON", "actions.download")}
          </Button>
          <Button
            onClick={() => void fetchMetrics(true)}
            variant="outline"
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 me-2" />
            )}
            {refreshing
              ? auto("Refreshing…", "actions.refreshing")
              : auto("Refresh", "actions.refresh")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {auto("Total Aliases", "cards.totalAliases")}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totals.aliasFiles}
            </div>
            <p className="text-xs text-muted-foreground">
              {auto("Across {{count}} modules", "cards.acrossModules", {
                count: metrics.totals.modules,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {auto("Unique Targets", "cards.uniqueTargets")}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totals.uniqueTargets}
            </div>
            <p className="text-xs text-muted-foreground">
              {auto("Dedicated implementations", "cards.dedicated")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {auto("Reused Targets", "cards.reusedTargets")}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totals.reusedTargets}
            </div>
            <p className="text-xs text-muted-foreground">
              {auto("Pages shared by multiple routes", "cards.sharedPages")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {auto("Duplication Rate", "cards.duplicationRate")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{duplicationRate}%</div>
            <p className="text-xs text-muted-foreground">
              {auto("Routes sharing implementations", "cards.routesSharing")}
              {duplicationDelta !== null && (
                <>
                  {" "}
                  <span
                    className={
                      duplicationDelta > 0
                        ? "text-destructive"
                        : "text-emerald-600"
                    }
                  >
                    {duplicationDelta > 0 ? "+" : ""}
                    {duplicationDelta.toFixed(1)}%
                  </span>
                  <span> {auto("vs last refresh", "cards.vsLast")}</span>
                </>
              )}
            </p>
            {history.length > 1 && trendMax > 0 && (
              <div className="mt-4">
                <div className="flex items-end gap-1 h-12">
                  {history.map((entry, index) => {
                    const normalized = entry.rate / trendMax;
                    return (
                      <div
                        key={`${entry.timestamp}-${index}`}
                        className="flex-1 rounded-t bg-primary/70"
                        style={{ height: `${Math.max(normalized * 100, 5)}%` }}
                        title={`${entry.rate.toFixed(1)}%`}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {auto("History of duplication refreshes", "cards.trendHelp")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {auto("Last Updated", "cards.lastUpdated")}
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {new Date(metrics.generatedAt).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {auto("Metrics timestamp", "cards.timestamp")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>
            {auto("Historical Duplicate Rate", "history.chart.title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto(
              "Snapshots captured from route metrics history archives",
              "history.chart.subtitle",
            )}
          </p>
        </CardHeader>
        <CardContent>
          {historyChartData.length === 0 ? (
            <div className="h-40 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {auto(
                "Snapshots populate automatically when you run npm run check:route-aliases. Rerun after major refactors to capture new data.",
                "history.chart.empty",
              )}
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={historyChartData}
                  margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id={HISTORY_GRADIENT_ID}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.45}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="label"
                    className="text-xs"
                    tick={{ fontSize: 12 }}
                    minTickGap={12}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatPercentLabel}
                    width={48}
                    domain={[0, "auto"]}
                  />
                  <RechartsTooltip content={renderHistoryTooltip} />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill={`url(#${HISTORY_GRADIENT_ID})`}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2">
                {auto(
                  "Data source: reports/route-metrics/history/*.json",
                  "history.chart.caption",
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Analytics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Alias Resolution", "analytics.resolutionTitle")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Resolved vs unresolved alias files",
                "analytics.resolutionSubtitle",
              )}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {auto("Resolved", "analytics.resolved")}
                </p>
                <p className="text-2xl font-bold">{resolvedCount}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {auto("Unresolved", "analytics.unresolved")}
                </p>
                <p className="text-2xl font-bold text-destructive">
                  {unresolvedCount}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${
                    resolvedCount === 0 && unresolvedCount === 0
                      ? 0
                      : (resolvedCount / (resolvedCount + unresolvedCount)) *
                        100
                  }%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {auto("Highest Risk Modules", "analytics.riskTitle")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Modules still sharing implementations",
                "analytics.riskSubtitle",
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {topRiskModules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {auto("No duplication remaining 🎉", "analytics.noRisk")}
              </p>
            ) : (
              topRiskModules.map((module) => (
                <div
                  key={module.module}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-semibold capitalize">{module.module}</p>
                    <p className="text-xs text-muted-foreground">
                      {auto(
                        "{{duplicates}} shared aliases",
                        "analytics.duplicates",
                        {
                          duplicates: module.duplicateAliases,
                        },
                      )}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-orange-600 border-orange-600"
                  >
                    {Math.round(module.riskScore * 100)}%{" "}
                    {auto("risk", "analytics.riskLabel")}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {averageResolutionDays !== null && (
        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Resolution Velocity", "analytics.resolutionVelocity")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Average time to retire duplicated routes",
                "analytics.resolutionVelocitySubtitle",
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">
              {averageResolutionDays} {auto("days", "analytics.daysLabel")}
            </div>
            {recentlyResolved.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase text-muted-foreground">
                  {auto("Recently resolved", "analytics.recentlyResolved")}
                </p>
                {recentlyResolved.map((entry) => (
                  <div
                    key={entry.target}
                    className="flex items-center justify-between text-sm"
                  >
                    <code className="text-xs bg-muted px-2 py-1 rounded border border-border/60">
                      {entry.target}
                    </code>
                    <span className="text-muted-foreground">
                      {new Date(entry.resolvedAt ?? "").toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {highImpactDuplicates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {auto("High-Impact Duplicates", "analytics.highImpactTitle")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Prioritize routes with real traffic or error volume",
                "analytics.highImpactSubtitle",
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {highImpactDuplicates.map((entry) => (
              <div
                key={entry.target}
                className="flex flex-wrap items-center justify-between rounded-lg border border-border/70 p-3"
              >
                <div>
                  <code className="text-xs bg-muted px-2 py-1 rounded border border-border/60">
                    {entry.target}
                  </code>
                  <p className="text-xs text-muted-foreground">
                    {auto(
                      "{{count}} aliases · {{views}} views",
                      "analytics.highImpactMeta",
                      {
                        count: entry.count,
                        views: entry.pageViews,
                      },
                    )}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-semibold">
                    {auto("Error rate", "analytics.errorRate")}:{" "}
                    {(entry.errorRate * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {metrics.totals.unresolvedAliases > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm font-semibold">
                {auto(
                  "Some aliases do not resolve to targets",
                  "alerts.unresolvedTitle",
                )}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {auto(
                "{{count}} aliases are unresolved — regenerate the metrics and fix the pages",
                "alerts.unresolvedBody",
                {
                  count: metrics.totals.unresolvedAliases,
                },
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Top Reused Targets */}
      <Card>
        <CardHeader>
          <CardTitle>{auto("Most Reused Targets", "reused.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto(
              "Pages serving multiple routes (UX debt candidates)",
              "reused.subtitle",
            )}
          </p>
        </CardHeader>
        <CardContent>
          {topReused.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {auto(
                "No reused targets found - all routes are dedicated!",
                "reused.empty",
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {topReused.map((entry, index) => (
                <div
                  key={entry.target}
                  className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={entry.count > 3 ? "destructive" : "secondary"}
                      >
                        #{index + 1}
                      </Badge>
                      <div>
                        <code className="text-sm font-mono">
                          {entry.target}
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">
                          {auto(
                            "Serving {{count}} different routes",
                            "reused.servingCount",
                            {
                              count: entry.count,
                            },
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={entry.count > 3 ? "destructive" : "default"}
                    >
                      {entry.count}× {auto("reused", "reused.label")}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.modules.map((module) => (
                      <Badge
                        key={`${entry.target}-${module}`}
                        variant="outline"
                        className="uppercase tracking-wide"
                      >
                        {module}
                      </Badge>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {auto("Alias Files", "reused.aliasFiles")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {entry.aliasFiles.map((alias) => (
                        <code
                          key={`${entry.target}-${alias}`}
                          className="text-xs bg-muted px-2 py-1 rounded border border-border/70"
                        >
                          {alias}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alias Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>{auto("Alias Inventory", "aliases.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto(
              "Full list of /fm aliases and their resolved targets",
              "aliases.subtitle",
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {auto(
              "Owner & resolution states sync across admins automatically",
              "aliases.localStateHint",
            )}
          </p>
          {workflowLoading && (
            <p className="text-xs text-muted-foreground">
              {auto("Syncing workflow states…", "aliases.workflow.loading")}
            </p>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={moduleFilter} onValueChange={setModuleFilter} placeholder={auto("Filter by module", "aliases.filter.placeholder")}>
              <SelectTrigger className="w-48"></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {auto("All modules", "aliases.filter.all")}
                </SelectItem>
                {moduleOptions.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={aliasQuery}
              onChange={(event) => setAliasQuery(event.target.value)}
              placeholder={auto(
                "Search alias or target…",
                "aliases.search.placeholder",
              )}
              className="w-64"
            />
            <span className="text-xs text-muted-foreground">
              {auto("{{count}} aliases shown", "aliases.count", {
                count: filteredAliases.length,
              })}
            </span>
          </div>
          {sortedAliases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {auto(
                "No alias files detected under app/fm — awesome!",
                "aliases.empty",
              )}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-1">
                    {auto("Module", "aliases.headers.module")}
                  </th>
                  <th className="px-2 py-1">
                    {auto("Alias File", "aliases.headers.alias")}
                  </th>
                  <th className="px-2 py-1">
                    {auto("Resolved Target", "aliases.headers.target")}
                  </th>
                  <th className="px-2 py-1">
                    {auto("Status", "aliases.headers.status")}
                  </th>
                  <th className="px-2 py-1">
                    {auto("Owner", "aliases.headers.owner")}
                  </th>
                  <th className="px-2 py-1">
                    {auto("Workflow", "aliases.headers.workflow")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAliases.map((alias) => {
                  const isShared =
                    alias.resolvedPath &&
                    duplicatedTargets.has(alias.resolvedPath);
                  const aliasState = aliasStates[alias.aliasFile];
                  return (
                    <tr
                      key={alias.aliasFile}
                      className="border-t border-border/60"
                    >
                      <td className="px-2 py-2 font-medium capitalize">
                        {alias.module}
                      </td>
                      <td className="px-2 py-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded border border-border/70">
                          {alias.aliasFile}
                        </code>
                      </td>
                      <td className="px-2 py-2">
                        {alias.resolvedPath ? (
                          <code className="text-xs text-muted-foreground">
                            {alias.resolvedPath}
                          </code>
                        ) : (
                          <span className="text-xs text-destructive">
                            {auto("Missing target", "aliases.targetMissing")}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={
                              alias.targetExists ? "secondary" : "destructive"
                            }
                          >
                            {alias.targetExists
                              ? auto("Resolved", "aliases.status.resolved")
                              : auto("Missing", "aliases.status.missing")}
                          </Badge>
                          {isShared && (
                            <Badge
                              variant="outline"
                              className="text-orange-600 border-orange-600"
                            >
                              {auto("Shared target", "aliases.status.shared")}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          value={aliasState?.owner ?? ""}
                          onChange={(event) =>
                            stageAliasState(alias.aliasFile, {
                              owner: event.target.value,
                            })
                          }
                          onBlur={() => void persistAliasState(alias.aliasFile)}
                          placeholder={auto(
                            "Assign owner…",
                            "aliases.owner.placeholder",
                          )}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          size="sm"
                          variant={
                            aliasState?.resolved ? "secondary" : "outline"
                          }
                          onClick={() => {
                            stageAliasState(alias.aliasFile, {
                              resolved: !aliasState?.resolved,
                            });
                            void persistAliasState(alias.aliasFile);
                          }}
                        >
                          {aliasState?.resolved
                            ? auto("Resolved", "aliases.workflow.resolved")
                            : auto("Mark Resolved", "aliases.workflow.mark")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Remediation Suggestions */}
      {remediationSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Remediation Suggestions", "suggestions.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Next steps to eliminate shared routes",
                "suggestions.subtitle",
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {remediationSuggestions.map((suggestion) => (
              <div
                key={suggestion.module}
                className="flex items-center justify-between rounded-lg border border-border/60 p-3"
              >
                <div>
                  <p className="font-semibold capitalize">
                    {suggestion.module}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {suggestion.message}
                  </p>
                </div>
                <Badge variant="secondary">
                  {auto("Action", "suggestions.actionLabel")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Module Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>{auto("Module Breakdown", "modules.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto("Route counts by module", "modules.subtitle")}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.modules.map((module) => {
              const duplicationRatio =
                module.aliases > 0
                  ? ((module.uniqueTargets / module.aliases) * 100).toFixed(0)
                  : "0";
              const hasDuplication = module.aliases > module.uniqueTargets;
              const uniquePercent =
                module.aliases > 0
                  ? Math.round((module.uniqueTargets / module.aliases) * 100)
                  : 0;

              return (
                <div
                  key={module.module}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold capitalize">
                        {module.module}
                      </span>
                      {hasDuplication && (
                        <Badge
                          variant="outline"
                          className="text-orange-600 border-orange-600"
                        >
                          {auto("Has Duplication", "modules.hasDuplication")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {auto(
                        "{{aliases}} aliases → {{targets}} unique targets",
                        "modules.stats",
                        {
                          aliases: module.aliases,
                          targets: module.uniqueTargets,
                        },
                      )}
                    </p>
                    {module.missing > 0 && (
                      <p className="text-xs text-destructive">
                        {auto(
                          "{{count}} aliases missing targets",
                          "modules.missing",
                          {
                            count: module.missing,
                          },
                        )}
                      </p>
                    )}
                    <div className="mt-2">
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${uniquePercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {auto(
                          "{{percent}}% dedicated coverage",
                          "modules.progress",
                          {
                            percent: uniquePercent,
                          },
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="text-2xl font-bold">
                      {duplicationRatio}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {auto("unique", "modules.unique")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            {auto(
              "Metrics generated on-demand (npm run check:route-aliases:json or Refresh)",
              "info.command",
            )}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {auto(
              "Data source: _artifacts/route-aliases.json",
              "info.dataSource",
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
