"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";

type ReportTab = {
  id: string;
  labelKey: string;
  fallback: string;
};

const TABS: ReportTab[] = [
  {
    id: "standard",
    labelKey: "dashboard.reports.tabs.standard",
    fallback: "Standard Reports",
  },
  {
    id: "custom",
    labelKey: "dashboard.reports.tabs.custom",
    fallback: "Custom Reports",
  },
  {
    id: "dashboards",
    labelKey: "dashboard.reports.tabs.dashboards",
    fallback: "Dashboards",
  },
];

export default function ReportsDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(TABS[0]?.id ?? "standard");

  const activeTabLabel = TABS.find((tab) => tab.id === activeTab);

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
        {TABS.map((tab) => (
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
            {t(tab.labelKey, tab.fallback)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p className="font-medium">
              {activeTabLabel
                ? t(activeTabLabel.labelKey, activeTabLabel.fallback)
                : ""}
            </p>
            <p className="text-sm mt-2">
              {t(
                "dashboard.reports.comingSoon",
                "Content will be implemented here",
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
