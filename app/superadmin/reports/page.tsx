"use client";

/**
 * Superadmin Reports
 * Real reports using /api/fm/reports and aggregation APIs
 * 
 * @module app/superadmin/reports/page
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  BarChart3, RefreshCw, Download, FileText, Calendar,
  Clock, CheckCircle, XCircle,
} from "@/components/ui/icons";

interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  lastRun?: string;
  status?: string;
}

interface GeneratedReport {
  _id: string;
  name: string;
  type: string;
  status: string;
  generatedAt: string;
  downloadUrl?: string;
  rowCount?: number;
}

const REPORT_DEFINITIONS: ReportDefinition[] = [
  { id: "tenant-activity", name: "Tenant Activity Report", description: "Usage metrics per tenant", category: "Usage" },
  { id: "user-engagement", name: "User Engagement Report", description: "Login frequency and feature adoption", category: "Usage" },
  { id: "revenue-summary", name: "Revenue Summary", description: "Monthly recurring revenue breakdown", category: "Finance" },
  { id: "billing-status", name: "Billing Status Report", description: "Payment status and overdue accounts", category: "Finance" },
  { id: "work-order-summary", name: "Work Order Summary", description: "Work orders by status and priority", category: "Operations" },
  { id: "vendor-performance", name: "Vendor Performance", description: "Vendor ratings and completion rates", category: "Operations" },
  { id: "audit-summary", name: "Audit Summary", description: "Security events and compliance status", category: "Compliance" },
  { id: "data-export", name: "Full Data Export", description: "Complete data export for backup/migration", category: "Admin" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Usage: "bg-blue-500/20 text-blue-400",
  Finance: "bg-green-500/20 text-green-400",
  Operations: "bg-purple-500/20 text-purple-400",
  Compliance: "bg-yellow-500/20 text-yellow-400",
  Admin: "bg-muted text-muted-foreground",
};

export default function SuperadminReportsPage() {
  const { t } = useI18n();
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/superadmin/reports", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch {
      // Reports may not exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleGenerate = async (reportId: string) => {
    try {
      setGenerating(reportId);
      const reportDef = REPORT_DEFINITIONS.find(r => r.id === reportId);
      const response = await fetch("/api/superadmin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          title: reportDef?.name || reportId,
          reportType: reportId,
          dateRange: "month",
          format: "csv",
        }),
      });
      if (!response.ok) throw new Error("Failed to generate report");
      toast.success("Report generation started");
      fetchReports();
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setGenerating(null);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const response = await fetch(`/api/superadmin/export?format=${format}`, { credentials: "include" });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  const filteredDefinitions = REPORT_DEFINITIONS.filter(
    (r) => categoryFilter === "all" || r.category === categoryFilter
  );

  const categories = [...new Set(REPORT_DEFINITIONS.map((r) => r.category))];

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.reports")}</h1>
          <p className="text-muted-foreground">Generate and view cross-tenant reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} className="border-input text-muted-foreground" aria-label={t("superadmin.reports.exportCsv", "Export all data as CSV")} title={t("superadmin.reports.exportCsv", "Export all data as CSV")}>
            <Download className="h-4 w-4 me-2" />Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading} className="border-input text-muted-foreground" aria-label={t("common.refresh", "Refresh reports")} title={t("common.refresh", "Refresh reports")}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Filter */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter} placeholder="Category">
            <SelectTrigger className="w-[160px] bg-muted border-input text-foreground">
              {categoryFilter === "all" ? "All Categories" : categoryFilter}
            </SelectTrigger>
            <SelectContent className="bg-muted border-input">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Available Reports */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-foreground"><BarChart3 className="h-5 w-5" />Available Reports</CardTitle>
          <CardDescription className="text-muted-foreground">Generate reports on demand</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Report</TableHead>
                <TableHead className="text-muted-foreground">Category</TableHead>
                <TableHead className="text-muted-foreground">Description</TableHead>
                <TableHead className="text-muted-foreground w-[120px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDefinitions.map((report) => (
                <TableRow key={report.id} className="border-border hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">{report.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={CATEGORY_COLORS[report.category]}>{report.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{report.description}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerate(report.id)}
                      disabled={generating === report.id}
                      className="border-input"
                      aria-label={t("superadmin.reports.generate", `Generate ${report.name}`)}
                      title={t("superadmin.reports.generate", `Generate ${report.name}`)}
                    >
                      {generating === report.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Generate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Generated Reports History */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-foreground"><Clock className="h-5 w-5" />Recent Reports</CardTitle>
          <CardDescription className="text-muted-foreground">Previously generated reports</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reports generated yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Report</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Generated</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Rows</TableHead>
                  <TableHead className="text-muted-foreground w-[100px]">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report._id} className="border-border hover:bg-muted/50">
                    <TableCell className="text-foreground font-medium">{report.name}</TableCell>
                    <TableCell className="text-muted-foreground">{report.type}</TableCell>
                    <TableCell className="text-muted-foreground"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{formatDate(report.generatedAt)}</div></TableCell>
                    <TableCell>
                      {report.status === "completed" ? (
                        <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="h-3 w-3 me-1" />Completed</Badge>
                      ) : report.status === "failed" ? (
                        <Badge className="bg-red-500/20 text-red-400"><XCircle className="h-3 w-3 me-1" />Failed</Badge>
                      ) : (
                        <Badge className="bg-yellow-500/20 text-yellow-400"><RefreshCw className="h-3 w-3 me-1 animate-spin" />Processing</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{report.rowCount?.toLocaleString() || "—"}</TableCell>
                    <TableCell>
                      {report.downloadUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={report.downloadUrl} download><Download className="h-4 w-4" /></a>
                        </Button>
                      )}
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
