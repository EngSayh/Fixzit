"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShoppingBag, Package, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { fetchOrgCounters } from "@/lib/counters";

interface MarketplaceCounters {
  marketplace: { listings: number; orders: number; reviews: number };
}

export default function MarketplaceDashboard() {
  const { data: session, status } = useSession();
  const orgId = (session?.user as { orgId?: string } | undefined)?.orgId;
  const auto = useAutoTranslator("dashboard.marketplace");
  const [activeTab, setActiveTab] = useState("vendors");
  const [counters, setCounters] = useState<MarketplaceCounters | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!orgId) {
      setCounters(null);
      setLoading(false);
      return;
    }
    const abortController = new AbortController();
    let mounted = true;

    const fetchData = async () => {
      try {
        const data = await fetchOrgCounters(orgId, {
          signal: abortController.signal,
        });

        if (mounted) {
          const marketplace =
            (data.marketplace as Partial<MarketplaceCounters["marketplace"]>) ??
            {};
          setCounters({
            marketplace: {
              listings: marketplace.listings ?? 0,
              orders: marketplace.orders ?? 0,
              reviews: marketplace.reviews ?? 0,
            },
          });
          setLoading(false);
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === "AbortError") return;

        if (mounted) {
          logger.error("Failed to load marketplace data:", error as Error);
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [auto, orgId, status]);

  const tabs = [
    { id: "vendors", label: auto("Vendors", "tabs.vendors") },
    {
      id: "catalog",
      label: auto("Catalog", "tabs.catalog"),
      count: counters?.marketplace.listings,
    },
    {
      id: "orders",
      label: auto("Orders", "tabs.orders"),
      count: counters?.marketplace.orders,
    },
    { id: "rfqs", label: auto("RFQs", "tabs.rfqs") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {auto("Marketplace", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto("Manage vendors, catalog, and orders", "header.subtitle")}
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

      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto("Active Listings", "metrics.listings")}
              </CardTitle>
              <Package className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {loading ? "..." : counters?.marketplace.listings || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto("Orders", "metrics.orders")}
              </CardTitle>
              <ShoppingBag className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {loading ? "..." : counters?.marketplace.orders || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto("Reviews", "metrics.reviews")}
              </CardTitle>
              <Star className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {loading ? "..." : counters?.marketplace.reviews || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {["vendors", "orders", "rfqs"].includes(activeTab) && (
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
