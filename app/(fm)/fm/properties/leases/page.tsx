"use client";

import React, { useMemo, useState } from "react";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useTranslation } from "@/contexts/TranslationContext";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { useProperties } from "@/hooks/fm/useProperties";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, FileText, Plus, RefreshCw } from "@/components/ui/icons";
import { useSession } from "next-auth/react";
import { useFMPermissions } from "@/hooks/fm/useFMPermissions";
import { SubmoduleKey } from "@/domain/fm/fm-lite";

// Lease data derived from property records
// ROADMAP: Implement dedicated /api/fm/leases endpoint for full lease management
// See ISSUES_REGISTER.md for tracking. Current implementation uses property lease fields.

export default function PropertiesLeasesPage() {
  const { t } = useTranslation();
  const { status: sessionStatus } = useSession();
  const fmPermissions = useFMPermissions();
  const { hasOrgContext, guard, supportBanner } = useFmOrgGuard({
    moduleId: "properties",
  });
  const { properties, isLoading, error, refresh } = useProperties("?limit=100");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const canAccessLeases = fmPermissions.canAccessModule(
    SubmoduleKey.PROP_LEASES
  );
  const canManageLeases =
    canAccessLeases && fmPermissions.canManageProperties();

  // Derive lease information from properties with occupied units
  const leaseData = useMemo(() => {
    const leases: Array<{
      id: string;
      property: string;
      propertyId: string;
      unit: string;
      tenant: string;
      status: string;
      startDate: string;
      endDate: string;
      monthlyRent: number;
    }> = [];

    properties.forEach((property) => {
      if (property.units && property.units.length > 0) {
        property.units.forEach((unit, idx) => {
          const unitStatus = unit.status?.toLowerCase();
          if (unitStatus === "occupied") {
            leases.push({
              id: `${property._id}-${idx}`,
              property: property.name,
              propertyId: property._id,
              unit: unit.name || `Unit ${idx + 1}`,
              tenant: "—", // Would come from tenant relationship
              status: "Active",
              startDate: property.createdAt || "—",
              endDate: "—",
              monthlyRent: 0,
            });
          }
        });
      }
    });

    return leases;
  }, [properties]);

  const filteredLeases = useMemo(() => {
    if (statusFilter === "all") return leaseData;
    return leaseData.filter(
      (lease) => lease.status.toLowerCase() === statusFilter.toLowerCase()
    );
  }, [leaseData, statusFilter]);

  const stats = useMemo(() => {
    const total = leaseData.length;
    const active = leaseData.filter((l) => l.status === "Active").length;
    return { total, active };
  }, [leaseData]);

  if (!hasOrgContext) {
    return guard;
  }

  if (sessionStatus === "loading") {
    return (
      <div className="space-y-6">
        <ModuleViewTabs moduleId="properties" />
        <div className="rounded-xl border border-border bg-card/30 p-6 space-y-3 animate-pulse">
          <div className="h-4 w-44 rounded-md bg-muted" />
          <div className="h-4 w-64 rounded-md bg-muted" />
          <div className="h-3 w-72 rounded-md bg-muted/60" />
        </div>
      </div>
    );
  }

  if (!canAccessLeases) {
    return (
      <div className="space-y-6">
        <ModuleViewTabs moduleId="properties" />
        {supportBanner}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {t(
                "fm.properties.leases.planGate.title",
                "Leases require the Standard plan or above"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground">
              {t(
                "fm.properties.leases.planGate.body",
                "Upgrade your subscription to enable lease tracking, renewals, and rent visibility."
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="properties" />
      {supportBanner}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("fm.properties.leases.title", "Lease Management")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "fm.properties.leases.subtitle",
              "Track and manage property leases across your portfolio"
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refresh()} aria-label={t("common.refreshAria", "Refresh lease data")} title={t("common.refreshAria", "Refresh lease data")}>
            <RefreshCw className="me-2 h-4 w-4" />
            {t("common.refresh", "Refresh")}
          </Button>
          {canManageLeases ? (
            <Button aria-label={t("fm.properties.leases.newLeaseAria", "Create a new lease")} title={t("fm.properties.leases.newLeaseAria", "Create a new lease")}>
              <Plus className="me-2 h-4 w-4" />
              {t("fm.properties.leases.newLease", "New Lease")}
            </Button>
          ) : null}
        </div>
      </div>
      {!canManageLeases ? (
        <p className="text-sm text-muted-foreground">
          {t(
            "fm.properties.leases.viewOnly",
            "You have view-only access. Contact an admin to manage leases."
          )}
        </p>
      ) : null}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("fm.properties.leases.stats.total", "Total Leases")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {isLoading ? "—" : stats.total}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("fm.properties.leases.stats.hint", "Based on occupied units")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("fm.properties.leases.stats.active", "Active Leases")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {isLoading ? "—" : stats.active}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Row 1: Filter buttons - horizontal */}
            <div className="flex flex-col sm:flex-row gap-3">
              {["all", "active"].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  aria-label={t(`fm.properties.leases.filter.${status}Aria`, `Show ${status} leases`)}
                >
                  {t(
                    `fm.properties.leases.filter.${status}`,
                    status.charAt(0).toUpperCase() + status.slice(1)
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("fm.properties.leases.list.title", "Lease Records")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t(
              "fm.properties.leases.list.subtitle",
              "Lease data derived from occupied units. Full lease management coming soon."
            )}
          </p>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-lg border border-destructive/60 bg-destructive/5 p-4 text-destructive">
              <p className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {t("fm.properties.leases.error", "Unable to load lease data.")}
              </p>
              <Button
                size="sm"
                className="mt-2"
                variant="outline"
                onClick={() => refresh()}
                aria-label={t("common.retryAria", "Retry loading leases")}
              >
                {t("common.retry", "Retry")}
              </Button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("common.loading", "Loading...")}
            </div>
          ) : filteredLeases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {t(
                  "fm.properties.leases.empty",
                  "No lease records found. Leases will appear when units are marked as occupied."
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                      {t("fm.properties.leases.table.property", "Property")}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                      {t("fm.properties.leases.table.unit", "Unit")}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                      {t("fm.properties.leases.table.tenant", "Tenant")}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                      {t("fm.properties.leases.table.status", "Status")}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                      {t("fm.properties.leases.table.actions", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLeases.map((lease) => (
                    <tr key={lease.id} className="hover:bg-muted/50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-medium">{lease.property}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                        {lease.unit}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                        {lease.tenant}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge
                          className={
                            lease.status === "Active"
                              ? "bg-success/10 text-success"
                              : lease.status === "Expiring"
                                ? "bg-warning/10 text-warning"
                                : "bg-destructive/10 text-destructive"
                          }
                        >
                          {lease.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Button variant="ghost" size="sm" aria-label={t("common.viewLeaseAria", `View lease for ${lease.unit}`)}>
                          {t("common.view", "View")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon Notice */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <h3 className="font-semibold mb-2">
              {t("fm.properties.leases.comingSoon.title", "Full Lease Management Coming Soon")}
            </h3>
            <p className="text-muted-foreground text-sm">
              {t(
                "fm.properties.leases.comingSoon.description",
                "Contract uploads, renewal workflows, rent collection tracking, and financial reporting will be available in the next release."
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
