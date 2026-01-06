"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ClientDate from "@/components/ClientDate";
import { formatServerDate } from "@/lib/formatServerDate";
import { logger } from "@/lib/logger";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { ShieldAlert, Loader2, Search, XCircle } from "@/components/ui/icons";
import { DataRefreshTimestamp } from "@/components/common/DataRefreshTimestamp";

// Roles allowed to access audit logs
const ADMIN_ROLES = ["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN"];

// Fixzit primary timezone for audit logs (canonical timeline)
const DEFAULT_TIMEZONE = "Asia/Riyadh";
// Constants at module scope
const LOGS_PER_PAGE = 20;
const API_ENDPOINT = "/api/admin/audit-logs";

interface AuditLog {
  id: string;
  timestamp: string | Date;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  context?: {
    method?: string;
    endpoint?: string;
    ipAddress?: string;
    browser?: string;
    os?: string;
    device?: string;
  };
  result?: {
    success?: boolean;
    errorCode?: string;
    duration?: number;
  };
  changes?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}

interface AuditLogFilters {
  userId?: string;
  entityType?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  /** P119: Filter by user role */
  userRole?: string;
  /** P119: Filter by tenant/organization */
  orgId?: string;
}

export default function AuditLogViewer() {
  const auto = useAutoTranslator("admin.auditLogs");
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // RBAC Check: Only allow admin roles
  const userRole = session?.user?.role as string | undefined;
  const hasAccess = userRole && ADMIN_ROLES.includes(userRole);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/admin/audit-logs");
    }
  }, [status, router]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.append("userId", filters.userId);
      if (filters.entityType) params.append("entityType", filters.entityType);
      if (filters.action) params.append("action", filters.action);
      // P119: Add RBAC role and tenant filters
      if (filters.userRole) params.append("userRole", filters.userRole);
      if (filters.orgId) params.append("orgId", filters.orgId);
      if (filters.startDate) {
        // Convert to ISO string at start of day in UTC
        const startDate = new Date(filters.startDate);
        startDate.setUTCHours(0, 0, 0, 0);
        params.append("startDate", startDate.toISOString());
      }
      if (filters.endDate) {
        // Convert to ISO string at end of day in UTC
        const endDate = new Date(filters.endDate);
        endDate.setUTCHours(23, 59, 59, 999);
        params.append("endDate", endDate.toISOString());
      }
      params.append("page", page.toString());
      params.append("limit", LOGS_PER_PAGE.toString());

      const response = await fetch(`${API_ENDPOINT}?${params}`, {
        credentials: "include", // Ensure cookies are sent for authentication
      });
      if (!response.ok) {
        // Provide more specific error messages based on status
        let errorMessage = auto(
          "An unexpected error occurred while loading audit logs",
          "errors.loadUnexpected",
        );
        if (response.status === 401) {
          errorMessage = auto(
            "You are not authorized to view audit logs. Please log in again.",
            "errors.unauthorized",
          );
        } else if (response.status === 403) {
          errorMessage = auto(
            "You do not have permission to access audit logs.",
            "errors.forbidden",
          );
        } else if (response.status === 404) {
          errorMessage = auto(
            "Audit log service not found. Please contact support.",
            "errors.notFound",
          );
        } else if (response.status >= 500) {
          errorMessage = auto(
            "Server error occurred while fetching audit logs. Please try again later.",
            "errors.server",
          );
        } else if (response.status >= 400) {
          errorMessage = auto(
            "Invalid request. Please check your filters and try again.",
            "errors.invalidRequest",
          );
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Validate response structure
      if (!data || typeof data !== "object") {
        throw new Error(
          auto(
            "Invalid response format from audit log service",
            "errors.invalidResponse",
          ),
        );
      }

      const logs = Array.isArray(data.logs) ? data.logs : [];
      const total = typeof data.total === "number" ? data.total : logs.length;
      const pages =
        typeof data.pages === "number"
          ? data.pages
          : Math.max(1, Math.ceil(total / LOGS_PER_PAGE));

      setLogs(logs);
      setTotalLogs(total);
      setTotalPages(pages);
      setLastRefresh(new Date()); // P127: Track last refresh timestamp

      if (page > pages) {
        setPage(pages);
      }
    } catch (err) {
      logger.error(
        "Failed to fetch audit logs",
        err instanceof Error ? err : new Error(String(err)),
        { route: "/admin/audit-logs", page, filters },
      );

      // Handle different error types with user-friendly messages
      let errorMessage = auto(
        "An unexpected error occurred. Please try again.",
        "errors.generic",
      );

      if (err instanceof TypeError && err.message.includes("fetch")) {
        errorMessage = auto(
          "Network error occurred. Please check your connection and try again.",
          "errors.network",
        );
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setLogs([]);
      setTotalLogs(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [auto, filters, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied if no permission
  if (status === "authenticated" && !hasAccess) {
    return (
      <div className="container max-w-2xl py-16 px-4">
        <Card className="border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">
              {auto("Access Denied", "accessDenied")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p className="mb-4">
              {auto(
                "You do not have permission to access Audit Logs. This page is restricted to Admin users only.",
                "noPermission"
              )}
            </p>
            <Button variant="outline" onClick={() => router.push("/dashboard")} aria-label={auto("Go back to dashboard", "backToDashboardAria")}>
              {auto("Back to Dashboard", "backToDashboard")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "text-success bg-success/10 dark:bg-success/10 dark:text-success";
      case "UPDATE":
        return "text-primary bg-primary/10 dark:bg-primary/10 dark:text-primary";
      case "DELETE":
        return "text-destructive bg-destructive/10 dark:bg-destructive/10 dark:text-destructive";
      case "LOGIN":
        return "text-secondary bg-secondary/10 dark:bg-secondary/10 dark:text-secondary";
      case "LOGOUT":
        return "text-muted-foreground bg-muted";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const pageStart = (page - 1) * LOGS_PER_PAGE + 1;
  const pageEnd = Math.min(page * LOGS_PER_PAGE, totalLogs);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {auto("Audit Log", "header.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {auto("View all system activity and user actions", "header.subtitle")}
          </p>
        </div>
        {/* P127: Data refresh timestamp with manual refresh */}
        <DataRefreshTimestamp
          lastRefresh={lastRefresh}
          onRefresh={fetchLogs}
          isRefreshing={loading}
          autoRefreshSeconds={60}
          showRelativeTime
        />
      </div>

      {/* Error Alert - Show at top level for better visibility */}
      {error && (
        <div className="bg-destructive/10 dark:bg-destructive/10 border border-destructive/20 dark:border-destructive/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-destructive dark:text-destructive flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-destructive-foreground dark:text-destructive-foreground mb-1">
                {auto("Error Loading Audit Logs", "errors.alertTitle")}
              </h3>
              <p className="text-sm text-destructive dark:text-destructive break-words">
                {error}
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button"
                  onClick={() => {
                    setError(null);
                    fetchLogs();
                  }}
                  className="inline-flex items-center gap-1 text-sm font-medium text-destructive-foreground dark:text-destructive-foreground hover:text-destructive-foreground dark:hover:text-destructive-foreground focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 dark:focus:ring-offset-destructive rounded px-2 py-1"
                  aria-label={auto("Try Again", "common.tryAgain")}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {auto("Try Again", "common.tryAgain")}
                </button>
                <button type="button"
                  onClick={() => setError(null)}
                  className="text-sm font-medium text-destructive dark:text-destructive hover:text-destructive dark:hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 dark:focus:ring-offset-destructive rounded px-2 py-1"
                  aria-label={auto("Dismiss", "common.dismiss")}
                >
                  {auto("Dismiss", "common.dismiss")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Row 1: Search input - full width */}
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={auto("Search by org ID or name...", "filters.orgPlaceholder")}
                value={filters.orgId || ""}
                onChange={(e) => {
                  setFilters({ ...filters, orgId: e.target.value || undefined });
                  setPage(1);
                }}
                className="ps-10 bg-muted border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {/* Row 2: Filter dropdowns - horizontal */}
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <Select
                value={filters.action || ""}
                onValueChange={(value) => {
                  setFilters({ ...filters, action: value || undefined });
                  setPage(1);
                }}
                className="w-full sm:w-40 bg-muted border-input text-foreground"
              >
                <SelectItem value="">{auto("All Actions", "filters.actions.all")}</SelectItem>
                <SelectItem value="CREATE">{auto("Create", "filters.actions.create")}</SelectItem>
                <SelectItem value="READ">{auto("Read", "filters.actions.read")}</SelectItem>
                <SelectItem value="UPDATE">{auto("Update", "filters.actions.update")}</SelectItem>
                <SelectItem value="DELETE">{auto("Delete", "filters.actions.delete")}</SelectItem>
                <SelectItem value="LOGIN">{auto("Login", "filters.actions.login")}</SelectItem>
                <SelectItem value="LOGOUT">{auto("Logout", "filters.actions.logout")}</SelectItem>
                <SelectItem value="EXPORT">{auto("Export", "filters.actions.export")}</SelectItem>
                <SelectItem value="IMPORT">{auto("Import", "filters.actions.import")}</SelectItem>
                <SelectItem value="APPROVE">{auto("Approve", "filters.actions.approve")}</SelectItem>
                <SelectItem value="REJECT">{auto("Reject", "filters.actions.reject")}</SelectItem>
              </Select>
              <Select
                value={filters.entityType || ""}
                onValueChange={(value) => {
                  setFilters({ ...filters, entityType: value || undefined });
                  setPage(1);
                }}
                className="w-full sm:w-40 bg-muted border-input text-foreground"
              >
                <SelectItem value="">{auto("All Types", "filters.entityTypes.all")}</SelectItem>
                <SelectItem value="USER">{auto("User", "filters.entityTypes.user")}</SelectItem>
                <SelectItem value="PROPERTY">{auto("Property", "filters.entityTypes.property")}</SelectItem>
                <SelectItem value="TENANT">{auto("Tenant", "filters.entityTypes.tenant")}</SelectItem>
                <SelectItem value="CONTRACT">{auto("Contract", "filters.entityTypes.contract")}</SelectItem>
                <SelectItem value="PAYMENT">{auto("Payment", "filters.entityTypes.payment")}</SelectItem>
                <SelectItem value="WORKORDER">{auto("Work Order", "filters.entityTypes.workOrder")}</SelectItem>
                <SelectItem value="VENDOR">{auto("Vendor", "filters.entityTypes.vendor")}</SelectItem>
              </Select>
              <Select
                value={filters.userRole || ""}
                onValueChange={(value) => {
                  setFilters({ ...filters, userRole: value || undefined });
                  setPage(1);
                }}
                className="w-full sm:w-40 bg-muted border-input text-foreground"
              >
                <SelectItem value="">{auto("All Roles", "filters.roles.all")}</SelectItem>
                <SelectItem value="SUPER_ADMIN">{auto("Super Admin", "filters.roles.superAdmin")}</SelectItem>
                <SelectItem value="ADMIN">{auto("Admin", "filters.roles.admin")}</SelectItem>
                <SelectItem value="FINANCE">{auto("Finance", "filters.roles.finance")}</SelectItem>
                <SelectItem value="PROPERTY_MANAGER">{auto("Property Manager", "filters.roles.propertyManager")}</SelectItem>
                <SelectItem value="VENDOR">{auto("Vendor", "filters.roles.vendor")}</SelectItem>
              </Select>
              <input
                type="date"
                className="h-10 px-3 rounded-md bg-muted border border-input text-foreground text-sm"
                value={filters.startDate ? filters.startDate.toISOString().split("T")[0] : ""}
                max={filters.endDate ? filters.endDate.toISOString().split("T")[0] : undefined}
                onChange={(e) => {
                  const value = e.target.value ? new Date(e.target.value + "T00:00:00") : undefined;
                  setFilters({ ...filters, startDate: value });
                  setPage(1);
                }}
                aria-label={auto("Start Date", "filters.startDate")}
              />
              <input
                type="date"
                className="h-10 px-3 rounded-md bg-muted border border-input text-foreground text-sm"
                value={filters.endDate ? filters.endDate.toISOString().split("T")[0] : ""}
                min={filters.startDate ? filters.startDate.toISOString().split("T")[0] : undefined}
                onChange={(e) => {
                  const value = e.target.value ? new Date(e.target.value + "T23:59:59") : undefined;
                  setFilters({ ...filters, endDate: value });
                  setPage(1);
                }}
                aria-label={auto("End Date", "filters.endDate")}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({});
                  setPage(1);
                }}
              >
                <XCircle className="h-4 w-4 me-2" />
                {auto("Clear", "filters.clear")}
              </Button>
            </div>
            {/* Row 3: Quick filter presets */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    userRole: "super_admin",
                    action: undefined,
                    entityType: "TENANT",
                    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    endDate: new Date(),
                  });
                  setPage(1);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50 transition-colors"
                aria-label={auto("Tenant Escalations", "presets.tenantEscalations")}
              >
                🏢 {auto("Tenant Escalations", "presets.tenantEscalations")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    action: "UPDATE",
                    entityType: "USER",
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: new Date(),
                  });
                  setPage(1);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 transition-colors"
                aria-label={auto("RBAC Changes", "presets.rbacChanges")}
              >
                🛡️ {auto("RBAC Changes", "presets.rbacChanges")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    action: "DELETE",
                    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    endDate: new Date(),
                  });
                  setPage(1);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors"
                aria-label={auto("Recent Deletions", "presets.recentDeletions")}
              >
                🗑️ {auto("Recent Deletions", "presets.recentDeletions")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    action: "LOGIN",
                    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    endDate: new Date(),
                  });
                  setPage(1);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
                aria-label={auto("Today's Logins", "presets.todaysLogins")}
              >
                🔑 {auto("Today's Logins", "presets.todaysLogins")}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">
              {auto("Loading audit logs...", "table.loading")}
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">
              {auto("No audit logs found", "table.empty")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {auto("Timestamp", "table.columns.timestamp")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {auto("Action", "table.columns.action")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {auto("Entity", "table.columns.entity")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {auto("User", "table.columns.user")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {auto("IP Address", "table.columns.ip")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {auto("Status", "table.columns.status")}
                  </th>
                  <th className="px-6 py-3 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {auto("Actions", "table.columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {formatServerDate(
                        log.timestamp,
                        "medium",
                        undefined,
                        DEFAULT_TIMEZONE,
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <div>{log.entityType}</div>
                      {log.entityName && (
                        <div className="text-xs text-muted-foreground">
                          {log.entityName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <div>{log.userName}</div>
                      <div className="text-xs text-muted-foreground">
                        {log.userEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {log.context?.ipAddress ?? "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.result?.success ? (
                        <span className="text-success">
                          ✓ {auto("Success", "table.status.success")}
                        </span>
                      ) : (
                        <span className="text-destructive">
                          ✗ {auto("Failed", "table.status.failed")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-end text-sm">
                      <button type="button"
                        onClick={() => setSelectedLog(log)}
                        className="text-primary hover:text-primary-foreground dark:text-primary dark:hover:text-primary/80"
                        aria-label={auto("View Details", "table.actions.viewDetails")}
                      >
                        {auto("View Details", "table.actions.viewDetails")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && logs.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-foreground">
              {auto(
                "Showing {{start}} to {{end}} of {{total}} results",
                "pagination.summary",
                {
                  start: pageStart,
                  end: pageEnd,
                  total: totalLogs,
                },
              )}
            </div>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-2xl hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={auto("Previous", "pagination.previous")}
              >
                {auto("Previous", "pagination.previous")}
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button type="button"
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-4 py-2 text-sm font-medium rounded-2xl ${
                        page === pageNum
                          ? "bg-primary text-white"
                          : "text-foreground bg-background border border-border hover:bg-muted"
                      }`}
                      aria-label={`Page ${pageNum}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-2xl hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={auto("Next", "pagination.next")}
              >
                {auto("Next", "pagination.next")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLog(null);
          }}
        >
          <div className="bg-popover rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-border">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2
                  id="modal-title"
                  className="text-2xl font-bold text-foreground"
                >
                  {auto("Audit Log Details", "modal.title")}
                </h2>
                <button type="button"
                  onClick={() => setSelectedLog(null)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={auto("Close modal", "modal.closeAria")}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {auto("Timestamp", "modal.timestamp")}
                  </h3>
                  <p className="mt-1 text-foreground">
                    <ClientDate
                      date={selectedLog.timestamp}
                      format="full"
                      timeZone={DEFAULT_TIMEZONE}
                    />
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {auto("Action", "modal.action")}
                  </h3>
                  <p className="mt-1 text-foreground">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(selectedLog.action)}`}
                    >
                      {selectedLog.action}
                    </span>
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {auto("User", "modal.user")}
                  </h3>
                  <p className="mt-1 text-foreground">
                    {selectedLog.userName} ({selectedLog.userEmail})
                    <span className="ms-2 text-xs text-muted-foreground">
                      {auto("Role", "modal.roleLabel")}: {selectedLog.userRole}
                    </span>
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {auto("Entity", "modal.entity")}
                  </h3>
                  <p className="mt-1 text-foreground">
                    {selectedLog.entityType}
                    {selectedLog.entityName && ` - ${selectedLog.entityName}`}
                    {selectedLog.entityId && (
                      <span className="ms-2 text-xs text-muted-foreground">
                        {auto("ID", "modal.entityId")}: {selectedLog.entityId}
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {auto("Context", "modal.context")}
                  </h3>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted p-2 rounded-2xl">
                      <span className="font-medium">
                        {auto("Method", "modal.contextMethod")}:
                      </span>{" "}
                      {selectedLog.context?.method ?? "—"}
                    </div>
                    <div className="bg-muted p-2 rounded-2xl">
                      <span className="font-medium">
                        {auto("IP", "modal.contextIp")}:
                      </span>{" "}
                      {selectedLog.context?.ipAddress ?? "—"}
                    </div>
                    <div className="bg-muted p-2 rounded-2xl">
                      <span className="font-medium">
                        {auto("Browser", "modal.contextBrowser")}:
                      </span>{" "}
                      {selectedLog.context?.browser ?? "—"}
                    </div>
                    <div className="bg-muted p-2 rounded-2xl">
                      <span className="font-medium">
                        {auto("OS", "modal.contextOs")}:
                      </span>{" "}
                      {selectedLog.context?.os ?? "—"}
                    </div>
                    <div className="bg-muted p-2 rounded-2xl">
                      <span className="font-medium">
                        {auto("Device", "modal.contextDevice")}:
                      </span>{" "}
                      {selectedLog.context?.device ?? "—"}
                    </div>
                    <div className="bg-muted p-2 rounded-2xl">
                      <span className="font-medium">
                        {auto("Endpoint", "modal.contextEndpoint")}:
                      </span>{" "}
                      {selectedLog.context?.endpoint ?? "—"}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {auto("Result", "modal.result")}
                  </h3>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted p-2 rounded-2xl">
                      <span className="font-medium">
                        {auto("Success", "modal.resultSuccess")}:
                      </span>{" "}
                      {selectedLog.result?.success
                        ? auto("Yes", "modal.resultYes")
                        : auto("No", "modal.resultNo")}
                    </div>
                    {selectedLog.result?.errorCode && (
                      <div className="bg-destructive/10 dark:bg-destructive/10 p-2 rounded-2xl">
                        <span className="font-medium text-destructive dark:text-destructive">
                          {auto("Error Code", "modal.resultErrorCode")}:
                        </span>{" "}
                        {selectedLog.result.errorCode}
                      </div>
                    )}
                    {selectedLog.result?.duration !== undefined && (
                      <div className="bg-muted p-2 rounded-2xl">
                        <span className="font-medium">
                          {auto("Duration", "modal.resultDuration")}:
                        </span>{" "}
                        {selectedLog.result?.duration}{" "}
                        {auto("ms", "modal.durationUnit")}
                      </div>
                    )}
                  </div>
                </div>

                {selectedLog.changes && selectedLog.changes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {auto("Changes", "modal.changes")}
                    </h3>
                    <div className="mt-1 space-y-2">
                      {selectedLog.changes.map((change) => (
                        <div
                          key={change.field}
                          className="p-2 rounded-2xl bg-muted"
                        >
                          <div className="flex gap-2">
                            <span className="font-medium">{change.field}:</span>
                            <span className="text-foreground">
                              {JSON.stringify(change.oldValue)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-medium">→</span>
                            <span className="text-foreground">
                              {JSON.stringify(change.newValue)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
