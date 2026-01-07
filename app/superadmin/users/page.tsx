"use client";

/**
 * Superadmin Users Management - Refactored
 * Full interface for managing all users across tenants
 * 
 * @module app/superadmin/users/page
 */

import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { toast } from "sonner";
import type { ModulePermissions } from "@/config/rbac.matrix";
import type { UserRoleType } from "@/types/user";

// Import extracted components
import {
  type UserData,
  type Organization,
  type Pagination,
  type GroupByOption,
  type CreateUserFormData,
  type PermissionOverrides,
  UserFilters,
  UsersTable,
  BulkActionsHeader,
  ViewUserDialog,
  EditStatusDialog,
  BulkStatusDialog,
  NotificationDialog,
  DeleteDialog,
  ViewPermissionsDialog,
  CreateUserDialog,
  EditRoleDialog,
  EditPermissionsDialog,
} from "./components";

export default function SuperadminUsersPage() {
  const { t } = useI18n();

  // Core state
  const [users, setUsers] = useState<UserData[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [showModuleAccess, setShowModuleAccess] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

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
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [editPermissionsDialogOpen, setEditPermissionsDialogOpen] = useState(false);

  // Form state
  const [createUserForm, setCreateUserForm] = useState<CreateUserFormData>({
    email: "",
    firstName: "",
    lastName: "",
    role: "",
    orgId: "",
  });
  const [newRole, setNewRole] = useState<UserRoleType | "">("");
  const [permissionOverrides, setPermissionOverrides] = useState<PermissionOverrides>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [singleUserStatus, setSingleUserStatus] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationSubject, setNotificationSubject] = useState("");
  const [singleNotificationUserId, setSingleNotificationUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ============================================================================
  // Data Fetching
  // ============================================================================

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
      setSelectedIds(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, orgFilter, userTypeFilter, roleFilter]);

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

  useEffect(() => {
    setPage(1);
  }, [statusFilter, orgFilter, userTypeFilter, roleFilter]);

  // ============================================================================
  // Selection Handlers
  // ============================================================================

  const toggleSelectAll = useCallback(() => {
    if (users.every(user => selectedIds.has(user._id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u._id)));
    }
  }, [users, selectedIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // ============================================================================
  // Action Handlers
  // ============================================================================

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

  const handleSingleStatusChange = async () => {
    if (!selectedUser || !singleUserStatus) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/superadmin/users/${selectedUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: singleUserStatus }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update user");
      }

      toast.success("User status updated");
      setEditStatusDialogOpen(false);
      setSingleUserStatus("");
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setActionLoading(false);
    }
  };

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

  const toggleSubModulePermission = (subModuleId: string, permissionKey: keyof ModulePermissions) => {
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

  // ============================================================================
  // Dialog Openers
  // ============================================================================

  const openEditStatus = (user: UserData) => {
    setSelectedUser(user);
    setSingleUserStatus("");
    setEditStatusDialogOpen(true);
  };

  const openEditRole = (user: UserData) => {
    setSelectedUser(user);
    setNewRole((user.professional?.role || user.role || "") as UserRoleType);
    setEditRoleDialogOpen(true);
  };

  const openViewPermissions = (user: UserData) => {
    setSelectedUser(user);
    setPermissionsDialogOpen(true);
  };

  const openEditPermissions = (user: UserData) => {
    setSelectedUser(user);
    setPermissionOverrides({});
    setExpandedModules(new Set());
    setEditPermissionsDialogOpen(true);
  };

  const openSendNotification = (userId: string) => {
    setSingleNotificationUserId(userId);
    setNotificationDialogOpen(true);
  };

  // ============================================================================
  // Render
  // ============================================================================

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
        <BulkActionsHeader
          selectedCount={selectedIds.size}
          loading={loading}
          users={users}
          onCreateUser={() => setCreateUserDialogOpen(true)}
          onRefresh={fetchUsers}
          onBulkStatus={() => setBulkStatusDialogOpen(true)}
          onSendNotification={() => setNotificationDialogOpen(true)}
          onBulkDelete={() => setDeleteDialogOpen(true)}
        />
      </div>

      {/* Filters */}
      <UserFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        orgFilter={orgFilter}
        onOrgFilterChange={setOrgFilter}
        userTypeFilter={userTypeFilter}
        onUserTypeFilterChange={setUserTypeFilter}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        showModuleAccess={showModuleAccess}
        onShowModuleAccessChange={setShowModuleAccess}
        organizations={organizations}
      />

      {/* Table */}
      <UsersTable
        users={users}
        pagination={pagination}
        loading={loading}
        error={error}
        selectedIds={selectedIds}
        groupBy={groupBy}
        showModuleAccess={showModuleAccess}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelect={toggleSelect}
        onEditStatus={openEditStatus}
        onEditRole={openEditRole}
        onViewPermissions={openViewPermissions}
        onEditPermissions={openEditPermissions}
        onSendNotification={openSendNotification}
        onRetry={fetchUsers}
        onPageChange={setPage}
      />

      {/* Dialogs */}
      <ViewUserDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        user={selectedUser}
      />

      <EditStatusDialog
        open={editStatusDialogOpen}
        onOpenChange={(open) => {
          setEditStatusDialogOpen(open);
          if (!open) setSingleUserStatus("");
        }}
        user={selectedUser}
        status={singleUserStatus}
        onStatusChange={setSingleUserStatus}
        onSave={handleSingleStatusChange}
        loading={actionLoading}
      />

      <BulkStatusDialog
        open={bulkStatusDialogOpen}
        onOpenChange={(open) => {
          setBulkStatusDialogOpen(open);
          if (!open) setBulkStatus("");
        }}
        selectedCount={selectedIds.size}
        status={bulkStatus}
        onStatusChange={setBulkStatus}
        onSave={handleBulkStatusChange}
        loading={actionLoading}
      />

      <NotificationDialog
        open={notificationDialogOpen}
        onOpenChange={(open) => {
          setNotificationDialogOpen(open);
          if (!open) {
            setNotificationSubject("");
            setNotificationMessage("");
            setSingleNotificationUserId(null);
          }
        }}
        targetCount={singleNotificationUserId ? 1 : selectedIds.size}
        subject={notificationSubject}
        onSubjectChange={setNotificationSubject}
        message={notificationMessage}
        onMessageChange={setNotificationMessage}
        onSend={handleSendNotification}
        loading={actionLoading}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        selectedCount={selectedIds.size}
        onConfirm={handleBulkDelete}
        loading={actionLoading}
      />

      <ViewPermissionsDialog
        open={permissionsDialogOpen}
        onOpenChange={setPermissionsDialogOpen}
        user={selectedUser}
      />

      <CreateUserDialog
        open={createUserDialogOpen}
        onOpenChange={setCreateUserDialogOpen}
        form={createUserForm}
        onFormChange={setCreateUserForm}
        organizations={organizations}
        onSave={handleCreateUser}
        loading={actionLoading}
      />

      <EditRoleDialog
        open={editRoleDialogOpen}
        onOpenChange={setEditRoleDialogOpen}
        user={selectedUser}
        role={newRole}
        onRoleChange={setNewRole}
        onSave={handleEditRole}
        loading={actionLoading}
      />

      <EditPermissionsDialog
        open={editPermissionsDialogOpen}
        onOpenChange={setEditPermissionsDialogOpen}
        user={selectedUser}
        permissionOverrides={permissionOverrides}
        onTogglePermission={toggleSubModulePermission}
        expandedModules={expandedModules}
        onToggleModule={toggleModuleExpansion}
        onSave={handleSavePermissions}
        loading={actionLoading}
      />
    </div>
  );
}
