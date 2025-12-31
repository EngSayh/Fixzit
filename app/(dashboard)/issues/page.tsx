"use client";

/**
 * Issues Dashboard Page
 * Main interface for viewing and managing issues
 * 
 * @module app/(dashboard)/issues/page
 */

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bug,
  Clock,
  Search,
  RefreshCw,
  Plus,
  Download,
  Zap,
  AlertOctagon,
  FileCode,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import {
  Card,
  CardContent,
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
// DropdownMenu imports removed - will add when needed
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// TYPES
// ============================================================================

interface Issue {
  _id: string;
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
  quickWins: number;
  stale: number;
  blocked: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_COLORS: Record<string, string> = {
  P0: "bg-red-500 text-white",
  P1: "bg-orange-500 text-white",
  P2: "bg-yellow-500 text-black",
  P3: "bg-blue-500 text-white",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-slate-500",
  in_progress: "bg-blue-500",
  in_review: "bg-purple-500",
  blocked: "bg-red-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
  wont_fix: "bg-gray-400",
};

const CATEGORY_ICONS: Record<string, typeof Bug> = {
  bug: Bug,
  security: AlertOctagon,
  efficiency: Zap,
  missing_test: FileCode,
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function IssuesDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8" />}>
      <IssuesDashboardContent />
    </Suspense>
  );
}

function IssuesDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // State
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState(searchParams?.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams?.get("status") || "open");
  const [priorityFilter, setPriorityFilter] = useState(searchParams?.get("priority") || "");
  const [categoryFilter, setCategoryFilter] = useState(searchParams?.get("category") || "");
  const [viewMode, setViewMode] = useState<"all" | "quickWins" | "stale">("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch issues
  const fetchIssues = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", pageSize.toString());

      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (categoryFilter) params.set("category", categoryFilter);
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
  }, [page, statusFilter, priorityFilter, categoryFilter, search, viewMode, toast]);

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
      // Stats loading failure is non-critical, silently ignored
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
    fetchIssues();
    fetchStats();
  };

  // Navigate to issue detail
  const handleIssueClick = (issueId: string) => {
    router.push(`/issues/${issueId}`);
  };

  // Export handler
  const handleExport = async () => {
    try {
      const response = await fetch("/api/issues?limit=1000");
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data.issues, null, 2)], {
        type: "application/json",
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `issues-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Exported ${data.issues.length} issues`,
      });
    } catch {
      toast({
        title: "Export Failed",
        description: "Could not export issues",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Issue Tracker</h1>
          <p className="text-muted-foreground">
            Track and manage development issues
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
          <Button size="sm">
            <Plus className="h-4 w-4 me-2" />
            New Issue
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
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
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-orange-500">
                  {stats?.totalOpen || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Quick Wins</p>
                <p className="text-2xl font-bold text-green-500">
                  {stats?.quickWins || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Stale</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {stats?.stale || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Blocked</p>
                <p className="text-2xl font-bold text-red-500">
                  {stats?.blocked || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Health</p>
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
              <SelectTrigger className="w-[150px]">
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
              <SelectTrigger className="w-[150px]">
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

            <Select
              value={categoryFilter || "all"}
              onValueChange={(value) =>
                setCategoryFilter(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="efficiency">Efficiency</SelectItem>
                <SelectItem value="missing_test">Missing Tests</SelectItem>
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
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : issues.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bug className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No issues found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px]">Module</TableHead>
                  <TableHead className="w-[80px]">Effort</TableHead>
                  <TableHead className="w-[120px]">Updated</TableHead>
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
                      <TableCell>
                        <Badge className={PRIORITY_COLORS[issue.priority] || "bg-gray-500"}>
                          {issue.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <CategoryIcon className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{issue.title}</p>
                            {issue.location.filePath && (
                              <p className="text-xs text-muted-foreground truncate">
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
                        <span className="text-sm">{issue.module}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{issue.effort}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
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
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              if (size === "all") {
                setPageSize(totalItems || 100);
              } else {
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
