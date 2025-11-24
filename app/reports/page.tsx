"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useTranslation } from "@/contexts/TranslationContext";

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

const statusAppearance: Record<
  ReportRow["status"],
  { className: string; titleKey: string; fallback: string }
> = {
  ready: {
    className: "text-success",
    titleKey: "reports.status.ready",
    fallback: "Ready",
  },
  running: {
    className: "text-warning",
    titleKey: "reports.status.running",
    fallback: "Running",
  },
  error: {
    className: "text-destructive",
    titleKey: "reports.status.error",
    fallback: "Error",
  },
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

  return (
    <>
      <div className="fxz-topbar">
        <div className="fxz-brand">{t("reports.page.title", "Reports")}</div>
        <div className="fxz-top-actions">
          <button
            type="button"
            className="fxz-btn primary"
            onClick={() =>
              toast.info(
                t(
                  "reports.toast.newReportComingSoon",
                  "New Report feature coming soon",
                ),
              )
            }
          >
            {t("reports.actions.newReport", "+ New Report")}
          </button>
          <button
            type="button"
            className="fxz-btn secondary"
            onClick={toggleLanguage}
          >
            {t("reports.actions.langToggle", "EN / عربي")}
          </button>
        </div>
      </div>

      <div className="fxz-app">
        <aside className="fxz-sidebar">
          <div className="fxz-sidehead">
            {t("sidebar.category.core", "Core")}
          </div>
          <nav className="fxz-nav">
            <Link href="/dashboard">
              🏠 <span>{t("nav.dashboard", "Dashboard")}</span>
            </Link>
            <Link href="/work-orders">
              🧰 <span>{t("nav.work-orders", "Work Orders")}</span>
            </Link>
            <Link href="/properties">
              🏢 <span>{t("nav.properties", "Properties")}</span>
            </Link>
            <Link href="/finance">
              💳 <span>{t("nav.finance", "Finance")}</span>
            </Link>
            <Link href="/hr">
              👥 <span>{t("nav.hr", "HR")}</span>
            </Link>
          </nav>
          <div className="fxz-sidehead">
            {t("sidebar.category.business", "Business")}
          </div>
          <nav className="fxz-nav">
            <Link href="/crm">
              📇 <span>{t("nav.crm", "CRM")}</span>
            </Link>
            <Link href="/marketplace">
              🛍️ <span>{t("nav.marketplace", "Marketplace")}</span>
            </Link>
            <Link href="/support">
              🎧 <span>{t("nav.support", "Support")}</span>
            </Link>
            <Link href="/compliance">
              🛡️ <span>{t("nav.compliance", "Compliance")}</span>
            </Link>
            <Link href="/reports" className="active">
              📊 <span>{t("nav.reports", "Reports")}</span>
            </Link>
            <Link href="/system">
              ⚙️ <span>{t("nav.system", "System Mgmt.")}</span>
            </Link>
          </nav>
        </aside>

        <main className="fxz-main">
          <div className="fxz-content">
            <h2 style={{ margin: "0 0 6px" }}>
              {t("reports.page.title", "Reports")}
            </h2>
            <div className="fxz-pills" data-tabs="reports">
              <button
                type="button"
                className={`fxz-pill ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => setActiveTab("dashboard")}
                data-tab="dashboard"
              >
                {t("nav.dashboard", "Dashboard")}
              </button>
              <button
                type="button"
                className={`fxz-pill ${activeTab === "builder" ? "active" : ""}`}
                onClick={() => setActiveTab("builder")}
                data-tab="builder"
              >
                {t("reports.tabs.builder", "Report Builder")}
              </button>
              <button
                type="button"
                className={`fxz-pill ${activeTab === "viewer" ? "active" : ""}`}
                onClick={() => setActiveTab("viewer")}
                data-tab="viewer"
              >
                {t("reports.tabs.viewer", "Report Viewer")}
              </button>
            </div>

            <div data-panels="reports">
              <section
                data-panel="dashboard"
                className={activeTab === "dashboard" ? "" : "fxz-hidden"}
              >
                <table className="fxz-table">
                  <thead>
                    <tr>
                      <th>{t("reports.table.reportName", "Report Name")}</th>
                      <th>{t("reports.table.type", "Type")}</th>
                      <th>{t("reports.table.lastRun", "Last Run")}</th>
                      <th>{t("reports.table.status", "Status")}</th>
                      <th>{t("reports.table.actions", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((row) => (
                      <tr key={`${row.name}-${row.lastRun}`}>
                        <td>{row.name}</td>
                        <td>{row.type}</td>
                        <td>{row.lastRun}</td>
                        <td className={statusAppearance[row.status].className}>
                          {t(
                            statusAppearance[row.status].titleKey,
                            statusAppearance[row.status].fallback,
                          )}
                        </td>
                        <td>
                          {row.actionType === "download" ? (
                            <>
                              <button
                                className="fxz-btn secondary"
                                style={{ padding: "4px 8px", fontSize: "12px" }}
                                disabled={row.disableActions}
                              >
                                {t("common.view", "View")}
                              </button>
                              <button
                                className="fxz-btn primary"
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "12px",
                                  marginInlineStart: "4px",
                                }}
                                disabled={row.disableActions}
                              >
                                {t("common.download", "Download")}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="fxz-btn secondary"
                                style={{ padding: "4px 8px", fontSize: "12px" }}
                              >
                                {t("common.retry", "Retry")}
                              </button>
                              <button
                                className="fxz-btn primary"
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "12px",
                                  marginInlineStart: "4px",
                                }}
                              >
                                {t("common.edit", "Edit")}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section
                className={activeTab === "builder" ? "" : "fxz-hidden"}
                data-panel="builder"
              >
                <div className="fxz-card">
                  {t(
                    "reports.builder.placeholder",
                    "Drag-and-drop report builder interface",
                  )}
                </div>
              </section>

              <section
                className={activeTab === "viewer" ? "" : "fxz-hidden"}
                data-panel="viewer"
              >
                <div className="fxz-card">
                  {t(
                    "reports.viewer.placeholder",
                    "Report viewer with export options",
                  )}
                </div>
              </section>
            </div>
          </div>
          <div className="fxz-footer">
            {t("reports.footer", "© 2025 Fixzit Enterprise — Version 1.0")}
          </div>
        </main>
      </div>
    </>
  );
}
