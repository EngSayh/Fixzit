"use client";

import { useState, useCallback, useEffect } from "react";
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
import { Save, RotateCcw, Shield, Eye, Edit, Trash2 } from "lucide-react";

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
        return <Edit className="h-3 w-3" />;
      case "edit":
        return <Edit className="h-3 w-3" />;
      case "delete":
        return <Trash2 className="h-3 w-3" />;
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    if (role.includes("SUPER") || role.includes("ADMIN")) return "destructive";
    if (role.includes("MANAGER")) return "default";
    return "secondary";
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
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
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

// Export default permissions for use in pages
export const DEFAULT_MODULES: Module[] = [
  { id: "dashboard", label: "Dashboard", description: "Main dashboard and overview" },
  { id: "work_orders", label: "Work Orders", description: "Maintenance and service requests" },
  { id: "properties", label: "Properties", description: "Property management" },
  { id: "units", label: "Units", description: "Unit management within properties" },
  { id: "tenants", label: "Tenants", description: "Tenant management and profiles" },
  { id: "vendors", label: "Vendors", description: "Vendor and contractor management" },
  { id: "finance", label: "Finance", description: "Invoices, payments, and budgets" },
  { id: "reports", label: "Reports", description: "Analytics and reporting" },
  { id: "hr", label: "HR", description: "Human resources management" },
  { id: "settings", label: "Settings", description: "System configuration" },
  { id: "admin", label: "Admin", description: "Administrative functions" },
];

export const DEFAULT_ROLES: RolePermission[] = [
  {
    role: "SUPER_ADMIN",
    roleLabel: "Super Admin",
    permissions: Object.fromEntries(
      DEFAULT_MODULES.map((m) => [m.id, { view: true, create: true, edit: true, delete: true }])
    ),
  },
  {
    role: "ADMIN",
    roleLabel: "Admin",
    permissions: Object.fromEntries(
      DEFAULT_MODULES.filter((m) => m.id !== "admin").map((m) => [
        m.id,
        { view: true, create: true, edit: true, delete: m.id !== "settings" },
      ])
    ),
  },
  {
    role: "PROPERTY_MANAGER",
    roleLabel: "Property Manager",
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false },
      work_orders: { view: true, create: true, edit: true, delete: false },
      properties: { view: true, create: false, edit: true, delete: false },
      units: { view: true, create: true, edit: true, delete: false },
      tenants: { view: true, create: true, edit: true, delete: false },
      vendors: { view: true, create: false, edit: false, delete: false },
      finance: { view: true, create: true, edit: true, delete: false },
      reports: { view: true, create: false, edit: false, delete: false },
    },
  },
  {
    role: "TECHNICIAN",
    roleLabel: "Technician",
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false },
      work_orders: { view: true, create: false, edit: true, delete: false },
      properties: { view: true, create: false, edit: false, delete: false },
      units: { view: true, create: false, edit: false, delete: false },
    },
  },
  {
    role: "TENANT",
    roleLabel: "Tenant",
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false },
      work_orders: { view: true, create: true, edit: false, delete: false },
      finance: { view: true, create: false, edit: false, delete: false },
    },
  },
];
