"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, Loader2, RefreshCw, Shield, Zap } from "@/components/ui/icons";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type EndpointStats = {
  endpoint: string;
  hits: number;
  uniqueClients: number;
  orgs: string[];
};

type RateLimitMetrics = {
  windowMs: number;
  totalHits: number;
  uniqueKeys: number;
  endpoints: EndpointStats[];
  loginRateLimit: {
    windowMs: number;
    maxAttempts: number;
  };
  distributed: {
    enabled: boolean;
    status: string;
    lastConnectedAt?: string | null;
    lastErrorAt?: string | null;
    lastError?: string | null;
  };
  generatedAt: string;
};

export default function RateLimitingDashboard() {
  const auto = useAutoTranslator("admin.rateLimits");
  const { data: session, status } = useSession();

  const [metrics, setMetrics] = useState<RateLimitMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpointQuery, setEndpointQuery] = useState("");

  const hasAccess = session?.user?.role === "SUPER_ADMIN";

  const refreshMetrics = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/security/rate-limits", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to load rate limit metrics");
      }
      setMetrics(data as RateLimitMetrics);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : auto("Unable to load rate limit metrics", "errors.load");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [auto, hasAccess]);

  useEffect(() => {
    if (status === "authenticated" && hasAccess) {
      void refreshMetrics();
    }
  }, [status, hasAccess, refreshMetrics]);

  const filteredEndpoints = useMemo(() => {
    if (!metrics) return [];
    const term = endpointQuery.trim().toLowerCase();
    const list = [...metrics.endpoints].sort((a, b) => b.hits - a.hits);
    if (!term) return list;
    return list.filter((entry) =>
      entry.endpoint.toLowerCase().includes(term),
    );
  }, [metrics, endpointQuery]);

  const windowMinutes = metrics ? Math.max(1, Math.round(metrics.windowMs / 60000)) : 1;

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {auto("Authentication Required", "authRequired.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <p>
              {auto(
                "Log in to view the rate limiting dashboard.",
                "authRequired.description",
              )}
            </p>
            <a
              href="/login"
              className="inline-flex text-sm font-medium text-primary underline"
            >
              {auto("Go to Login", "authRequired.cta")}
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {auto("Access Denied", "accessDenied.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <p>
              {auto(
                "This dashboard is restricted to Super Admin users.",
                "accessDenied.description",
              )}
            </p>
            <a
              href="/dashboard"
              className="inline-flex text-sm font-medium text-primary underline"
            >
              {auto("Return to Dashboard", "accessDenied.cta")}
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">
            {auto("Rate Limiting Dashboard", "rateLimit.header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Monitor throttling activity, login guardrails, and distributed rate limiting health.",
              "rateLimit.header.subtitle",
            )}
          </p>
          {metrics?.generatedAt && (
            <p className="text-xs text-muted-foreground">
              {auto(
                "Refreshed {{time}}",
                "rateLimit.header.refreshed",
                { time: new Date(metrics.generatedAt).toLocaleString() },
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            className="w-64"
            placeholder={auto("Filter by endpoint", "rateLimit.filter.placeholder")}
            value={endpointQuery}
            onChange={(e) => setEndpointQuery(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => refreshMetrics()}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {auto("Refresh", "rateLimit.actions.refresh")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive-foreground rounded-2xl p-4">
          <div className="flex items-start gap-2">
            <Shield className="h-5 w-5 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                {auto("Unable to load rate limits", "rateLimit.errors.load")}
              </p>
              <p className="text-sm">{error}</p>
              <button type="button"
                onClick={() => refreshMetrics()}
                className="text-sm font-medium underline"
              >
                {auto("Retry", "errors.retry")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {auto("429s in last window", "rateLimit.summary.total")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {metrics?.totalHits ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {auto("Unique clients", "rateLimit.summary.unique")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {metrics?.uniqueKeys ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {auto("Login guardrail", "rateLimit.summary.login")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-lg font-semibold">
              {metrics?.loginRateLimit.maxAttempts ?? 0} {auto("attempts", "rateLimit.summary.attempts")}
            </p>
            <p className="text-sm text-muted-foreground">
              {auto("per {{window}} minutes", "rateLimit.summary.window", {
                window: metrics
                  ? Math.max(1, Math.round(metrics.loginRateLimit.windowMs / 60000))
                  : windowMinutes,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {auto("Distributed status", "rateLimit.summary.distributed")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Badge variant={metrics?.distributed.enabled ? "default" : "secondary"}>
              {metrics?.distributed.enabled
                ? auto("Redis active", "rateLimit.summary.redisActive")
                : auto("In-memory", "rateLimit.summary.redisInactive")}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {metrics?.distributed.status ?? "unknown"}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              {auto("Endpoint activity ({{minutes}}m window)", "rateLimit.table.title", {
                minutes: windowMinutes,
              })}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Top endpoints currently being throttled. Includes org-aware rate limits where available.",
                "rateLimit.table.subtitle",
              )}
            </p>
          </div>
          <Badge variant="outline">
            {auto("Window", "rateLimit.table.window")}: {windowMinutes}m
          </Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {filteredEndpoints.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {auto("No recent rate limit events", "rateLimit.table.empty")}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {auto("Endpoint", "rateLimit.table.endpoint")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {auto("Hits", "rateLimit.table.hits")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {auto("Unique keys", "rateLimit.table.unique")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {auto("Orgs", "rateLimit.table.orgs")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEndpoints.map((entry) => (
                  <tr key={entry.endpoint} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {entry.endpoint}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {entry.hits}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {entry.uniqueClients}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {entry.orgs.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {entry.orgs.slice(0, 3).map((org) => (
                            <Badge key={`${entry.endpoint}-${org}`} variant="secondary">
                              {org}
                            </Badge>
                          ))}
                          {entry.orgs.length > 3 && (
                            <Badge variant="outline">+{entry.orgs.length - 3}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {auto("Global", "rateLimit.table.global")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {metrics?.distributed.lastError && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <CardTitle className="text-warning">
              {auto("Recent Redis warning", "rateLimit.redis.warning")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-warning-foreground">
            <p>{metrics.distributed.lastError}</p>
            {metrics.distributed.lastErrorAt && (
              <p className="text-xs">
                {auto(
                  "Last error at {{time}}",
                  "rateLimit.redis.lastErrorAt",
                  { time: new Date(metrics.distributed.lastErrorAt).toLocaleString() },
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
