"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Building2, Home, Key, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { fetchOrgCounters } from "@/lib/counters";

interface PropertyCounters {
  properties: {
    total: number;
    vacant: number;
    occupied: number;
    occupancy_rate: number;
  };
}

export default function PropertiesDashboard() {
  const { data: session, status } = useSession();
  const orgId = (session?.user as { orgId?: string } | undefined)?.orgId;
  const auto = useAutoTranslator("dashboard.properties");
  const [activeTab, setActiveTab] = useState("overview");
  const [counters, setCounters] = useState<PropertyCounters | null>(null);
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
        const properties =
          (data.properties as Partial<PropertyCounters["properties"]>) ?? {};
        setCounters({
          properties: {
            total: properties.total ?? 0,
            vacant: properties.vacant ?? 0,
            occupied: properties.occupied ?? 0,
            occupancy_rate: properties.occupancy_rate ?? 0,
          },
        });
        setLoading(false);
      } catch (error) {
        logger.error("Failed to load properties data:", error as Error);
        setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [auto, orgId, status]);

  const tabs = [
    {
      id: "overview",
      label: auto("Overview", "tabs.overview"),
      count: counters?.properties.total,
    },
    { id: "leases", label: auto("Leases", "tabs.leases") },
    { id: "maintenance", label: auto("Maintenance", "tabs.maintenance") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {auto("Properties", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto(
            "Manage properties, leases, and maintenance",
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

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto("Total Properties", "metrics.total")}
              </CardTitle>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : counters?.properties.total || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto("Occupied", "metrics.occupied")}
              </CardTitle>
              <Home className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {loading ? "..." : counters?.properties.occupied || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto("Vacant", "metrics.vacant")}
              </CardTitle>
              <Key className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {loading ? "..." : counters?.properties.vacant || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto("Occupancy Rate", "metrics.occupancy")}
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {loading
                  ? "..."
                  : `${counters?.properties.occupancy_rate?.toFixed(1) || 0}%`}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {["leases", "maintenance"].includes(activeTab) && (
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
