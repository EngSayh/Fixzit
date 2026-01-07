"use client";

/**
 * Superadmin Users Management
 * Full interface for managing all users across tenants
 * Features: Multi-select, bulk actions, organization filter, notifications
 * 
 * @module app/superadmin/users/page
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import {
  Users,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserPlus,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Shield,
  Building2,
  Edit,
  Trash2,
  Bell,
  Mail,
  MoreHorizontal,
  CheckSquare,
  Square,
  MinusSquare,
  KeyRound,
} from "@/components/ui/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { RBAC_MODULES, RBAC_ROLE_PERMISSIONS, type ModulePermissions } from "@/config/rbac.matrix";
import { getSubModulesForParent } from "@/config/rbac.submodules";
import { type UserRoleType, CANONICAL_ROLES } from "@/types/user";

// Types
interface UserData {
  _id: string;
  email: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";
  role?: string;
  professional?: {
    role?: string;
    subRole?: string;
    department?: string;
  };
  personal?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  orgId?: string;
  orgName?: string;
  isSuperAdmin?: boolean;
  createdAt: string;
  lastLogin?: string;
  code?: string;
  userType?: "individual" | "company";
}

// Group by options
type GroupByOption = "none" | "organization" | "role" | "status";

interface Organization {
  _id: string;
  name: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
  PENDING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  INACTIVE: "bg-muted text-muted-foreground border-input",
  SUSPENDED: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  ACTIVE: <CheckCircle className="h-3 w-3" />,
  PENDING: <Clock className="h-3 w-3" />,
  INACTIVE: <XCircle className="h-3 w-3" />,
  SUSPENDED: <AlertCircle className="h-3 w-3" />,
};

const USER_TYPES = [
  { value: "all", label: "All Types" },
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
];

export default function SuperadminUsersPage() {
  const { t } = useI18n();
  const router = useRouter();

  // State
  const [users, setUsers] = useState<UserData[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [showModuleAccess, setShowModuleAccess] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog states
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [editStatusDialogOpen, setEditStatusDialogOpen] = useState(false);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // NEW: Create User Dialog state
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "" as UserRoleType | "",
    orgId: "",
  });
  
  // NEW: Edit Role Dialog state
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<UserRoleType | "">("");
  
  // NEW: Edit Permissions Dialog state
  const [editPermissionsDialogOpen, setEditPermissionsDialogOpen] = useState(false);
  const [permissionOverrides, setPermissionOverrides] = useState<Record<string, Partial<ModulePermissions>>>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // Bulk action state
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [singleUserStatus, setSingleUserStatus] = useState<string>("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationSubject, setNotificationSubject] = useState("");
  const [singleNotificationUserId, setSingleNotificationUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (orgFilter !== "all") params.set("orgId", orgFilter);
      if (userTypeFilter !== "all") params.set("userType", userTypeFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);

      const response = await fetch(`/api/superadmin/users?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
      // Clear selection on filter change
      setSelectedIds(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, orgFilter, userTypeFilter, roleFilter]);

  // Fetch organizations for filter
  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await fetch("/api/superadmin/organizations?limit=100", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch {
      // Non-critical: filter will still work without org dropdown
      toast.warning("Could not load organizations filter");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    const timeout = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, orgFilter, userTypeFilter]);

  // Selection helpers
  const allSelected = useMemo(() => {
    if (users.length === 0) return false;
    return users.every(user => selectedIds.has(user._id));
  }, [users, selectedIds]);

  const someSelected = useMemo(() => {
    return selectedIds.size > 0 && !allSelected;
  }, [selectedIds, allSelected]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u._id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Bulk actions
  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    
    setActionLoading(true);
    try {
      const response = await fetch("/api/superadmin/users/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userIds: Array.from(selectedIds),
          updates: { status: bulkStatus },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update users");
      }

      const result = await response.json();
      const updatedCount = result.modifiedCount ?? selectedIds.size;
      toast.success(`Updated ${updatedCount} users`);
      setBulkStatusDialogOpen(false);
      setBulkStatus("");
      setSelectedIds(new Set());
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update users");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNotification = async () => {
    const targetIds = singleNotificationUserId ? [singleNotificationUserId] : Array.from(selectedIds);
    if (!notificationSubject || !notificationMessage || targetIds.length === 0) return;
    
    setActionLoading(true);
    try {
      const response = await fetch("/api/superadmin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userIds: targetIds,
          subject: notificationSubject,
          message: notificationMessage,
          type: "email",
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send notifications");
      }

      toast.success(`Sent notification to ${targetIds.length} user${targetIds.length !== 1 ? "s" : ""}`);
      setNotificationDialogOpen(false);
      setNotificationSubject("");
      setNotificationMessage("");
      setSingleNotificationUserId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send notifications");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setActionLoading(true);
    try {
      const response = await fetch("/api/superadmin/users/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userIds: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete users");
      }

      const result = await response.json();
      const deletedCount = result.deletedCount ?? result.modifiedCount ?? selectedIds.size;
      toast.success(`Deleted ${deletedCount} users`);
      setDeleteDialogOpen(false);
      setSelectedIds(new Set());
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete users");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSingleStatusChange = async (userId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update user");
      }

      toast.success("User status updated");
      setEditStatusDialogOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setActionLoading(false);
    }
  };

  // NEW: Create User handler
  const handleCreateUser = async () => {
    if (!createUserForm.email || !createUserForm.role) {
      toast.error("Email and role are required");
      return;
    }
    
    setActionLoading(true);
    try {
      const response = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: createUserForm.email,
          personal: {
            firstName: createUserForm.firstName,
            lastName: createUserForm.lastName,
          },
          professional: {
            role: createUserForm.role,
          },
          orgId: createUserForm.orgId || undefined,
          status: "PENDING",
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create user");
      }

      toast.success("User created successfully");
      setCreateUserDialogOpen(false);
      setCreateUserForm({ email: "", firstName: "", lastName: "", role: "", orgId: "" });
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setActionLoading(false);
    }
  };

  // NEW: Edit Role handler
  const handleEditRole = async () => {
    if (!selectedUser || !newRole) {
      toast.error("Please select a role");
      return;
    }
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/superadmin/users/${selectedUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          professional: { role: newRole },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update role");
      }

      toast.success("User role updated");
      setEditRoleDialogOpen(false);
      setNewRole("");
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setActionLoading(false);
    }
  };

  // NEW: Edit Permissions handler
  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/superadmin/users/${selectedUser._id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          permissionOverrides,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update permissions");
      }

      toast.success("User permissions updated");
      setEditPermissionsDialogOpen(false);
      setPermissionOverrides({});
      setExpandedModules(new Set());
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update permissions");
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle permission for a sub-module
  const toggleSubModulePermission = (
    subModuleId: string,
    permissionKey: keyof ModulePermissions
  ) => {
    setPermissionOverrides((prev) => {
      const current = prev[subModuleId] || {};
      const currentValue = current[permissionKey] ?? false;
      return {
        ...prev,
        [subModuleId]: {
          ...current,
          [permissionKey]: !currentValue,
        },
      };
    });
  };

  // Toggle module expansion in permissions tree
  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getUserName = (user: UserData) => {
    const first = user.personal?.firstName || "";
    const last = user.personal?.lastName || "";
    return (first + " " + last).trim() || "—";
  };

  const getUserRole = (user: UserData) => {
    return user.professional?.role || user.role || "—";
  };

  // Get module access badges for a user based on their role
  const getModuleAccessBadges = (user: UserData) => {
    const role = (user.professional?.role || user.role || "") as UserRoleType;
    const permissions = RBAC_ROLE_PERMISSIONS[role];
    
    if (!permissions) {
      return <span className="text-xs text-muted-foreground">No modules</span>;
    }
    
    const accessibleModules = RBAC_MODULES.filter(mod => {
      const perm = permissions[mod.id];
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
  };

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t("superadmin.nav.users")}
          </h1>
          <p className="text-muted-foreground">
            Manage all system users across all tenants
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-blue-600 text-blue-400" aria-label={t("superadmin.users.bulkActions", `Bulk actions for ${selectedIds.size} selected users`)} title={t("superadmin.users.bulkActions", `Bulk actions for ${selectedIds.size} selected users`)}>
                  <MoreHorizontal className="h-4 w-4 me-2" />
                  Bulk Actions ({selectedIds.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-muted border-input">
                <DropdownMenuItem 
                  onClick={() => setBulkStatusDialogOpen(true)}
                  className="text-muted-foreground hover:bg-muted/80"
                >
                  <Edit className="h-4 w-4 me-2" />
                  Change Status
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setNotificationDialogOpen(true)}
                  className="text-muted-foreground hover:bg-muted/80"
                >
                  <Bell className="h-4 w-4 me-2" />
                  Send Notification
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-input" />
                <DropdownMenuItem 
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-400 hover:bg-muted/80"
                >
                  <Trash2 className="h-4 w-4 me-2" />
                  Delete Users
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => setCreateUserDialogOpen(true)}
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
            onClick={fetchUsers}
            disabled={loading}
            className="border-input text-muted-foreground"
            aria-label={t("common.refresh", "Refresh users list")}
            title={t("common.refresh", "Refresh users list")}
          >
            <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search row */}
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, phone, or organization..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-10 bg-muted border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {/* Filter row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
                placeholder="Status"
                className="w-full sm:w-40 bg-muted border-input text-foreground"
              >
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </Select>
              
              <Select 
                value={orgFilter} 
                onValueChange={setOrgFilter}
                placeholder="Organization"
                className="w-full sm:w-48 bg-muted border-input text-foreground"
              >
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map((org, idx) => (
                  <SelectItem key={org._id || `org-${idx}`} value={org._id || `org-${idx}`}>
                    {org.name}
                  </SelectItem>
                ))}
              </Select>
              
              <Select 
                value={userTypeFilter} 
                onValueChange={setUserTypeFilter}
                placeholder="User Type"
                className="w-full sm:w-40 bg-muted border-input text-foreground"
              >
                {USER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </Select>
              
              <Select 
                value={roleFilter} 
                onValueChange={setRoleFilter}
                placeholder="Role"
                className="w-full sm:w-44 bg-muted border-input text-foreground"
              >
                <SelectItem value="all">All Roles</SelectItem>
                {CANONICAL_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                  </SelectItem>
                ))}
              </Select>
            </div>
            
            {/* Group By & Display Options */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">Group By:</Label>
                <Select 
                  value={groupBy} 
                  onValueChange={(v) => setGroupBy(v as GroupByOption)}
                  placeholder="Group By"
                  className="w-40 bg-muted border-input text-foreground"
                >
                  <SelectItem value="none">No Grouping</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </Select>
              </div>
              
              <div className="flex items-center gap-2 ms-0 sm:ms-4">
                <Checkbox
                  id="showModuleAccess"
                  checked={showModuleAccess}
                  onCheckedChange={(checked) => setShowModuleAccess(checked === true)}
                  className="border-input data-[state=checked]:bg-blue-600"
                />
                <Label 
                  htmlFor="showModuleAccess" 
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Show Module Access
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
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
              <Button variant="outline" onClick={fetchUsers} aria-label={t("common.tryAgain", "Try again to load users")} title={t("common.tryAgain", "Try again to load users")}>
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
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-12 text-muted-foreground">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground"
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
                          <TableRow
                            key={user._id}
                            className={`border-border hover:bg-muted/50 ${selectedIds.has(user._id) ? "bg-blue-900/20" : ""}`}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(user._id)}
                                onCheckedChange={() => toggleSelect(user._id)}
                                className="border-input data-[state=checked]:bg-blue-600"
                              />
                            </TableCell>
                            <TableCell>
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
                            <TableCell>
                              <span className="text-xs font-mono text-muted-foreground" title={user._id}>
                                {user.code || user._id.slice(-8)}
                              </span>
                            </TableCell>
                            <TableCell>
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
                            <TableCell>
                              <Badge variant="outline" className="text-muted-foreground border-input">
                                {getUserRole(user)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`${STATUS_COLORS[user.status] || ""} flex items-center gap-1 w-fit`}
                              >
                                {STATUS_ICONS[user.status]}
                                {user.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                {user.orgName || "—"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-muted-foreground text-sm">
                                {user.personal?.phone || "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-muted-foreground text-sm">
                                {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                              </span>
                            </TableCell>
                            {showModuleAccess && (
                              <TableCell>
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
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-muted border-input">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      router.push(`/superadmin/users/${user._id}`);
                                    }}
                                    className="text-muted-foreground hover:bg-muted/80"
                                  >
                                    <Eye className="h-4 w-4 me-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setEditStatusDialogOpen(true);
                                    }}
                                    className="text-muted-foreground hover:bg-muted/80"
                                  >
                                    <Edit className="h-4 w-4 me-2" />
                                    Change Status
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setNewRole((user.professional?.role || user.role || "") as UserRoleType);
                                      setEditRoleDialogOpen(true);
                                    }}
                                    className="text-muted-foreground hover:bg-muted/80"
                                  >
                                    <Shield className="h-4 w-4 me-2" />
                                    Edit Role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setPermissionsDialogOpen(true);
                                    }}
                                    className="text-muted-foreground hover:bg-muted/80"
                                  >
                                    <KeyRound className="h-4 w-4 me-2" />
                                    View Permissions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setPermissionOverrides({});
                                      setExpandedModules(new Set());
                                      setEditPermissionsDialogOpen(true);
                                    }}
                                    className="text-muted-foreground hover:bg-muted/80"
                                  >
                                    <KeyRound className="h-4 w-4 me-2" />
                                    Edit Permissions
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-input" />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSingleNotificationUserId(user._id);
                                      setNotificationDialogOpen(true);
                                    }}
                                    className="text-muted-foreground hover:bg-muted/80"
                                  >
                                    <Mail className="h-4 w-4 me-2" />
                                    Send Notification
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    // Regular view (no grouping)
                    users.map((user) => (
                    <TableRow
                      key={user._id}
                      className={`border-border hover:bg-muted/50 ${selectedIds.has(user._id) ? "bg-blue-900/20" : ""}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(user._id)}
                          onCheckedChange={() => toggleSelect(user._id)}
                          className="border-input data-[state=checked]:bg-blue-600"
                        />
                      </TableCell>
                      <TableCell>
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
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground" title={user._id}>
                          {user.code || user._id.slice(-8)}
                        </span>
                      </TableCell>
                      <TableCell>
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
                      <TableCell>
                        <Badge variant="outline" className="text-muted-foreground border-input">
                          {getUserRole(user)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${STATUS_COLORS[user.status] || ""} flex items-center gap-1 w-fit`}
                        >
                          {STATUS_ICONS[user.status]}
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {user.orgName || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {user.personal?.phone || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                        </span>
                      </TableCell>
                      {showModuleAccess && (
                        <TableCell>
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
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-muted border-input">
                            <DropdownMenuItem
                              onClick={() => {
                                router.push(`/superadmin/users/${user._id}`);
                              }}
                              className="text-muted-foreground hover:bg-muted/80"
                            >
                              <Eye className="h-4 w-4 me-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setEditStatusDialogOpen(true);
                              }}
                              className="text-muted-foreground hover:bg-muted/80"
                            >
                              <Edit className="h-4 w-4 me-2" />
                              Change Status
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setNewRole((user.professional?.role || user.role || "") as UserRoleType);
                                setEditRoleDialogOpen(true);
                              }}
                              className="text-muted-foreground hover:bg-muted/80"
                            >
                              <Shield className="h-4 w-4 me-2" />
                              Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setPermissionsDialogOpen(true);
                              }}
                              className="text-muted-foreground hover:bg-muted/80"
                            >
                              <KeyRound className="h-4 w-4 me-2" />
                              View Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setPermissionOverrides({});
                                setExpandedModules(new Set());
                                setEditPermissionsDialogOpen(true);
                              }}
                              className="text-muted-foreground hover:bg-muted/80"
                            >
                              <KeyRound className="h-4 w-4 me-2" />
                              Edit Permissions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-input" />
                            <DropdownMenuItem
                              onClick={() => {
                                setSingleNotificationUserId(user._id);
                                setNotificationDialogOpen(true);
                              }}
                              className="text-muted-foreground hover:bg-muted/80"
                            >
                              <Mail className="h-4 w-4 me-2" />
                              Send Notification
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
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
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrev || loading}
                  onClick={() => setPage((p) => p - 1)}
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
                  onClick={() => setPage((p) => p + 1)}
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

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Details
            </DialogTitle>
            <DialogDescription>
              View detailed information about this user
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-mono text-sm">{selectedUser.code || selectedUser._id.slice(-8)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Full ID</p>
                  <p className="font-mono text-xs text-muted-foreground truncate" title={selectedUser._id}>{selectedUser._id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{getUserName(selectedUser)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User Type</p>
                  <Badge 
                    variant="outline" 
                    className={selectedUser.userType === "company" 
                      ? "bg-purple-500/20 text-purple-400 border-purple-500/30" 
                      : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    }
                  >
                    {selectedUser.userType === "company" ? "Company" : "Individual"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium">{getUserRole(selectedUser)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sub-Role</p>
                  <p className="font-medium">{selectedUser.professional?.subRole || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedUser.professional?.department || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={STATUS_COLORS[selectedUser.status]}>
                    {selectedUser.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Organization</p>
                  <p className="font-medium">{selectedUser.orgName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedUser.personal?.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                  <p className="font-medium">{selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : "Never"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                </div>
              </div>
              
              {/* Module Access Section */}
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground mb-2">Module Access</p>
                <div className="flex flex-wrap gap-1">
                  {getModuleAccessBadges(selectedUser)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
              className="border-input"
              aria-label={t("common.close", "Close user details")}
              title={t("common.close", "Close user details")}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog (Single User) */}
      <Dialog open={editStatusDialogOpen} onOpenChange={(open) => {
        setEditStatusDialogOpen(open);
        if (!open) setSingleUserStatus(""); // Reset on close
      }}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Change User Status</DialogTitle>
            <DialogDescription>
              Update the status for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select 
                value={singleUserStatus} 
                onValueChange={setSingleUserStatus}
                placeholder="Select status"
                className="w-full bg-muted border-input text-foreground"
              >
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStatusDialogOpen(false)} className="border-input" aria-label={t("common.cancel", "Cancel status change")} title={t("common.cancel", "Cancel status change")}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedUser && handleSingleStatusChange(selectedUser._id, singleUserStatus)}
              disabled={!singleUserStatus || actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
              aria-label={t("superadmin.users.updateStatus", "Update user status")}
              title={t("superadmin.users.updateStatus", "Update user status")}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={(open) => {
        setBulkStatusDialogOpen(open);
        if (!open) setBulkStatus(""); // Reset on close
      }}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Status Change</DialogTitle>
            <DialogDescription>
              Update status for {selectedIds.size} selected users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select 
                value={bulkStatus} 
                onValueChange={setBulkStatus}
                placeholder="Select status"
                className="w-full bg-muted border-input text-foreground"
              >
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)} className="border-input" aria-label={t("common.cancel", "Cancel bulk status change")} title={t("common.cancel", "Cancel bulk status change")}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkStatusChange}
              disabled={!bulkStatus || actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
              aria-label={t("superadmin.users.updateBulkStatus", `Update status for ${selectedIds.size} users`)}
              title={t("superadmin.users.updateBulkStatus", `Update status for ${selectedIds.size} users`)}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              Update {selectedIds.size} Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={(open) => {
        setNotificationDialogOpen(open);
        if (!open) {
          setNotificationSubject("");
          setNotificationMessage("");
          setSingleNotificationUserId(null);
        }
      }}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Send Notification
            </DialogTitle>
            <DialogDescription>
              Send an email notification to {singleNotificationUserId ? "1" : selectedIds.size} selected user{(singleNotificationUserId || selectedIds.size === 1) ? "" : "s"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={notificationSubject}
                onChange={(e) => setNotificationSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="bg-muted border-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Enter your message..."
                rows={5}
                className="bg-muted border-input text-foreground resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotificationDialogOpen(false)} className="border-input" aria-label={t("common.cancel", "Cancel sending notification")} title={t("common.cancel", "Cancel sending notification")}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendNotification}
              disabled={!notificationSubject || !notificationMessage || actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
              aria-label={t("superadmin.users.sendNotification", "Send email notification")}
              title={t("superadmin.users.sendNotification", "Send email notification")}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Mail className="h-4 w-4 me-2" />}
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} user{selectedIds.size !== 1 ? "s" : ""}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will mark the selected user{selectedIds.size !== 1 ? "s" : ""} as deleted and remove them from active lists. 
              They can be restored from the deleted users view if needed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="border-input" aria-label={t("common.cancel", "Cancel user deletion")} title={t("common.cancel", "Cancel user deletion")}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
              aria-label={t("superadmin.users.deleteUsers", `Delete ${selectedIds.size} users`)}
              title={t("superadmin.users.deleteUsers", `Delete ${selectedIds.size} users`)}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Trash2 className="h-4 w-4 me-2" />}
              Delete Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {t("superadmin.users.permissions.title", "Module Permissions")}
            </DialogTitle>
            <DialogDescription>
              {selectedUser && t("superadmin.users.permissions.description", `Permissions for ${getUserName(selectedUser)} (${getUserRole(selectedUser)})`)}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (() => {
            const role = (selectedUser.role || selectedUser.professional?.role || "STAFF") as UserRoleType;
            const permissions = RBAC_ROLE_PERMISSIONS[role] || {};
            
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-400" />
                  <span className="font-medium">{t("superadmin.users.permissions.role", "Role")}: </span>
                  <Badge variant="outline">{role}</Badge>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-start px-4 py-2 font-medium text-muted-foreground">{t("superadmin.users.permissions.module", "Module")}</th>
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">{t("superadmin.users.permissions.view", "View")}</th>
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">{t("superadmin.users.permissions.create", "Create")}</th>
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">{t("superadmin.users.permissions.edit", "Edit")}</th>
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">{t("superadmin.users.permissions.delete", "Delete")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RBAC_MODULES.map((module) => {
                        const modulePerms: ModulePermissions = permissions[module.id] || { view: false, create: false, edit: false, delete: false };
                        return (
                          <tr key={module.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-2">
                              <div>
                                <p className="font-medium">{module.label}</p>
                                <p className="text-xs text-muted-foreground">{module.description}</p>
                              </div>
                            </td>
                            <td className="text-center px-2 py-2">
                              {modulePerms.view ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                              )}
                            </td>
                            <td className="text-center px-2 py-2">
                              {modulePerms.create ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                              )}
                            </td>
                            <td className="text-center px-2 py-2">
                              {modulePerms.edit ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                              )}
                            </td>
                            <td className="text-center px-2 py-2">
                              {modulePerms.delete ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  {t("superadmin.users.permissions.note", "Permissions are determined by the user's role. Contact an administrator to change role assignments.")}
                </p>
              </div>
            );
          })()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPermissionsDialogOpen(false)}
              className="border-input"
              aria-label={t("common.close", "Close permissions dialog")}
              title={t("common.close", "Close permissions dialog")}
            >
              {t("common.close", "Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {t("superadmin.users.createUser", "Create User")}
            </DialogTitle>
            <DialogDescription>
              {t("superadmin.users.createUserDescription", "Create a new user account")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-email">{t("superadmin.users.email", "Email")} *</Label>
              <Input
                id="create-email"
                type="email"
                value={createUserForm.email}
                onChange={(e) => setCreateUserForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
                className="bg-muted border-input"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-firstName">{t("superadmin.users.firstName", "First Name")}</Label>
                <Input
                  id="create-firstName"
                  value={createUserForm.firstName}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  className="bg-muted border-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-lastName">{t("superadmin.users.lastName", "Last Name")}</Label>
                <Input
                  id="create-lastName"
                  value={createUserForm.lastName}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                  className="bg-muted border-input"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-role">{t("superadmin.users.role", "Role")} *</Label>
              <Select
                value={createUserForm.role}
                onValueChange={(value) => setCreateUserForm((prev) => ({ ...prev, role: value as UserRoleType }))}
                placeholder={t("superadmin.users.selectRole", "Select a role")}
                className="w-full sm:w-40 bg-muted border-input text-foreground"
              >
                {CANONICAL_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-org">{t("superadmin.users.organization", "Organization")}</Label>
              <Select
                value={createUserForm.orgId}
                onValueChange={(value) => setCreateUserForm((prev) => ({ ...prev, orgId: value }))}
                placeholder={t("superadmin.users.selectOrg", "Select organization (optional)")}
                className="w-full sm:w-40 bg-muted border-input text-foreground"
              >
                <SelectItem value="">{t("superadmin.users.noOrg", "No organization")}</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org._id} value={org._id}>
                    {org.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateUserDialogOpen(false);
                setCreateUserForm({ email: "", firstName: "", lastName: "", role: "", orgId: "" });
              }}
              className="border-input"
              disabled={actionLoading}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={actionLoading || !createUserForm.email || !createUserForm.role}
              className="bg-primary text-primary-foreground"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {t("common.creating", "Creating...")}
                </>
              ) : (
                t("common.create", "Create")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              {t("superadmin.users.editRole", "Edit User Role")}
            </DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  {t("superadmin.users.editRoleFor", "Change role for")} <strong>{selectedUser.email}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedUser && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="text-muted-foreground">
                  {t("superadmin.users.currentRole", "Current role")}:{" "}
                  <Badge variant="outline">{getUserRole(selectedUser)}</Badge>
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="edit-role">{t("superadmin.users.newRole", "New Role")}</Label>
              <Select
                value={newRole}
                onValueChange={(value) => setNewRole(value as UserRoleType)}
                placeholder={t("superadmin.users.selectRole", "Select a role")}
                className="w-full sm:w-40 bg-muted border-input text-foreground"
              >
                {CANONICAL_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditRoleDialogOpen(false);
                setNewRole("");
              }}
              className="border-input"
              disabled={actionLoading}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleEditRole}
              disabled={actionLoading || !newRole}
              className="bg-primary text-primary-foreground"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {t("common.saving", "Saving...")}
                </>
              ) : (
                t("common.save", "Save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={editPermissionsDialogOpen} onOpenChange={setEditPermissionsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-yellow-400" />
              {t("superadmin.users.editPermissions", "Edit Permissions")}
            </DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  {t("superadmin.users.editPermissionsFor", "Configure permission overrides for")} <strong>{selectedUser.email}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t("superadmin.users.permissionsNote", "Override default role permissions. Checked items grant permission beyond the role default.")}
            </p>
            
            {/* Collapsible module tree */}
            <div className="border rounded-lg divide-y divide-border">
              {RBAC_MODULES.map((module) => {
                const subModules = getSubModulesForParent(module.id);
                const isExpanded = expandedModules.has(module.id);
                
                return (
                  <div key={module.id}>
                    {/* Module header */}
                    <button
                      type="button"
                      onClick={() => toggleModuleExpansion(module.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{module.label}</span>
                        {subModules.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {subModules.length} sub-modules
                          </Badge>
                        )}
                      </div>
                    </button>
                    
                    {/* Sub-modules list (collapsible) */}
                    {isExpanded && subModules.length > 0 && (
                      <div className="bg-muted/30 border-t border-border">
                        {subModules.map((sub) => {
                          const overrides = permissionOverrides[sub.id] || {};
                          return (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between px-6 py-2 border-b border-border/50 last:border-0"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{sub.label}</p>
                                <p className="text-xs text-muted-foreground">{sub.description}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                {(["view", "create", "edit", "delete"] as const).map((perm) => (
                                  <label key={perm} className="flex items-center gap-1 cursor-pointer">
                                    <Checkbox
                                      checked={overrides[perm] ?? false}
                                      onCheckedChange={() => toggleSubModulePermission(sub.id, perm)}
                                    />
                                    <span className="text-xs capitalize">{perm}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* No sub-modules message */}
                    {isExpanded && subModules.length === 0 && (
                      <div className="bg-muted/30 border-t border-border px-6 py-3">
                        <p className="text-sm text-muted-foreground italic">
                          {t("superadmin.users.noSubModules", "No sub-modules for this module")}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditPermissionsDialogOpen(false);
                setPermissionOverrides({});
                setExpandedModules(new Set());
              }}
              className="border-input"
              disabled={actionLoading}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={actionLoading}
              className="bg-primary text-primary-foreground"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {t("common.saving", "Saving...")}
                </>
              ) : (
                t("common.savePermissions", "Save Permissions")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
