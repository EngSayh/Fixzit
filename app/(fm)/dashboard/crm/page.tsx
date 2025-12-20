"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UserCog, Users, FileSignature } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { fetchOrgCounters } from "@/lib/counters";

interface CRMCounters {
  customers: { leads: number; active: number; contracts: number };
}

export default function CRMDashboard() {
  const { data: session, status } = useSession();
  const orgId = (session?.user as { orgId?: string } | undefined)?.orgId;
  const auto = useAutoTranslator("dashboard.crm");
  const [activeTab, setActiveTab] = useState("customers");
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
    {
      id: "customers",
      label: auto("Customers", "tabs.customers"),
      count: counters?.customers.active,
    },
    {
      id: "leads",
      label: auto("Leads", "tabs.leads"),
      count: counters?.customers.leads,
    },
    {
      id: "contracts",
      label: auto("Contracts", "tabs.contracts"),
      count: counters?.customers.contracts,
    },
    { id: "feedback", label: auto("Feedback", "tabs.feedback") },
  ];

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

      {activeTab === "customers" && (
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

      {["leads", "contracts", "feedback"].includes(activeTab) && (
        <Card>
          <CardContent className="py-8">
            {/* guard-placeholders:allow - Dashboard hub page, sub-features on roadmap */}
            <div className="text-center text-muted-foreground">
              <p className="font-medium">
                {tabs.find((t) => t.id === activeTab)?.label}
              </p>
              <p className="text-sm mt-2">
                {auto(
                  "This feature is on our roadmap",
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
