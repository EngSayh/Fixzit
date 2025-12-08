"use client";

/**
 * SMS Provider Health Dashboard Component
 *
 * Displays real-time health metrics for all SMS providers.
 * Shows success rates, delivery times, costs, and status.
 *
 * @module components/admin/sms/ProviderHealthDashboard
 */
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderHealth {
  provider: string;
  enabled: boolean;
  configuredOrgs: number;
  status: "healthy" | "degraded" | "unhealthy" | "unconfigured";
  last24h: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    successRate: number;
    avgDeliveryMs: number | null;
    totalCost: number;
  };
  last7d: {
    total: number;
    delivered: number;
    failed: number;
    successRate: number;
    totalCost: number;
  };
}

interface HealthData {
  success: boolean;
  overallStatus: "healthy" | "degraded" | "unhealthy";
  providers: ProviderHealth[];
  totals: {
    last24h: {
      total: number;
      delivered: number;
      failed: number;
      pending: number;
      totalCost: number;
      successRate: number;
    };
    last7d: {
      total: number;
      delivered: number;
      failed: number;
      totalCost: number;
      successRate: number;
    };
  };
  generatedAt: string;
}

const STATUS_ICONS = {
  healthy: CheckCircle2,
  degraded: AlertTriangle,
  unhealthy: XCircle,
  unconfigured: Activity,
};

const STATUS_COLORS = {
  healthy: "text-green-500",
  degraded: "text-yellow-500",
  unhealthy: "text-red-500",
  unconfigured: "text-gray-400",
};

const STATUS_BG = {
  healthy: "bg-green-500/10",
  degraded: "bg-yellow-500/10",
  unhealthy: "bg-red-500/10",
  unconfigured: "bg-gray-500/10",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-OM", {
    style: "currency",
    currency: "OMR",
    minimumFractionDigits: 3,
  }).format(amount);
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "N/A";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ProviderCard({ provider }: { provider: ProviderHealth }) {
  const StatusIcon = STATUS_ICONS[provider.status];

  return (
    <Card className={cn("transition-all", provider.enabled ? "" : "opacity-60")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg capitalize">{provider.provider}</CardTitle>
          <Badge
            variant="outline"
            className={cn(STATUS_BG[provider.status], STATUS_COLORS[provider.status])}
          >
            <StatusIcon className="h-3 w-3 me-1" />
            {provider.status}
          </Badge>
        </div>
        <CardDescription>
          {provider.enabled
            ? `${provider.configuredOrgs} org${provider.configuredOrgs !== 1 ? "s" : ""} configured`
            : "Not configured"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {provider.enabled ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">24h Success Rate</p>
              <p className={cn(
                "text-2xl font-bold",
                provider.last24h.successRate >= 95 ? "text-green-500" :
                provider.last24h.successRate >= 80 ? "text-yellow-500" : "text-red-500"
              )}>
                {provider.last24h.successRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Delivery</p>
              <p className="text-2xl font-bold">
                {formatDuration(provider.last24h.avgDeliveryMs)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">24h Messages</p>
              <p className="text-lg font-medium">
                {provider.last24h.delivered}/{provider.last24h.total}
                {provider.last24h.pending > 0 && (
                  <span className="text-yellow-500 text-sm ms-1">
                    (+{provider.last24h.pending} pending)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">24h Cost</p>
              <p className="text-lg font-medium">
                {formatCurrency(provider.last24h.totalCost)}
              </p>
            </div>
            <div className="col-span-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">7d Totals</p>
              <p className="text-sm">
                {provider.last7d.delivered}/{provider.last7d.total} delivered
                ({provider.last7d.successRate.toFixed(1)}%) •{" "}
                {formatCurrency(provider.last7d.totalCost)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This provider is not configured for any organization.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function OverallStats({ data }: { data: HealthData }) {
  const StatusIcon = STATUS_ICONS[data.overallStatus];

  return (
    <Card className={cn(STATUS_BG[data.overallStatus])}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className={cn("h-5 w-5", STATUS_COLORS[data.overallStatus])} />
            System Health: {data.overallStatus.charAt(0).toUpperCase() + data.overallStatus.slice(1)}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Updated: {new Date(data.generatedAt).toLocaleTimeString()}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">24h Success Rate</p>
            <p className="text-3xl font-bold">{data.totals.last24h.successRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">24h Messages</p>
            <p className="text-3xl font-bold">{data.totals.last24h.total.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">24h Cost</p>
            <p className="text-3xl font-bold">{formatCurrency(data.totals.last24h.totalCost)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">7d Messages</p>
            <p className="text-3xl font-bold">{data.totals.last7d.total.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-60" />
        ))}
      </div>
    </div>
  );
}

export function ProviderHealthDashboard() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/sms/health");
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Card className="bg-red-500/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-500">
            <XCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <Button variant="outline" className="mt-4" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 me-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">SMS Provider Health</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4 me-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <OverallStats data={data} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.providers
          .sort((a, b) => {
            // Sort: enabled first, then by status severity
            if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
            const statusOrder = { unhealthy: 0, degraded: 1, healthy: 2, unconfigured: 3 };
            return statusOrder[a.status] - statusOrder[b.status];
          })
          .map((provider) => (
            <ProviderCard key={provider.provider} provider={provider} />
          ))}
      </div>
    </div>
  );
}

export default ProviderHealthDashboard;
