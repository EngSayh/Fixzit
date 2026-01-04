"use client";

/**
 * Superadmin Security Center
 * Real security monitoring using /api/superadmin/security/*
 * 
 * @module app/superadmin/security/page
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Shield, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  Activity, Lock, Clock, Server, Zap, AlertCircle,
} from "@/components/ui/icons";

interface RateLimitMetrics {
  windowMs: number;
  totalHits: number;
  uniqueKeys: number;
  endpoints: Array<{ endpoint: string; hits: number; blocked: number }>;
  loginRateLimit: { windowMs: number; maxAttempts: number };
  distributed: { enabled: boolean; status: string; lastConnectedAt?: string; lastErrorAt?: string; lastError?: string };
  generatedAt: string;
}

export default function SuperadminSecurityPage() {
  const { t } = useI18n();
  const [metrics, setMetrics] = useState<RateLimitMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/superadmin/security/rate-limits", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load security metrics");
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      toast.error("Failed to load security metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "connected": return "text-green-400";
      case "disconnected": return "text-red-400";
      case "connecting": return "text-yellow-400";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.security")}</h1>
          <p className="text-muted-foreground">Security monitoring and rate limit configuration</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading} className="border-input text-muted-foreground" aria-label={t("common.refresh", "Refresh security metrics")} title={t("common.refresh", "Refresh security metrics")}>
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {loading && !metrics ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-400">{error}</p>
              <Button variant="outline" onClick={fetchMetrics} className="mt-4" aria-label={t("common.retry", "Retry loading security metrics")} title={t("common.retry", "Retry loading security metrics")}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      ) : metrics && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20"><Activity className="h-5 w-5 text-blue-400" /></div>
                  <div><p className="text-2xl font-bold text-foreground">{metrics.totalHits.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Requests</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20"><Zap className="h-5 w-5 text-purple-400" /></div>
                  <div><p className="text-2xl font-bold text-foreground">{metrics.uniqueKeys.toLocaleString()}</p><p className="text-sm text-muted-foreground">Unique Keys</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/20"><Clock className="h-5 w-5 text-yellow-400" /></div>
                  <div><p className="text-2xl font-bold text-foreground">{formatDuration(metrics.windowMs)}</p><p className="text-sm text-muted-foreground">Window</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${metrics.distributed.enabled ? "bg-green-500/20" : "bg-muted"}`}>
                    <Server className={`h-5 w-5 ${metrics.distributed.enabled ? "text-green-400" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{metrics.distributed.enabled ? "ON" : "OFF"}</p>
                    <p className="text-sm text-muted-foreground">Distributed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Login Rate Limit */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground"><Lock className="h-5 w-5" />Login Protection</CardTitle>
              <CardDescription className="text-muted-foreground">Rate limiting for authentication endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Max Attempts</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.loginRateLimit.maxAttempts}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Window</p>
                  <p className="text-2xl font-bold text-foreground">{formatDuration(metrics.loginRateLimit.windowMs)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distributed Cache Status */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground"><Server className="h-5 w-5" />Distributed Cache (Redis)</CardTitle>
              <CardDescription className="text-muted-foreground">Redis connection status for distributed rate limiting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <div className="flex items-center gap-2">
                    {metrics.distributed.status === "connected" ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : metrics.distributed.status === "disconnected" ? (
                      <XCircle className="h-5 w-5 text-red-400" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    )}
                    <span className={getStatusColor(metrics.distributed.status)}>{metrics.distributed.status}</span>
                  </div>
                </div>
                {metrics.distributed.lastConnectedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Connected</span>
                    <span className="text-muted-foreground">{new Date(metrics.distributed.lastConnectedAt).toLocaleString()}</span>
                  </div>
                )}
                {metrics.distributed.lastError && (
                  <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-3">
                    <p className="text-sm text-red-400">{metrics.distributed.lastError}</p>
                    {metrics.distributed.lastErrorAt && (
                      <p className="text-xs text-red-500 mt-1">{new Date(metrics.distributed.lastErrorAt).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Endpoint Breakdown */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground"><Shield className="h-5 w-5" />Endpoint Rate Limits</CardTitle>
              <CardDescription className="text-muted-foreground">Request counts and blocks per endpoint</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!metrics.endpoints || metrics.endpoints.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No endpoint data available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Endpoint</TableHead>
                      <TableHead className="text-muted-foreground">Hits</TableHead>
                      <TableHead className="text-muted-foreground">Blocked</TableHead>
                      <TableHead className="text-muted-foreground">Block Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.endpoints.map((ep, i) => {
                      const blockRate = ep.hits > 0 ? (ep.blocked / ep.hits) * 100 : 0;
                      return (
                        <TableRow key={i} className="border-border hover:bg-muted/50">
                          <TableCell className="text-foreground font-mono text-sm">{ep.endpoint}</TableCell>
                          <TableCell className="text-muted-foreground">{ep.hits.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className={ep.blocked > 0 ? "text-red-400" : "text-muted-foreground"}>
                              {ep.blocked.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={blockRate} className="w-16 h-2" />
                              <span className="text-sm text-muted-foreground">{blockRate.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Last Updated */}
          <div className="text-center text-sm text-muted-foreground/50">
            Last updated: {new Date(metrics.generatedAt).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
