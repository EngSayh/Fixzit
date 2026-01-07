/**
 * Bulk actions header component for Superadmin Users list
 * @module app/superadmin/users/components/BulkActionsHeader
 */

"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import {
  UserPlus,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Bell,
  Trash2,
  Download,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserData } from "./types";

interface BulkActionsHeaderProps {
  selectedCount: number;
  loading: boolean;
  users: UserData[];
  onCreateUser: () => void;
  onRefresh: () => void;
  onBulkStatus: () => void;
  onSendNotification: () => void;
  onBulkDelete: () => void;
}

/**
 * Export users to CSV
 */
function exportUsersToCSV(users: UserData[]): void {
  // CSV Headers
  const headers = [
    "User ID",
    "Email",
    "First Name",
    "Last Name",
    "Status",
    "Role",
    "User Type",
    "Organization",
    "Phone",
    "Created At",
    "Last Login",
    "Is Super Admin"
  ];

  // CSV Rows
  const rows = users.map(user => [
    user.code || user._id,
    user.email,
    user.personal?.firstName || "",
    user.personal?.lastName || "",
    user.status,
    user.professional?.role || user.role || "",
    user.userType || "individual",
    user.orgName || "",
    user.personal?.phone || "",
    user.createdAt,
    user.lastLogin || "",
    user.isSuperAdmin ? "Yes" : "No"
  ]);

  // Build CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma/quote/newline
        const cellStr = String(cell);
        if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(",")
    )
  ].join("\n");

  // Download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `users-export-${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function BulkActionsHeader({
  selectedCount,
  loading,
  users,
  onCreateUser,
  onRefresh,
  onBulkStatus,
  onSendNotification,
  onBulkDelete,
}: BulkActionsHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="flex gap-2">
      {selectedCount > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-blue-600 text-blue-400" 
              aria-label={t("superadmin.users.bulkActions", `Bulk actions for ${selectedCount} selected users`)} 
              title={t("superadmin.users.bulkActions", `Bulk actions for ${selectedCount} selected users`)}
            >
              <MoreHorizontal className="h-4 w-4 me-2" />
              Bulk Actions ({selectedCount})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-muted border-input">
            <DropdownMenuItem 
              onClick={onBulkStatus}
              className="text-muted-foreground hover:bg-muted/80"
            >
              <Edit className="h-4 w-4 me-2" />
              Change Status
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onSendNotification}
              className="text-muted-foreground hover:bg-muted/80"
            >
              <Bell className="h-4 w-4 me-2" />
              Send Notification
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-input" />
            <DropdownMenuItem 
              onClick={onBulkDelete}
              className="text-red-400 hover:bg-muted/80"
            >
              <Trash2 className="h-4 w-4 me-2" />
              Delete Users
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportUsersToCSV(users)}
        disabled={users.length === 0}
        className="border-input text-muted-foreground"
        aria-label={t("superadmin.users.exportCSV", "Export users to CSV")}
        title={t("superadmin.users.exportCSV", "Export users to CSV")}
      >
        <Download className="h-4 w-4 me-2" />
        Export CSV
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={onCreateUser}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
        aria-label={t("superadmin.users.createUser", "Create new user")}
        title={t("superadmin.users.createUser", "Create new user")}
      >
        <UserPlus className="h-4 w-4 me-2" />
        Create User
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        className="border-input text-muted-foreground"
        aria-label={t("common.refresh", "Refresh users list")}
        title={t("common.refresh", "Refresh users list")}
      >
        <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </Button>
    </div>
  );
}
