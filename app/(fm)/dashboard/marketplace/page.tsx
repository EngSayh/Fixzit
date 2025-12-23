"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShoppingBag, Package, Star, Store, FileQuestion, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { fetchOrgCounters } from "@/lib/counters";
import { HubNavigationCard } from "@/components/dashboard/HubNavigationCard";
import { RoadmapBanner } from "@/components/dashboard/RoadmapBanner";

interface MarketplaceCounters {
  marketplace: { listings: number; orders: number; reviews: number };
}

export default function MarketplaceDashboard() {
  const { data: session, status } = useSession();
  const orgId = (session?.user as { orgId?: string } | undefined)?.orgId;
  const auto = useAutoTranslator("dashboard.marketplace");
  const [activeTab, setActiveTab] = useState("modules");
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

        const marketplace =
          data &&
          typeof data === "object" &&
          "marketplace" in data &&
          typeof (data as { marketplace?: unknown }).marketplace === "object"
            ? ((data as { marketplace: Partial<MarketplaceCounters["marketplace"]> })
                .marketplace ?? {})
            : {};

        if (mounted) {
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
    { id: "modules", label: auto("Modules", "tabs.modules") },
    {
      id: "metrics",
      label: auto("Metrics", "tabs.metrics"),
      count: counters?.marketplace.orders,
    },
  ];

  // Existing sub-modules from route inventory
  const modules = [
    {
      title: auto("Vendors", "modules.vendors"),
      description: auto("Manage marketplace vendors", "modules.vendorsDesc"),
      href: "/fm/vendors",
      icon: Store,
      iconColor: "text-primary",
    },
    {
      title: auto("Listings", "modules.listings"),
      description: auto("Create and manage listings", "modules.listingsDesc"),
      href: "/fm/marketplace/listings/new",
      icon: Package,
      iconColor: "text-success",
      metric: loading ? "..." : counters?.marketplace.listings || 0,
      metricLabel: auto("Active", "metrics.active"),
    },
    {
      title: auto("Orders", "modules.orders"),
      description: auto("Track marketplace orders", "modules.ordersDesc"),
      href: "/fm/marketplace/orders/new",
      icon: ShoppingCart,
      iconColor: "text-orange-500",
      metric: loading ? "..." : counters?.marketplace.orders || 0,
      metricLabel: auto("Total", "metrics.total"),
    },
    {
      title: auto("RFQs", "modules.rfqs"),
      description: auto("Request for quotations", "modules.rfqsDesc"),
      href: "/fm/rfqs",
      icon: FileQuestion,
      iconColor: "text-purple-500",
    },
  ];

  const plannedFeatures = ["Catalog Browser", "Reviews"];

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );
}
