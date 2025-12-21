"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ModuleStat } from "./types";

type RouteMetricsModuleBreakdownProps = {
  modules: ModuleStat[];
  auto: (text: string, key: string, vars?: Record<string, unknown>) => string;
};

/**
 * Module breakdown section for route metrics dashboard
 */
export function RouteMetricsModuleBreakdown({
  modules,
  auto,
}: RouteMetricsModuleBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{auto("Module Breakdown", "modules.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {auto("Route counts by module", "modules.subtitle")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {modules.map((module) => {
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
                      }
                    )}
                  </p>
                  {module.missing > 0 && (
                    <p className="text-xs text-destructive">
                      {auto("{{count}} aliases missing targets", "modules.missing", {
                        count: module.missing,
                      })}
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
                      {auto("{{percent}}% dedicated coverage", "modules.progress", {
                        percent: uniquePercent,
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-2xl font-bold">{duplicationRatio}%</div>
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
  );
}
