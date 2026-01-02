"use client";

/**
 * Superadmin Database Management
 * MongoDB status, collections, and maintenance using /api/superadmin/export and health endpoints
 * 
 * @module app/superadmin/database/page
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Database, RefreshCw, HardDrive, CheckCircle, XCircle,
  Clock, FileText, Download, AlertTriangle,
} from "@/components/ui/icons";

interface CollectionStats {
  name: string;
  count: number;
  avgObjSize: number;
  size: number;
  storageSize: number;
  indexCount: number;
}

interface DatabaseHealth {
  connected: boolean;
  latencyMs: number;
  replicaSet?: string;
  serverVersion?: string;
}

const EXPORTABLE_COLLECTIONS = ["workorders", "properties", "vendors", "units", "invoices", "users", "tenancies"];

export default function SuperadminDatabasePage() {
  const { t } = useI18n();
  const [health, setHealth] = useState<DatabaseHealth | null>(null);
  const [collections, setCollections] = useState<CollectionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch real database stats from API
      const statsResponse = await fetch("/api/superadmin/database/stats", { credentials: "include" });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        // Read from health object if available, otherwise from top-level properties
        setHealth({
          connected: statsData.health?.connected ?? statsData.connections?.connected ?? true,
          latencyMs: statsData.health?.latency ?? statsData.connections?.latency ?? 0,
          replicaSet: statsData.health?.replicaSet ?? null,
          serverVersion: statsData.health?.version ?? statsData.version ?? "unknown",
        });
        // Map API response to our format
        if (statsData.collections) {
          setCollections(statsData.collections.map((c: { name: string; count: number; avgObjSize: number; size: number; storageSize: number; indexes: number }) => ({
            name: c.name,
            count: c.count,
            avgObjSize: c.avgObjSize,
            size: c.size,
            storageSize: c.storageSize,
            indexCount: c.indexes || 0,
          })));
        }
      } else {
        // Fallback to health endpoint if stats API fails
        // Clear collections to avoid showing stale data
        setCollections([]);
        const response = await fetch("/api/health", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setHealth({
            connected: data.db?.status === "connected" || data.database?.connected === true,
            latencyMs: data.db?.latencyMs || data.database?.latencyMs || 0,
            replicaSet: data.db?.replicaSet || data.database?.replicaSet,
            serverVersion: data.db?.version || data.database?.version,
          });
        }
      }
    } catch {
      toast.error("Failed to fetch database health");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); const interval = setInterval(fetchHealth, 30000); return () => clearInterval(interval); }, [fetchHealth]);

  const handleExport = async (collection: string) => {
    try {
      setExporting(collection);
      const response = await fetch("/api/superadmin/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ format: "json", collections: [collection] }),
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${collection}-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`${collection} exported successfully`);
    } catch {
      toast.error(`Failed to export ${collection}`);
    } finally {
      setExporting(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const totalSize = collections.reduce((sum, c) => sum + c.storageSize, 0);
  const totalDocs = collections.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.database", { defaultValue: "Database" })}</h1>
          <p className="text-muted-foreground">{t("superadmin.database.description", { defaultValue: "MongoDB Atlas connection status and collection management" })}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading} className="border-input text-muted-foreground" aria-label={t("common.refresh", "Refresh database status")} title={t("common.refresh", "Refresh database status")}>
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {health?.connected ? <CheckCircle className="h-8 w-8 text-green-400" /> : <XCircle className="h-8 w-8 text-red-400" />}
              <div>
                <p className="text-lg font-bold text-foreground">{health?.connected ? "Connected" : "Disconnected"}</p>
                <p className="text-muted-foreground text-sm">Atlas Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{health?.latencyMs || 0}ms</p>
                <p className="text-muted-foreground text-sm">Latency</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <HardDrive className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{formatBytes(totalSize)}</p>
                <p className="text-muted-foreground text-sm">Total Storage</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{totalDocs.toLocaleString()}</p>
                <p className="text-muted-foreground text-sm">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Server Info */}
      {health && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6">
              <div><span className="text-muted-foreground text-sm">Server Version:</span><span className="text-foreground ms-2 font-mono">{health.serverVersion || "N/A"}</span></div>
              <div><span className="text-muted-foreground text-sm">Replica Set:</span><span className="text-foreground ms-2 font-mono">{health.replicaSet || "N/A"}</span></div>
              <div><span className="text-muted-foreground text-sm">Collections:</span><span className="text-foreground ms-2">{collections.length}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collections Table */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-foreground"><Database className="h-5 w-5" />Collections</CardTitle>
          <CardDescription className="text-muted-foreground">Collection statistics and export options</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Collection</TableHead>
                <TableHead className="text-muted-foreground text-end">Documents</TableHead>
                <TableHead className="text-muted-foreground text-end">Avg Size</TableHead>
                <TableHead className="text-muted-foreground text-end">Data Size</TableHead>
                <TableHead className="text-muted-foreground text-end">Storage</TableHead>
                <TableHead className="text-muted-foreground text-center">Indexes</TableHead>
                <TableHead className="text-muted-foreground w-[100px]">Export</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((col) => (
                <TableRow key={col.name} className="border-border hover:bg-muted/50">
                  <TableCell className="font-mono text-foreground">{col.name}</TableCell>
                  <TableCell className="text-end text-muted-foreground">{col.count.toLocaleString()}</TableCell>
                  <TableCell className="text-end text-muted-foreground">{formatBytes(col.avgObjSize)}</TableCell>
                  <TableCell className="text-end text-muted-foreground">{formatBytes(col.size)}</TableCell>
                  <TableCell className="text-end text-muted-foreground">{formatBytes(col.storageSize)}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className="bg-blue-500/20 text-blue-400">{col.indexCount}</Badge></TableCell>
                  <TableCell>
                    {EXPORTABLE_COLLECTIONS.includes(col.name) && (
                      <Button variant="ghost" size="sm" onClick={() => handleExport(col.name)} disabled={exporting === col.name} aria-label={t("superadmin.database.export", `Export ${col.name} collection`)} title={t("superadmin.database.export", `Export ${col.name} collection`)}>
                        {exporting === col.name ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="bg-yellow-500/10 border-yellow-500/30">
        <CardContent className="p-4 flex items-center gap-4">
          <AlertTriangle className="h-8 w-8 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-yellow-200 font-medium">Production Database</p>
            <p className="text-yellow-300/80 text-sm">Exports are tenant-scoped. For full database operations, use MongoDB Atlas console.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
