"use client";

import React from "react";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { useTranslation } from "@/contexts/TranslationContext";
import { getWorkOrderStatusLabel } from "@/lib/work-orders/status";
import { WORK_ORDERS_MODULE_ID } from "@/config/navigation/constants";

export default function ServiceHistoryPage() {
  const { t } = useTranslation();
  const { hasOrgContext, guard, supportOrg } = useFmOrgGuard({
    moduleId: WORK_ORDERS_MODULE_ID,
  });
  const serviceHistory = [
    {
      id: "WO-1001",
      title: "AC not cooling",
      property: "Tower A / 1204",
      technician: "Ahmed Al-Rashid",
      completionDate: "2025-01-20",
      duration: "2 hours",
      cost: "SAR 150",
      rating: 5,
      status: "completed",
    },
    {
      id: "WO-1002",
      title: "Elevator maintenance",
      property: "Tower B / Lobby",
      technician: "Mohammed Al-Saud",
      completionDate: "2025-01-18",
      duration: "4 hours",
      cost: "SAR 300",
      rating: 4,
      status: "completed",
    },
    {
      id: "WO-1003",
      title: "Plumbing repair",
      property: "Villa 9",
      technician: "Omar Al-Fahad",
      completionDate: "2025-01-15",
      duration: "1.5 hours",
      cost: "SAR 120",
      rating: 5,
      status: "completed",
    },
  ];

  const propertyOptions = [
    {
      value: "all",
      key: "workOrders.history.filters.allProperties",
      fallback: "All Properties",
    },
    {
      value: "tower-a",
      key: "workOrders.history.filters.towerA",
      fallback: "Tower A",
    },
    {
      value: "tower-b",
      key: "workOrders.history.filters.towerB",
      fallback: "Tower B",
    },
    {
      value: "villa-complex",
      key: "workOrders.history.filters.villaComplex",
      fallback: "Villa Complex",
    },
  ];

  const technicianOptions = [
    {
      value: "all",
      key: "workOrders.history.filters.allTechnicians",
      fallback: "All Technicians",
    },
    {
      value: "ahmed",
      key: "workOrders.history.filters.technicianAhmed",
      fallback: "Ahmed Al-Rashid",
    },
    {
      value: "mohammed",
      key: "workOrders.history.filters.technicianMohammed",
      fallback: "Mohammed Al-Saud",
    },
    {
      value: "omar",
      key: "workOrders.history.filters.technicianOmar",
      fallback: "Omar Al-Fahad",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success-foreground border-success/20";
      case "cancelled":
        return "bg-destructive/10 text-destructive-foreground border-destructive/20";
      case "pending":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  if (!hasOrgContext) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId={WORK_ORDERS_MODULE_ID} />
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t("fm.org.supportContext", "Support context: {{name}}", {
            name: supportOrg.name,
          })}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("workOrders.history.title", "Service History")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "workOrders.history.subtitle",
              "View completed work orders and service history",
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" aria-label={t("workOrders.history.exportReport", "Export Report")}>
            {t("workOrders.history.exportReport", "Export Report")}
          </button>
          <button type="button" className="btn-primary" aria-label={t("common.analytics", "Analytics")}>
            📊 {t("common.analytics", "Analytics")}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("workOrders.history.totalCompleted", "Total Completed")}
              </p>
              <p className="text-2xl font-bold text-success">247</p>
            </div>
            <div className="text-success">✅</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("common.thisMonth", "This Month")}
              </p>
              <p className="text-2xl font-bold text-primary">23</p>
            </div>
            <div className="text-primary">📅</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("common.avgRating", "Avg. Rating")}
              </p>
              <p className="text-2xl font-bold text-accent">4.8</p>
            </div>
            <div className="text-accent">⭐</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("common.totalCost", "Total Cost")}
              </p>
              <p className="text-2xl font-bold text-[hsl(var(--secondary))]">
                SAR 45,230
              </p>
            </div>
            <div className="text-secondary">💰</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
              {propertyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key, option.fallback)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
              {technicianOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key, option.fallback)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <input
              type="date"
              placeholder={t(
                "workOrders.history.filters.fromDate",
                "From Date",
              )}
              aria-label={t("workOrders.history.filters.fromDate", "From Date")}
              className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex-1 min-w-48">
            <input
              type="date"
              placeholder={t("workOrders.history.filters.toDate", "To Date")}
              aria-label={t("workOrders.history.filters.toDate", "To Date")}
              className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button type="button" className="btn-primary" aria-label={t("workOrders.filter", "Filter")}>
            {t("workOrders.filter", "Filter")}
          </button>
        </div>
      </div>

      {/* Service History Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {t("workOrders.history.title", "Service History")}
          </h3>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" aria-label={t("common.exportCsv", "Export CSV")}>
              📄 {t("common.exportCsv", "Export CSV")}
            </button>
            <button type="button" className="btn-ghost" aria-label={t("common.viewCharts", "View Charts")}>
              📊 {t("common.viewCharts", "View Charts")}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.woId", "WO ID")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.history.table.title", "Title")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.history.table.property", "Property")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.history.table.technician", "Technician")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t(
                    "workOrders.history.table.completionDate",
                    "Completion Date",
                  )}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.history.table.duration", "Duration")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.history.table.cost", "Cost")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.history.table.rating", "Rating")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.history.table.status", "Status")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.history.table.actions", "Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {serviceHistory.map((item) => (
                <tr key={item.id} className="hover:bg-muted">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {item.id}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                    {item.title}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {item.property}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {item.technician}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {item.completionDate}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {item.duration}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {item.cost}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <span className="text-accent">⭐</span>
                      <span className="ms-1">
                        {t(
                          "workOrders.history.table.ratingOutOf",
                          "{{rating}}/5",
                        ).replace("{{rating}}", String(item.rating))}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}
                    >
                      {getWorkOrderStatusLabel(t, item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button type="button" className="text-primary hover:text-primary" aria-label={t("workOrders.history.view", "View")}>
                        {t("workOrders.history.view", "View")}
                      </button>
                      <button type="button" className="text-success hover:text-success-foreground" aria-label={t("workOrders.history.invoice", "Invoice")}>
                        {t("workOrders.history.invoice", "Invoice")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">
          {t("workOrders.quickActions", "Quick Actions")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button type="button" className="btn-ghost text-center" aria-label={t("workOrders.history.quickActions.analytics", "Analytics")}>
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">
              {t("workOrders.history.quickActions.analytics", "Analytics")}
            </div>
          </button>
          <button type="button" className="btn-ghost text-center" aria-label={t("workOrders.history.quickActions.trends", "Trends")}>
            <div className="text-2xl mb-2">📈</div>
            <div className="text-sm font-medium">
              {t("workOrders.history.quickActions.trends", "Trends")}
            </div>
          </button>
          <button type="button" className="btn-ghost text-center" aria-label={t("workOrders.history.quickActions.cost", "Cost Analysis")}>
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm font-medium">
              {t("workOrders.history.quickActions.cost", "Cost Analysis")}
            </div>
          </button>
          <button type="button" className="btn-ghost text-center" aria-label={t("workOrders.history.quickActions.techPerformance", "Tech Performance")}>
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm font-medium">
              {t(
                "workOrders.history.quickActions.techPerformance",
                "Tech Performance",
              )}
            </div>
          </button>
          <button type="button" className="btn-ghost text-center" aria-label={t("workOrders.history.quickActions.reports", "Reports")}>
            <div className="text-2xl mb-2">📄</div>
            <div className="text-sm font-medium">
              {t("workOrders.history.quickActions.reports", "Reports")}
            </div>
          </button>
          <button type="button" className="btn-ghost text-center" aria-label={t("workOrders.history.quickActions.settings", "Settings")}>
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">
              {t("workOrders.history.quickActions.settings", "Settings")}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
