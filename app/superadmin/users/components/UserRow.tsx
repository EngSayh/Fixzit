/**
 * User table row component for Superadmin Users list
 * @module app/superadmin/users/components/UserRow
 */

"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import {
  Shield,
  Building2,
  Eye,
  Edit,
  MoreHorizontal,
  Mail,
  KeyRound,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RBAC_MODULES, RBAC_ROLE_PERMISSIONS, type ModulePermissions } from "@/config/rbac.matrix";
import type { UserRoleType } from "@/types/user";
import type { UserData } from "./types";
import { STATUS_COLORS } from "./types";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  ACTIVE: <CheckCircle className="h-3 w-3" />,
  PENDING: <Clock className="h-3 w-3" />,
  INACTIVE: <XCircle className="h-3 w-3" />,
  SUSPENDED: <AlertCircle className="h-3 w-3" />,
};

interface UserRowProps {
  user: UserData;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEditStatus: (user: UserData) => void;
  onEditRole: (user: UserData) => void;
  onViewPermissions: (user: UserData) => void;
  onEditPermissions: (user: UserData) => void;
  onSendNotification: (userId: string) => void;
  showModuleAccess: boolean;
}

function formatDate(dateStr?: string, locale: string = "en-US"): string {
  if (!dateStr) return "—";
  // Map to proper BCP 47 locale tag for Arabic (Saudi Arabia)
  const localeTag = locale === "ar" ? "ar-SA" : locale;
  return new Date(dateStr).toLocaleDateString(localeTag, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getUserName(user: UserData): string {
  const first = user.personal?.firstName || "";
  const last = user.personal?.lastName || "";
  return (first + " " + last).trim() || "—";
}

function getUserRole(user: UserData): string {
  return user.professional?.role || user.role || "—";
}

function getModuleAccessBadges(user: UserData): React.ReactNode {
  const role = (user.professional?.role || user.role || "") as UserRoleType;
  const permissions = RBAC_ROLE_PERMISSIONS[role];
  
  if (!permissions) {
    return <span className="text-xs text-muted-foreground">No modules</span>;
  }
  
  const accessibleModules = RBAC_MODULES.filter(mod => {
    const perm = permissions[mod.id] as ModulePermissions | undefined;
    return perm && (perm.view || perm.create || perm.edit || perm.delete);
  });
  
  if (accessibleModules.length === 0) {
    return <span className="text-xs text-muted-foreground">No modules</span>;
  }
  
  // Show first 3 modules + count
  const displayed = accessibleModules.slice(0, 3);
  const remaining = accessibleModules.length - 3;
  
  return (
    <>
      {displayed.map(mod => (
        <Badge 
          key={mod.id} 
          variant="outline" 
          className="text-xs bg-green-500/10 text-green-400 border-green-500/30"
        >
          {mod.label.split(" ")[0]}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge 
          variant="outline" 
          className="text-xs bg-muted text-muted-foreground border-input"
        >
          +{remaining}
        </Badge>
      )}
    </>
  );
}

export function UserRow({
  user,
  isSelected,
  onToggleSelect,
  onEditStatus,
  onEditRole,
  onViewPermissions,
  onEditPermissions,
  onSendNotification,
  showModuleAccess,
}: UserRowProps) {
  const { t } = useI18n();
  const router = useRouter();

  const handleViewDetails = useCallback(() => {
    router.push(`/superadmin/users/${user._id}`);
  }, [router, user._id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleViewDetails();
    }
  }, [handleViewDetails]);

  return (
    <TableRow
      className={`border-border hover:bg-muted/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${isSelected ? "bg-blue-900/20" : ""}`}
      tabIndex={0}
      role="row"
      aria-selected={isSelected}
      onKeyDown={handleKeyDown}
    >
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(user._id)}
          className="border-input data-[state=checked]:bg-blue-600"
          aria-label={t("superadmin.users.selectUser", `Select ${user.email}`)}
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>
      <TableCell onClick={handleViewDetails}>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{getUserName(user)}</span>
            {user.isSuperAdmin && (
              <span title="Super Admin">
                <Shield className="h-4 w-4 text-yellow-500" aria-hidden="true" />
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      </TableCell>
      <TableCell onClick={handleViewDetails}>
        <span className="text-xs font-mono text-muted-foreground" title={user._id}>
          {user.code || user._id.slice(-8)}
        </span>
      </TableCell>
      <TableCell onClick={handleViewDetails}>
        <Badge 
          variant="outline" 
          className={user.userType === "company" 
            ? "bg-purple-500/20 text-purple-400 border-purple-500/30" 
            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
          }
        >
          {user.userType === "company" ? (
            <><Building2 className="h-3 w-3 me-1" />Company</>
          ) : (
            <>Individual</>
          )}
        </Badge>
      </TableCell>
      <TableCell onClick={handleViewDetails}>
        <Badge variant="outline" className="text-muted-foreground border-input">
          {getUserRole(user)}
        </Badge>
      </TableCell>
      <TableCell onClick={handleViewDetails}>
        <Badge
          variant="outline"
          className={`${STATUS_COLORS[user.status] || ""} flex items-center gap-1 w-fit`}
        >
          {STATUS_ICONS[user.status]}
          {user.status}
        </Badge>
      </TableCell>
      <TableCell onClick={handleViewDetails}>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          {user.orgName || "—"}
        </div>
      </TableCell>
      <TableCell onClick={handleViewDetails}>
        <span className="text-muted-foreground text-sm">
          {user.personal?.phone || "—"}
        </span>
      </TableCell>
      <TableCell onClick={handleViewDetails}>
        <span className="text-muted-foreground text-sm">
          {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
        </span>
      </TableCell>
      {showModuleAccess && (
        <TableCell onClick={handleViewDetails}>
          <div className="flex flex-wrap gap-1 max-w-xs">
            {getModuleAccessBadges(user)}
          </div>
        </TableCell>
      )}
      <TableCell className="text-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              aria-label={t("superadmin.users.rowActions", `Actions for user ${user.email}`)}
              title={t("superadmin.users.rowActions", `Actions for ${user.email}`)}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-muted border-input">
            <DropdownMenuItem
              onClick={handleViewDetails}
              className="text-muted-foreground hover:bg-muted/80"
            >
              <Eye className="h-4 w-4 me-2" />
              {t("superadmin.users.viewDetails", "View Details")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEditStatus(user)}
              className="text-muted-foreground hover:bg-muted/80"
            >
              <Edit className="h-4 w-4 me-2" />
              {t("superadmin.users.changeStatus", "Change Status")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEditRole(user)}
              className="text-muted-foreground hover:bg-muted/80"
            >
              <Shield className="h-4 w-4 me-2" />
              {t("superadmin.users.editRole", "Edit Role")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onViewPermissions(user)}
              className="text-muted-foreground hover:bg-muted/80"
            >
              <KeyRound className="h-4 w-4 me-2" />
              {t("superadmin.users.viewPermissions", "View Permissions")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEditPermissions(user)}
              className="text-muted-foreground hover:bg-muted/80"
            >
              <KeyRound className="h-4 w-4 me-2" />
              {t("superadmin.users.editPermissions", "Edit Permissions")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-input" />
            <DropdownMenuItem
              onClick={() => onSendNotification(user._id)}
              className="text-muted-foreground hover:bg-muted/80"
            >
              <Mail className="h-4 w-4 me-2" />
              {t("superadmin.users.sendNotification", "Send Notification")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
