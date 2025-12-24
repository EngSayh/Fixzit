"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusPill from "@/components/ui/status-pill";

type ReportTab = "dashboard" | "builder" | "viewer";

type ReportAction = "download" | "retry";

interface ReportRow {
  name: string;
  type: string;
  lastRun: string;
  status: "ready" | "running" | "error";
  actionType: ReportAction;
  disableActions?: boolean;
}

const pillMap: Record<ReportRow["status"], { status: "success" | "warning" | "danger"; label: string }> = {
  ready: { status: "success", label: "جاهز" },
  running: { status: "warning", label: "قيد التنفيذ" },
  error: { status: "danger", label: "خطأ" },
};

export default function Reports() {
  const { t, language, setLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState<ReportTab>("dashboard");

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  const reportRows: ReportRow[] = [
    {
      name: t(
        "reports.samples.monthlyFinancialSummary",
        "Monthly Financial Summary",
      ),
      type: t("reports.types.financial", "Financial"),
      lastRun: "2024-01-15 10:30",
      status: "ready",
      actionType: "download",
    },
    {
      name: t(
        "reports.samples.workOrdersPerformance",
        "Work Orders Performance",
      ),
      type: t("reports.types.operational", "Operational"),
      lastRun: "2024-01-14 15:45",
      status: "running",
      actionType: "download",
      disableActions: true,
    },
    {
      name: t("reports.samples.complianceStatus", "Compliance Status Report"),
      type: t("reports.types.compliance", "Compliance"),
      lastRun: "2024-01-13 09:15",
      status: "error",
      actionType: "retry",
    },
  ];

  const downloadReport = () => {
    toast.info(
      t("reports.toast.featureInProgress", "New Report feature coming soon"),
    );
  };

  const handleRowAction = (row: ReportRow) => {
    if (row.disableActions) return;
    toast.info(
      t("reports.toast.featureInProgress", "New Report feature coming soon"),
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--color-text-primary)]">
            {t("reports.page.title", "Reports")}
          </h1>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            {t("reports.page.subtitle", "Dashboards, builders, and exports")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadReport}>
            {t("reports.actions.newReport", "+ New Report")}
          </Button>
          <Button variant="secondary" onClick={toggleLanguage}>
            {t("reports.actions.langToggle", "EN / عربي")}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="border-b border-ejar-border">
          <CardTitle className="text-[16px] font-bold">
            {t("reports.tabs.title", "Report Workspace")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            {(["dashboard", "builder", "viewer"] as ReportTab[]).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "ghost"}
                onClick={() => setActiveTab(tab)}
              >
                {t(`reports.tabs.${tab}`, tab)}
              </Button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--color-app-background)] text-end">
                  <th className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)] font-medium border-b border-ejar-border">
                    {t("reports.table.name", "Name")}
                  </th>
                  <th className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)] font-medium border-b border-ejar-border">
                    {t("reports.table.type", "Type")}
                  </th>
                  <th className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)] font-medium border-b border-ejar-border">
                    {t("reports.table.lastRun", "Last run")}
                  </th>
                  <th className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)] font-medium border-b border-ejar-border">
                    {t("reports.table.status", "Status")}
                  </th>
                  <th className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)] font-medium border-b border-ejar-border">
                    {t("reports.table.actions", "Actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((row) => {
                  const pill = pillMap[row.status];
                  return (
                    <tr key={row.name} className="border-b border-ejar-border">
                      <td className="px-4 py-3 text-[var(--color-text-primary)] text-end">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] text-end">
                        {row.type}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] text-end">
                        {row.lastRun}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <StatusPill status={pill.status} label={pill.label} />
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="flex items-center gap-2 justify-end">
                          {row.actionType === "download" ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={row.disableActions}
                              onClick={() => handleRowAction(row)}
                            >
                              {t("reports.actions.download", "Download")}
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                toast.error(
                                  t(
                                    "reports.actions.retrying",
                                    "Retrying report...",
                                  ),
                                )
                              }
                            >
                              {t("reports.actions.retry", "Retry")}
                            </Button>
                          )}
                          <Link
                            href="#"
                            className="text-[13px] text-[var(--color-brand-primary)] hover:underline"
                          >
                            {t("reports.actions.view", "View")}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
