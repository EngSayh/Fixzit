"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Save, RotateCcw, Shield, Eye, Plus, Pencil, Trash2 } from "lucide-react";

// Import from shared RBAC source of truth
import { Role, ModuleKey, ROLE_MODULES } from "@/lib/rbac/client-roles";

export interface RolePermission {
  role: string;
  roleLabel: string;
  permissions: {
    [module: string]: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    };
  };
}

export interface Module {
  id: string;
  label: string;
  description: string;
}

interface RBACMatrixTableProps {
  roles: RolePermission[];
  modules: Module[];
  onChange?: (roles: RolePermission[]) => void;
  onSave?: (roles: RolePermission[]) => Promise<void>;
  readOnly?: boolean;
}

export default function RBACMatrixTable({
  roles: initialRoles,
  modules,
  onChange,
  onSave,
  readOnly = false,
}: RBACMatrixTableProps) {
  const [roles, setRoles] = useState<RolePermission[]>(initialRoles);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Keep internal state in sync if the parent provides new initial roles (e.g., after load/save)
  useEffect(() => {
    setRoles(initialRoles);
    setIsDirty(false);
  }, [initialRoles]);

  const handlePermissionChange = useCallback(
    (roleIndex: number, moduleId: string, permissionType: "view" | "create" | "edit" | "delete", value: boolean) => {
      setRoles((prevRoles) => {
        const newRoles = [...prevRoles];
        const role = { ...newRoles[roleIndex] };
        role.permissions = { ...role.permissions };

        if (!role.permissions[moduleId]) {
          role.permissions[moduleId] = { view: false, create: false, edit: false, delete: false };
        }

        role.permissions[moduleId] = {
          ...role.permissions[moduleId],
          [permissionType]: value,
        };

        // If view is disabled, disable all other permissions
        if (permissionType === "view" && !value) {
          role.permissions[moduleId].create = false;
          role.permissions[moduleId].edit = false;
          role.permissions[moduleId].delete = false;
        }

        // If any other permission is enabled, enable view
        if (permissionType !== "view" && value) {
          role.permissions[moduleId].view = true;
        }

        newRoles[roleIndex] = role;
        onChange?.(newRoles);
        return newRoles;
      });
      setIsDirty(true);
    },
    [onChange]
  );

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(roles);
      setIsDirty(false);
    } catch {
      // Error handled by parent component
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setRoles(initialRoles);
    setIsDirty(false);
    onChange?.(initialRoles);
  };

  const getPermissionIcon = (type: "view" | "create" | "edit" | "delete") => {
    switch (type) {
      case "view":
        return <Eye className="h-3 w-3" />;
      case "create":
        return <Plus className="h-3 w-3" />;
      case "edit":
        return <Pencil className="h-3 w-3" />;
      case "delete":
        return <Trash2 className="h-3 w-3" />;
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    if (role.includes("SUPER")) return "destructive";
    if (role.includes("ADMIN") || role.includes("MANAGEMENT")) return "default";
    return "secondary"; // corporate/staff/owner/tenant
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role-Based Access Control Matrix
            </CardTitle>
            <CardDescription className="mt-2">
              Configure module access permissions for each role. Changes are highlighted and can be saved or reset.
            </CardDescription>
          </div>
          {!readOnly && onSave && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!isDirty || isSaving}
              >
                <RotateCcw className="me-2 h-4 w-4" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
              >
                <Save className="me-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky start-0 bg-background z-10 min-w-[150px]">
                    Role / Module
                  </TableHead>
                  {modules.map((module) => (
                    <TableHead key={module.id} className="text-center min-w-[180px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{module.label}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{module.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role, roleIndex) => (
                  <TableRow key={role.role}>
                    <TableCell className="sticky start-0 bg-background z-10 font-medium">
                      <Badge variant={getRoleBadgeVariant(role.role)}>
                        {role.roleLabel}
                      </Badge>
                    </TableCell>
                    {modules.map((module) => {
                      const permissions = role.permissions[module.id] || {
                        view: false,
                        create: false,
                        edit: false,
                        delete: false,
                      };

                      return (
                        <TableCell key={module.id} className="text-center">
                          <div className="flex justify-center gap-2">
                            {(["view", "create", "edit", "delete"] as const).map((permType) => (
                              <Tooltip key={permType}>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      {getPermissionIcon(permType)}
                                    </span>
                                    <Switch
                                      checked={permissions[permType]}
                                      onCheckedChange={(checked) =>
                                        handlePermissionChange(roleIndex, module.id, permType, checked)
                                      }
                                      disabled={readOnly}
                                      aria-label={`${role.roleLabel} ${permType} ${module.label}`}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {role.roleLabel}: {permType.charAt(0).toUpperCase() + permType.slice(1)} {module.label}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>

        {isDirty && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              ⚠️ You have unsaved changes. Click &quot;Save Changes&quot; to apply or &quot;Reset&quot; to discard.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Default modules derived from shared RBAC source (domain/fm/fm-lite.ts).
 * STRICT v4.1: Maps ModuleKey enum to UI-friendly module definitions.
 * 
 * Note: This bridges the canonical ModuleKey enum with the UI's Module interface.
 * Any changes to core modules should be made in domain/fm/fm-lite.ts first.
 */
const MODULE_LABELS: Record<string, { label: string; description: string }> = {
  [ModuleKey.DASHBOARD]: { label: "Dashboard", description: "Org overview and insights" },
  [ModuleKey.PROPERTIES]: { label: "Properties", description: "Property and portfolio management" },
  [ModuleKey.WORK_ORDERS]: { label: "Work Orders", description: "Maintenance and service requests" },
  [ModuleKey.FINANCE]: { label: "Finance", description: "Invoices, payments, ZATCA compliance, budgets" },
  [ModuleKey.HR]: { label: "HR", description: "Human resources management" },
  [ModuleKey.ADMINISTRATION]: { label: "Admin", description: "Administrative functions and configuration" },
  [ModuleKey.CRM]: { label: "CRM & Notifications", description: "Customers, communication, templates, alerts" },
  [ModuleKey.MARKETPLACE]: { label: "Marketplace (Souq)", description: "Listings, orders, claims/returns, settlements" },
  [ModuleKey.SUPPORT]: { label: "Support", description: "Support tickets and knowledge base" },
  [ModuleKey.COMPLIANCE]: { label: "Compliance", description: "Contracts, disputes, and inspections" },
  [ModuleKey.REPORTS]: { label: "Reports", description: "Analytics and reporting" },
  [ModuleKey.SYSTEM_MANAGEMENT]: { label: "System Management", description: "Users, roles, billing, integrations" },
};

// Additional UI-specific modules not in core ModuleKey (for FM/Aqar extensions)
const EXTENSION_MODULES: Module[] = [
  { id: "units", label: "Units", description: "Unit management within properties" },
  { id: "tenants", label: "Tenants", description: "Tenant management and profiles" },
  { id: "vendors", label: "Vendors", description: "Vendor and contractor management" },
  { id: "approvals", label: "Approvals", description: "Approval workflows and SLA decisions" },
  { id: "assets_sla", label: "Assets & SLA", description: "Assets, PM schedules, SLA tracking" },
  { id: "qa", label: "QA & Telemetry", description: "QA alerts/logs and platform telemetry" },
];

// Build DEFAULT_MODULES from shared source + extensions
export const DEFAULT_MODULES: Module[] = [
  // Core modules from shared RBAC source
  ...Object.values(ModuleKey).map((key) => ({
    id: key.toLowerCase(),
    label: MODULE_LABELS[key]?.label ?? key,
    description: MODULE_LABELS[key]?.description ?? "",
  })),
  // Extension modules for FM/Aqar-specific features
  ...EXTENSION_MODULES,
];

/**
 * Role label mappings for UI display.
 * STRICT v4.1: Canonical roles from domain/fm/fm-lite.ts Role enum.
 */
const ROLE_LABELS: Record<string, string> = {
  [Role.SUPER_ADMIN]: "Super Admin",
  [Role.ADMIN]: "Admin / Corporate Admin",
  [Role.CORPORATE_OWNER]: "Corporate Owner",
  [Role.TEAM_MEMBER]: "Team Member",
  [Role.TECHNICIAN]: "Technician",
  [Role.PROPERTY_MANAGER]: "Property Manager",
  [Role.TENANT]: "Tenant / End-User",
  [Role.VENDOR]: "Vendor",
  [Role.GUEST]: "Guest / Auditor",
};

/**
 * Helper to check if a role has access to a module based on ROLE_MODULES.
 */
function roleHasModuleAccess(role: Role, moduleId: string): boolean {
  const modules = ROLE_MODULES[role];
  if (!modules) return false;
  // Match by lowercase comparison since ModuleKey is UPPERCASE
  return modules.some((m) => m.toLowerCase() === moduleId.toLowerCase());
}

/**
 * Generate default permissions for a role based on shared ROLE_MODULES.
 * STRICT v4.1: Conservative delete rights - only SUPER_ADMIN gets delete.
 */
function generateRolePermissions(role: Role): RolePermission["permissions"] {
  const isAdmin = role === Role.SUPER_ADMIN || role === Role.ADMIN;
  const isCorporateOwner = role === Role.CORPORATE_OWNER;
  
  return Object.fromEntries(
    DEFAULT_MODULES.map((m) => {
      const hasAccess = roleHasModuleAccess(role, m.id);
      const canCreate = hasAccess && (isAdmin || isCorporateOwner || [Role.TEAM_MEMBER, Role.PROPERTY_MANAGER].includes(role));
      const canEdit = hasAccess && (isAdmin || isCorporateOwner || [Role.TEAM_MEMBER, Role.PROPERTY_MANAGER, Role.TECHNICIAN].includes(role));
      // Only SUPER_ADMIN gets delete rights per STRICT v4.1
      const canDelete = role === Role.SUPER_ADMIN;
      
      return [
        m.id,
        {
          view: hasAccess || isAdmin || isCorporateOwner,
          create: canCreate,
          edit: canEdit,
          delete: canDelete,
        },
      ];
    })
  );
}

/**
 * STRICT v4.1 Canonical Roles derived from shared RBAC source.
 * Roles are generated from domain/fm/fm-lite.ts Role enum with conservative permissions.
 */
export const DEFAULT_ROLES: RolePermission[] = Object.values(Role)
  .filter((r) => typeof r === "string") // Filter out numeric enum values
  .map((role) => ({
    role: role as string,
    roleLabel: ROLE_LABELS[role] ?? role,
    permissions: generateRolePermissions(role as Role),
  }));
