"use client";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import {
  ClipboardList,
  Home,
  MapPin,
  Shield,
  Wrench,
  AlertCircle,
} from "@/components/ui/icons";
import { useMemo, useState, useEffect } from "react";
import { useProperties } from "@/hooks/fm/useProperties";
import { toast } from "sonner";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { Config } from "@/lib/config/constants";

export default function PropertyInspectionWorkspace() {
  const { hasOrgContext, guard, supportBanner } = useFmOrgGuard({
    moduleId: "properties",
  });
  const auto = useAutoTranslator("fm.properties.inspections");
  const { properties, isLoading, error, refresh } = useProperties("?limit=50");
  const vendorAssignmentsApiEnabled = Config.client.vendorAssignmentsApiEnabled;
  const vendorAssignmentsMocksEnabled =
    Config.client.vendorAssignmentsMocksEnabled || !Config.env.isProduction;
  const shouldQueryVendorAssignments =
    vendorAssignmentsApiEnabled || vendorAssignmentsMocksEnabled;

  // Reserve slot feature - placeholder until API is implemented
  const handleReserveSlot = () => {
    toast.info(
      auto(
        "Inspection scheduling is coming soon. This feature requires the /api/fm/inspections endpoint.",
        "header.reserve.comingSoon"
      )
    );
  };

  const [vendorCount, setVendorCount] = useState<number>(0);

  const stats = useMemo(() => {
    const total = properties.length;
    const risk = properties.filter(
      (property) => (property.units?.length ?? 0) > 5,
    );
    const vendorIds = new Set<string>();
    properties.forEach((property) =>
      property.vendors?.forEach((vendor) => {
        const identifier = vendor?.vendorId ?? vendor?._id ?? vendor?.name;
        if (identifier) {
          vendorIds.add(identifier);
        }
      }),
    );
    const vendorCountValue = vendorCount > 0 ? vendorCount : vendorIds.size;

    return [
      {
        label: auto("Upcoming inspections", "metrics.upcoming"),
        value: total.toString(),
        hint: auto("Based on scheduled properties", "metrics.upcoming.hint"),
      },
      {
        label: auto("Risk flagged", "metrics.risk"),
        value: risk.length.toString(),
        hint: auto("Need QA presence", "metrics.risk.hint"),
      },
      {
        label: auto("Pending reports", "metrics.pendingReports"),
        value: Math.max(0, total - risk.length).toString(),
        hint: auto("Awaiting upload", "metrics.pendingReports.hint"),
      },
      {
        label: auto("Vendors scheduled", "metrics.vendors"),
        value: vendorCountValue.toString(),
        hint: auto("Across trades", "metrics.vendors.hint"),
      },
    ];
  }, [auto, properties, vendorCount]);

  // Fetch vendor count from API
  useEffect(() => {
    if (!shouldQueryVendorAssignments) return;

    const fetchVendorCount = async () => {
      try {
        const response = await fetch("/api/fm/inspections/vendor-assignments");
        if (response.ok) {
          const data = await response.json();
          if (data.stats?.uniqueVendors) {
            setVendorCount(data.stats.uniqueVendors);
          }
        }
      } catch {
        // Fallback to calculated value on error (already handled in stats)
      }
    };
    fetchVendorCount();
  }, [properties.length, shouldQueryVendorAssignments]);

  const inspectionQueue = useMemo(() => {
    return properties.slice(0, 5).map((property, index) => ({
      id: property.code ?? `INS-${index + 901}`,
      property: property.name,
      type: property.type ?? "Preventive",
      eta: property.createdAt
        ? new Date(property.createdAt).toLocaleDateString()
        : auto("Not scheduled", "queue.notScheduled"),
      severity: index % 3 === 0 ? "high" : index % 3 === 1 ? "medium" : "low",
    }));
  }, [auto, properties]);

  const checklist = [
    { title: "Scope defined", detail: "Which assets & trades are covered?" },
    { title: "Access confirmed", detail: "Keys/badges arranged with tenant" },
    {
      title: "Vendors assigned",
      detail: "Mechanical + MEP technicians confirmed",
    },
  ];

  if (!hasOrgContext) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="properties" />
      {supportBanner}

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {auto("Inspection control", "header.kicker")}
          </p>
          <h1 className="text-3xl font-semibold">
            {auto("Portfolio inspections hub", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Plan, schedule, and track inspections without bouncing between spreadsheets.",
              "header.subtitle",
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refresh()} aria-label={auto("Import inspection plan from file", "header.import.ariaLabel")} title={auto("Import inspection plan", "header.import")}>
            <ClipboardList className="me-2 h-4 w-4" />
            {auto("Import inspection plan", "header.import")}
          </Button>
          <Button onClick={handleReserveSlot} aria-label={auto("Reserve a new inspection slot", "header.reserve.ariaLabel")} title={auto("Reserve inspection slot", "header.reserve")}>
            <Home className="me-2 h-4 w-4" />
            {auto("Reserve inspection slot", "header.reserve")}
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
              <p className="text-xs text-muted-foreground">{metric.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{auto("Inspection queue", "queue.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto("Prioritize by severity and SLA impact.", "queue.subtitle")}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive">
              <p className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {auto("Failed to load inspections.", "queue.error")}
              </p>
              <Button
                size="sm"
                className="mt-2"
                variant="outline"
                onClick={() => refresh()}
                aria-label={auto("Retry loading inspections", "queue.retry.ariaLabel")}
                title={auto("Retry loading inspections", "queue.retry")}
              >
                {auto("Retry", "queue.retry")}
              </Button>
            </div>
          ) : (
            inspectionQueue.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-4"
              >
                <div>
                  <p className="font-semibold">{item.property}</p>
                  <p className="text-sm text-muted-foreground">{item.id}</p>
                </div>
                <Badge variant="outline">{item.type}</Badge>
                <p className="text-sm text-muted-foreground">
                  {auto("Due", "queue.due")}: {item.eta}
                </p>
                <Badge
                  className={
                    item.severity === "high"
                      ? "bg-destructive/15 text-destructive"
                      : item.severity === "medium"
                        ? "bg-warning/15 text-warning"
                        : "bg-muted"
                  }
                >
                  {item.severity}
                </Badge>
                                <Button size="sm" variant="outline" aria-label={auto("Open inspection worksheet", "queue.open.ariaLabel")} title={auto("Open worksheet", "queue.open")}>
                  {auto("Open worksheet", "queue.open")}
                </Button>
              </div>
            ))
          )}
          {!isLoading && !error && inspectionQueue.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {auto("No inspections scheduled yet.", "queue.empty")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed border-border/70">
        <CardHeader>
          <CardTitle>
            {auto("Pre-inspection checklist", "checklist.title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto(
              "Lock these items before dispatching teams.",
              "checklist.subtitle",
            )}
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {checklist.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border/60 p-4"
            >
              <p className="font-semibold">
                {auto(item.title, `checklist.${item.title}`)}
              </p>
              <p className="text-sm text-muted-foreground">
                {auto(item.detail, `checklist.${item.title}.detail`)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{auto("Integrations", "integrations.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto(
              "Wire this view to /api/properties/inspections for live status.",
              "integrations.subtitle",
            )}
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <Wrench className="h-4 w-4" />
            {auto("Vendor scheduler", "integrations.vendor")}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <MapPin className="h-4 w-4" />
            {auto("Property registry", "integrations.registry")}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <Shield className="h-4 w-4" />
            {auto("QA audit trail", "integrations.qa")}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
