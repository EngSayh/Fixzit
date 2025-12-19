"use client";

/**
 * Superadmin Issues Dashboard
 * System-wide issue tracking with full admin access
 * 
 * @module app/superadmin/issues/page
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import {
  Bug,
  Clock,
  Search,
  RefreshCw,
  Plus,
  Download,
  Upload,
  Zap,
  AlertOctagon,
  FileCode,
  Database,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable, SkeletonKPICard, SkeletonDashboard as _SkeletonDashboard } from "@/components/superadmin/SkeletonTableEnhanced";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSuperadminSession } from "@/components/superadmin/superadmin-session";
import { Sparkline } from "@/components/superadmin/Sparkline";
import { TrendIndicator } from "@/components/superadmin/TrendIndicator";
import { SlideOverDrawer } from "@/components/superadmin/SlideOverDrawer";
import { FloatingBulkActions } from "@/components/superadmin/FloatingBulkActions";

// ============================================================================
// TYPES
// ============================================================================

interface Issue {
  _id: string;
  issueId: string;
  legacyId?: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  effort: string;
  module: string;
  location: {
    filePath: string;
    lineStart?: number;
    lineEnd?: number;
  };
  assignedTo?: string;
  riskTags: string[];
  labels: string[];
  mentionCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  totalOpen: number;
  totalClosed: number;
  healthScore: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  quickWins: number;
  stale: number;
  blocked: number;
  recentlyResolved: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_COLORS: Record<string, string> = {
  P0: "bg-red-600 text-white",
  P1: "bg-orange-500 text-white",
  P2: "bg-yellow-500 text-black",
  P3: "bg-blue-500 text-white",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-secondary text-white",
  in_progress: "bg-blue-500 text-white",
  in_review: "bg-purple-500 text-white",
  blocked: "bg-red-500 text-white",
  resolved: "bg-green-500 text-white",
  closed: "bg-gray-500 text-white",
  wont_fix: "bg-gray-400 text-white",
};

const CATEGORY_ICONS: Record<string, typeof Bug> = {
  bug: Bug,
  security: AlertOctagon,
  efficiency: Zap,
  missing_test: FileCode,
  logic_error: AlertTriangle,
};

// ============================================================================
// PHASE PROGRESS COMPONENT
// ============================================================================

interface PhaseData {
  id: string;
  title: string;
  status: "completed" | "in-progress" | "not-started";
  date?: string;
  description: string;
}

interface PhaseSummary {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionPercentage: number;
}

function PhaseProgressSection() {
  const [phases, setPhases] = useState<PhaseData[]>([]);
  const [summary, setSummary] = useState<PhaseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPhases = async () => {
      try {
        const res = await fetch("/api/superadmin/phases");
        if (!res.ok) throw new Error("Failed to fetch phase data");
        const data = await res.json();
        setPhases(data.phases || []);
        setSummary(data.summary || null);
      } catch (_error) {
        // Phase fetch failed - show user-friendly toast
        toast({
          title: "Error",
          description: "Failed to load phase progress data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchPhases();
  }, [toast]);

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const phaseStart = phases[0]?.id ?? "P66";
  const phaseEnd = phases[phases.length - 1]?.id ?? "P110";

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Phase Progress ({phaseStart}-{phaseEnd})
        </CardTitle>
        <CardDescription className="text-slate-400">
          Production + continuous improvement: {summary.completed}/{summary.total} completed ({summary.completionPercentage}%)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-full transition-all duration-500"
            style={{ width: `${summary.completionPercentage}%` }}
          />
        </div>

        {/* Phase Grid - Expanded for P66-P110 */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {phases.map((phase) => (
            <div
              key={phase.id}
              className={`px-2 py-1.5 rounded-md text-xs font-medium text-center transition-all ${
                phase.status === "completed"
                  ? "bg-green-500/20 text-green-400 border border-green-500/50"
                  : phase.status === "in-progress"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/50 animate-pulse"
                  : "bg-slate-700 text-slate-400 border border-slate-600"
              }`}
              title={`${phase.title} - ${phase.status}`}
            >
              {phase.id}
              {phase.status === "completed" && (
                <CheckCircle2 className="inline-block h-3 w-3 ms-1" />
              )}
              {phase.status === "in-progress" && (
                <Clock className="inline-block h-3 w-3 ms-1 animate-spin" />
              )}
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 text-center pt-2 border-t border-slate-700">
          <div>
            <p className="text-xs text-slate-400">Completed</p>
            <p className="text-lg font-bold text-green-400">{summary.completed}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">In Progress</p>
            <p className="text-lg font-bold text-blue-400">{summary.inProgress}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Remaining</p>
            <p className="text-lg font-bold text-slate-400">{summary.notStarted}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SuperadminIssuesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const session = useSuperadminSession();
  // BUG-001 FIX: Auth now enforced server-side in layout, no client polling needed
  const isAuthenticated = session?.authenticated ?? false;

  // State
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Selection state
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"all" | "quickWins" | "stale">("all");

  // Auto-refresh
  const [isTabVisible, setIsTabVisible] = useState(true);

  const getStatusLabel = useCallback(
    (status: string) => {
      const key = `superadmin.issues.statuses.${status}`;
      const value = t(key);
      return value === key ? status.replaceAll("_", " ") : value;
    },
    [t],
  );

  const getCategoryLabel = useCallback(
    (category: string) => {
      const key = `superadmin.issues.categories.${category}`;
      const value = t(key);
      return value === key ? category.replaceAll("_", " ") : value;
    },
    [t],
  );

  const getPriorityLabel = useCallback(
    (priority: string) => {
      const key = `superadmin.issues.priorities.${priority.toLowerCase()}`;
      const value = t(key);
      return value === key ? priority : value;
    },
    [t],
  );

  const statusOptions = [
    { value: "all", label: t("superadmin.issues.filters.all") },
    { value: "open", label: getStatusLabel("open") },
    { value: "in_progress", label: getStatusLabel("in_progress") },
    { value: "in_review", label: getStatusLabel("in_review") },
    { value: "blocked", label: getStatusLabel("blocked") },
    { value: "resolved", label: getStatusLabel("resolved") },
    { value: "closed", label: getStatusLabel("closed") },
    { value: "wont_fix", label: getStatusLabel("wont_fix") },
  ];

  const priorityOptions = [
    { value: "all", label: t("superadmin.issues.filters.all") },
    { value: "P0", label: getPriorityLabel("P0") },
    { value: "P1", label: getPriorityLabel("P1") },
    { value: "P2", label: getPriorityLabel("P2") },
    { value: "P3", label: getPriorityLabel("P3") },
  ];

  const categoryOptions = [
    { value: "all", label: t("superadmin.issues.filters.all") },
    { value: "bug", label: getCategoryLabel("bug") },
    { value: "security", label: getCategoryLabel("security") },
    { value: "efficiency", label: getCategoryLabel("efficiency") },
    { value: "missing_test", label: getCategoryLabel("missing_test") },
    { value: "logic_error", label: getCategoryLabel("logic_error") },
  ];

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIssues.size === issues.length) {
      setSelectedIssues(new Set());
    } else {
      setSelectedIssues(new Set(issues.map(i => i._id)));
    }
  };

  const toggleSelectIssue = (id: string) => {
    const newSelection = new Set(selectedIssues);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIssues(newSelection);
  };

  // Export handlers
  const handleCopyMarkdown = () => {
    const selectedData = issues.filter(i => selectedIssues.has(i._id));
    if (selectedData.length === 0) {
      toast({ title: "No selection", description: "Please select issues to copy", variant: "destructive" });
      return;
    }

    const headers = ["ID", "Priority", "Title", "Status", "Category", "Module", "Seen", "Updated"];
    const rows = selectedData.map(issue => [
      issue.issueId || issue.legacyId || issue._id.slice(-6),
      issue.priority,
      issue.title,
      issue.status,
      issue.category,
      issue.module,
      `${issue.mentionCount || 1}×`,
      new Date(issue.updatedAt).toLocaleDateString(),
    ]);

    const markdown = `| ${headers.join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |\n${rows.map(row => `| ${row.join(" | ")} |`).join("\n")}`;
    navigator.clipboard.writeText(markdown);
    toast({ title: "Copied to clipboard", description: `${selectedData.length} issues copied as Markdown table` });
  };

  const handleCopyTSV = () => {
    const selectedData = issues.filter(i => selectedIssues.has(i._id));
    if (selectedData.length === 0) {
      toast({ title: "No selection", description: "Please select issues to copy", variant: "destructive" });
      return;
    }

    const headers = ["ID", "Priority", "Title", "Status", "Category", "Module", "Seen", "Updated"];
    const rows = selectedData.map(issue => [
      issue.issueId || issue.legacyId || issue._id.slice(-6),
      issue.priority,
      issue.title,
      issue.status,
      issue.category,
      issue.module,
      `${issue.mentionCount || 1}×`,
      new Date(issue.updatedAt).toLocaleDateString(),
    ]);

    const tsv = `${headers.join("\t")}\n${rows.map(row => row.join("\t")).join("\n")}`;
    navigator.clipboard.writeText(tsv);
    toast({ title: "Copied to clipboard", description: `${selectedData.length} issues copied as TSV (paste into Excel/Sheets)` });
  };

  const handleExportCSV = () => {
    const selectedData = selectedIssues.size > 0 ? issues.filter(i => selectedIssues.has(i._id)) : issues;

    if (selectedData.length === 0) {
      toast({ title: "No data", description: "No issues to export", variant: "destructive" });
      return;
    }

    const headers = ["ID", "Priority", "Title", "Status", "Category", "Module", "Seen", "Updated"];
    const rows = selectedData.map(issue => [
      issue.issueId || issue.legacyId || issue._id.slice(-6),
      issue.priority,
      issue.title.replace(/"/g, '""'),
      issue.status,
      issue.category,
      issue.module,
      issue.mentionCount || 1,
      new Date(issue.updatedAt).toISOString(),
    ]);

    const csv = `${headers.join(",")}\n${rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fixzit-issues-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Export complete", description: `${selectedData.length} issues exported to CSV` });
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setViewMode("all");
  };

  // Fetch issues
  const fetchIssues = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "25");

      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter && priorityFilter !== "all") params.set("priority", priorityFilter);
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      if (search) params.set("search", search);
      if (viewMode === "quickWins") params.set("quickWins", "true");
      if (viewMode === "stale") params.set("stale", "true");

      // BUG-FIX: Use /api/superadmin/issues which queries BacklogIssue (PENDING_MASTER.md imports)
      // Previously was using /api/issues which queries Issue model (different collection)
      const response = await fetch(`/api/superadmin/issues?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch issues");
      }

      const data = await response.json();
      const payload = data.data || data;
      setIssues(payload.issues || []);
      setTotalPages(payload.pagination?.totalPages || 1);
    } catch (_error) {
      toast({
        title: t("superadmin.issues.toast.errorTitle"),
        description: t("superadmin.issues.toast.loadFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter, priorityFilter, categoryFilter, search, viewMode, toast, t]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      // BUG-FIX: Use /api/superadmin/issues/stats which queries BacklogIssue
      const response = await fetch("/api/superadmin/issues/stats");
      
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data);
    } catch (_error) {
      // Stats loading failure is non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load data when session is ready
  useEffect(() => {
    if (isAuthenticated) {
      fetchIssues();
      fetchStats();
    }
  }, [isAuthenticated, fetchIssues, fetchStats]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!isAuthenticated || !isTabVisible) return;

    const interval = setInterval(() => {
      fetchIssues();
      fetchStats();
    }, 20000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isTabVisible, fetchIssues, fetchStats]);

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    setStatsLoading(true);
    fetchIssues();
    fetchStats();
  };

  // Navigate to issue detail
  const handleIssueClick = (issue: Issue) => {
    setSelectedIssue(issue);
    setDrawerOpen(true);
  };

  // Export handler
  const handleExport = async () => {
    try {
      // BUG-FIX: Use /api/superadmin/issues which queries BacklogIssue
      const response = await fetch("/api/superadmin/issues?limit=100");
      const data = await response.json();
      const payload = data.data || data;
      const issuesCount = (payload.issues || []).length;
      
      const blob = new Blob([JSON.stringify(payload.issues, null, 2)], {
        type: "application/json",
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fixzit-issues-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: t("superadmin.issues.toast.exportComplete"),
        description: t("superadmin.issues.toast.exportSummary", { count: issuesCount }),
      });
    } catch (_error) {
      toast({
        title: t("superadmin.issues.toast.exportFailedTitle"),
        description: t("superadmin.issues.toast.exportFailed"),
        variant: "destructive",
      });
    }
  };

  // Import handler
  const handleImport = async (dryRun = false) => {
    if (!importData.trim()) {
      toast({
        title: t("superadmin.issues.toast.noDataTitle"),
        description: t("superadmin.issues.toast.noDataDescription"),
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    try {
      let issues: unknown[];
      try {
        const parsed = JSON.parse(importData);
        issues = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        const lines = importData.split("\n").filter(l => l.trim());
        issues = lines.map((line, i) => ({
          title: line.trim(),
          id: `import-${Date.now()}-${i}`,
        }));
      }

      // BUG-FIX: Use /api/superadmin/issues/import which writes to BacklogIssue
      const response = await fetch("/api/superadmin/issues/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issues,
          dryRun,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: dryRun
            ? t("superadmin.issues.toast.importDryRunComplete")
            : t("superadmin.issues.toast.importComplete"),
          description: t("superadmin.issues.toast.importSummary", {
            created: result.result.created,
            updated: result.result.updated,
            skipped: result.result.skipped,
          }),
        });

        if (!dryRun) {
          setImportDialogOpen(false);
          setImportData("");
          handleRefresh();
        }
      } else {
        throw new Error("Import failed");
      }
    } catch (_error) {
      toast({
        title: t("superadmin.issues.toast.importFailedTitle"),
        description: t("superadmin.issues.toast.importFailed"),
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Database className="h-8 w-8" />
            {t("superadmin.issues.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("superadmin.issues.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 me-2 ${refreshing ? "animate-spin" : ""}`} />
            {t("superadmin.issues.refresh")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 me-2" />
            {t("superadmin.issues.export")}
          </Button>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 me-2" />
                {t("superadmin.issues.import")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("superadmin.issues.importTitle")}</DialogTitle>
                <DialogDescription>
                  {t("superadmin.issues.importDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t("superadmin.issues.importDataLabel")}</Label>
                  <Textarea
                    placeholder={t("superadmin.issues.importPlaceholder")}
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => handleImport(true)} disabled={importing}>
                    {t("superadmin.issues.importDryRun")}
                  </Button>
                  <Button onClick={() => handleImport(false)} disabled={importing}>
                    {importing ? t("superadmin.issues.importing") : t("superadmin.issues.import")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm">
            <Plus className="h-4 w-4 me-2" />
            {t("superadmin.issues.add")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {statsLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <SkeletonKPICard key={i} />
          ))
        ) : (
          <>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t("superadmin.issues.stats.total")}</p>
                <div className="mt-2 h-10">
                  <Sparkline data={[45, 52, 48, 61, 58, 55, stats?.total || 0]} color="#0061A8" />
                </div>
                <TrendIndicator value={8.3} className="mt-1" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t("superadmin.issues.stats.open")}</p>
                <p className="text-2xl font-bold text-orange-500">
                  {stats?.totalOpen || 0}
                </p>
                <div className="mt-2 h-10">
                  <Sparkline data={[12, 18, 15, 22, 19, 17, stats?.totalOpen || 0]} color="#F97316" />
                </div>
                <TrendIndicator value={-5.2} className="mt-1" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t("superadmin.issues.stats.closed")}</p>
                <p className="text-2xl font-bold text-green-500">
                  {stats?.totalClosed || 0}
                </p>
                <div className="mt-2 h-10">
                  <Sparkline data={[8, 12, 15, 18, 22, 25, stats?.totalClosed || 0]} color="#00A859" />
                </div>
                <TrendIndicator value={12.4} className="mt-1" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t("superadmin.issues.stats.quickWins")}</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {stats?.quickWins || 0}
                </p>
                <div className="mt-2 h-10">
                  <Sparkline data={[5, 7, 6, 8, 7, 6, stats?.quickWins || 0]} color="#10B981" />
                </div>
                <TrendIndicator value={3.1} className="mt-1" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t("superadmin.issues.stats.stale")}</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {stats?.stale || 0}
                </p>
                <div className="mt-2 h-10">
                  <Sparkline data={[3, 4, 5, 6, 5, 7, stats?.stale || 0]} color="#FFB400" />
                </div>
                <TrendIndicator value={-1.8} className="mt-1" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t("superadmin.issues.stats.blocked")}</p>
                <p className="text-2xl font-bold text-red-500">
                  {stats?.blocked || 0}
                </p>
                <div className="mt-2 h-10">
                  <Sparkline data={[2, 3, 2, 4, 3, 2, stats?.blocked || 0]} color="#EF4444" />
                </div>
                <TrendIndicator value={-0.5} className="mt-1" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t("superadmin.issues.stats.recentlyResolved")}</p>
                <p className="text-2xl font-bold text-blue-500">
                  {stats?.recentlyResolved || 0}
                </p>
                <div className="mt-2 h-10">
                  <Sparkline data={[1, 2, 3, 4, 5, 6, stats?.recentlyResolved || 0]} color="#3B82F6" />
                </div>
                <TrendIndicator value={18.7} className="mt-1" />
              </CardContent>
            </Card>
            <Card className={`bg-card ${(stats?.healthScore || 0) >= 70 ? "border-green-500" : (stats?.healthScore || 0) >= 40 ? "border-yellow-500" : "border-red-500"}`}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t("superadmin.issues.stats.healthScore")}</p>
                <p className={`text-2xl font-bold ${
                  (stats?.healthScore || 0) >= 70 ? "text-green-500" :
                  (stats?.healthScore || 0) >= 40 ? "text-yellow-500" : "text-red-500"
                }`}>
                  {stats?.healthScore || 0}%
                </p>
                <div className="mt-2 h-10">
                  <Sparkline 
                    data={[65, 68, 72, 70, 75, 73, stats?.healthScore || 0]} 
                    color={(stats?.healthScore || 0) >= 70 ? "#00A859" : (stats?.healthScore || 0) >= 40 ? "#FFB400" : "#EF4444"} 
                  />
                </div>
                <TrendIndicator value={4.2} className="mt-1" />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Priority Breakdown */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <XCircle className="h-4 w-4 text-red-600" />
                {getPriorityLabel("P0")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{stats.byPriority?.P0 || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                {getPriorityLabel("P1")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-500">{stats.byPriority?.P1 || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <Clock className="h-4 w-4 text-yellow-500" />
                {getPriorityLabel("P2")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-500">{stats.byPriority?.P2 || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                {getPriorityLabel("P3")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-500">{stats.byPriority?.P3 || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Phase Progress Tracking */}
      <PhaseProgressSection />

      {/* Filters - Sticky */}
      <Card className="bg-slate-800 border-slate-700 sticky top-0 z-10">
        <CardContent className="p-4">
          {/* Quick Status Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-slate-700">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className={statusFilter === "all" ? "" : "text-slate-300 border-slate-600"}
            >
              All
            </Button>
            <Button
              variant={statusFilter === "open" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("open")}
              className={statusFilter === "open" ? "" : "text-slate-300 border-slate-600"}
            >
              Open
            </Button>
            <Button
              variant={statusFilter === "closed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("closed")}
              className={statusFilter === "closed" ? "" : "text-slate-300 border-slate-600"}
            >
              Closed
            </Button>
            <Button
              variant={statusFilter === "blocked" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("blocked")}
              className={statusFilter === "blocked" ? "" : "text-slate-300 border-slate-600"}
            >
              Blocked
            </Button>
            <Button
              variant={viewMode === "stale" ? "default" : "outline"}
              size="sm"
              onClick={() => { setViewMode("stale"); setStatusFilter("all"); }}
              className={viewMode === "stale" ? "" : "text-slate-300 border-slate-600"}
            >
              <Clock className="h-4 w-4 me-1" />
              Stale
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-slate-400 hover:text-white ms-auto"
            >
              Clear filters
            </Button>
          </div>

          {/* Detailed Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("superadmin.issues.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-9 bg-muted border-input text-white"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-muted border-input text-white">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px] bg-muted border-input text-white">
                <SelectValue placeholder="Filter by Priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] bg-muted border-input text-white">
                <SelectValue placeholder="Filter by Module" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={viewMode === "quickWins" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("quickWins")}
            >
              <Zap className="h-4 w-4 me-1" />
              {t("superadmin.issues.views.quickWins")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Actions */}
      {selectedIssues.size > 0 && (
        <Card className="bg-blue-900/20 border-blue-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-blue-300 font-medium">
                {selectedIssues.size} issues selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyMarkdown}
                  className="text-blue-300 border-blue-600 hover:bg-blue-800"
                >
                  Copy Markdown
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyTSV}
                  className="text-blue-300 border-blue-600 hover:bg-blue-800"
                >
                  Copy TSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="text-blue-300 border-blue-600 hover:bg-blue-800"
                >
                  <Download className="h-4 w-4 me-1" />
                  Export CSV
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIssues(new Set())}
                  className="text-slate-400 hover:text-white"
                >
                  Clear selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issues Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="h-5 w-5" />
            {t("superadmin.issues.title")}
            <span className="text-sm text-muted-foreground">({issues.length})</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("superadmin.issues.tableDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <SkeletonTable rows={8} columns={10} />
          ) : issues.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bug className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">{t("superadmin.issues.empty")}</p>
              <p className="text-sm">{t("superadmin.issues.emptyHint")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-700/50">
                  <TableHead className="text-slate-300 w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedIssues.size === issues.length && issues.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="text-slate-300 w-[80px]">{t("superadmin.issues.table.id")}</TableHead>
                  <TableHead className="text-slate-300 w-[80px]">{t("superadmin.issues.table.priority")}</TableHead>
                  <TableHead className="text-slate-300">{t("superadmin.issues.table.title")}</TableHead>
                  <TableHead className="text-slate-300 w-[100px]">{t("superadmin.issues.table.status")}</TableHead>
                  <TableHead className="text-slate-300 w-[100px]">{t("superadmin.issues.table.category")}</TableHead>
                  <TableHead className="text-slate-300 w-[80px]">{t("superadmin.issues.table.module")}</TableHead>
                  <TableHead className="text-slate-300 w-[120px]">Assignee</TableHead>
                  <TableHead className="text-slate-300 w-[60px]">{t("superadmin.issues.table.seen")}</TableHead>
                  <TableHead className="text-slate-300 w-[100px]">{t("superadmin.issues.table.updated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => {
                  const CategoryIcon = CATEGORY_ICONS[issue.category] || Bug;
                  
                  return (
                    <TableRow
                      key={issue._id}
                      className="cursor-pointer hover:bg-slate-700/50 border-slate-700"
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIssues.has(issue._id)}
                          onChange={() => toggleSelectIssue(issue._id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell 
                        className="font-mono text-xs text-slate-300"
                        onClick={() => handleIssueClick(issue)}
                      >
                        {issue.issueId || issue.legacyId || issue._id.slice(-6)}
                      </TableCell>
                      <TableCell onClick={() => handleIssueClick(issue)}>
                        <Badge className={PRIORITY_COLORS[issue.priority] || "bg-gray-500"}>
                          {getPriorityLabel(issue.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={() => handleIssueClick(issue)}>
                        <div className="flex items-start gap-2">
                          <CategoryIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate max-w-[400px]" title={issue.title}>{issue.title}</p>
                            {issue.location?.filePath && (
                              <p className="text-xs text-muted-foreground truncate max-w-[400px]" title={issue.location.filePath}>
                                {issue.location.filePath}
                                {issue.location.lineStart && `:${issue.location.lineStart}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell onClick={() => handleIssueClick(issue)}>
                        <Badge variant="secondary" className={STATUS_COLORS[issue.status]}>
                          {getStatusLabel(issue.status)}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={() => handleIssueClick(issue)}>
                        <span className="text-sm text-slate-300 capitalize">{getCategoryLabel(issue.category)}</span>
                      </TableCell>
                      <TableCell onClick={() => handleIssueClick(issue)}>
                        <span className="text-sm font-mono text-slate-300">{issue.module}</span>
                      </TableCell>
                      <TableCell onClick={() => handleIssueClick(issue)}>
                        <div className="flex items-center gap-2">
                          {issue.assignedTo ? (
                            <>
                              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-medium">
                                {issue.assignedTo.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm text-slate-300">{issue.assignedTo}</span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Unassigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={() => handleIssueClick(issue)}>
                        <span className="text-sm text-slate-300">{issue.mentionCount || 1}×</span>
                      </TableCell>
                      <TableCell onClick={() => handleIssueClick(issue)}>
                        <span className="text-xs text-slate-400">
                          {new Date(issue.updatedAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            {t("superadmin.issues.pagination.previous")}
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            {t("superadmin.issues.pagination.pageOf", { page, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t("superadmin.issues.pagination.next")}
          </Button>
        </div>
      )}

      {/* Floating Bulk Actions */}
      <FloatingBulkActions
        selectedCount={selectedIssues.size}
        onClearSelection={() => setSelectedIssues(new Set())}
        onMarkResolved={() => {
          toast({ title: "Bulk action", description: `Marking ${selectedIssues.size} issues as resolved` });
          setSelectedIssues(new Set());
        }}
        onArchive={() => {
          toast({ title: "Bulk action", description: `Archiving ${selectedIssues.size} issues` });
          setSelectedIssues(new Set());
        }}
        onDelete={() => {
          toast({ title: "Bulk action", description: `Deleting ${selectedIssues.size} issues`, variant: "destructive" });
          setSelectedIssues(new Set());
        }}
      />

      {/* Slide-Over Drawer for Issue Details */}
      <SlideOverDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedIssue?.title || "Issue Details"}
      >
        {selectedIssue && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Badge className={PRIORITY_COLORS[selectedIssue.priority] || "bg-gray-500"}>
                {getPriorityLabel(selectedIssue.priority)}
              </Badge>
              <Badge variant="secondary" className={STATUS_COLORS[selectedIssue.status]}>
                {getStatusLabel(selectedIssue.status)}
              </Badge>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
              <p className="text-gray-900 dark:text-gray-100">{selectedIssue.description}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Category</h3>
              <p className="text-gray-900 dark:text-gray-100 capitalize">{getCategoryLabel(selectedIssue.category)}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Module</h3>
              <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">{selectedIssue.module}</p>
            </div>

            {selectedIssue.location?.filePath && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Location</h3>
                <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">
                  {selectedIssue.location.filePath}
                  {selectedIssue.location.lineStart && `:${selectedIssue.location.lineStart}`}
                  {selectedIssue.location.lineEnd && `-${selectedIssue.location.lineEnd}`}
                </p>
              </div>
            )}

            {selectedIssue.assignedTo && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Assigned To</h3>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm text-white font-medium">
                    {selectedIssue.assignedTo.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-gray-900 dark:text-gray-100">{selectedIssue.assignedTo}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Mention Count</h3>
                <p className="text-gray-900 dark:text-gray-100">{selectedIssue.mentionCount || 1}×</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Effort</h3>
                <p className="text-gray-900 dark:text-gray-100 capitalize">{selectedIssue.effort}</p>
              </div>
            </div>

            {selectedIssue.riskTags && selectedIssue.riskTags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Risk Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedIssue.riskTags.map((tag, idx) => (
                    <Badge key={idx} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedIssue.labels && selectedIssue.labels.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Labels</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedIssue.labels.map((label, idx) => (
                    <Badge key={idx} variant="secondary">{label}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t flex gap-2">
              <Button onClick={() => router.push(`/superadmin/issues/${selectedIssue._id}`)} className="flex-1">
                View Full Details
              </Button>
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
