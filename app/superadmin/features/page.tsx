"use client";

/**
 * Superadmin Feature Flags Management
 * Real feature flag management using /api/superadmin/feature-flags
 * 
 * @module app/superadmin/features/page
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Zap, RefreshCw, Search, AlertCircle, CheckCircle, XCircle, 
  Settings, Globe, Lock, Beaker,
} from "@/components/ui/icons";

interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  category?: string;
  enabled: boolean;
  status?: string;
  environments?: { development?: boolean; staging?: boolean; production?: boolean };
  rollout?: { strategy?: string; percentage?: number };
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  UI: <Globe className="h-4 w-4" />,
  BACKEND: <Settings className="h-4 w-4" />,
  API: <Zap className="h-4 w-4" />,
  SECURITY: <Lock className="h-4 w-4" />,
  INTEGRATION: <Settings className="h-4 w-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  ENABLED: "bg-green-500/20 text-green-400 border-green-500/30",
  DISABLED: "bg-muted text-muted-foreground border-border",
  BETA: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  DEPRECATED: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function SuperadminFeaturesPage() {
  const { t } = useI18n();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/superadmin/feature-flags", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load feature flags");
      const data = await response.json();
      setFlags(data.flags || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      toast.error("Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      setUpdating(flag.id);
      const response = await fetch("/api/superadmin/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: flag.id, enabled: !flag.enabled }),
      });
      if (!response.ok) throw new Error("Failed to update");
      toast.success(`${flag.name} ${!flag.enabled ? "enabled" : "disabled"}`);
      fetchFlags();
    } catch {
      toast.error("Failed to update feature flag");
    } finally {
      setUpdating(null);
    }
  };

  const filteredFlags = flags.filter((flag) => {
    const matchesSearch = !search || 
      flag.name.toLowerCase().includes(search.toLowerCase()) ||
      flag.description?.toLowerCase().includes(search.toLowerCase()) ||
      flag.id.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || flag.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(flags.map(f => f.category).filter(Boolean))];
  const enabledCount = flags.filter(f => f.enabled).length;
  const betaCount = flags.filter(f => f.status === "BETA").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.features")}</h1>
          <p className="text-muted-foreground">Manage feature toggles system-wide</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFlags} disabled={loading} className="border-input text-muted-foreground" aria-label={t("common.refresh", "Refresh feature flags")} title={t("common.refresh", "Refresh feature flags")}>
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><Zap className="h-5 w-5 text-muted-foreground" /></div>
              <div><p className="text-2xl font-bold text-foreground">{flags.length}</p><p className="text-sm text-muted-foreground">Total Flags</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20"><CheckCircle className="h-5 w-5 text-green-400" /></div>
              <div><p className="text-2xl font-bold text-foreground">{enabledCount}</p><p className="text-sm text-muted-foreground">Enabled</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20"><Beaker className="h-5 w-5 text-yellow-400" /></div>
              <div><p className="text-2xl font-bold text-foreground">{betaCount}</p><p className="text-sm text-muted-foreground">Beta</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><XCircle className="h-5 w-5 text-muted-foreground" /></div>
              <div><p className="text-2xl font-bold text-foreground">{flags.length - enabledCount}</p><p className="text-sm text-muted-foreground">Disabled</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search flags..." value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10 bg-muted border-input text-foreground" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter} placeholder="Category" className="w-[120px] bg-muted border-input text-foreground">
              <SelectTrigger></SelectTrigger>
              <SelectContent className="bg-muted border-input">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (<SelectItem key={cat} value={cat!}>{cat}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Flags Table */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-foreground"><Zap className="h-5 w-5" />Feature Flags</CardTitle>
          <CardDescription className="text-muted-foreground">Toggle features on/off across the platform</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12"><AlertCircle className="h-12 w-12 text-red-500 mb-4" /><p className="text-red-400">{error}</p></div>
          ) : filteredFlags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12"><Zap className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">No feature flags found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Flag</TableHead>
                  <TableHead className="text-muted-foreground">Category</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Environments</TableHead>
                  <TableHead className="text-muted-foreground text-end">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFlags.map((flag) => (
                  <TableRow key={flag.id} className="border-border hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="text-foreground font-medium">{flag.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{flag.id}</p>
                        {flag.description && <p className="text-sm text-muted-foreground mt-1">{flag.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {CATEGORY_ICONS[flag.category || ""] || <Settings className="h-4 w-4" />}
                        {flag.category || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[flag.status || (flag.enabled ? "ENABLED" : "DISABLED")]}>
                        {flag.status || (flag.enabled ? "ENABLED" : "DISABLED")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {flag.environments?.development && <Badge variant="outline" className="text-xs">DEV</Badge>}
                        {flag.environments?.staging && <Badge variant="outline" className="text-xs">STG</Badge>}
                        {flag.environments?.production && <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400">PROD</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={() => handleToggle(flag)}
                        disabled={updating === flag.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
