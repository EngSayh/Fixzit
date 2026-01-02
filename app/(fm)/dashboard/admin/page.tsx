"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { HubNavigationCard } from "@/components/dashboard/HubNavigationCard";
import { RoadmapBanner } from "@/components/dashboard/RoadmapBanner";
import { FileText, Box } from "@/components/ui/icons";

export default function AdminDashboard() {
  const auto = useAutoTranslator("dashboard.admin");
  const [activeTab, setActiveTab] = useState("modules");

  const tabs = [
    { id: "modules", label: auto("Modules", "tabs.modules") },
    { id: "roadmap", label: auto("Roadmap", "tabs.roadmap") },
  ];

  // Existing sub-modules from route inventory
  const modules = [
    {
      title: auto("Policies", "modules.policies"),
      description: auto("Manage organizational policies", "modules.policiesDesc"),
      href: "/fm/administration/policies/new",
      icon: FileText,
      iconColor: "text-primary",
    },
    {
      title: auto("Assets", "modules.assets"),
      description: auto("Track and manage assets", "modules.assetsDesc"),
      href: "/fm/administration/assets/new",
      icon: Box,
      iconColor: "text-success",
    },
  ];

  const plannedFeatures = ["DOA Workflows", "Facilities Management", "Document Control"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {auto("Admin & Operations", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto("Manage policies, assets, and facilities", "header.subtitle")}
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
            aria-label={auto("Switch to {{tab}} tab", "tabs.switchAria", { tab: tab.label })}
            aria-selected={activeTab === tab.id}
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
