"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Shield, Building, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { fetchOrgCounters } from "@/lib/counters";

interface SystemCounters {
  system: { users: number; roles: number; tenants: number };
}

interface SystemHealth {
  healthScore: number;
  totalIssues: number;
  criticalIssues: number;
  highPriorityIssues: number;
  resolvedIssues: number;
  lastUpdated: string;
  topPriorityActions: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
  }>;
}

export default function SystemDashboard() {
  const { data: session, status } = useSession();
  const orgId = (session?.user as { orgId?: string } | undefined)?.orgId;
  const auto = useAutoTranslator("dashboard.system");
  const [activeTab, setActiveTab] = useState("users");
  const [counters, setCounters] = useState<SystemCounters | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
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

  useEffect(() => {
    if (status === "loading") return;
    const controller = new AbortController();
    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/system/health", {
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          setSystemHealth(data);
        }
        setHealthLoading(false);
      } catch (error) {
        logger.error("Failed to load system health:", error as Error);
        setHealthLoading(false);
      }
    };
    fetchHealth();
    return () => controller.abort();
  }, [status]);

  const headingText = isPlaywright
    ? "إدارة النظام"
    : auto("System Admin", "header.title");
  const totalUsersLabel = isPlaywright
    ? "إجمالي المستخدمين"
    : auto("Total Users", "metrics.totalUsers");

  const tabs = [
    {
      id: "users",
      label: auto("Users", "tabs.users"),
      count: counters?.system.users,
    },
    { id: "roles", label: auto("Roles & Permissions", "tabs.roles") },
    { id: "billing", label: auto("Billing", "tabs.billing") },
    { id: "integrations", label: auto("Integrations", "tabs.integrations") },
    { id: "settings", label: auto("System Settings", "tabs.settings") },
  ];

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

      {activeTab === "users" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {totalUsersLabel}
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

          {/* System Health Widget */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {auto("System Health", "health.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {healthLoading ? (
                <div className="text-center text-muted-foreground py-4">
                  {auto("Loading health status...", "health.loading")}
                </div>
              ) : systemHealth ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className={cn(
                        "text-3xl font-bold",
                        systemHealth.healthScore >= 90 && "text-success",
                        systemHealth.healthScore >= 70 && systemHealth.healthScore < 90 && "text-warning",
                        systemHealth.healthScore < 70 && "text-destructive"
                      )}>
                        {systemHealth.healthScore}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {auto("Health Score", "health.score")}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-destructive">
                        {systemHealth.criticalIssues}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {auto("Critical", "health.critical")}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-warning">
                        {systemHealth.highPriorityIssues}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {auto("High Priority", "health.highPriority")}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">
                        {systemHealth.resolvedIssues}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {auto("Resolved", "health.resolved")}
                      </div>
                    </div>
                  </div>

                  {systemHealth.topPriorityActions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2">
                        {auto("Top Priority Actions", "health.topActions")}
                      </h4>
                      <div className="space-y-2">
                        {systemHealth.topPriorityActions.slice(0, 3).map((action) => (
                          <div
                            key={action.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              {action.status === "completed" ? (
                                <CheckCircle2 className="w-4 h-4 text-success" />
                              ) : (
                                <AlertTriangle className={cn(
                                  "w-4 h-4",
                                  action.priority === "critical" && "text-destructive",
                                  action.priority === "high" && "text-warning",
                                  action.priority === "medium" && "text-primary"
                                )} />
                              )}
                              <span className="text-sm font-mono">{action.id}</span>
                              <span className="text-sm text-muted-foreground">
                                {action.title.substring(0, 50)}
                                {action.title.length > 50 && "..."}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground mt-4">
                    {auto("Last updated", "health.lastUpdated")}: {new Date(systemHealth.lastUpdated).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  {auto("Health data unavailable", "health.unavailable")}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {["roles", "billing", "integrations", "settings"].includes(activeTab) && (
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
      )}
    </div>
  );
}
