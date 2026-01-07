/**
 * Audit Trail Tab component for User Detail page
 * @module app/superadmin/users/[id]/components/AuditTrailTab
 */

"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import {
  Clock,
  Shield,
  FileText,
  Settings,
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
} from "@/components/ui/icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditLogEntry, Pagination } from "./types";

interface AuditTrailTabProps {
  logs: AuditLogEntry[];
  pagination: Pagination;
  filter: { search: string; action: string; dateRange: string };
  onFilterChange: (filter: { search: string; action: string; dateRange: string }) => void;
  onPageChange: (page: number) => void;
  onLogClick: (log: AuditLogEntry) => void;
  formatDateTime: (date?: string) => string;
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  create: FileText,
  update: Settings,
  delete: Activity,
  login: Shield,
  logout: Shield,
  view: Search,
  default: Activity,
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-500/20 text-green-400 border-green-500/30",
  update: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  delete: "bg-red-500/20 text-red-400 border-red-500/30",
  login: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  logout: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export function AuditTrailTab({
  logs,
  pagination,
  filter,
  onFilterChange,
  onPageChange,
  onLogClick,
  formatDateTime,
}: AuditTrailTabProps) {
  const { t } = useI18n();
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action.toLowerCase()] || ACTION_ICONS.default;
    return Icon;
  };

  const getActionColor = (action: string) => {
    return ACTION_COLORS[action.toLowerCase()] || "bg-muted text-muted-foreground border-border";
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {t("user.auditTrail.title", "Audit Trail")}
        </CardTitle>
        <CardDescription>
          {t("user.auditTrail.description", "Complete audit history of all user actions")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("user.auditTrail.search", "Search audit logs...")}
              value={filter.search}
              onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
              className="ps-10 bg-background border-input"
            />
          </div>
          <Select
            value={filter.action}
            onValueChange={(v) => onFilterChange({ ...filter, action: v })}
          >
            <SelectTrigger className="w-full sm:w-40 bg-background border-input">
              <SelectValue placeholder={t("user.auditTrail.allActions", "All Actions")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("user.auditTrail.allActions", "All Actions")}</SelectItem>
              <SelectItem value="create">{t("user.auditTrail.create", "Create")}</SelectItem>
              <SelectItem value="update">{t("user.auditTrail.update", "Update")}</SelectItem>
              <SelectItem value="delete">{t("user.auditTrail.delete", "Delete")}</SelectItem>
              <SelectItem value="login">{t("user.auditTrail.login", "Login")}</SelectItem>
              <SelectItem value="logout">{t("user.auditTrail.logout", "Logout")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filter.dateRange}
            onValueChange={(v) => onFilterChange({ ...filter, dateRange: v })}
          >
            <SelectTrigger className="w-full sm:w-40 bg-background border-input">
              <SelectValue placeholder={t("user.auditTrail.allTime", "All Time")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("user.auditTrail.allTime", "All Time")}</SelectItem>
              <SelectItem value="today">{t("user.auditTrail.today", "Today")}</SelectItem>
              <SelectItem value="week">{t("user.auditTrail.thisWeek", "This Week")}</SelectItem>
              <SelectItem value="month">{t("user.auditTrail.thisMonth", "This Month")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("user.auditTrail.noLogs", "No audit logs found")}</p>
            </div>
          ) : (
            <div className="relative border-s-2 border-border ps-6 space-y-6 ms-4">
              {logs.map((log) => {
                const Icon = getActionIcon(log.action);
                return (
                  <button
                    type="button"
                    key={log._id}
                    onClick={() => onLogClick(log)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onLogClick(log);
                      }
                    }}
                    tabIndex={0}
                    className="relative block w-full text-start p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={`${log.action} - ${log.entityType} - ${formatDateTime(log.timestamp)}`}
                  >
                    {/* Timeline dot */}
                    <div className="absolute -start-9 top-5 h-4 w-4 rounded-full bg-primary border-4 border-background" />

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-background">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={getActionColor(log.action)}>
                              {log.action.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{log.entityType}</span>
                          </div>
                          <p className="text-sm line-clamp-2">
                            {log.result?.success
                              ? t("user.auditTrail.success", "Operation completed successfully")
                              : log.result?.errorMessage || t("user.auditTrail.failed", "Operation failed")}
                          </p>
                          {(log.ipAddress || log.context?.ipAddress) && (
                            <span className="text-xs text-muted-foreground">
                              IP: {log.ipAddress || log.context?.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(log.timestamp)}
                        </div>
                        {log.result?.success ? (
                          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                            {t("user.auditTrail.successBadge", "Success")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                            {t("user.auditTrail.failedBadge", "Failed")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {t("user.auditTrail.showing", `Showing ${((pagination.page - 1) * pagination.limit) + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {t("user.auditTrail.page", `Page ${pagination.page} of ${totalPages}`)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
