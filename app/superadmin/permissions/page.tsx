"use client";

/**
 * Superadmin Permissions / Authority Matrix
 * Visual RBAC management with role-permission grid
 * 
 * @module app/superadmin/permissions/page
 */

import { useState, useEffect, useCallback, Fragment } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Grid3x3, RefreshCw, Search, Edit, Plus, Shield,
  Check, X, Minus, Lock, Users, Building2,
  Settings, CreditCard, Package, Home,
  BarChart3, Save,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  actions: ("create" | "read" | "update" | "delete" | "manage")[];
}

interface Role {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  permissions: Record<string, ("create" | "read" | "update" | "delete" | "manage")[]>;
  userCount: number;
  createdAt: string;
}

interface PermissionModule {
  id: string;
  name: string;
  icon: typeof Shield;
  permissions: Permission[];
}

const MODULES: PermissionModule[] = [
  {
    id: "users",
    name: "User Management",
    icon: Users,
    permissions: [
      { id: "users.view", name: "View Users", description: "View user list and profiles", module: "users", actions: ["read"] },
      { id: "users.create", name: "Create Users", description: "Create new user accounts", module: "users", actions: ["create"] },
      { id: "users.edit", name: "Edit Users", description: "Edit user details and settings", module: "users", actions: ["update"] },
      { id: "users.delete", name: "Delete Users", description: "Delete user accounts", module: "users", actions: ["delete"] },
      { id: "users.manage", name: "Manage Users", description: "Full user management access", module: "users", actions: ["manage"] },
    ],
  },
  {
    id: "tenants",
    name: "Tenant Management",
    icon: Building2,
    permissions: [
      { id: "tenants.view", name: "View Tenants", description: "View tenant list and details", module: "tenants", actions: ["read"] },
      { id: "tenants.create", name: "Create Tenants", description: "Create new tenants", module: "tenants", actions: ["create"] },
      { id: "tenants.edit", name: "Edit Tenants", description: "Edit tenant settings", module: "tenants", actions: ["update"] },
      { id: "tenants.delete", name: "Delete Tenants", description: "Delete tenants", module: "tenants", actions: ["delete"] },
      { id: "tenants.manage", name: "Manage Tenants", description: "Full tenant management", module: "tenants", actions: ["manage"] },
    ],
  },
  {
    id: "fm",
    name: "Facility Management",
    icon: Home,
    permissions: [
      { id: "fm.dashboard", name: "FM Dashboard", description: "Access FM dashboard", module: "fm", actions: ["read"] },
      { id: "fm.workorders.view", name: "View Work Orders", description: "View work orders", module: "fm", actions: ["read"] },
      { id: "fm.workorders.create", name: "Create Work Orders", description: "Create new work orders", module: "fm", actions: ["create"] },
      { id: "fm.workorders.edit", name: "Edit Work Orders", description: "Edit work orders", module: "fm", actions: ["update"] },
      { id: "fm.workorders.delete", name: "Delete Work Orders", description: "Delete work orders", module: "fm", actions: ["delete"] },
      { id: "fm.assets", name: "Asset Management", description: "Manage assets", module: "fm", actions: ["manage"] },
    ],
  },
  {
    id: "souq",
    name: "Marketplace (Souq)",
    icon: Package,
    permissions: [
      { id: "souq.products.view", name: "View Products", description: "View product catalog", module: "souq", actions: ["read"] },
      { id: "souq.products.manage", name: "Manage Products", description: "Create/edit products", module: "souq", actions: ["manage"] },
      { id: "souq.orders.view", name: "View Orders", description: "View orders", module: "souq", actions: ["read"] },
      { id: "souq.orders.manage", name: "Manage Orders", description: "Process orders", module: "souq", actions: ["manage"] },
      { id: "souq.vendors", name: "Vendor Management", description: "Manage vendors", module: "souq", actions: ["manage"] },
    ],
  },
  {
    id: "aqar",
    name: "Real Estate (Aqar)",
    icon: Home,
    permissions: [
      { id: "aqar.properties.view", name: "View Properties", description: "View property listings", module: "aqar", actions: ["read"] },
      { id: "aqar.properties.manage", name: "Manage Properties", description: "Create/edit properties", module: "aqar", actions: ["manage"] },
      { id: "aqar.contracts.view", name: "View Contracts", description: "View contracts", module: "aqar", actions: ["read"] },
      { id: "aqar.contracts.manage", name: "Manage Contracts", description: "Create/edit contracts", module: "aqar", actions: ["manage"] },
    ],
  },
  {
    id: "finance",
    name: "Finance & Billing",
    icon: CreditCard,
    permissions: [
      { id: "finance.invoices.view", name: "View Invoices", description: "View invoices", module: "finance", actions: ["read"] },
      { id: "finance.invoices.create", name: "Create Invoices", description: "Create invoices", module: "finance", actions: ["create"] },
      { id: "finance.payments.view", name: "View Payments", description: "View payments", module: "finance", actions: ["read"] },
      { id: "finance.payments.process", name: "Process Payments", description: "Process payments", module: "finance", actions: ["manage"] },
      { id: "finance.reports", name: "Financial Reports", description: "Access financial reports", module: "finance", actions: ["read"] },
    ],
  },
  {
    id: "hr",
    name: "Human Resources",
    icon: Users,
    permissions: [
      { id: "hr.employees.view", name: "View Employees", description: "View employee data", module: "hr", actions: ["read"] },
      { id: "hr.employees.manage", name: "Manage Employees", description: "Manage employees", module: "hr", actions: ["manage"] },
      { id: "hr.payroll", name: "Payroll Access", description: "Access payroll data", module: "hr", actions: ["manage"] },
      { id: "hr.attendance", name: "Attendance Management", description: "Manage attendance", module: "hr", actions: ["manage"] },
    ],
  },
  {
    id: "reports",
    name: "Reports & Analytics",
    icon: BarChart3,
    permissions: [
      { id: "reports.view", name: "View Reports", description: "View reports", module: "reports", actions: ["read"] },
      { id: "reports.export", name: "Export Reports", description: "Export reports", module: "reports", actions: ["read"] },
      { id: "reports.create", name: "Create Reports", description: "Create custom reports", module: "reports", actions: ["create"] },
      { id: "reports.analytics", name: "Access Analytics", description: "View analytics dashboards", module: "reports", actions: ["read"] },
    ],
  },
  {
    id: "system",
    name: "System Administration",
    icon: Settings,
    permissions: [
      { id: "system.settings.view", name: "View Settings", description: "View system settings", module: "system", actions: ["read"] },
      { id: "system.settings.edit", name: "Edit Settings", description: "Edit system settings", module: "system", actions: ["update"] },
      { id: "system.integrations", name: "Manage Integrations", description: "Configure external integrations", module: "system", actions: ["manage"] },
      { id: "system.webhooks", name: "Manage Webhooks", description: "Configure webhook endpoints", module: "system", actions: ["manage"] },
      { id: "system.emails", name: "Email Templates", description: "Manage email templates", module: "system", actions: ["manage"] },
      { id: "system.translations", name: "Translations", description: "Manage translations", module: "system", actions: ["manage"] },
      { id: "system.jobs", name: "Background Jobs", description: "View and manage jobs", module: "system", actions: ["manage"] },
      { id: "system.scheduled-tasks", name: "Scheduled Tasks", description: "Manage scheduled tasks", module: "system", actions: ["manage"] },
      { id: "system.database", name: "Database Admin", description: "View database stats", module: "system", actions: ["read"] },
    ],
  },
  {
    id: "security",
    name: "Security & Audit",
    icon: Shield,
    permissions: [
      { id: "security.audit.view", name: "View Audit Logs", description: "View audit trail", module: "security", actions: ["read"] },
      { id: "security.user-logs", name: "User Activity Logs", description: "View user activity", module: "security", actions: ["read"] },
      { id: "security.impersonate", name: "Impersonate Users", description: "Log in as another user", module: "security", actions: ["manage"] },
      { id: "security.roles", name: "Manage Roles", description: "Create and edit roles", module: "security", actions: ["manage"] },
      { id: "security.permissions", name: "Manage Permissions", description: "Assign permissions to roles", module: "security", actions: ["manage"] },
    ],
  },
  {
    id: "content",
    name: "Content Management",
    icon: Grid3x3,
    permissions: [
      { id: "content.footer", name: "Footer Content", description: "Manage footer content", module: "content", actions: ["manage"] },
      { id: "content.catalog", name: "Service Catalog", description: "Manage service catalog", module: "content", actions: ["manage"] },
      { id: "content.features", name: "Feature Flags", description: "Toggle feature flags", module: "content", actions: ["manage"] },
      { id: "content.notifications", name: "Notifications", description: "Send notifications", module: "content", actions: ["manage"] },
    ],
  },
  {
    id: "billing",
    name: "Billing & Subscriptions",
    icon: CreditCard,
    permissions: [
      { id: "billing.subscriptions.view", name: "View Subscriptions", description: "View subscription plans", module: "billing", actions: ["read"] },
      { id: "billing.subscriptions.manage", name: "Manage Subscriptions", description: "Create/edit subscriptions", module: "billing", actions: ["manage"] },
      { id: "billing.quotas", name: "Quotas Management", description: "Manage resource quotas", module: "billing", actions: ["manage"] },
      { id: "billing.pricebooks", name: "Pricebooks", description: "Manage pricing", module: "billing", actions: ["manage"] },
    ],
  },
  {
    id: "support",
    name: "Support & Issues",
    icon: Shield,
    permissions: [
      { id: "support.tickets.view", name: "View Support Tickets", description: "View customer tickets", module: "support", actions: ["read"] },
      { id: "support.tickets.manage", name: "Manage Tickets", description: "Handle support tickets", module: "support", actions: ["manage"] },
      { id: "support.issues", name: "Issue Tracking", description: "Manage internal issues (SSOT)", module: "support", actions: ["manage"] },
      { id: "support.customer-requests", name: "Customer Requests", description: "Handle customer requests", module: "support", actions: ["manage"] },
    ],
  },
  {
    id: "data",
    name: "Data Operations",
    icon: BarChart3,
    permissions: [
      { id: "data.import", name: "Import Data", description: "Import data from files", module: "data", actions: ["create"] },
      { id: "data.export", name: "Export Data", description: "Export data to files", module: "data", actions: ["read"] },
      { id: "data.search", name: "Global Search", description: "Search across all data", module: "data", actions: ["read"] },
    ],
  },
];

const DEFAULT_ROLES: Role[] = [
  {
    _id: "role-superadmin",
    name: "superadmin",
    displayName: "Super Admin",
    description: "Full system access with all permissions",
    isSystem: true,
    permissions: Object.fromEntries(MODULES.flatMap(m => m.permissions.map(p => [p.id, ["create", "read", "update", "delete", "manage"]]))),
    userCount: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "role-admin",
    name: "admin",
    displayName: "Admin",
    description: "Administrative access without system settings",
    isSystem: true,
    permissions: {
      "users.view": ["read"], "users.create": ["create"], "users.edit": ["update"],
      "fm.dashboard": ["read"], "fm.workorders.view": ["read"], "fm.workorders.create": ["create"], "fm.workorders.edit": ["update"],
      "souq.products.view": ["read"], "souq.orders.view": ["read"], "souq.orders.manage": ["manage"],
      "finance.invoices.view": ["read"], "finance.payments.view": ["read"],
      "reports.view": ["read"], "reports.export": ["read"],
    },
    userCount: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "role-manager",
    name: "manager",
    displayName: "Manager",
    description: "Department manager with team oversight",
    isSystem: false,
    permissions: {
      "users.view": ["read"],
      "fm.dashboard": ["read"], "fm.workorders.view": ["read"], "fm.workorders.create": ["create"], "fm.workorders.edit": ["update"],
      "reports.view": ["read"],
    },
    userCount: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "role-technician",
    name: "technician",
    displayName: "Technician",
    description: "Field technician with work order access",
    isSystem: false,
    permissions: {
      "fm.dashboard": ["read"], "fm.workorders.view": ["read"], "fm.workorders.edit": ["update"],
    },
    userCount: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "role-viewer",
    name: "viewer",
    displayName: "Viewer",
    description: "Read-only access to dashboards and reports",
    isSystem: true,
    permissions: {
      "fm.dashboard": ["read"], "fm.workorders.view": ["read"],
      "reports.view": ["read"],
    },
    userCount: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

export default function SuperadminPermissionsPage() {
  const { t } = useI18n();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Role editing
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: "", displayName: "", description: "" });

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch("/api/superadmin/roles", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setRoles(Array.isArray(data) ? data : data.roles || DEFAULT_ROLES);
      } else {
        // Handle non-OK responses
        const errorText = await response.text().catch(() => "");
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText;
        }
        // eslint-disable-next-line no-console -- Provide visibility for failed role fetches in admin UI.
        console.error("Failed to fetch roles:", response.status, errorMessage);
        toast.error(`Failed to load roles: ${errorMessage}`);
        setRoles(DEFAULT_ROLES);
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- Provide visibility for fetch errors in admin UI.
      console.error("Network error fetching roles:", error);
      toast.error("Failed to load roles: Network error");
      setRoles(DEFAULT_ROLES);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchRoles().finally(() => setLoading(false));
  }, [fetchRoles]);

  const filteredModules = MODULES.filter(m => 
    selectedModule === "all" || m.id === selectedModule
  );

  const getPermissionStatus = (role: Role, permissionId: string): "full" | "partial" | "none" => {
    const perms = role.permissions[permissionId];
    if (!perms || perms.length === 0) return "none";
    if (perms.includes("manage")) return "full";
    return "partial";
  };

  const togglePermission = (roleId: string, permissionId: string) => {
    setRoles(prev => prev.map(role => {
      if (role._id !== roleId || role.isSystem) return role;
      
      const currentPerms = role.permissions[permissionId] || [];
      const newPerms = { ...role.permissions };
      
      if (currentPerms.length === 0) {
        // None -> Read
        newPerms[permissionId] = ["read"];
      } else if (!currentPerms.includes("manage")) {
        // Partial -> Full
        newPerms[permissionId] = ["create", "read", "update", "delete", "manage"];
      } else {
        // Full -> None
        delete newPerms[permissionId];
      }
      
      return { ...role, permissions: newPerms };
    }));
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    try {
      const response = await fetch("/api/superadmin/roles/bulk-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ roles: roles.filter(r => !r.isSystem) }),
      });
      
      if (response.ok) {
        toast.success("Permissions saved successfully");
        setHasChanges(false);
      } else {
        toast.error("Failed to save permissions");
      }
    } catch {
      toast.error("Error saving permissions");
    }
  };

  const handleNewRole = () => {
    setEditingRole(null);
    setRoleForm({ name: "", displayName: "", description: "" });
    setRoleDialogOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
    });
    setRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    // Validate required fields
    if (!roleForm.name.trim() || !roleForm.displayName.trim()) {
      toast.error("Role name and display name are required");
      return;
    }
    
    try {
      const url = editingRole 
        ? `/api/superadmin/roles/${editingRole._id}`
        : "/api/superadmin/roles";
      
      const response = await fetch(url, {
        method: editingRole ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...roleForm,
          permissions: editingRole?.permissions || {},
        }),
      });
      
      if (response.ok) {
        toast.success(editingRole ? "Role updated" : "Role created");
        setRoleDialogOpen(false);
        fetchRoles();
      } else {
        toast.error("Failed to save role");
      }
    } catch {
      toast.error("Error saving role");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.permissions")}</h1>
          <p className="text-muted-foreground">Visual role-based access control (RBAC) matrix</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button onClick={handleSaveChanges} className="bg-primary text-primary-foreground" aria-label="Save permission changes" title="Save all permission changes">
              <Save className="h-4 w-4 me-2" />Save Changes
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleNewRole} className="border-input text-muted-foreground" aria-label="Add new role" title="Add a new role">
            <Plus className="h-4 w-4 me-2" />Add Role
          </Button>
          <Button variant="outline" size="sm" onClick={fetchRoles} disabled={loading} className="border-input text-muted-foreground" aria-label="Refresh roles list" title="Refresh roles list">
            <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm text-muted-foreground font-medium">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center"><Check className="h-4 w-4 text-green-400" /></div>
              <span className="text-sm text-muted-foreground">Full Access</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-yellow-500/20 flex items-center justify-center"><Minus className="h-4 w-4 text-yellow-400" /></div>
              <span className="text-sm text-muted-foreground">Partial Access</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-muted flex items-center justify-center"><X className="h-4 w-4 text-muted-foreground" /></div>
              <span className="text-sm text-muted-foreground">No Access</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">System Role (Read-only)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search permissions..." value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10 bg-muted border-input text-foreground" />
          </div>
          <Select value={selectedModule} onValueChange={setSelectedModule} placeholder="Filter by module">
            <SelectTrigger className="w-[200px] bg-muted border-input">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {MODULES.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-foreground"><Grid3x3 className="h-5 w-5" />Permission Matrix</CardTitle>
          <CardDescription className="text-muted-foreground">Click cells to toggle permissions (None → Read → Full → None)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="min-w-[800px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground sticky start-0 bg-card z-10 min-w-[250px]">Permission</TableHead>
                      {roles.map(role => (
                        <TableHead key={role._id} className="text-center min-w-[120px]">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              {role.isSystem && <Lock className="h-3 w-3 text-muted-foreground" />}
                              <span className="text-foreground font-medium">{role.displayName}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{role.userCount} users</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredModules.map(module => (
                      <Fragment key={module.id}>
                        {/* Module Header */}
                        <TableRow key={`header-${module.id}`} className="bg-muted/30 border-border">
                          <TableCell colSpan={roles.length + 1} className="py-2">
                            <div className="flex items-center gap-2">
                              <module.icon className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-foreground">{module.name}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Permissions */}
                        {module.permissions
                          .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()))
                          .map(permission => (
                          <TableRow key={permission.id} className="border-border hover:bg-muted/50">
                            <TableCell className="sticky start-0 bg-card z-10">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-help">
                                      <p className="text-foreground">{permission.name}</p>
                                      <p className="text-xs text-muted-foreground">{permission.description}</p>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{permission.description}</p>
                                    <p className="text-xs text-muted-foreground mt-1">ID: {permission.id}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            {roles.map(role => {
                              const status = getPermissionStatus(role, permission.id);
                              return (
                                <TableCell key={`${role._id}-${permission.id}`} className="text-center">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() => togglePermission(role._id, permission.id)}
                                          disabled={role.isSystem}
                                          className={cn(
                                            "w-8 h-8 rounded flex items-center justify-center transition-colors",
                                            status === "full" && "bg-green-500/20 hover:bg-green-500/30",
                                            status === "partial" && "bg-yellow-500/20 hover:bg-yellow-500/30",
                                            status === "none" && "bg-muted hover:bg-muted/80",
                                            role.isSystem && "cursor-not-allowed opacity-60"
                                          )}
                                        >
                                          {status === "full" && <Check className="h-4 w-4 text-green-400" />}
                                          {status === "partial" && <Minus className="h-4 w-4 text-yellow-400" />}
                                          {status === "none" && <X className="h-4 w-4 text-muted-foreground" />}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {role.isSystem ? (
                                          <p>System role - cannot be modified</p>
                                        ) : (
                                          <p>Click to toggle: {status === "none" ? "Add Read" : status === "partial" ? "Add Full" : "Remove"}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roles Summary */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-foreground"><Shield className="h-5 w-5" />Roles Summary</CardTitle>
          <CardDescription className="text-muted-foreground">Overview of all roles and their access levels</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Role</TableHead>
                <TableHead className="text-muted-foreground">Description</TableHead>
                <TableHead className="text-muted-foreground">Permissions</TableHead>
                <TableHead className="text-muted-foreground">Users</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map(role => (
                <TableRow key={role._id} className="border-border hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-foreground font-medium">{role.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate">{role.description || "—"}</TableCell>
                  <TableCell className="text-foreground">{Object.keys(role.permissions).length}</TableCell>
                  <TableCell className="text-foreground">{role.userCount}</TableCell>
                  <TableCell>
                    <Badge className={role.isSystem ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"}>
                      {role.isSystem ? "System" : "Custom"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditRole(role)} disabled={role.isSystem} aria-label={t("superadmin.permissions.editRole", `Edit ${role.displayName} role`)} title={t("superadmin.permissions.editRole", `Edit ${role.displayName} role`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create New Role"}</DialogTitle>
            <DialogDescription className="text-muted-foreground">Configure role details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Internal Name</Label>
              <Input value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="e.g., sales_manager" className="bg-muted border-input" disabled={!!editingRole} />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={roleForm.displayName} onChange={(e) => setRoleForm({ ...roleForm, displayName: e.target.value })} placeholder="e.g., Sales Manager" className="bg-muted border-input" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="Brief description of this role" className="bg-muted border-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)} aria-label="Cancel role changes" title="Cancel and close dialog">Cancel</Button>
            <Button onClick={handleSaveRole} aria-label={editingRole ? "Update role" : "Create new role"} title={editingRole ? "Update role settings" : "Create new role"}>{editingRole ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
