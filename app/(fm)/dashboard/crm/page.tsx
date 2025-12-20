"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UserCog, Users, FileSignature, UserPlus, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { fetchOrgCounters } from "@/lib/counters";
import { HubNavigationCard } from "@/components/dashboard/HubNavigationCard";
import { RoadmapBanner } from "@/components/dashboard/RoadmapBanner";

interface CRMCounters {
  customers: { leads: number; active: number; contracts: number };
}

export default function CRMDashboard() {
  const { data: session, status } = useSession();
  const orgId = (session?.user as { orgId?: string } | undefined)?.orgId;
  const auto = useAutoTranslator("dashboard.crm");
  const [activeTab, setActiveTab] = useState("modules");
  const [counters, setCounters] = useState<CRMCounters | null>(null);
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
        const customers =
          (data.customers as Partial<CRMCounters["customers"]>) ?? {};
        setCounters({
          customers: {
            leads: customers.leads ?? 0,
            active: customers.active ?? 0,
            contracts: customers.contracts ?? 0,
          },
        });
        setLoading(false);
      } catch (error) {
        logger.error("Failed to load CRM data:", error as Error);
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
      count: counters?.customers.active,
    },
  ];

  // Existing sub-modules from route inventory
  const modules = [
    {
      title: auto("Leads", "modules.leads"),
      description: auto("Manage sales leads", "modules.leadsDesc"),
      href: "/fm/crm/leads/new",
      icon: UserPlus,
      iconColor: "text-orange-500",
      metric: loading ? "..." : counters?.customers.leads || 0,
      metricLabel: auto("Active", "metrics.active"),
    },
    {
      title: auto("Accounts", "modules.accounts"),
      description: auto("Customer accounts", "modules.accountsDesc"),
      href: "/fm/crm/accounts/new",
      icon: Building,
      iconColor: "text-primary",
      metric: loading ? "..." : counters?.customers.active || 0,
      metricLabel: auto("Customers", "metrics.customers"),
    },
  ];

  const plannedFeatures = ["Contracts", "Feedback", "Campaign Management"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {auto("CRM", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto(
            "Manage customers, leads, and relationships",
            "header.subtitle",
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
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ms-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
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
                {auto("Active Customers", "metrics.active")}
              </CardTitle>
              <Users className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {loading ? "..." : counters?.customers.active || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto("Leads", "metrics.leads")}
              </CardTitle>
              <UserCog className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {loading ? "..." : counters?.customers.leads || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto("Contracts", "metrics.contracts")}
              </CardTitle>
              <FileSignature className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {loading ? "..." : counters?.customers.contracts || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
