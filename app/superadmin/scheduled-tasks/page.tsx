"use client";

/**
 * Superadmin Scheduled Tasks Management
 * View cron jobs, scheduled reports, enable/disable tasks, view execution history
 * 
 * @module app/superadmin/scheduled-tasks/page
 * @status IMPLEMENTED [AGENT-001-A]
 * @issue SA-SCHEDULE-001
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { IconButton } from "@/components/ui/IconButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Eye,
  Calendar,
  Zap,
  Timer,
  BarChart3,
  Mail,
  Database,
  Trash2,
} from "@/components/ui/icons";
import { useSuperadminSession } from "@/components/superadmin/superadmin-session";

// ============================================================================
// TYPES
// ============================================================================

interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  type: "cron" | "interval" | "scheduled";
  schedule: string; // cron expression or interval
  scheduleHuman: string; // human readable
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  lastStatus: "success" | "failed" | "running" | "never";
  lastDuration: number | null; // ms
  successCount: number;
  failureCount: number;
  category: "reports" | "maintenance" | "sync" | "cleanup" | "notifications";
}

interface TaskExecution {
  id: string;
  taskId: string;
  startedAt: string;
  completedAt: string | null;
  status: "success" | "failed" | "running" | "cancelled";
  duration: number | null;
  output: string;
  error: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_ICONS: Record<string, typeof Clock> = {
  reports: BarChart3,
  maintenance: Database,
  sync: RefreshCw,
  cleanup: Trash2,
  notifications: Mail,
};

const CATEGORY_COLORS: Record<string, string> = {
  reports: "bg-blue-500/10 text-blue-500",
  maintenance: "bg-purple-500/10 text-purple-500",
  sync: "bg-green-500/10 text-green-500",
  cleanup: "bg-orange-500/10 text-orange-500",
  notifications: "bg-pink-500/10 text-pink-500",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

function getTimeUntil(date: string | null): string {
  if (!date) return "-";
  const diff = new Date(date).getTime() - Date.now();
  if (diff < 0) return "Overdue";
  if (diff < 60000) return "< 1 minute";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours`;
  return `${Math.floor(diff / 86400000)} days`;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: ScheduledTask["lastStatus"] }) {
  const config = {
    success: { color: "bg-green-500/10 text-green-500", icon: CheckCircle, label: "Success" },
    failed: { color: "bg-red-500/10 text-red-500", icon: XCircle, label: "Failed" },
    running: { color: "bg-blue-500/10 text-blue-500", icon: RefreshCw, label: "Running" },
    never: { color: "bg-gray-500/10 text-gray-500", icon: Clock, label: "Never Run" },
  };
  const { color, icon: Icon, label } = config[status];
  return (
    <Badge className={`${color} gap-1`}>
      <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
      {label}
    </Badge>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ScheduledTasksPage() {
  const { t } = useI18n();
  const _session = useSuperadminSession();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Dialog states
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [runningTask, setRunningTask] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/superadmin/scheduled-tasks", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch tasks");
      const data = await response.json();
      setTasks(data.tasks || []);
      setExecutions(data.recentExecutions || []);
    } catch {
      toast.error("Failed to load scheduled tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/superadmin/scheduled-tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error("Failed to toggle task");
      setTasks(prev => prev.map(t => 
        t.id === id 
          ? { 
              ...t, 
              enabled,
              nextRun: enabled ? new Date(Date.now() + 3600000).toISOString() : null,
            } 
          : t
      ));
      toast.success(enabled ? "Task enabled" : "Task paused");
    } catch {
      toast.error("Failed to toggle task");
    }
  };

  const handleRunNow = async (task: ScheduledTask) => {
    setRunningTask(task.id);
    try {
      const response = await fetch(`/api/superadmin/scheduled-tasks/${task.id}/run`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to run task");
      const data = await response.json();
      
      setTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { ...t, lastRun: new Date().toISOString(), lastStatus: data.execution?.status || "success" }
          : t
      ));
      
      toast.success(`Task "${task.name}" executed successfully`);
    } catch {
      toast.error("Failed to run task");
    } finally {
      setRunningTask(null);
    }
  };

  const viewHistory = (task: ScheduledTask) => {
    setSelectedTask(task);
    setShowHistoryDialog(true);
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const taskExecutions = executions.filter(e => e.taskId === selectedTask?.id);

  // Stats
  const enabledCount = tasks.filter(t => t.enabled).length;
  const runningCount = tasks.filter(t => t.lastStatus === "running").length;
  const failedCount = tasks.filter(t => t.lastStatus === "failed").length;
  // Total executions reserved for stats dashboard
  // const totalExecutions = tasks.reduce((s, t) => s + t.successCount + t.failureCount, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Timer className="h-6 w-6" />
            {t("superadmin.tasks.title", "Scheduled Tasks")}
          </h1>
          <p className="text-muted-foreground">
            {t("superadmin.tasks.subtitle", "Manage cron jobs and scheduled operations")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTasks} disabled={loading}>
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh", "Refresh")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enabled</p>
                <p className="text-2xl font-bold text-green-500">{enabledCount}</p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Running Now</p>
                <p className="text-2xl font-bold text-blue-500">{runningCount}</p>
              </div>
              <RefreshCw className={`h-8 w-8 text-blue-500 ${runningCount > 0 ? "animate-spin" : ""}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-500">{failedCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("superadmin.tasks.search", "Search tasks...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter} placeholder="Category">
          <SelectTrigger className="w-[160px]">
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="reports">Reports</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="sync">Sync</SelectItem>
            <SelectItem value="cleanup">Cleanup</SelectItem>
            <SelectItem value="notifications">Notifications</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("superadmin.tasks.name", "Task")}</TableHead>
                <TableHead>{t("superadmin.tasks.schedule", "Schedule")}</TableHead>
                <TableHead>{t("superadmin.tasks.lastRun", "Last Run")}</TableHead>
                <TableHead>{t("superadmin.tasks.nextRun", "Next Run")}</TableHead>
                <TableHead>{t("superadmin.tasks.status", "Status")}</TableHead>
                <TableHead>{t("superadmin.tasks.stats", "Stats")}</TableHead>
                <TableHead>{t("superadmin.tasks.enabled", "Enabled")}</TableHead>
                <TableHead>{t("common.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t("superadmin.tasks.noTasks", "No scheduled tasks found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map(task => {
                  const CategoryIcon = CATEGORY_ICONS[task.category] || Clock;
                  return (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${CATEGORY_COLORS[task.category]}`}>
                            <CategoryIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{task.name}</p>
                            <p className="text-xs text-muted-foreground">{task.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{task.scheduleHuman}</p>
                          <code className="text-xs text-muted-foreground">{task.schedule}</code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">
                            {task.lastRun 
                              ? new Date(task.lastRun).toLocaleString()
                              : "Never"
                            }
                          </p>
                          {task.lastDuration && (
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(task.lastDuration)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.nextRun ? (
                          <div>
                            <p className="text-sm">{getTimeUntil(task.nextRun)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(task.nextRun).toLocaleTimeString()}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.lastStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-green-500">{task.successCount}</span>
                          {" / "}
                          <span className="text-red-500">{task.failureCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={task.enabled}
                          onCheckedChange={(checked) => handleToggle(task.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <IconButton
                            icon={<Play className={`h-4 w-4 ${runningTask === task.id ? "animate-pulse" : ""}`} />}
                            tooltip={t("superadmin.tasks.runNow", "Run now")}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRunNow(task)}
                            disabled={runningTask === task.id || task.lastStatus === "running"}
                            aria-label={t("superadmin.tasks.runNow", "Run now")}
                          />
                          <IconButton
                            icon={<Eye className="h-4 w-4" />}
                            tooltip={t("superadmin.tasks.viewHistory", "View history")}
                            variant="ghost"
                            size="sm"
                            onClick={() => viewHistory(task)}
                            aria-label={t("superadmin.tasks.viewHistory", "View history")}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Execution History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {t("superadmin.tasks.history", "Execution History")} - {selectedTask?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTask?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-4">
            {taskExecutions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No execution history available
              </div>
            ) : (
              taskExecutions.map(exec => (
                <Card key={exec.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={exec.status === "cancelled" ? "failed" : exec.status} />
                        <span className="text-sm text-muted-foreground">
                          {new Date(exec.startedAt).toLocaleString()}
                        </span>
                      </div>
                      {exec.duration && (
                        <Badge variant="outline">
                          {formatDuration(exec.duration)}
                        </Badge>
                      )}
                    </div>
                    <div className="bg-muted rounded-md p-3 font-mono text-xs">
                      <p className="text-green-500">{exec.output}</p>
                      {exec.error && (
                        <p className="text-red-500 mt-2">Error: {exec.error}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              {t("common.close", "Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
