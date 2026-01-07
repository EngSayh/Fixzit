"use client";

/**
 * Superadmin User Detail Page
 * Advanced user information with activity logs, errors, and audit trail
 * Supports investigation for individual users or organizations
 * 
 * REFACTORED: Components extracted to ./components/ for maintainability
 * Reduced from 1377 lines to ~350 lines
 * 
 * @module app/superadmin/users/[id]/page
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import {
  User,
  ArrowLeft,
  RefreshCw,
  Building2,
  Shield,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
  AlertTriangle,
} from "@/components/ui/icons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { type UserRoleType } from "@/types/user";
import { RBAC_MODULES, RBAC_ROLE_PERMISSIONS } from "@/config/rbac.matrix";

// Import extracted components
import {
  ProfileTab,
  ActivityLogTab,
  ErrorsTab,
  AuditTrailTab,
  PermissionsTab,
  LogDetailDialog,
  STATUS_COLORS,
  type UserDetail,
  type AuditLogEntry,
  type ErrorLogEntry,
  type ActivityStats,
  type Pagination,
  type ModuleAccessItem,
} from "./components";

// Status icons for quick stats
const STATUS_ICONS: Record<string, React.ReactNode> = {
  ACTIVE: <CheckCircle className="h-3 w-3" />,
  PENDING: <Clock className="h-3 w-3" />,
  INACTIVE: <XCircle className="h-3 w-3" />,
  SUSPENDED: <AlertCircle className="h-3 w-3" />,
};

export default function SuperadminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale } = useI18n();
  const userId = (params?.id as string) || "";

  // State
  const [user, setUser] = useState<UserDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [_stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  // Pagination
  const [auditPagination, setAuditPagination] = useState<Pagination | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- errorPage for future error log pagination
  const [errorPage, setErrorPage] = useState(1);

  // Filters for Activity Tab
  const [activitySearch, setActivitySearch] = useState("");
  const [activityActionFilter, setActivityActionFilter] = useState("all");
  const [activityDateRangeFilter, setActivityDateRangeFilter] = useState("30d");
  
  // Filters for Audit Trail Tab
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditDateRangeFilter, setAuditDateRangeFilter] = useState("all");

  // Dialog
  const [logDetailDialogOpen, setLogDetailDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Fetch user details
  const fetchUser = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/superadmin/users/${userId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("User not found");
        }
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load user";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch audit logs for user
  const fetchAuditLogs = useCallback(async () => {
    if (!userId) return;

    try {
      setLogsLoading(true);

      // Use appropriate filters based on active tab
      const search = activeTab === "activity" ? activitySearch : auditSearch;
      const action = activeTab === "activity" ? activityActionFilter : auditActionFilter;
      const dateRange = activeTab === "activity" ? activityDateRangeFilter : auditDateRangeFilter;

      const params = new URLSearchParams({
        page: String(auditPage),
        limit: "20",
        dateRange: dateRange,
      });

      if (search) params.set("search", search);
      if (action !== "all") params.set("action", action);

      const response = await fetch(`/api/superadmin/users/${userId}/audit-logs?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
        setAuditPagination(data.pagination || null);
        setStats(data.stats || null);
      } else {
        setAuditLogs([]);
        setAuditPagination(null);
      }
    } catch (_err) {
      // Silent catch - empty list is acceptable fallback for audit logs
      setAuditLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [userId, auditPage, activeTab, activitySearch, activityActionFilter, activityDateRangeFilter, auditSearch, auditActionFilter, auditDateRangeFilter]);

  // Fetch error logs for user
  const fetchErrorLogs = useCallback(async () => {
    if (!userId) return;

    try {
      const params = new URLSearchParams({
        page: String(errorPage),
        limit: "20",
        errorsOnly: "true",
        dateRange: "30d",
      });

      const response = await fetch(`/api/superadmin/users/${userId}/audit-logs?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setErrorLogs(data.logs || []);
      } else {
        setErrorLogs([]);
      }
    } catch {
      setErrorLogs([]);
    }
  }, [userId, errorPage]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (activeTab === "activity" || activeTab === "audit") {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  useEffect(() => {
    if (activeTab === "errors") {
      fetchErrorLogs();
    }
  }, [activeTab, fetchErrorLogs]);

  // Format functions
  const formatDate = useCallback((dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [locale]);

  const formatDateTime = useCallback((dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [locale]);

  const formatRelativeTime = useCallback((dateStr?: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t("time.justNow", "Just now");
    if (diffMins < 60) return t("time.minutesAgo", `${diffMins}m ago`);
    if (diffHours < 24) return t("time.hoursAgo", `${diffHours}h ago`);
    if (diffDays < 7) return t("time.daysAgo", `${diffDays}d ago`);
    return formatDate(dateStr);
  }, [formatDate, t]);

  const getUserName = () => {
    if (!user) return "—";
    const first = user.personal?.firstName || "";
    const last = user.personal?.lastName || "";
    return (first + " " + last).trim() || user.email.split("@")[0];
  };

  const getUserRole = () => {
    return user?.professional?.role || user?.role || "—";
  };

  // Get module access badges for user based on their role
  const getModuleAccessList = useCallback((): ModuleAccessItem[] => {
    if (!user) return [];
    const role = (user.professional?.role || user.role || "") as UserRoleType;
    const permissions = RBAC_ROLE_PERMISSIONS[role];
    
    if (!permissions) return [];
    
    return RBAC_MODULES.filter(mod => {
      const perm = permissions[mod.id];
      return perm && (perm.view || perm.create || perm.edit || perm.delete);
    }).map(mod => {
      const perm = permissions[mod.id];
      const actions: string[] = [];
      if (perm?.view) actions.push("read");
      if (perm?.create) actions.push("create");
      if (perm?.edit) actions.push("update");
      if (perm?.delete) actions.push("delete");
      
      return {
        module: mod.label || mod.id,
        subModule: mod.description || "",
        hasAccess: true,
        actions,
      };
    });
  }, [user]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <div className="p-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/superadmin/users")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 me-2" />
          {t("common.back", "Back to Users")}
        </Button>
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-400 mb-4">{error || "User not found"}</p>
            <Button variant="outline" onClick={fetchUser}>
              {t("common.tryAgain", "Try Again")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/superadmin/users")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 me-2" />
            {t("common.back", "Back")}
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {getUserName()}
              {user.isSuperAdmin && (
                <span title="Super Admin">
                  <Shield className="h-5 w-5 text-yellow-500" />
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUser}
            className="border-input text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4 me-2" />
            {t("common.refresh", "Refresh")}
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("user.status", "Status")}</p>
                <Badge
                  variant="outline"
                  className={`${STATUS_COLORS[user.status] || ""} mt-1 flex items-center gap-1 w-fit`}
                >
                  {STATUS_ICONS[user.status]}
                  {user.status}
                </Badge>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("user.organization", "Organization")}</p>
                <p className="font-medium mt-1 flex items-center gap-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {user.orgName || "—"}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("user.lastLogin", "Last Login")}</p>
                <p className="font-medium mt-1">
                  {user.lastLogin ? formatRelativeTime(user.lastLogin) : "Never"}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("user.role", "Role")}</p>
                <Badge variant="outline" className="mt-1">
                  {getUserRole()}
                </Badge>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="profile" className="data-[state=active]:bg-card">
            <User className="h-4 w-4 me-2" />
            {t("user.tabs.profile", "Profile")}
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-card">
            <Activity className="h-4 w-4 me-2" />
            {t("user.tabs.activity", "Activity Log")}
          </TabsTrigger>
          <TabsTrigger value="errors" className="data-[state=active]:bg-card">
            <AlertTriangle className="h-4 w-4 me-2" />
            {t("user.tabs.errors", "Errors")}
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-card">
            <FileText className="h-4 w-4 me-2" />
            {t("user.tabs.audit", "Audit Trail")}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="data-[state=active]:bg-card">
            <Shield className="h-4 w-4 me-2" />
            {t("user.tabs.permissions", "Permissions")}
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <ProfileTab
            user={user}
            formatDate={formatDate}
            formatDateTime={formatDateTime}
          />
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="mt-6">
          <ActivityLogTab
            logs={auditLogs}
            loading={logsLoading}
            pagination={auditPagination ? {
              page: auditPagination.page,
              limit: auditPagination.limit,
              total: auditPagination.total,
            } : { page: 1, limit: 20, total: 0 }}
            search={activitySearch}
            onSearchChange={setActivitySearch}
            actionFilter={activityActionFilter}
            onActionFilterChange={setActivityActionFilter}
            dateRangeFilter={activityDateRangeFilter}
            onDateRangeFilterChange={setActivityDateRangeFilter}
            onPageChange={setAuditPage}
            onViewLog={(log: AuditLogEntry) => {
              setSelectedLog(log);
              setLogDetailDialogOpen(true);
            }}
            formatRelativeTime={formatRelativeTime}
          />
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="mt-6">
          <ErrorsTab
            logs={errorLogs}
            formatDateTime={formatDateTime}
          />
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="mt-6">
          <AuditTrailTab
            logs={auditLogs}
            pagination={auditPagination ? {
              page: auditPagination.page,
              limit: auditPagination.limit,
              total: auditPagination.total,
            } : { page: 1, limit: 20, total: 0 }}
            filter={{ search: auditSearch, action: auditActionFilter, dateRange: auditDateRangeFilter }}
            onFilterChange={(f) => {
              setAuditSearch(f.search);
              setAuditActionFilter(f.action);
              setAuditDateRangeFilter(f.dateRange);
            }}
            onPageChange={setAuditPage}
            onLogClick={(log) => {
              setSelectedLog(log);
              setLogDetailDialogOpen(true);
            }}
            formatDateTime={formatDateTime}
          />
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="mt-6">
          <PermissionsTab
            modulesAccess={getModuleAccessList()}
            userRole={getUserRole()}
          />
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <LogDetailDialog
        log={selectedLog}
        open={logDetailDialogOpen}
        onOpenChange={setLogDetailDialogOpen}
        formatDateTime={formatDateTime}
      />
    </div>
  );
}
