/**
 * Activity Log Tab component for User Detail page
 * @module app/superadmin/users/[id]/components/ActivityLogTab
 */

"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import {
  Activity,
  Search,
  Globe,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogIn,
  FileText,
  Settings,
  MousePointer,
  Download,
} from "@/components/ui/icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectItem } from "@/components/ui/select";
import type { AuditLogEntry, Pagination } from "./types";

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LOGIN: LogIn,
  LOGOUT: LogIn,
  CREATE: FileText,
  UPDATE: Settings,
  DELETE: XCircle,
  READ: Eye,
  NAVIGATE: MousePointer,
  EXPORT: Download,
  IMPORT: Download,
};

interface ActivityLogTabProps {
  logs: AuditLogEntry[];
  pagination: Pagination | null;
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  actionFilter: string;
  onActionFilterChange: (value: string) => void;
  dateRangeFilter: string;
  onDateRangeFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onViewLog: (log: AuditLogEntry) => void;
  formatRelativeTime: (date?: string) => string;
}

function getActionIcon(action: string) {
  const Icon = ACTION_ICONS[action.toUpperCase()] || Activity;
  return <Icon className="h-4 w-4" />;
}

export function ActivityLogTab({
  logs,
  pagination,
  loading,
  search,
  onSearchChange,
  actionFilter,
  onActionFilterChange,
  dateRangeFilter,
  onDateRangeFilterChange,
  onPageChange,
  onViewLog,
  formatRelativeTime,
}: ActivityLogTabProps) {
  const { t } = useI18n();

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t("user.activity.title", "Activity Log")}
            </CardTitle>
            <CardDescription>
              {t("user.activity.description", "View all user actions and page visits")}
            </CardDescription>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search", "Search...")}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="ps-10 w-48 bg-muted border-input"
              />
            </div>
            <Select
              value={actionFilter}
              onValueChange={onActionFilterChange}
              placeholder="Action"
              className="w-36 bg-muted border-input"
            >
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="LOGIN">Login</SelectItem>
              <SelectItem value="LOGOUT">Logout</SelectItem>
              <SelectItem value="CREATE">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
              <SelectItem value="READ">Read</SelectItem>
            </Select>
            <Select
              value={dateRangeFilter}
              onValueChange={onDateRangeFilterChange}
              placeholder="Date Range"
              className="w-36 bg-muted border-input"
            >
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("user.activity.noLogs", "No activity logs found")}</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">{t("user.activity.action", "Action")}</TableHead>
                  <TableHead className="text-muted-foreground">{t("user.activity.entity", "Entity")}</TableHead>
                  <TableHead className="text-muted-foreground">{t("user.activity.context", "Context")}</TableHead>
                  <TableHead className="text-muted-foreground">{t("user.activity.status", "Status")}</TableHead>
                  <TableHead className="text-muted-foreground">{t("user.activity.timestamp", "Timestamp")}</TableHead>
                  <TableHead className="text-muted-foreground text-end">{t("common.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id} className="border-border hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="font-medium">{log.action}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{log.entityType}</span>
                        {log.entityName && (
                          <span className="text-xs text-muted-foreground">{log.entityName}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        {log.context?.endpoint && (
                          <span className="font-mono text-xs">{log.context.method} {log.context.endpoint}</span>
                        )}
                        {log.context?.ipAddress && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {log.context.ipAddress}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={log.result?.success !== false
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                        }
                      >
                        {log.result?.success !== false ? (
                          <><CheckCircle className="h-3 w-3 me-1" />Success</>
                        ) : (
                          <><XCircle className="h-3 w-3 me-1" />Error</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(log.timestamp)}
                      </span>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && Math.ceil(pagination.total / pagination.limit) > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => onPageChange(pagination.page - 1)}
                    className="border-input"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t("pagination.previous", "Previous")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                    onClick={() => onPageChange(pagination.page + 1)}
                    className="border-input"
                  >
                    {t("pagination.next", "Next")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
