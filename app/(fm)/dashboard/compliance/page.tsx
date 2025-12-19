"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

export default function ComplianceDashboard() {
  const auto = useAutoTranslator("dashboard.compliance");
  const [activeTab, setActiveTab] = useState("contracts");

  const tabs = [
    { id: "contracts", label: auto("Contracts", "tabs.contracts") },
    { id: "disputes", label: auto("Disputes", "tabs.disputes") },
    { id: "audit", label: auto("Audit Trail", "tabs.audit") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {auto("Compliance", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto(
            "Manage contracts, disputes, and audit trails",
            "header.subtitle",
          )}
        </p>
      </div>

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
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p className="font-medium">
              {tabs.find((t) => t.id === activeTab)?.label}
            </p>
            <p className="text-sm mt-2">
              {auto(
                "Content will be implemented here",
                "placeholder.description",
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
