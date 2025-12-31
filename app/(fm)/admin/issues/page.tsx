"use client";

/**
 * Admin Issues Dashboard Page
 * System-wide issue tracking for Super Admin
 * 
 * @module app/admin/issues/page
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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

interface ImportResult {
  success: boolean;
  dryRun: boolean;
  result: {
    imported: number;
    updated: number;
    skipped: number;
    errors: Array<{ index: number; error: string }>;
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

export default function AdminIssuesPage() {
  const router = useRouter();
  const { toast } = useToast();

  // State
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "quickWins" | "stale">("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showingAll, setShowingAll] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

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
        throw new Error("Failed to fetch issues");
      }

      const data = await response.json();
      setIssues(data.issues || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalItems(data.pagination?.total || data.issues?.length || 0);
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to load issues",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, statusFilter, priorityFilter, categoryFilter, search, viewMode, toast]);

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

  // Initial load
  useEffect(() => {
    fetchIssues();
    fetchStats();
  }, [fetchIssues, fetchStats]);

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    setStatsLoading(true);
    fetchIssues();
    fetchStats();
  };

  // Navigate to issue detail
  const handleIssueClick = (issueId: string) => {
    router.push(`/admin/issues/${issueId}`);
  };

  // Export handler
  const handleExport = async () => {
    try {
      const response = await fetch("/api/issues?limit=5000");
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data.issues, null, 2)], {
        type: "application/json",
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fixzit-issues-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Exported ${data.issues.length} issues`,
      });
    } catch (_error) {
      toast({
        title: "Export Failed",
        description: "Could not export issues",
        variant: "destructive",
      });
    }
  };

  // Import handler
  const handleImport = async (dryRun = false) => {
    if (!importData.trim()) {
      toast({
        title: "No Data",
        description: "Please paste issues JSON or markdown",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    try {
      // Try to parse as JSON array
      let issues: unknown[];
      try {
        const parsed = JSON.parse(importData);
        issues = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // If not JSON, try to parse as simple format
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
          source: "admin-ui",
          issues,
          options: { dryRun, skipDuplicates: true },
        }),
      });

      const result: ImportResult = await response.json();

      if (result.success) {
        toast({
          title: dryRun ? "Dry Run Complete" : "Import Complete",
          description: `Imported: ${result.result.imported}, Updated: ${result.result.updated}, Skipped: ${result.result.skipped}`,
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
        title: "Import Failed",
        description: "Could not import issues. Check format.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  // Sync from PENDING_MASTER
  const handleSyncPendingMaster = async () => {
    setImporting(true);
    try {
      // This would typically read from the file system or a dedicated endpoint
      toast({
        title: "Sync Started",
        description: "Syncing from PENDING_MASTER.md...",
      });

      // For now, show instructions
      toast({
        title: "CLI Recommended",
        description: "Use: pnpm issue-log import docs/PENDING_MASTER.md",
      });
    } catch (_error) {
      toast({
        title: "Sync Failed",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            System Issue Tracker
          </h1>
          <p className="text-muted-foreground">
            Track and manage system issues, bugs, and enhancements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 me-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 me-2" />
            Export
          </Button>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 me-2" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Issues</DialogTitle>
                <DialogDescription>
                  Paste JSON array of issues or simple text (one title per line)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Issues Data</Label>
                  <Textarea
                    placeholder='[{"title": "Fix bug...", "priority": "P1"}]'
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleSyncPendingMaster} disabled={importing}>
                    <Database className="h-4 w-4 me-2" />
                    Sync PENDING_MASTER
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleImport(true)} disabled={importing}>
                      Dry Run
                    </Button>
                    <Button onClick={() => handleImport(false)} disabled={importing}>
                      {importing ? "Importing..." : "Import"}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm">
            <Plus className="h-4 w-4 me-2" />
            New Issue
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {statsLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-orange-500">
                  {stats?.totalOpen || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-500">
                  {stats?.totalClosed || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Quick Wins</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {stats?.quickWins || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Stale</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {stats?.stale || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Blocked</p>
                <p className="text-2xl font-bold text-red-500">
                  {stats?.blocked || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold text-blue-500">
                  {stats?.recentlyResolved || 0}
                </p>
              </CardContent>
            </Card>
            <Card className={stats?.healthScore && stats.healthScore >= 70 ? "border-green-500" : stats?.healthScore && stats.healthScore >= 40 ? "border-yellow-500" : "border-red-500"}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Health</p>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                P0 Critical
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{stats.byPriority?.P0 || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                P1 High
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-500">{stats.byPriority?.P1 || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                P2 Medium
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-500">{stats.byPriority?.P2 || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                P3 Low
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-500">{stats.byPriority?.P3 || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search issues..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-9"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="P0">P0 Critical</SelectItem>
                <SelectItem value="P1">P1 High</SelectItem>
                <SelectItem value="P2">P2 Medium</SelectItem>
                <SelectItem value="P3">P3 Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="efficiency">Efficiency</SelectItem>
                <SelectItem value="missing_test">Missing Test</SelectItem>
                <SelectItem value="logic_error">Logic Error</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("all")}
              >
                All
              </Button>
              <Button
                variant={viewMode === "quickWins" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("quickWins")}
              >
                <Zap className="h-4 w-4 me-1" />
                Quick Wins
              </Button>
              <Button
                variant={viewMode === "stale" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("stale")}
              >
                <Clock className="h-4 w-4 me-1" />
                Stale
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Issues ({issues.length})
          </CardTitle>
          <CardDescription>
            Click on an issue to view details and update status
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : issues.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bug className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No issues found</p>
              <p className="text-sm">Try adjusting your filters or import issues</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead className="w-[80px]">Priority</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Category</TableHead>
                  <TableHead className="w-[80px]">Module</TableHead>
                  <TableHead className="w-[60px]">Seen</TableHead>
                  <TableHead className="w-[100px]">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => {
                  const CategoryIcon = CATEGORY_ICONS[issue.category] || Bug;
                  
                  return (
                    <TableRow
                      key={issue._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleIssueClick(issue._id)}
                    >
                      <TableCell className="font-mono text-xs">
                        {issue.issueId || issue.legacyId || issue._id.slice(-6)}
                      </TableCell>
                      <TableCell>
                        <Badge className={PRIORITY_COLORS[issue.priority] || "bg-gray-500"}>
                          {issue.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <CategoryIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[400px]">{issue.title}</p>
                            {issue.location?.filePath && (
                              <p className="text-xs text-muted-foreground truncate max-w-[400px]">
                                {issue.location.filePath}
                                {issue.location.lineStart && `:${issue.location.lineStart}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_COLORS[issue.status]}>
                          {issue.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">{issue.category?.replace("_", " ")}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">{issue.module}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{issue.mentionCount || 1}×</span>
                      </TableCell>
                      <TableCell>
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
    </div>
  );
}
