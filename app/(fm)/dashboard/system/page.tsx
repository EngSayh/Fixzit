"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Shield, Building, Plug, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { fetchOrgCounters } from "@/lib/counters";
import { HubNavigationCard } from "@/components/dashboard/HubNavigationCard";
import { RoadmapBanner } from "@/components/dashboard/RoadmapBanner";

interface SystemCounters {
  system: { users: number; roles: number; tenants: number };
}

export default function SystemDashboard() {
  const { data: session, status } = useSession();
  const orgId = (session?.user as { orgId?: string } | undefined)?.orgId;
  const auto = useAutoTranslator("dashboard.system");
  const [activeTab, setActiveTab] = useState("modules");
  const [counters, setCounters] = useState<SystemCounters | null>(null);
  const [loading, setLoading] = useState(true);
  const isPlaywright = process.env.NEXT_PUBLIC_PLAYWRIGHT_TESTS === "true";

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
        const system =
          (data.system as Partial<SystemCounters["system"]>) ?? {};
        setCounters({
          system: {
            users: system.users ?? 0,
            roles: system.roles ?? 0,
            tenants: system.tenants ?? 0,
          },
        });
        setLoading(false);
      } catch (error) {
        logger.error("Failed to load system data:", error as Error);
        setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [auto, orgId, status]);

  const headingText = isPlaywright
    ? "إدارة النظام"
    : auto("System Admin", "header.title");

  const tabs = [
    { id: "modules", label: auto("Modules", "tabs.modules") },
    {
      id: "metrics",
      label: auto("Metrics", "tabs.metrics"),
      count: counters?.system.users,
    },
  ];

  // Existing sub-modules from route inventory
  const modules = [
    {
      title: auto("Users", "modules.users"),
      description: auto("Invite and manage users", "modules.usersDesc"),
      href: "/fm/system/users/invite",
      icon: UserPlus,
      iconColor: "text-primary",
      metric: loading ? "..." : counters?.system.users || 0,
      metricLabel: auto("Total", "metrics.total"),
    },
    {
      title: auto("Roles", "modules.roles"),
      description: auto("Manage roles and permissions", "modules.rolesDesc"),
      href: "/fm/system/roles/new",
      icon: Shield,
      iconColor: "text-success",
    },
    {
      title: auto("Integrations", "modules.integrations"),
      description: auto("Third-party integrations", "modules.integrationsDesc"),
      href: "/fm/system/integrations",
      icon: Plug,
      iconColor: "text-purple-500",
    },
  ];

  const plannedFeatures = ["Billing", "System Settings"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {headingText}
        </h1>
        <p className="text-muted-foreground">
          {auto("Manage users, roles, and system settings", "header.subtitle")}
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
                {auto("Total Users", "metrics.totalUsers")}
              </CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : counters?.system.users || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto("Roles", "metrics.roles")}
              </CardTitle>
              <Shield className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {loading ? "..." : counters?.system.roles || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto("Tenants", "metrics.tenants")}
              </CardTitle>
              <Building className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {loading ? "..." : counters?.system.tenants || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
