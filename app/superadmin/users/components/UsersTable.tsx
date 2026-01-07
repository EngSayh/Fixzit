/**
 * Users table component for Superadmin Users list
 * @module app/superadmin/users/components/UsersTable
 */

"use client";

import React, { useMemo, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import {
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckSquare,
  Square,
  MinusSquare,
} from "@/components/ui/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserData, Pagination, GroupByOption } from "./types";
import { UserRow } from "./UserRow";

interface UsersTableProps {
  users: UserData[];
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  groupBy: GroupByOption;
  showModuleAccess: boolean;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onEditStatus: (user: UserData) => void;
  onEditRole: (user: UserData) => void;
  onViewPermissions: (user: UserData) => void;
  onEditPermissions: (user: UserData) => void;
  onSendNotification: (userId: string) => void;
  onRetry: () => void;
  onPageChange: (newPage: number) => void;
}

export function UsersTable({
  users,
  pagination,
  loading,
  error,
  selectedIds,
  groupBy,
  showModuleAccess,
  onToggleSelectAll,
  onToggleSelect,
  onEditStatus,
  onEditRole,
  onViewPermissions,
  onEditPermissions,
  onSendNotification,
  onRetry,
  onPageChange,
}: UsersTableProps) {
  const { t } = useI18n();

  const allSelected = useMemo(() => {
    if (users.length === 0) return false;
    return users.every(user => selectedIds.has(user._id));
  }, [users, selectedIds]);

  const someSelected = useMemo(() => {
    return selectedIds.size > 0 && !allSelected;
  }, [selectedIds, allSelected]);

  // Group users by the selected grouping option
  const groupedUsers = useMemo(() => {
    if (groupBy === "none") return null;
    
    const groups: Record<string, UserData[]> = {};
    
    users.forEach(user => {
      let key: string;
      switch (groupBy) {
        case "organization":
          key = user.orgName || "No Organization";
          break;
        case "role":
          key = user.professional?.role || user.role || "No Role";
          break;
        case "status":
          key = user.status;
          break;
        default:
          key = "Other";
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(user);
    });
    
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [users, groupBy]);

  const handleKeyDownSelectAll = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggleSelectAll();
    }
  }, [onToggleSelectAll]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Users className="h-5 w-5" />
          Users
          {pagination && (
            <span className="text-sm font-normal text-muted-foreground">
              ({pagination.total} total)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={onRetry} 
              aria-label={t("common.tryAgain", "Try again to load users")} 
              title={t("common.tryAgain", "Try again to load users")}
            >
              Try Again
            </Button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table role="grid" aria-label={t("superadmin.users.table", "Users table")}>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-12 text-muted-foreground">
                    <button
                      type="button"
                      onClick={onToggleSelectAll}
                      onKeyDown={handleKeyDownSelectAll}
                      className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      title={allSelected ? "Deselect all" : "Select all"}
                      aria-label={allSelected ? t("superadmin.users.deselectAll", "Deselect all users") : t("superadmin.users.selectAll", "Select all users")}
                    >
                      {allSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-500" />
                      ) : someSelected ? (
                        <MinusSquare className="h-4 w-4 text-blue-400" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-muted-foreground">User</TableHead>
                  <TableHead className="text-muted-foreground w-24">User ID</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Role</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Organization</TableHead>
                  <TableHead className="text-muted-foreground">Phone</TableHead>
                  <TableHead className="text-muted-foreground">Last Login</TableHead>
                  {showModuleAccess && (
                    <TableHead className="text-muted-foreground">Module Access</TableHead>
                  )}
                  <TableHead className="text-muted-foreground text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupBy !== "none" && groupedUsers ? (
                  // Grouped view
                  groupedUsers.map(([groupName, groupUsers]) => (
                    <React.Fragment key={groupName}>
                      {/* Group Header Row */}
                      <TableRow className="bg-muted/50 border-border hover:bg-muted/70">
                        <TableCell colSpan={showModuleAccess ? 11 : 10} className="py-2">
                          <div className="flex items-center gap-2">
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-foreground">{groupName}</span>
                            <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-input">
                              {groupUsers.length} user{groupUsers.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Group Users */}
                      {groupUsers.map((user) => (
                        <UserRow
                          key={user._id}
                          user={user}
                          isSelected={selectedIds.has(user._id)}
                          onToggleSelect={onToggleSelect}
                          onEditStatus={onEditStatus}
                          onEditRole={onEditRole}
                          onViewPermissions={onViewPermissions}
                          onEditPermissions={onEditPermissions}
                          onSendNotification={onSendNotification}
                          showModuleAccess={showModuleAccess}
                        />
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  // Regular view (no grouping)
                  users.map((user) => (
                    <UserRow
                      key={user._id}
                      user={user}
                      isSelected={selectedIds.has(user._id)}
                      onToggleSelect={onToggleSelect}
                      onEditStatus={onEditStatus}
                      onEditRole={onEditRole}
                      onViewPermissions={onViewPermissions}
                      onEditPermissions={onEditPermissions}
                      onSendNotification={onSendNotification}
                      showModuleAccess={showModuleAccess}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {t("pagination.pageOf", { current: pagination.page, total: pagination.totalPages })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrev || loading}
                onClick={() => onPageChange(pagination.page - 1)}
                className="border-input"
                aria-label={t("pagination.previous", "Go to previous page")}
                title={t("pagination.previous", "Go to previous page")}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNext || loading}
                onClick={() => onPageChange(pagination.page + 1)}
                className="border-input"
                aria-label={t("pagination.next", "Go to next page")}
                title={t("pagination.next", "Go to next page")}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
