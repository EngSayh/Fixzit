"use client";

/**
 * Superadmin Import/Export
 * Bulk data import/export using /api/superadmin/export endpoints
 * 
 * @module app/superadmin/import-export/page
 */

import { useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Upload, Download, FileText, RefreshCw, CheckCircle, AlertTriangle,
  Database, Building2, Users, Wrench, FileJson, FileSpreadsheet,
} from "@/components/ui/icons";

const EXPORTABLE_COLLECTIONS = [
  { id: "workorders", name: "Work Orders", icon: Wrench, count: 12450 },
  { id: "properties", name: "Properties", icon: Building2, count: 3240 },
  { id: "vendors", name: "Vendors", icon: Users, count: 856 },
  { id: "units", name: "Units", icon: Database, count: 15680 },
  { id: "users", name: "Users", icon: Users, count: 4520 },
  { id: "invoices", name: "Invoices", icon: FileText, count: 28340 },
  { id: "tenancies", name: "Tenancies", icon: Building2, count: 8920 },
];

interface ExportJob {
  id: string;
  collections: string[];
  format: string;
  status: string;
  progress: number;
  createdAt: string;
  downloadUrl?: string;
}

export default function SuperadminImportExportPage() {
  const { t } = useI18n();
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<string>("json");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [recentExports, setRecentExports] = useState<ExportJob[]>([]);

  const toggleCollection = (id: string) => {
    setSelectedCollections(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelectedCollections(selectedCollections.length === EXPORTABLE_COLLECTIONS.length ? [] : EXPORTABLE_COLLECTIONS.map(c => c.id));
  };

  const handleExport = async () => {
    if (selectedCollections.length === 0) {
      toast.error("Please select at least one collection");
      return;
    }
    if (selectedCollections.length > 5) {
      toast.error("Maximum 5 collections per export");
      return;
    }

    try {
      setExporting(true);
      setExportProgress(10);

      const response = await fetch("/api/superadmin/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ format: exportFormat, collections: selectedCollections }),
      });

      setExportProgress(50);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Export failed");
      }

      setExportProgress(80);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fixzit-export-${new Date().toISOString().split("T")[0]}.${exportFormat === "csv" ? "zip" : "json"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportProgress(100);
      toast.success("Export completed successfully");

      setRecentExports(prev => [{
        id: Date.now().toString(),
        collections: selectedCollections,
        format: exportFormat,
        status: "completed",
        progress: 100,
        createdAt: new Date().toISOString(),
      }, ...prev.slice(0, 4)]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.import-export") || "Import / Export"}</h1>
          <p className="text-muted-foreground">Bulk data import and export operations</p>
        </div>
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="bg-muted border-input">
          <TabsTrigger value="export" className="data-[state=active]:bg-muted/80"><Download className="h-4 w-4 me-2" />Export</TabsTrigger>
          <TabsTrigger value="import" className="data-[state=active]:bg-muted/80"><Upload className="h-4 w-4 me-2" />Import</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-muted/80"><FileText className="h-4 w-4 me-2" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-card border-border">
                <CardHeader className="border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground">Select Collections</CardTitle>
                      <CardDescription className="text-muted-foreground">Choose up to 5 collections to export</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={selectAll} className="border-input" aria-label={selectedCollections.length === EXPORTABLE_COLLECTIONS.length ? t("common.deselectAll", "Deselect all collections") : t("common.selectAll", "Select all collections")} title={selectedCollections.length === EXPORTABLE_COLLECTIONS.length ? t("common.deselectAll", "Deselect all") : t("common.selectAll", "Select all")}>
                      {selectedCollections.length === EXPORTABLE_COLLECTIONS.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {EXPORTABLE_COLLECTIONS.map((collection) => {
                      const Icon = collection.icon;
                      return (
                        <div
                          key={collection.id}
                          className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${selectedCollections.includes(collection.id) ? "bg-blue-500/20 border border-blue-500/50" : "bg-muted border border-transparent hover:border-input"}`}
                          onClick={() => toggleCollection(collection.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={selectedCollections.includes(collection.id)} onCheckedChange={() => toggleCollection(collection.id)} />
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-foreground font-medium">{collection.name}</p>
                              <p className="text-muted-foreground text-sm">{collection.count.toLocaleString()} records</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="bg-card border-border">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-foreground">Export Options</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Format</Label>
                    <Select value={exportFormat} onValueChange={setExportFormat} placeholder="Select format" className="bg-muted border-input text-foreground">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-input">
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="csv">CSV (ZIP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground text-sm mb-1">Selected</p>
                    <p className="text-foreground font-medium">{selectedCollections.length} collection(s)</p>
                  </div>

                  {exporting && (
                    <div className="space-y-2">
                      <Progress value={exportProgress} className="h-2" />
                      <p className="text-muted-foreground text-sm text-center">{exportProgress}% complete</p>
                    </div>
                  )}

                  <Button onClick={handleExport} disabled={exporting || selectedCollections.length === 0} className="w-full bg-blue-600 hover:bg-blue-700" aria-label={exporting ? t("common.exporting", "Export in progress") : t("superadmin.importExport.exportData", "Export selected collections")} title={t("superadmin.importExport.exportData", "Export data")}>
                    {exporting ? <><RefreshCw className="h-4 w-4 me-2 animate-spin" />Exporting...</> : <><Download className="h-4 w-4 me-2" />Export Data</>}
                  </Button>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-200 text-xs flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      Exports are tenant-scoped. Sensitive fields (passwords, tokens) are excluded.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="import">
          <Card className="bg-card border-border">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-input rounded-lg">
                <Upload className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium text-foreground mb-2">Import Data</h3>
                <p className="text-muted-foreground text-center mb-4 max-w-md">Import functionality requires validation rules and dry-run preview. Contact support for bulk imports.</p>
                <Badge className="bg-yellow-500/20 text-yellow-400">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-foreground">Recent Exports</CardTitle>
              <CardDescription className="text-muted-foreground">Your export history (this session)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {recentExports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No exports yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentExports.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          {job.format === "csv" ? <FileSpreadsheet className="h-5 w-5 text-green-400" /> : <FileJson className="h-5 w-5 text-blue-400" />}
                        </div>
                        <div>
                          <p className="text-foreground font-medium">{job.collections.join(", ")}</p>
                          <p className="text-muted-foreground text-sm">{formatDate(job.createdAt)} · {job.format.toUpperCase()}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="h-3 w-3 me-1" />Completed</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
