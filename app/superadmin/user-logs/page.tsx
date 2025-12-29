"use client";

/**
 * Superadmin User Activity Logs
 * View user interactions, requests, and history for support
 * 
 * @module app/superadmin/user-logs/page
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  History, RefreshCw, Search, Eye, User, Clock, Globe,
  MousePointer, LogIn, Settings, FileText, AlertCircle,
  CheckCircle, XCircle, Download,
  Monitor, Smartphone, Tablet, MapPin, Activity,
} from "@/components/ui/icons";

interface UserActivityLog {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  tenantId: string;
  tenantName: string;
  action: string;
  category: "auth" | "navigation" | "crud" | "settings" | "api" | "error";
  details: string;
  metadata?: {
    path?: string;
    method?: string;
    statusCode?: number;
    duration?: number;
    userAgent?: string;
    device?: string;
    browser?: string;
    os?: string;
    ip?: string;
    location?: string;
    [key: string]: string | number | undefined;
  };
  status: "success" | "warning" | "error";
  timestamp: string;
}

interface UserSession {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  tenantName: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location?: string;
  pagesVisited: number;
  actionsPerformed: number;
  isActive: boolean;
}

interface ActivityStats {
  totalLogs: number;
  todayLogs: number;
  uniqueUsers: number;
  errorRate: number;
  avgSessionDuration: number;
  topActions: { action: string; count: number }[];
}

const CATEGORY_ICONS: Record<string, typeof History> = {
  auth: LogIn,
  navigation: MousePointer,
  crud: FileText,
  settings: Settings,
  api: Globe,
  error: AlertCircle,
};

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-500/20 text-green-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  error: "bg-red-500/20 text-red-400",
};

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export default function SuperadminUserLogsPage() {
  const { t, locale } = useI18n();
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("today");
  
  // Dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<UserActivityLog | null>(null);
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/user-logs?range=${dateRange}`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setLogs(Array.isArray(data) ? data : data.logs || []);
      } else {
        // Handle non-OK responses
        const errorText = await response.text().catch(() => "");
        // eslint-disable-next-line no-console -- SuperAdmin debug logging for API failures
        console.error("Failed to fetch logs:", response.status, errorText);
        if (response.status === 401 || response.status === 403) {
          setLogs([]);
          // Could redirect to login or show unauthorized state
        } else {
          setLogs([]);
        }
        return; // Don't fall through to demo data
      }
      return; // Success - don't use demo data
    } catch (error) {
      // eslint-disable-next-line no-console -- SuperAdmin debug logging for network errors
      console.error("Network error fetching logs:", error);
      // Demo data
      const now = new Date();
      setLogs([
        {
          _id: "log-1",
          userId: "user-1",
          userName: "Ahmed Al-Rashid",
          userEmail: "ahmed@acme.com",
          tenantId: "tenant-1",
          tenantName: "Acme Corp",
          action: "Login",
          category: "auth",
          details: "User logged in successfully",
          metadata: { ip: "192.168.1.1", browser: "Chrome 120", os: "Windows 11", device: "desktop", location: "Riyadh, SA" },
          status: "success",
          timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        },
        {
          _id: "log-2",
          userId: "user-1",
          userName: "Ahmed Al-Rashid",
          userEmail: "ahmed@acme.com",
          tenantId: "tenant-1",
          tenantName: "Acme Corp",
          action: "View Dashboard",
          category: "navigation",
          details: "Navigated to FM Dashboard",
          metadata: { path: "/fm/dashboard", duration: 2500 },
          status: "success",
          timestamp: new Date(now.getTime() - 4 * 60 * 1000).toISOString(),
        },
        {
          _id: "log-3",
          userId: "user-2",
          userName: "Sara Mohammed",
          userEmail: "sara@techsolutions.com",
          tenantId: "tenant-2",
          tenantName: "Tech Solutions",
          action: "Create Work Order",
          category: "crud",
          details: "Created new work order WO-2024-001",
          metadata: { path: "/api/workorders", method: "POST", statusCode: 201 },
          status: "success",
          timestamp: new Date(now.getTime() - 3 * 60 * 1000).toISOString(),
        },
        {
          _id: "log-4",
          userId: "user-3",
          userName: "Khalid Ibrahim",
          userEmail: "khalid@startup.com",
          tenantId: "tenant-3",
          tenantName: "StartupXYZ",
          action: "API Request Failed",
          category: "error",
          details: "Rate limit exceeded on /api/properties",
          metadata: { path: "/api/properties", method: "GET", statusCode: 429, duration: 50 },
          status: "error",
          timestamp: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
        },
        {
          _id: "log-5",
          userId: "user-1",
          userName: "Ahmed Al-Rashid",
          userEmail: "ahmed@acme.com",
          tenantId: "tenant-1",
          tenantName: "Acme Corp",
          action: "Update Settings",
          category: "settings",
          details: "Updated notification preferences",
          metadata: { path: "/api/settings/notifications", method: "PUT", statusCode: 200 },
          status: "success",
          timestamp: new Date(now.getTime() - 1 * 60 * 1000).toISOString(),
        },
        {
          _id: "log-6",
          userId: "user-4",
          userName: "Fatima Al-Saud",
          userEmail: "fatima@enterprise.sa",
          tenantId: "tenant-4",
          tenantName: "Enterprise SA",
          action: "Export Report",
          category: "api",
          details: "Exported financial report for Q4",
          metadata: { path: "/api/reports/export", method: "POST", statusCode: 200, duration: 4500 },
          status: "success",
          timestamp: now.toISOString(),
        },
        {
          _id: "log-7",
          userId: "user-2",
          userName: "Sara Mohammed",
          userEmail: "sara@techsolutions.com",
          tenantId: "tenant-2",
          tenantName: "Tech Solutions",
          action: "Permission Denied",
          category: "auth",
          details: "Attempted to access admin settings without permission",
          metadata: { path: "/admin/settings", statusCode: 403 },
          status: "warning",
          timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        },
      ]);
    }
  }, [dateRange]);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/user-sessions", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setSessions(Array.isArray(data) ? data : data.sessions || []);
        return; // Success - don't use demo data
      } else {
        // Handle non-OK responses like errors
        const errorText = await response.text().catch(() => "");
        // eslint-disable-next-line no-console -- SuperAdmin debug logging for API failures
        console.error("Failed to fetch sessions:", response.status, errorText);
        if (response.status === 401 || response.status === 403) {
          setSessions([]);
          // Could redirect to login or show unauthorized state
          return; // Don't fall through to demo data on auth failures
        }
        // Fall through to demo data for other errors
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- SuperAdmin debug logging for network errors
      console.error("Network error fetching sessions:", error);
      // Demo data
      const now = new Date();
      setSessions([
        {
          _id: "session-1",
          userId: "user-1",
          userName: "Ahmed Al-Rashid",
          userEmail: "ahmed@acme.com",
          tenantName: "Acme Corp",
          startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          device: "desktop",
          browser: "Chrome 120",
          os: "Windows 11",
          ip: "192.168.1.1",
          location: "Riyadh, SA",
          pagesVisited: 15,
          actionsPerformed: 23,
          isActive: true,
        },
        {
          _id: "session-2",
          userId: "user-2",
          userName: "Sara Mohammed",
          userEmail: "sara@techsolutions.com",
          tenantName: "Tech Solutions",
          startedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
          device: "mobile",
          browser: "Safari",
          os: "iOS 17",
          ip: "10.0.0.55",
          location: "Jeddah, SA",
          pagesVisited: 8,
          actionsPerformed: 12,
          isActive: true,
        },
        {
          _id: "session-3",
          userId: "user-3",
          userName: "Khalid Ibrahim",
          userEmail: "khalid@startup.com",
          tenantName: "StartupXYZ",
          startedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
          endedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
          duration: 7200,
          device: "tablet",
          browser: "Firefox",
          os: "Android 14",
          ip: "172.16.0.10",
          pagesVisited: 25,
          actionsPerformed: 45,
          isActive: false,
        },
      ]);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/user-logs/stats", { credentials: "include" });
      if (response.ok) {
        setStats(await response.json());
        return; // Success - don't use demo data
      } else {
        // Handle non-OK responses
        const errorText = await response.text().catch(() => "");
        // eslint-disable-next-line no-console -- SuperAdmin debug logging for API failures
        console.error("Failed to fetch stats:", response.status, errorText);
        if (response.status === 401 || response.status === 403) {
          setStats(null);
          // Could redirect to login or show unauthorized state
          return; // Don't fall through to demo data on auth failures
        }
        // Fall through to demo data for other errors
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- SuperAdmin debug logging for network errors
      console.error("Network error fetching stats:", error);
      // Demo stats - guard against division by zero
      const errorCount = logs.filter(l => l.status === "error").length;
      const errorRate = logs.length > 0 ? (errorCount / logs.length) * 100 : 0;
      setStats({
        totalLogs: logs.length,
        todayLogs: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length,
        uniqueUsers: new Set(logs.map(l => l.userId)).size,
        errorRate,
        avgSessionDuration: 45,
        topActions: [
          { action: "View Dashboard", count: 145 },
          { action: "Login", count: 89 },
          { action: "Create Work Order", count: 67 },
          { action: "Export Report", count: 34 },
        ],
      });
    }
  }, [logs]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchLogs(), fetchSessions()]);
    setLoading(false);
  }, [fetchLogs, fetchSessions]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (logs.length > 0) fetchStats(); }, [logs, fetchStats]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = !search || 
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.tenantName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Use Intl.RelativeTimeFormat for relative times
    try {
      const rtf = new Intl.RelativeTimeFormat(locale ?? undefined, { numeric: "auto" });
      if (diffMs < 60000) return rtf.format(0, "minute"); // "now" or equivalent
      if (diffMs < 3600000) return rtf.format(-Math.floor(diffMs / 60000), "minute");
      if (diffMs < 86400000) return rtf.format(-Math.floor(diffMs / 3600000), "hour");
    } catch {
      // Fallback if RelativeTimeFormat fails
      if (diffMs < 60000) return t("common.justNow", "Just now");
      if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m`;
      if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h`;
    }
    
    // Use locale-aware date formatting
    return new Intl.DateTimeFormat(locale ?? undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const handleViewLog = (log: UserActivityLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const handleViewSession = (session: UserSession) => {
    setSelectedSession(session);
    setSessionDialogOpen(true);
  };

  // CSV escape helper to prevent injection and handle special characters
  const escapeCsvField = (value: unknown): string => {
    const str = String(value ?? "");
    // Prevent CSV injection by prefixing dangerous characters
    const sanitized = str.replace(/^([=+\-@])/, "'$1");
    // Escape quotes and wrap in quotes if contains comma, quote, newline, or CR
    if (/[,"\n\r]/.test(sanitized)) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  };

  const handleExport = () => {
    const csvContent = [
      ["Timestamp", "User", "Email", "Tenant", "Action", "Category", "Status", "Details"].join(","),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        escapeCsvField(log.userName),
        escapeCsvField(log.userEmail),
        escapeCsvField(log.tenantName),
        escapeCsvField(log.action),
        escapeCsvField(log.category),
        escapeCsvField(log.status),
        escapeCsvField(log.details),
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.userLogs")}</h1>
          <p className="text-muted-foreground">{t("superadmin.userLogs.subtitle", "Monitor user activity, sessions, and interactions for support")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="border-input text-muted-foreground">
            <Download className="h-4 w-4 me-2" />{t("common.export", "Export")}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="border-input text-muted-foreground">
            <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />{t("common.refresh", "Refresh")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20"><Activity className="h-5 w-5 text-blue-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.totalLogs}</p><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.totalLogs", "Total Logs")}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20"><Clock className="h-5 w-5 text-green-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.todayLogs}</p><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.today", "Today")}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20"><User className="h-5 w-5 text-purple-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.uniqueUsers}</p><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.uniqueUsers", "Unique Users")}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20"><AlertCircle className="h-5 w-5 text-red-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.errorRate.toFixed(1)}%</p><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.errorRate", "Error Rate")}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20"><History className="h-5 w-5 text-yellow-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.avgSessionDuration}m</p><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.avgSession", "Avg Session")}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList className="bg-muted border-input">
          <TabsTrigger value="logs" className="data-[state=active]:bg-muted">{t("superadmin.userLogs.activityLogs", "Activity Logs")}</TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-muted">{t("superadmin.userLogs.activeSessions", "Active Sessions")}</TabsTrigger>
        </TabsList>

        {/* Activity Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t("superadmin.userLogs.searchPlaceholder", "Search by user, email, action, or tenant...")} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10 bg-muted border-input text-foreground" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter} placeholder="Category">
                <SelectTrigger className="w-[150px] bg-muted border-input">
                  {categoryFilter === "all" ? "All Categories" : categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                  <SelectItem value="navigation">Navigation</SelectItem>
                  <SelectItem value="crud">CRUD</SelectItem>
                  <SelectItem value="settings">Settings</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter} placeholder="Status">
                <SelectTrigger className="w-[130px] bg-muted border-input">
                  {statusFilter === "all" ? "All Status" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange} placeholder="Date Range">
                <SelectTrigger className="w-[130px] bg-muted border-input">
                  {dateRange === "today" ? "Today" : dateRange === "week" ? "This Week" : dateRange === "month" ? "This Month" : "All Time"}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground"><History className="h-5 w-5" />Activity Logs</CardTitle>
              <CardDescription className="text-muted-foreground">Real-time user activity and request history</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12"><History className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">{t("superadmin.userLogs.noLogsFound", "No activity logs found")}</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Time</TableHead>
                      <TableHead className="text-muted-foreground">User</TableHead>
                      <TableHead className="text-muted-foreground">Tenant</TableHead>
                      <TableHead className="text-muted-foreground">Action</TableHead>
                      <TableHead className="text-muted-foreground">Category</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground w-[80px]">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const CategoryIcon = CATEGORY_ICONS[log.category] || History;
                      return (
                        <TableRow key={log._id} className="border-border hover:bg-muted/50">
                          <TableCell className="text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {formatTimestamp(log.timestamp)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-foreground font-medium">{log.userName}</p>
                              <p className="text-sm text-muted-foreground">{log.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{log.tenantName}</TableCell>
                          <TableCell className="text-foreground">{log.action}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground capitalize">{log.category}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[log.status]}>
                              {log.status === "success" && <CheckCircle className="h-3 w-3 me-1" />}
                              {log.status === "warning" && <AlertCircle className="h-3 w-3 me-1" />}
                              {log.status === "error" && <XCircle className="h-3 w-3 me-1" />}
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleViewLog(log)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground"><User className="h-5 w-5" />Active Sessions</CardTitle>
              <CardDescription className="text-muted-foreground">Currently active user sessions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                const activeSessions = sessions.filter(s => s.isActive);
                return activeSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12"><User className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">{t("superadmin.userLogs.noSessions", "No active sessions")}</p></div>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">User</TableHead>
                      <TableHead className="text-muted-foreground">Tenant</TableHead>
                      <TableHead className="text-muted-foreground">Device</TableHead>
                      <TableHead className="text-muted-foreground">Location</TableHead>
                      <TableHead className="text-muted-foreground">Started</TableHead>
                      <TableHead className="text-muted-foreground">Activity</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground w-[80px]">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeSessions.map((session) => {
                      const DeviceIcon = DEVICE_ICONS[session.device] || Monitor;
                      return (
                        <TableRow key={session._id} className="border-border hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <p className="text-foreground font-medium">{session.userName}</p>
                              <p className="text-sm text-muted-foreground">{session.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{session.tenantName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-foreground">{session.browser}</p>
                                <p className="text-sm text-muted-foreground">{session.os}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{session.location || session.ip}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatTimestamp(session.startedAt)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="text-foreground">{session.pagesVisited} {t("superadmin.userLogs.pages", "pages")}</p>
                              <p className="text-muted-foreground">{session.actionsPerformed} {t("superadmin.userLogs.actions", "actions")}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={session.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                              {session.isActive ? t("superadmin.userLogs.statusActive", "Active") : t("superadmin.userLogs.statusEnded", "Ended")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleViewSession(session)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("superadmin.userLogs.logDetails", "Activity Log Details")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{selectedLog?.action}</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.user", "User")}</p><p className="text-foreground">{selectedLog.userName}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.email", "Email")}</p><p className="text-foreground">{selectedLog.userEmail}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.tenant", "Tenant")}</p><p className="text-foreground">{selectedLog.tenantName}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.category", "Category")}</p><p className="text-foreground capitalize">{selectedLog.category}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.status", "Status")}</p><Badge className={STATUS_COLORS[selectedLog.status]}>{selectedLog.status}</Badge></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.timestamp", "Timestamp")}</p><p className="text-foreground">{new Intl.DateTimeFormat(locale ?? undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(selectedLog.timestamp))}</p></div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t("superadmin.userLogs.fields.details", "Details")}</p>
                <p className="text-foreground bg-muted p-3 rounded-lg">{selectedLog.details}</p>
              </div>
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t("superadmin.userLogs.fields.metadata", "Metadata")}</p>
                  <div className="bg-muted p-3 rounded-lg space-y-1">
                    {Object.entries(selectedLog.metadata).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-muted-foreground capitalize">{key}:</span>
                        <span className="text-foreground">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDetailDialogOpen(false)}>{t("common.close", "Close")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Detail Dialog */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("superadmin.userLogs.sessionDetails", "Session Details")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{selectedSession?.userName}</DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.user", "User")}</p><p className="text-foreground">{selectedSession.userName}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.email", "Email")}</p><p className="text-foreground">{selectedSession.userEmail}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.tenant", "Tenant")}</p><p className="text-foreground">{selectedSession.tenantName}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.status", "Status")}</p><Badge className={selectedSession.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>{selectedSession.isActive ? t("superadmin.userLogs.statusActive", "Active") : t("superadmin.userLogs.statusEnded", "Ended")}</Badge></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.device", "Device")}</p><p className="text-foreground capitalize">{selectedSession.device}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.browser", "Browser")}</p><p className="text-foreground">{selectedSession.browser}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.os", "OS")}</p><p className="text-foreground">{selectedSession.os}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.ipAddress", "IP Address")}</p><p className="text-foreground">{selectedSession.ip}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.location", "Location")}</p><p className="text-foreground">{selectedSession.location || t("common.unknown", "Unknown")}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.started", "Started")}</p><p className="text-foreground">{new Intl.DateTimeFormat(locale ?? undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(selectedSession.startedAt))}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.pagesVisited", "Pages Visited")}</p><p className="text-foreground">{selectedSession.pagesVisited}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.actions", "Actions")}</p><p className="text-foreground">{selectedSession.actionsPerformed}</p></div>
                {selectedSession.duration && (
                  <div className="col-span-2"><p className="text-sm text-muted-foreground">{t("superadmin.userLogs.fields.duration", "Duration")}</p><p className="text-foreground">{formatDuration(selectedSession.duration)}</p></div>
                )}
              </div>
              {selectedSession.isActive && (
                <Button variant="destructive" className="w-full" disabled title={t("superadmin.userLogs.terminateNotImplemented", "Session termination not yet implemented")}>
                  {t("superadmin.userLogs.terminateSession", "Terminate Session")}
                </Button>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setSessionDialogOpen(false)}>{t("common.close", "Close")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
