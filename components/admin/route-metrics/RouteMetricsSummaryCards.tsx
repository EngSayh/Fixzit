"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Activity, TrendingUp, RefreshCw } from "@/components/ui/icons";
import type { RouteMetrics } from "./types";

type RouteMetricsSummaryCardsProps = {
  metrics: RouteMetrics;
  duplicationRate: string;
  duplicationDelta: number | null;
  history: Array<{ timestamp: string; rate: number }>;
  trendMax: number;
  auto: (text: string, key: string, vars?: Record<string, unknown>) => string;
};

/**
 * Summary cards for route metrics dashboard
 */
export function RouteMetricsSummaryCards({
  metrics,
  duplicationRate,
  duplicationDelta,
  history,
  trendMax,
  auto,
}: RouteMetricsSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {auto("Total Aliases", "cards.totalAliases")}
          </CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totals.aliasFiles}</div>
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
  );
}
