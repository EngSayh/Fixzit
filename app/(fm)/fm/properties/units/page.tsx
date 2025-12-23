"use client";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { Filter, Plus, AlertCircle } from "@/components/ui/icons";
import { useMemo } from "react";
import { useProperties } from "@/hooks/fm/useProperties";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";

export default function PropertiesUnitsWorkspace() {
  const { hasOrgContext, guard, supportBanner } = useFmOrgGuard({
    moduleId: "properties",
  });
  const auto = useAutoTranslator("fm.properties.units");
  const { properties, isLoading, error, refresh } = useProperties("?limit=100");

  const stats = useMemo(() => {
    const totalUnits = properties.reduce(
      (sum, property) => sum + (property.units?.length ?? 1),
      0,
    );
    const vacantUnits = properties.reduce(
      (sum, property) =>
        sum +
        (property.units?.filter((unit) => unit.status === "vacant").length ??
          0),
      0,
    );
    const renewals = properties.filter((property) => property.createdAt).length;
    return [
      {
        label: auto("Total units", "metrics.total"),
        value: totalUnits.toString(),
      },
      {
        label: auto("Vacancy rate", "metrics.vacancy"),
        value: totalUnits
          ? `${Math.round((vacantUnits / totalUnits) * 100)}%`
          : "0%",
      },
      {
        label: auto("Renewals next 90d", "metrics.renewals"),
        value: renewals.toString(),
      },
      { label: auto("Maintenance alerts", "metrics.maintenance"), value: "9" },
    ];
  }, [auto, properties]);

  if (!hasOrgContext) {
    return guard;
  }

  return (
    <div className="space-y-6">
      {supportBanner}
      <ModuleViewTabs moduleId="properties" />

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {auto("Inventory", "header.kicker")}
          </p>
          <h1 className="text-3xl font-semibold">
            {auto("Portfolio unit manager", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Filter units, track lease KPIs, and trigger onboarding/offboarding workflows.",
              "header.subtitle",
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refresh()}>
            <Filter className="me-2 h-4 w-4" />
            {auto("Advanced filters", "header.filters")}
          </Button>
          <Button>
            <Plus className="me-2 h-4 w-4" />
            {auto("Create new unit", "header.create")}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "—" : metric.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {auto("Live data via /api/properties", "metrics.hint")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{auto("Unit list", "list.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto(
              "Toggle between table, Kanban, or map once data is connected.",
              "list.subtitle",
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <div className="rounded-lg border border-destructive/60 bg-destructive/5 p-4 text-destructive">
              <p className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {auto("Unable to load units.", "list.error")}
              </p>
              <Button
                size="sm"
                className="mt-2"
                variant="outline"
                onClick={() => refresh()}
              >
                {auto("Retry", "list.retry")}
              </Button>
            </div>
          ) : (
            properties.map((property) => {
              const status = property.units?.[0]?.status ?? "occupied";
              return (
                <div
                  key={property._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                >
                  <div>
                    <p className="font-semibold">{property.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {auto("Type", "list.type")}:{" "}
                      {property.type ?? auto("N/A", "list.na")}
                    </p>
                  </div>
                  <Badge
                    className={
                      status === "vacant"
                        ? "bg-warning/15 text-warning"
                        : status === "notice"
                          ? "bg-warning/15 text-warning"
                          : "bg-success/15 text-success"
                    }
                  >
                    {auto(status, `list.status.${status}`)}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {auto("Units", "list.units")}: {property.units?.length ?? 1}
                  </p>
                  <Button size="sm" variant="outline">
                    {auto("Open record", "list.open")}
                  </Button>
                </div>
              );
            })
          )}
          {!isLoading && !error && properties.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {auto("No units yet.", "list.empty")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed border-border/70">
        <CardHeader>
          <CardTitle>{auto("Views & automations", "views.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto(
              "Pick the layout that suits leasing, FM, or finance teams.",
              "views.subtitle",
            )}
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Kanban onboarding",
              detail: "Stages: docs, inspection, activation",
            },
            {
              title: "Map by occupancy",
              detail: "Heat-map of vacancy vs pipeline",
            },
            { title: "Finance control", detail: "Aging buckets + rent roll" },
          ].map((view) => (
            <div
              key={view.title}
              className="rounded-xl border border-border/60 p-4"
            >
              <p className="font-semibold">
                {auto(view.title, `views.${view.title}`)}
              </p>
              <p className="text-sm text-muted-foreground">
                {auto(view.detail, `views.${view.title}.detail`)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
