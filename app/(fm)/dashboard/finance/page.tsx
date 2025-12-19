"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Wallet, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";
import { useOrgCounters } from "@/hooks/useOrgCounters";
import type { CounterPayload } from "@/lib/counters";

// ==========================================
// TYPES
// ==========================================

type InvoiceCounters = {
  total?: number;
  unpaid?: number;
  overdue?: number;
  paid?: number;
};

type RevenueCounters = {
  today?: number;
  week?: number;
  month?: number;
  growth?: number; // percentage
};

interface FinanceCounters {
  invoices: {
    total: number;
    unpaid: number;
    overdue: number;
    paid: number;
  };
  revenue: {
    today: number;
    week: number;
    month: number;
    growth: number; // percentage
  };
}

// ==========================================
// FINANCE DASHBOARD - INVOICES TAB
// ==========================================

export default function FinanceDashboard() {
  const { data: session } = useSession();
  const orgId = (session?.user as { orgId?: string } | undefined)?.orgId;
  const [activeTab, setActiveTab] = useState("invoices");
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const { counters, error: countersError } = useOrgCounters();
  const financeCounters = useMemo<FinanceCounters | null>(() => {
    if (!counters || typeof counters !== "object") return null;
    const countersObj = counters as CounterPayload;
    const invoices =
      (countersObj.invoices as InvoiceCounters | undefined) ??
      (countersObj.finance as InvoiceCounters | undefined) ??
      {};
    const revenue = (countersObj.revenue as RevenueCounters | undefined) ?? {};
    return {
      invoices: {
        total: invoices.total ?? 0,
        unpaid: invoices.unpaid ?? 0,
        overdue: invoices.overdue ?? 0,
        paid: invoices.paid ?? 0,
      },
      revenue: {
        today: revenue.today ?? 0,
        week: revenue.week ?? 0,
        month: revenue.month ?? 0,
        growth: revenue.growth ?? 0,
      },
    };
  }, [counters]);

  if (loading && (financeCounters || countersError || !orgId)) {
    setLoading(false);
    if (countersError) {
      logger.error("Failed to load finance data:", countersError as Error);
    }
  }

  // Tabs
  const tabs = [
    {
      id: "invoices",
      label: t("dashboard.finance.tabs.invoices", "Invoices"),
      count: financeCounters?.invoices.unpaid,
    },
    { id: "payments", label: t("dashboard.finance.tabs.payments", "Payments") },
    { id: "expenses", label: t("dashboard.finance.tabs.expenses", "Expenses") },
    { id: "budgets", label: t("dashboard.finance.tabs.budgets", "Budgets") },
    { id: "reports", label: t("dashboard.finance.tabs.reports", "Reports") },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("dashboard.finance.header.title", "Finance")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "dashboard.finance.header.subtitle",
            "Manage invoices, payments, and financial reports",
          )}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b">
        {tabs.map((tab) => (
          <button type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ms-2 px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      {activeTab === "invoices" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Invoices */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.finance.cards.totalInvoices", "Total Invoices")}
                </CardTitle>
                <Wallet className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : financeCounters?.invoices.total ?? 0}
                </div>
              </CardContent>
            </Card>

            {/* Unpaid */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.finance.cards.unpaid", "Unpaid")}
                </CardTitle>
                <AlertCircle className="w-4 h-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                    {loading ? "..." : financeCounters?.invoices.unpaid ?? 0}
                </div>
              </CardContent>
            </Card>

            {/* Overdue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.finance.cards.overdue", "Overdue")}
                </CardTitle>
                <AlertCircle className="w-4 h-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                    {loading ? "..." : financeCounters?.invoices.overdue ?? 0}
                </div>
              </CardContent>
            </Card>

            {/* Paid */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.finance.cards.paid", "Paid")}
                </CardTitle>
                <CheckCircle className="w-4 h-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                    {loading ? "..." : financeCounters?.invoices.paid ?? 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice List Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("dashboard.finance.cards.recentInvoices", "Recent Invoices")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>
                  {t(
                    "dashboard.finance.cards.recentPlaceholder",
                    "Invoice list will be displayed here",
                  )}
                </p>
                <p className="text-sm mt-2">
                  {t(
                    "dashboard.finance.cards.recentHint",
                    "Implement data table with filters, sorting, and actions",
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Other tabs (placeholder) */}
      {activeTab !== "invoices" && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="font-medium">
                {tabs.find((tab) => tab.id === activeTab)?.label}
              </p>
              <p className="text-sm mt-2">
                {t(
                  "dashboard.finance.tabs.placeholder",
                  "Content will be implemented here",
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
