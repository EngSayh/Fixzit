/**
 * Permissions Tab component for User Detail page
 * @module app/superadmin/users/[id]/components/PermissionsTab
 */

"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import {
  Shield,
  CheckCircle,
  XCircle,
  Lock,
  Eye,
  Edit,
  Trash,
  FileText,
} from "@/components/ui/icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ModuleAccessItem } from "./types";

interface PermissionsTabProps {
  modulesAccess: ModuleAccessItem[];
  userRole: string;
}

const PERMISSION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  read: Eye,
  create: FileText,
  update: Edit,
  delete: Trash,
  manage: Lock,
};

export function PermissionsTab({ modulesAccess, userRole }: PermissionsTabProps) {
  const { t } = useI18n();

  const getPermissionIcon = (permission: string) => {
    const Icon = PERMISSION_ICONS[permission.toLowerCase()] || Shield;
    return <Icon className="h-3 w-3" />;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {t("user.permissions.title", "Module Permissions")}
        </CardTitle>
        <CardDescription>
          {t("user.permissions.description", `Access permissions for role: ${userRole}`)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {modulesAccess.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("user.permissions.noModules", "No module access configured")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">{t("user.permissions.module", "Module")}</TableHead>
                <TableHead className="text-muted-foreground">{t("user.permissions.subModule", "Sub-Module")}</TableHead>
                <TableHead className="text-muted-foreground">{t("user.permissions.access", "Access")}</TableHead>
                <TableHead className="text-muted-foreground">{t("user.permissions.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modulesAccess.map((item, index) => (
                <TableRow
                  key={`${item.module}-${item.subModule}-${index}`}
                  className="border-border hover:bg-muted/50"
                  tabIndex={0}
                  aria-label={`${item.module} - ${item.subModule}: ${item.hasAccess ? "Has access" : "No access"}`}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      {item.module}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{item.subModule}</span>
                  </TableCell>
                  <TableCell>
                    {item.hasAccess ? (
                      <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 me-1" />
                        {t("user.permissions.granted", "Granted")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                        <XCircle className="h-3 w-3 me-1" />
                        {t("user.permissions.denied", "Denied")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.hasAccess && item.actions && item.actions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.actions.map((action: string) => (
                          <Badge
                            key={action}
                            variant="outline"
                            className="bg-primary/10 text-primary border-primary/30 text-xs"
                          >
                            {getPermissionIcon(action)}
                            <span className="ms-1 capitalize">{action}</span>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Permission Legend */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">{t("user.permissions.legend", "Permission Legend:")}</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-blue-400" />
              <span>{t("user.permissions.read", "Read")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-green-400" />
              <span>{t("user.permissions.create", "Create")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Edit className="h-4 w-4 text-amber-400" />
              <span>{t("user.permissions.update", "Update")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Trash className="h-4 w-4 text-red-400" />
              <span>{t("user.permissions.delete", "Delete")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-purple-400" />
              <span>{t("user.permissions.manage", "Manage")}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
