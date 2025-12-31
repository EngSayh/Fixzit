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
import { logger } from "@/lib/logger";
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
} from "@/components/ui/icons";
import { useActionFeedback } from "@/components/ui/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
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
import { TrackerSourceSwitch } from "@/components/superadmin/TrackerSourceSwitch";

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
// COMPONENT
// ============================================================================

export default function SuperadminIssuesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const session = useSuperadminSession();
  // BUG-001 FIX: Auth now enforced server-side in layout, no client polling needed
  const isAuthenticated = session?.authenticated ?? false;

  // Inline confirmation feedback hooks
  const copyMdFeedback = useActionFeedback();
  const copyTsvFeedback = useActionFeedback();
  const exportCsvFeedback = useActionFeedback();
  const exportJsonFeedback = useActionFeedback();
  const importFeedback = useActionFeedback();

  // State
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
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

  // Computed: Check if any filter is active
  const hasActiveFilter = search !== "" || 
    statusFilter !== "all" || 
    priorityFilter !== "all" || 
    categoryFilter !== "all" || 
    viewMode !== "all";

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
  const [pageSize, setPageSize] = useState(25);
  const [showingAll, setShowingAll] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

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
  const handleCopyMarkdown = async () => {
    const selectedData = issues.filter(i => selectedIssues.has(i._id));
    if (selectedData.length === 0) {
      toast({ title: t("superadmin.issues.toast.noSelectionTitle", "No selection"), description: t("superadmin.issues.toast.noSelectionDescription", "Please select issues to copy"), variant: "destructive" });
      return;
    }

    // Generate a fix command prompt for each issue
    const issuePrompts = selectedData.map(issue => {
      const issueId = issue.issueId || issue.legacyId || issue._id.slice(-6);
      const locationInfo = issue.location?.filePath 
        ? `File: ${issue.location.filePath}${issue.location.lineStart ? `:${issue.location.lineStart}` : ""}${issue.location.lineEnd ? `-${issue.location.lineEnd}` : ""}`
        : "";
      
      return `## ${issueId} [${issue.priority}] - ${issue.title}

**Category:** ${issue.category} | **Status:** ${issue.status} | **Effort:** ${issue.effort || "N/A"}
**Module:** ${issue.module}
${locationInfo ? `**Location:** ${locationInfo}` : ""}
${issue.riskTags?.length ? `**Risk Tags:** ${issue.riskTags.join(", ")}` : ""}

**Description:**
${issue.description || "No description provided."}

---`;
    }).join("\n\n");

    const fixCommand = `# Fix Request for ${selectedData.length} Issue${selectedData.length > 1 ? "s" : ""}

${issuePrompts}

## Instructions

Please fix the above issue${selectedData.length > 1 ? "s" : ""} following these guidelines:
1. Read the issue description and understand the problem
2. Locate the file(s) mentioned in the location field
3. Implement the fix following project conventions
4. Run \`pnpm typecheck\` and \`pnpm lint\` to verify
5. Update the issue status to "resolved" when complete

Agent Token: [AGENT-001-A]`;

    try {
      await navigator.clipboard.writeText(fixCommand);
      copyMdFeedback.showSuccess(t("common.copied", "Copied"), "copy");
    } catch (err) {
      logger.error("Failed to copy markdown to clipboard", { error: err });
      copyMdFeedback.showError(t("common.failed", "Failed"));
    }
  };

  const handleCopyTSV = async () => {
    const selectedData = issues.filter(i => selectedIssues.has(i._id));
    if (selectedData.length === 0) {
      toast({ title: t("superadmin.issues.toast.noSelectionTitle", "No selection"), description: t("superadmin.issues.toast.noSelectionDescription", "Please select issues to copy"), variant: "destructive" });
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
    try {
      await navigator.clipboard.writeText(tsv);
      copyTsvFeedback.showSuccess(t("common.copied", "Copied"), "copy");
    } catch (err) {
      logger.error("Failed to copy TSV to clipboard", { error: err });
      copyTsvFeedback.showError(t("common.failed", "Failed"));
    }
  };

  const handleExportCSV = () => {
    const selectedData = selectedIssues.size > 0 ? issues.filter(i => selectedIssues.has(i._id)) : issues;

    if (selectedData.length === 0) {
      toast({ title: t("superadmin.issues.toast.noDataTitle", "No data"), description: t("superadmin.issues.toast.noDataDescription", "No issues to export"), variant: "destructive" });
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

    exportCsvFeedback.showSuccess(t("common.exported", "Exported"), "save");
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
      params.set("limit", pageSize.toString());

      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter && priorityFilter !== "all") params.set("priority", priorityFilter);
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      if (search) params.set("search", search);
      if (viewMode === "quickWins") params.set("quickWins", "true");
      if (viewMode === "stale") params.set("stale", "true");

      const response = await fetch(`/api/issues?${params.toString()}`);
      
      if (!response.ok) {
        // Check for specific error types
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || errorData?.message || "Failed to fetch issues";
        
        // Detect database connection issues
        if (response.status === 500 && (errorMessage.includes("database") || errorMessage.includes("MongoDB") || errorMessage.includes("connection"))) {
          setConnectionError(
            t(
              "superadmin.issues.connection.dbFailed",
              "Database connection failed. Please check your MongoDB configuration.",
            ),
          );
        } else if (response.status >= 500) {
          setConnectionError(
            t("superadmin.issues.connection.serverError", { error: errorMessage }),
          );
        }
        throw new Error(errorMessage);
      }

      // Clear any previous connection error on success
      setConnectionError(null);
      
      const data = await response.json();
      const payload = data.data || data;
      setIssues(payload.issues || []);
      setTotalPages(payload.pagination?.totalPages || 1);
      setTotalItems(payload.pagination?.total || payload.issues?.length || 0);
    } catch (error) {
      // If we don't already have a connection error set, show generic error
      if (!connectionError) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        // Check for network/fetch errors that indicate connection issues
        if (errorMsg.includes("fetch") || errorMsg.includes("network") || errorMsg.includes("Failed to fetch")) {
          setConnectionError(
            t(
              "superadmin.issues.connection.fetchFailed",
              "Unable to connect to the server. Please check if the API is running.",
            ),
          );
        }
      }
      toast({
        title: t("superadmin.issues.toast.errorTitle"),
        description: t("superadmin.issues.toast.loadFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, statusFilter, priorityFilter, categoryFilter, search, viewMode, toast, t, connectionError]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/issues/stats");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      // Stats loading failure is non-critical, but must be observable
      const isNetworkError = error instanceof TypeError && (error.message === "Failed to fetch" || error.message.includes("NetworkError"));
      // eslint-disable-next-line no-console -- surface non-critical stats errors
      console.error("[superadmin:issues] Failed to fetch stats", {
        type: isNetworkError ? "NETWORK_ERROR" : "API_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        hint: isNetworkError ? "Check if dev server is running and MongoDB is connected" : undefined,
      });
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
      const response = await fetch("/api/issues?limit=5000");
      const data = await response.json();
      const payload = data.data || data;
      
      const blob = new Blob([JSON.stringify(payload.issues, null, 2)], {
        type: "application/json",
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fixzit-issues-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      exportJsonFeedback.showSuccess("Exported", "save");
    } catch {
      exportJsonFeedback.showError("Failed");
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

      const response = await fetch("/api/issues/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issues,
          dryRun,
        }),
      });

      const result = await response.json();

      if (result.success) {
        importFeedback.showSuccess(dryRun ? "Validated" : "Imported", "add");

        if (!dryRun) {
          setImportDialogOpen(false);
          setImportData("");
          handleRefresh();
        }
      } else {
        throw new Error("Import failed");
      }
    } catch {
      importFeedback.showError("Failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Source Switch */}
      <TrackerSourceSwitch activeSource="system-issues" />

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
          <div className="inline-flex items-center">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 me-2" />
              {t("superadmin.issues.export")}
            </Button>
            <exportJsonFeedback.FeedbackComponent className="ms-2" />
          </div>
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
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => handleImport(true)} disabled={importing}>
                    {t("superadmin.issues.importDryRun")}
                  </Button>
                  <Button onClick={() => handleImport(false)} disabled={importing}>
                    {importing ? t("superadmin.issues.importing") : t("superadmin.issues.import")}
                  </Button>
                  <importFeedback.FeedbackComponent className="ms-2" />
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
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2 bg-muted" />
                <Skeleton className="h-8 w-12 bg-muted" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className={`bg-card border-border ${hasActiveFilter ? 'ring-1 ring-primary/50' : ''}`}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilter ? t("superadmin.issues.stats.filtered", "Filtered") : t("superadmin.issues.stats.total")}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {hasActiveFilter ? totalItems : (stats?.total || 0)}
                </p>
                {!hasActiveFilter && (
                  <div className="mt-2 h-10">
                    <Sparkline data={[45, 52, 48, 61, 58, 55, stats?.total || 0]} color="var(--color-sparkline-blue, #0061A8)" />
                  </div>
                )}
                {!hasActiveFilter && <TrendIndicator value={8.3} className="mt-1" />}
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t("superadmin.issues.stats.open")}</p>
                <p className="text-2xl font-bold text-orange-500">
                  {stats?.totalOpen || 0}
                </p>
                <div className="mt-2 h-10">
                  <Sparkline data={[12, 18, 15, 22, 19, 17, stats?.totalOpen || 0]} color="var(--color-sparkline-orange, #F97316)" />
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
                  <Sparkline data={[8, 12, 15, 18, 22, 25, stats?.totalClosed || 0]} color="var(--color-success, #00A859)" />
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
                  <Sparkline data={[5, 7, 6, 8, 7, 6, stats?.quickWins || 0]} color="var(--color-sparkline-green, #10B981)" />
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
                  <Sparkline data={[3, 4, 5, 6, 5, 7, stats?.stale || 0]} color="var(--color-warning, #FFB400)" />
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
                  <Sparkline data={[2, 3, 2, 4, 3, 2, stats?.blocked || 0]} color="var(--color-danger, #EF4444)" />
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
                  <Sparkline data={[1, 2, 3, 4, 5, 6, stats?.recentlyResolved || 0]} color="var(--color-sparkline-sky, #3B82F6)" />
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
                    color={(stats?.healthScore || 0) >= 70 ? "var(--color-success, #00A859)" : (stats?.healthScore || 0) >= 40 ? "var(--color-warning, #FFB400)" : "var(--color-danger, #EF4444)"} 
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

      {/* Filters - Compact Single Row */}
      <Card className="bg-muted border-input sticky top-0 z-10">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search - Compact */}
            <div className="relative w-[180px] lg:w-[220px]">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t("superadmin.issues.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 ps-8 text-sm bg-background border-input"
              />
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* Status Tabs - Inline */}
            <div className="flex items-center gap-1">
              {[
                { value: "all", label: "All" },
                { value: "open", label: "Open" },
                { value: "closed", label: "Closed" },
                { value: "blocked", label: "Blocked" },
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  variant={statusFilter === value && viewMode === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => { setStatusFilter(value); setViewMode("all"); }}
                  className={`h-7 px-2.5 text-xs ${statusFilter === value && viewMode === "all" ? "" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* Priority Dropdown - Compact */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 w-[110px] text-xs bg-background border-input">
                {priorityFilter === "all" ? "Priority" : priorityOptions.find(o => o.value === priorityFilter)?.label}
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Dropdown - Compact */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-[110px] text-xs bg-background border-input">
                {categoryFilter === "all" ? "Category" : categoryOptions.find(o => o.value === categoryFilter)?.label}
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Divider */}
            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* View Mode Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === "quickWins" ? "default" : "ghost"}
                size="sm"
                onClick={() => { setViewMode(viewMode === "quickWins" ? "all" : "quickWins"); setStatusFilter("all"); }}
                className={`h-7 px-2 text-xs ${viewMode === "quickWins" ? "" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Zap className="h-3.5 w-3.5 me-1" />
                Quick Wins
              </Button>
              <Button
                variant={viewMode === "stale" ? "default" : "ghost"}
                size="sm"
                onClick={() => { setViewMode(viewMode === "stale" ? "all" : "stale"); setStatusFilter("all"); }}
                className={`h-7 px-2 text-xs ${viewMode === "stale" ? "" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Clock className="h-3.5 w-3.5 me-1" />
                Stale
              </Button>
            </div>

            {/* Clear Filters - Right aligned */}
            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground ms-auto"
              >
                <XCircle className="h-3.5 w-3.5 me-1" />
                Clear
              </Button>
            )}
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
                <div className="inline-flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyMarkdown}
                    className="text-blue-300 border-blue-600 hover:bg-blue-800"
                  >
                    Copy Markdown
                  </Button>
                  <copyMdFeedback.FeedbackComponent className="ms-2" />
                </div>
                <div className="inline-flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyTSV}
                    className="text-blue-300 border-blue-600 hover:bg-blue-800"
                  >
                    Copy TSV
                  </Button>
                  <copyTsvFeedback.FeedbackComponent className="ms-2" />
                </div>
                <div className="inline-flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="text-blue-300 border-blue-600 hover:bg-blue-800"
                  >
                    <Download className="h-4 w-4 me-1" />
                    Export CSV
                  </Button>
                  <exportCsvFeedback.FeedbackComponent className="ms-2" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIssues(new Set())}
                  className="text-muted-foreground hover:text-foreground"
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
            <div className="p-8 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-muted" />
              ))}
            </div>
          ) : connectionError ? (
            <div className="p-8 text-center">
              <AlertOctagon className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <p className="font-medium text-red-400 mb-2">
                {t("superadmin.issues.connection.title")}
              </p>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                {connectionError}
              </p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setConnectionError(null); handleRefresh(); }}
                  className="me-2"
                >
                  <RefreshCw className="h-4 w-4 me-2" />
                  {t("superadmin.issues.connection.retry")}
                </Button>
              </div>
              <div className="mt-6 p-4 bg-muted rounded-lg text-start max-w-md mx-auto">
                <p className="text-xs text-muted-foreground mb-2">
                  {t("superadmin.issues.connection.troubleshootingTitle")}
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>{t("superadmin.issues.connection.troubleshooting.env")}</li>
                  <li>{t("superadmin.issues.connection.troubleshooting.atlas")}</li>
                  <li>{t("superadmin.issues.connection.troubleshooting.ip")}</li>
                  <li>{t("superadmin.issues.connection.troubleshooting.logs")}</li>
                </ul>
              </div>
            </div>
          ) : issues.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bug className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">{t("superadmin.issues.empty")}</p>
              <p className="text-sm">{t("superadmin.issues.emptyHint")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-input hover:bg-muted/50">
                  <TableHead className="text-muted-foreground w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedIssues.size === issues.length && issues.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="text-muted-foreground w-[80px]">{t("superadmin.issues.table.id")}</TableHead>
                  <TableHead className="text-muted-foreground w-[80px]">{t("superadmin.issues.table.priority")}</TableHead>
                  <TableHead className="text-muted-foreground">{t("superadmin.issues.table.title")}</TableHead>
                  <TableHead className="text-muted-foreground w-[100px]">{t("superadmin.issues.table.status")}</TableHead>
                  <TableHead className="text-muted-foreground w-[100px]">{t("superadmin.issues.table.category")}</TableHead>
                  <TableHead className="text-muted-foreground w-[80px]">{t("superadmin.issues.table.module")}</TableHead>
                  <TableHead className="text-muted-foreground w-[120px]">Assignee</TableHead>
                  <TableHead className="text-muted-foreground w-[60px]">{t("superadmin.issues.table.seen")}</TableHead>
                  <TableHead className="text-muted-foreground w-[100px]">{t("superadmin.issues.table.updated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => {
                  const CategoryIcon = CATEGORY_ICONS[issue.category] || Bug;
                  
                  return (
                    <TableRow
                      key={issue._id}
                      className="cursor-pointer hover:bg-muted/50 border-input"
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
                        className="font-mono text-xs text-muted-foreground"
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
                        <span className="text-sm text-muted-foreground capitalize">{getCategoryLabel(issue.category)}</span>
                      </TableCell>
                      <TableCell onClick={() => handleIssueClick(issue)}>
                        <span className="text-sm font-mono text-muted-foreground">{issue.module}</span>
                      </TableCell>
                      <TableCell onClick={() => handleIssueClick(issue)}>
                        <div className="flex items-center gap-2">
                          {issue.assignedTo ? (
                            <>
                              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-medium">
                                {issue.assignedTo.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm text-muted-foreground">{issue.assignedTo}</span>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground/50 italic">Unassigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={() => handleIssueClick(issue)}>
                        <span className="text-sm text-muted-foreground">{issue.mentionCount || 1}×</span>
                      </TableCell>
                      <TableCell onClick={() => handleIssueClick(issue)}>
                        <span className="text-xs text-muted-foreground">
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
      {totalPages >= 1 && (
        <div className="border rounded-lg border-border bg-card">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={pageSize}
            showingAll={showingAll}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              if (size === "all") {
                setShowingAll(true);
                setPageSize(totalItems || 100);
              } else {
                setShowingAll(false);
                setPageSize(size);
              }
              setPage(1);
            }}
          />
        </div>
      )}

      {/* Floating Bulk Actions */}
      <FloatingBulkActions
        selectedCount={selectedIssues.size}
        onClearSelection={() => setSelectedIssues(new Set())}
        onMarkResolved={() => {
          toast({ title: t("superadmin.issues.toast.bulkActionTitle", "Bulk action"), description: t("superadmin.issues.toast.markingResolved", "Marking {{count}} issues as resolved").replace("{{count}}", String(selectedIssues.size)) });
          setSelectedIssues(new Set());
        }}
        onArchive={() => {
          toast({ title: t("superadmin.issues.toast.bulkActionTitle", "Bulk action"), description: t("superadmin.issues.toast.archiving", "Archiving {{count}} issues").replace("{{count}}", String(selectedIssues.size)) });
          setSelectedIssues(new Set());
        }}
        onDelete={() => {
          toast({ title: t("superadmin.issues.toast.bulkActionTitle", "Bulk action"), description: t("superadmin.issues.toast.deleting", "Deleting {{count}} issues").replace("{{count}}", String(selectedIssues.size)), variant: "destructive" });
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
