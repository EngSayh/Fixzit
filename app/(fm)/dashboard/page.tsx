"use client";

import { BarChart3, TrendingUp, Users, DollarSign } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusPill from "@/components/ui/status-pill";
import { ChartDonut } from "@/components/ui/chart-donut";

export default function DashboardPage() {
  const { t } = useTranslation();

  const stats = [
    {
      labelKey: "dashboard.totalProperties",
      value: "42",
      icon: Users,
      color: "bg-primary",
    },
    {
      labelKey: "dashboard.openWorkOrders",
      value: "17",
      icon: TrendingUp,
      color: "bg-success",
    },
    {
      labelKey: "dashboard.monthlyRevenue",
      value: "SAR 284,500",
      icon: DollarSign,
      color: "bg-warning",
    },
    {
      labelKey: "dashboard.occupancyRate",
      value: "92%",
      icon: BarChart3,
      color: "bg-accent",
    },
  ];

  const workOrderData = [
    { name: t("dashboard.statusCompleted", "Completed"), value: 72, color: "var(--color-brand-primary)" },
    { name: t("dashboard.statusInProgress", "In Progress"), value: 18, color: "var(--color-brand-secondary)" },
    { name: t("dashboard.statusPending", "Pending"), value: 10, color: "var(--color-info)" },
  ];

  return (
    <div className="space-y-6" role="main">
      <header className="space-y-1">
        <h1 className="text-[24px] font-bold text-[var(--color-text-primary)]">
          {t("dashboard.title", "Dashboard")}
        </h1>
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          {t("dashboard.welcome", "Welcome back")}, Eng. Sultan
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.labelKey} className="shadow-card">
              <CardContent className="flex items-center justify-between p-5">
                <div className="space-y-1 text-end">
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    {t(stat.labelKey, stat.labelKey)}
                  </p>
                  <p className="text-[24px] font-bold text-[var(--color-text-primary)]">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-[8px] text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="shadow-card xl:col-span-1">
          <CardHeader className="border-b border-ejar-border">
            <CardTitle className="text-[16px] font-bold">
              {t("dashboard.workOrderHealth", "Work Order Health")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartDonut data={workOrderData} />
          </CardContent>
        </Card>

        <Card className="shadow-card xl:col-span-2">
          <CardHeader className="border-b border-ejar-border">
            <CardTitle className="text-[16px] font-bold">
              {t("dashboard.recentWorkOrders", "Recent Work Orders")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={`task-${i}`}
                className="flex items-center justify-between gap-3"
              >
                <div className="text-end">
                  <p className="font-medium text-[var(--color-text-primary)]">
                    WO-{1000 + i} - {t("dashboard.acMaintenance", "AC Maintenance")}
                  </p>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    {t("dashboard.propertyTowerA", "Property Tower A")} - {t("dashboard.unit", "Unit")} 301
                  </p>
                </div>
                <StatusPill status="warning" label={t("dashboard.statusInProgress", "In Progress")} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader className="border-b border-ejar-border">
            <CardTitle className="text-[16px] font-bold">
              {t("dashboard.recentTransactions", "Recent Transactions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={`payment-${i}`}
                className="flex items-center justify-between gap-3"
              >
                <div className="text-end">
                  <p className="font-medium text-[var(--color-text-primary)]">
                    INV-{2000 + i} - {t("dashboard.monthlyRent", "Monthly Rent")}
                  </p>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    {t("dashboard.tenant", "Tenant")}: Acme Corp
                  </p>
                </div>
                <p className="font-semibold text-[var(--color-brand-primary)]">
                  +SAR {(15000 + i * 1000).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
