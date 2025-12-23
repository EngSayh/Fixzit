"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { HubNavigationCard } from "@/components/dashboard/HubNavigationCard";
import { RoadmapBanner } from "@/components/dashboard/RoadmapBanner";
import { ClipboardCheck, FileSignature, ScrollText } from "@/components/ui/icons";

export default function ComplianceDashboard() {
  const auto = useAutoTranslator("dashboard.compliance");
  const [activeTab, setActiveTab] = useState("modules");

  const tabs = [
    { id: "modules", label: auto("Modules", "tabs.modules") },
    { id: "roadmap", label: auto("Roadmap", "tabs.roadmap") },
  ];

  // Existing sub-modules from route inventory
  const modules = [
    {
      title: auto("Audits", "modules.audits"),
      description: auto("Schedule and track compliance audits", "modules.auditsDesc"),
      href: "/fm/compliance/audits",
      icon: ClipboardCheck,
      iconColor: "text-primary",
    },
    {
      title: auto("Contracts", "modules.contracts"),
      description: auto("Manage contracts and agreements", "modules.contractsDesc"),
      href: "/fm/compliance/contracts/new",
      icon: FileSignature,
      iconColor: "text-success",
    },
    {
      title: auto("Policies", "modules.policies"),
      description: auto("Compliance policies and procedures", "modules.policiesDesc"),
      href: "/fm/compliance/policies",
      icon: ScrollText,
      iconColor: "text-orange-500",
    },
  ];

  const plannedFeatures = ["Disputes", "Audit Trail"];

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

      {activeTab === "modules" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <HubNavigationCard key={module.href} {...module} />
            ))}
          </div>
          <RoadmapBanner features={plannedFeatures} variant="subtle" />
        </div>
      )}

      {activeTab === "roadmap" && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="font-medium">
                {auto("Planned Features", "roadmap.title")}
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
