"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";
import { HubNavigationCard } from "@/components/dashboard/HubNavigationCard";
import { RoadmapBanner } from "@/components/dashboard/RoadmapBanner";
import { BarChart3, FileSpreadsheet, LayoutDashboard } from "lucide-react";

export default function ReportsDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("modules");

  const tabs = [
    { id: "modules", label: t("dashboard.reports.tabs.modules", "Modules") },
    { id: "roadmap", label: t("dashboard.reports.tabs.roadmap", "Roadmap") },
  ];

  // Existing sub-modules from route inventory
  const modules = [
    {
      title: t("dashboard.reports.modules.standard", "Standard Reports"),
      description: t("dashboard.reports.modules.standardDesc", "Pre-built business reports"),
      href: "/fm/reports",
      icon: BarChart3,
      iconColor: "text-primary",
    },
  ];

  const plannedFeatures = ["Custom Reports", "Dashboards Builder"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("dashboard.reports.title", "Reports")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "dashboard.reports.subtitle",
            "Generate and view business reports",
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 border-b">
        {tabs.map((tab) => (
          <button
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
          </button>
        ))}
      </div>

      {activeTab === "modules" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <HubNavigationCard key={module.href} {...module} />
            ))}
          </div>
          <RoadmapBanner features={plannedFeatures} variant="info" />
        </div>
      )}

      {activeTab === "roadmap" && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="font-medium">
                {t("dashboard.reports.roadmap.title", "Planned Features")}
              </p>
              <ul className="mt-4 space-y-2">
                {plannedFeatures.map((feature) => (
                  <li key={feature} className="text-sm">{feature}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
