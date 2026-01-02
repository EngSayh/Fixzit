"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MessageSquare, AlertCircle, CheckCircle, AlertTriangle } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { fetchOrgCounters } from "@/lib/counters";
import { HubNavigationCard } from "@/components/dashboard/HubNavigationCard";
import { RoadmapBanner } from "@/components/dashboard/RoadmapBanner";

interface SupportCounters {
  support: { open: number; pending: number; resolved: number };
}

export default function SupportDashboard() {
  const { data: session, status } = useSession();
  const orgId = (session?.user as { orgId?: string } | undefined)?.orgId;
  const auto = useAutoTranslator("dashboard.support");
  const [activeTab, setActiveTab] = useState("modules");
  const [counters, setCounters] = useState<SupportCounters | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!orgId) {
      setCounters(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const data = await fetchOrgCounters(orgId, { signal: controller.signal });
        const support =
          (data.support as Partial<SupportCounters["support"]>) ?? {};
        setCounters({
          support: {
            open: support.open ?? 0,
            pending: support.pending ?? 0,
            resolved: support.resolved ?? 0,
          },
        });
        setLoading(false);
      } catch (error) {
        logger.error("Failed to load support data:", error as Error);
        setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [auto, orgId, status]);

  const tabs = [
    { id: "modules", label: auto("Modules", "tabs.modules") },
    {
      id: "metrics",
      label: auto("Metrics", "tabs.metrics"),
      count: counters?.support.open,
    },
  ];

  // Existing sub-modules from route inventory
  const modules = [
    {
      title: auto("Tickets", "modules.tickets"),
      description: auto("Support ticket management", "modules.ticketsDesc"),
      href: "/fm/support/tickets",
      icon: MessageSquare,
      iconColor: "text-primary",
      metric: loading ? "..." : counters?.support.open || 0,
      metricLabel: auto("Open", "metrics.open"),
    },
    {
      title: auto("Escalations", "modules.escalations"),
      description: auto("Manage escalated issues", "modules.escalationsDesc"),
      href: "/fm/support/escalations/new",
      icon: AlertTriangle,
      iconColor: "text-orange-500",
    },
  ];

  const plannedFeatures = ["Knowledge Base", "Live Chat", "SLA Management"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {auto("Support", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto("Manage tickets, KB, and customer support", "header.subtitle")}
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
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ms-2 px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                {tab.count}
              </span>
            )}
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

      {activeTab === "metrics" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto("Open Tickets", "metrics.open")}
              </CardTitle>
              <MessageSquare className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {loading ? "..." : counters?.support.open || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto("Pending", "metrics.pending")}
              </CardTitle>
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {loading ? "..." : counters?.support.pending || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto("Resolved", "metrics.resolved")}
              </CardTitle>
              <CheckCircle className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {loading ? "..." : counters?.support.resolved || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
