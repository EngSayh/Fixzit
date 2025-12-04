"use client";

import React from "react";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useFmOrgGuard } from "@/components/fm/useFmOrgGuard";
import { useTranslation } from "@/contexts/TranslationContext";
import { getWorkOrderStatusLabel } from "@/lib/work-orders/status";
import { WORK_ORDERS_MODULE_ID } from "@/config/navigation/constants";

export default function WorkOrderApprovalsPage() {
  const { t } = useTranslation();
  const { hasOrgContext, guard, supportOrg } = useFmOrgGuard({
    moduleId: WORK_ORDERS_MODULE_ID,
  });
  const pendingApprovals = [
    {
      id: "WO-1004",
      title: "Emergency electrical repair",
      property: "Tower A / 1204",
      requestedBy: "Ahmed Al-Rashid",
      requestDate: "2025-01-22",
      estimatedCost: "SAR 800",
      priority: "P1",
      reason: "Urgent safety issue requiring immediate attention",
      status: "pending",
    },
    {
      id: "WO-1005",
      title: "HVAC system upgrade",
      property: "Tower B / Lobby",
      requestedBy: "Property Manager",
      requestDate: "2025-01-21",
      estimatedCost: "SAR 2,500",
      priority: "P2",
      reason: "Scheduled upgrade to improve efficiency",
      status: "pending",
    },
    {
      id: "WO-1006",
      title: "Painting exterior walls",
      property: "Villa Complex",
      requestedBy: "Omar Al-Fahad",
      requestDate: "2025-01-20",
      estimatedCost: "SAR 1,200",
      priority: "P3",
      reason: "Routine maintenance and aesthetic improvement",
      status: "under-review",
    },
  ];

  const approvedWorkOrders = [
    {
      id: "WO-1001",
      title: "AC not cooling",
      property: "Tower A / 1204",
      approvedBy: "Admin User",
      approvalDate: "2025-01-19",
      estimatedCost: "SAR 150",
      actualCost: "SAR 145",
      status: "approved",
    },
    {
      id: "WO-1002",
      title: "Elevator maintenance",
      property: "Tower B / Lobby",
      approvedBy: "Admin User",
      approvalDate: "2025-01-18",
      estimatedCost: "SAR 300",
      actualCost: "SAR 285",
      status: "approved",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      case "approved":
        return "bg-success/10 text-success-foreground border-success/20";
      case "rejected":
        return "bg-destructive/10 text-destructive-foreground border-destructive/20";
      case "under-review":
        return "bg-primary/10 text-primary-foreground border-primary/20";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "P1":
        return "bg-destructive/100 text-white";
      case "P2":
        return "bg-warning/100 text-white";
      case "P3":
        return "bg-warning/100 text-black";
      case "P4":
        return "bg-success/100 text-white";
      default:
        return "bg-muted0 text-white";
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
            {t("workOrders.approvals.title", "Work Order Approvals")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "workOrders.approvals.subtitle",
              "Review and approve work orders that require authorization",
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">
            {t("workOrders.approvals.rules", "Approval Rules")}
          </button>
          <button className="btn-primary">
            📋 {t("workOrders.approvals.bulkApprove", "Bulk Approve")}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("workOrders.approvals.pendingApproval", "Pending Approval")}
              </p>
              <p className="text-2xl font-bold text-accent">3</p>
            </div>
            <div className="text-accent">⏳</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("workOrders.approvals.approvedToday", "Approved Today")}
              </p>
              <p className="text-2xl font-bold text-success">5</p>
            </div>
            <div className="text-success">✅</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("workOrders.approvals.avgTime", "Avg. Approval Time")}
              </p>
              <p className="text-2xl font-bold text-primary">2.3h</p>
            </div>
            <div className="text-primary">⏱️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("workOrders.approvals.totalApproved", "Total Approved")}
              </p>
              <p className="text-2xl font-bold text-[hsl(var(--secondary))]">
                247
              </p>
            </div>
            <div className="text-secondary">📊</div>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {t("workOrders.approvals.pending", "Pending Approvals")}
          </h3>
          <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium">
            {pendingApprovals.length} {t("workOrders.pending", "pending")}
          </span>
        </div>

        <div className="space-y-4">
          {pendingApprovals.map((item) => (
            <div
              key={item.id}
              className="border border-border rounded-2xl p-4 hover:bg-muted"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-foreground">
                      {item.id}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(item.priority)}`}
                    >
                      {item.priority}
                    </span>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}
                    >
                      {getWorkOrderStatusLabel(t, item.status)}
                    </span>
                  </div>
                  <h4 className="font-medium text-foreground mb-1">
                    {item.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {item.property}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {item.reason}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>
                      <strong>
                        {t(
                          "workOrders.approvals.details.requestedBy",
                          "Requested by",
                        )}
                        :
                      </strong>{" "}
                      {item.requestedBy}
                    </span>
                    <span>
                      <strong>
                        {t("workOrders.approvals.details.date", "Date")}:
                      </strong>{" "}
                      {item.requestDate}
                    </span>
                    <span>
                      <strong>
                        {t(
                          "workOrders.approvals.details.estimatedCost",
                          "Estimated Cost",
                        )}
                        :
                      </strong>{" "}
                      {item.estimatedCost}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 ms-4">
                  <button className="px-4 py-2 bg-success text-white rounded-2xl hover:bg-success/90 transition-colors">
                    {t("common.approve", "Approve")}
                  </button>
                  <button className="px-4 py-2 bg-[hsl(var(--destructive))] text-white rounded-2xl hover:bg-[hsl(var(--destructive)) / 0.9] transition-colors">
                    {t("common.reject", "Reject")}
                  </button>
                  <button className="px-4 py-2 bg-muted text-foreground rounded-2xl hover:bg-muted/80 transition-colors">
                    {t("common.review", "Review")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Approvals */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {t("workOrders.approvals.recent", "Recent Approvals")}
          </h3>
          <button className="btn-ghost">
            {t("workOrders.approvals.viewAll", "View All")}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.woId", "WO ID")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.title", "Title")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.property", "Property")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.approvals.approvedBy", "Approved By")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.approvals.approvalDate", "Approval Date")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.approvals.estimatedCost", "Estimated Cost")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.approvals.actualCost", "Actual Cost")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("workOrders.status", "Status")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {approvedWorkOrders.map((item) => (
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
                    {item.approvedBy}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {item.approvalDate}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {item.estimatedCost}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {item.actualCost}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}
                    >
                      {getWorkOrderStatusLabel(t, item.status)}
                    </span>
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
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">✅</div>
            <div className="text-sm font-medium">
              {t("workOrders.approvals.bulkApprove", "Bulk Approve")}
            </div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium">
              {t("workOrders.approvals.rules", "Approval Rules")}
            </div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">
              {t("workOrders.reports", "Reports")}
            </div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">🔄</div>
            <div className="text-sm font-medium">
              {t("workOrders.approvals.workflow", "Workflow")}
            </div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">
              {t("workOrders.settings", "Settings")}
            </div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📤</div>
            <div className="text-sm font-medium">
              {t("workOrders.export", "Export")}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
