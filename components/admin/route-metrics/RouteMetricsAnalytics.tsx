"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TopRiskModule, DuplicateHistoryEntry, HighImpactDuplicate, RemediationSuggestion } from "./types";

type RouteMetricsAnalyticsProps = {
  resolvedCount: number;
  unresolvedCount: number;
  topRiskModules: TopRiskModule[];
  averageResolutionDays: number | null;
  recentlyResolved: DuplicateHistoryEntry[];
  highImpactDuplicates: HighImpactDuplicate[];
  unresolvedAliasesTotal: number;
  remediationSuggestions: RemediationSuggestion[];
  auto: (text: string, key: string, vars?: Record<string, unknown>) => string;
};

/**
 * Analytics section for route metrics dashboard
 * Includes resolution status, risk modules, velocity, and high-impact duplicates
 */
export function RouteMetricsAnalytics({
  resolvedCount,
  unresolvedCount,
  topRiskModules,
  averageResolutionDays,
  recentlyResolved,
  highImpactDuplicates,
  unresolvedAliasesTotal,
  remediationSuggestions,
  auto,
}: RouteMetricsAnalyticsProps) {
  return (
    <>
      {/* Resolution & Risk */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Alias Resolution", "analytics.resolutionTitle")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Resolved vs unresolved alias files",
                "analytics.resolutionSubtitle"
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
                      : (resolvedCount / (resolvedCount + unresolvedCount)) * 100
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
                "analytics.riskSubtitle"
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
                      {auto("{{duplicates}} shared aliases", "analytics.duplicates", {
                        duplicates: module.duplicateAliases,
                      })}
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

      {/* Resolution Velocity */}
      {averageResolutionDays !== null && (
        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Resolution Velocity", "analytics.resolutionVelocity")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Average time to retire duplicated routes",
                "analytics.resolutionVelocitySubtitle"
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

      {/* High-Impact Duplicates */}
      {highImpactDuplicates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {auto("High-Impact Duplicates", "analytics.highImpactTitle")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Prioritize routes with real traffic or error volume",
                "analytics.highImpactSubtitle"
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
                    {auto("{{count}} aliases · {{views}} views", "analytics.highImpactMeta", {
                      count: entry.count,
                      views: entry.pageViews,
                    })}
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

      {/* Unresolved Alert */}
      {unresolvedAliasesTotal > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-destructive">
              <span className="w-4 h-4">⚠️</span>
              <p className="text-sm font-semibold">
                {auto(
                  "Some aliases do not resolve to targets",
                  "alerts.unresolvedTitle"
                )}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {auto(
                "{{count}} aliases are unresolved — regenerate the metrics and fix the pages",
                "alerts.unresolvedBody",
                { count: unresolvedAliasesTotal }
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Remediation Suggestions */}
      {remediationSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Remediation Suggestions", "suggestions.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto("Next steps to eliminate shared routes", "suggestions.subtitle")}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {remediationSuggestions.map((suggestion) => (
              <div
                key={suggestion.module}
                className="flex items-center justify-between rounded-lg border border-border/60 p-3"
              >
                <div>
                  <p className="font-semibold capitalize">{suggestion.module}</p>
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
    </>
  );
}
