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
  LogOut,
  Shield,
  Settings,
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

interface SessionInfo {
  authenticated: boolean;
  user?: {
    username: string;
    role: string;
  };
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
  open: "bg-slate-500 text-white",
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

  // Session state
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // State
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState("");

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

  // Check session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/superadmin/session");
        const data = await response.json();
        
        if (!data.authenticated) {
          router.push("/superadmin/login");
          return;
        }
        
        setSession(data);
      } catch {
        router.push("/superadmin/login");
      } finally {
        setSessionLoading(false);
      }
    };
    
    checkSession();
  }, [router]);

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

      const response = await fetch(`/api/issues?${params.toString()}`);
      
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
      const response = await fetch("/api/issues/stats");
      
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
    if (session?.authenticated) {
      fetchIssues();
      fetchStats();
    }
  }, [session, fetchIssues, fetchStats]);

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
    if (!session?.authenticated || !isTabVisible) return;

    const interval = setInterval(() => {
      fetchIssues();
      fetchStats();
    }, 20000);

    return () => clearInterval(interval);
  }, [session, isTabVisible, fetchIssues, fetchStats]);

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    setStatsLoading(true);
    fetchIssues();
    fetchStats();
  };

  // Logout handler
  const handleLogout = async () => {
    await fetch("/api/superadmin/logout", { method: "POST" });
    router.push("/superadmin/login");
  };

  // Navigate to issue detail
  const handleIssueClick = (issueId: string) => {
    router.push(`/superadmin/issues/${issueId}`);
  };

  // Export handler
  const handleExport = async () => {
    try {
      const response = await fetch("/api/issues?limit=5000");
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

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-lg">{t("superadmin.verifyingAccess")}</div>
      </div>
    );
  }

  if (!session?.authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-amber-500" />
            <span className="text-white font-semibold">{t("superadmin.title")}</span>
            <Badge variant="outline" className="border-amber-500 text-amber-500">
              {session.user?.username}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <Settings className="h-4 w-4 me-2" />
              {t("superadmin.settings")}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-300 hover:text-white">
              <LogOut className="h-4 w-4 me-2" />
              {t("superadmin.logout")}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Database className="h-8 w-8" />
              {t("superadmin.issues.title")}
            </h1>
            <p className="text-slate-400">
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
              <Card key={i} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2 bg-slate-700" />
                  <Skeleton className="h-8 w-12 bg-slate-700" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-400">{t("superadmin.issues.stats.total")}</p>
                  <p className="text-2xl font-bold text-white">{stats?.total || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-400">{t("superadmin.issues.stats.open")}</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {stats?.totalOpen || 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-400">{t("superadmin.issues.stats.closed")}</p>
                  <p className="text-2xl font-bold text-green-500">
                    {stats?.totalClosed || 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-400">{t("superadmin.issues.stats.quickWins")}</p>
                  <p className="text-2xl font-bold text-emerald-500">
                    {stats?.quickWins || 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-400">{t("superadmin.issues.stats.stale")}</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {stats?.stale || 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-400">{t("superadmin.issues.stats.blocked")}</p>
                  <p className="text-2xl font-bold text-red-500">
                    {stats?.blocked || 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-400">{t("superadmin.issues.stats.recentlyResolved")}</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {stats?.recentlyResolved || 0}
                  </p>
                </CardContent>
              </Card>
              <Card className={`bg-slate-800 ${(stats?.healthScore || 0) >= 70 ? "border-green-500" : (stats?.healthScore || 0) >= 40 ? "border-yellow-500" : "border-red-500"}`}>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-400">{t("superadmin.issues.stats.healthScore")}</p>
                  <p className={`text-2xl font-bold ${
                    (stats?.healthScore || 0) >= 70 ? "text-green-500" :
                    (stats?.healthScore || 0) >= 40 ? "text-yellow-500" : "text-red-500"
                  }`}>
                    {stats?.healthScore || 0}%
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Priority Breakdown */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-800 border-slate-700">
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
            <Card className="bg-slate-800 border-slate-700">
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
            <Card className="bg-slate-800 border-slate-700">
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
            <Card className="bg-slate-800 border-slate-700">
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
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={t("superadmin.issues.search")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="ps-9 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder={t("superadmin.issues.filters.status")} />
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
                <SelectTrigger className="w-[140px] bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder={t("superadmin.issues.filters.priority")} />
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
                <SelectTrigger className="w-[140px] bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder={t("superadmin.issues.filters.category")} />
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
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5" />
              {t("superadmin.issues.title")}
              <span className="text-sm text-slate-400">({issues.length})</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t("superadmin.issues.tableDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full bg-slate-700" />
                ))}
              </div>
            ) : issues.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
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
                          onClick={() => handleIssueClick(issue._id)}
                        >
                          {issue.issueId || issue.legacyId || issue._id.slice(-6)}
                        </TableCell>
                        <TableCell onClick={() => handleIssueClick(issue._id)}>
                          <Badge className={PRIORITY_COLORS[issue.priority] || "bg-gray-500"}>
                            {getPriorityLabel(issue.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={() => handleIssueClick(issue._id)}>
                          <div className="flex items-start gap-2">
                            <CategoryIcon className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate max-w-[400px]">{issue.title}</p>
                              {issue.location?.filePath && (
                                <p className="text-xs text-slate-500 truncate max-w-[400px]">
                                  {issue.location.filePath}
                                  {issue.location.lineStart && `:${issue.location.lineStart}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell onClick={() => handleIssueClick(issue._id)}>
                          <Badge variant="secondary" className={STATUS_COLORS[issue.status]}>
                            {getStatusLabel(issue.status)}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={() => handleIssueClick(issue._id)}>
                          <span className="text-sm text-slate-300 capitalize">{getCategoryLabel(issue.category)}</span>
                        </TableCell>
                        <TableCell onClick={() => handleIssueClick(issue._id)}>
                          <span className="text-sm font-mono text-slate-300">{issue.module}</span>
                        </TableCell>
                        <TableCell onClick={() => handleIssueClick(issue._id)}>
                          <span className="text-sm text-slate-300">{issue.mentionCount || 1}×</span>
                        </TableCell>
                        <TableCell onClick={() => handleIssueClick(issue._id)}>
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
            <span className="flex items-center px-4 text-sm text-slate-400">
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
      </div>
    </div>
  );
}
