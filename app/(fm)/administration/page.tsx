"use client";

/**
 * Administration Module - Fully Integrated with API and RBAC
 *
 * This module provides comprehensive administration features for:
 * - User Management (CRUD operations)
 * - Role & Permission Management
 * - Audit Log Viewing
 * - System Settings Configuration
 *
 * Access Control: Super Admin and Corporate Admin only
 * Compliance: WCAG 2.1 AA, RTL-first, Gov V5 structure
 */

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users,
  Shield,
  Activity,
  Settings as SettingsIcon,
  UserPlus,
  Download,
  Edit,
  Lock,
  Unlock,
  Trash2,
  Search,
  Filter,
  Save,
  X,
  Check,
  AlertCircle,
  MoreVertical,
  Eye,
  UserCog,
  Globe,
  DollarSign,
  Bell,
  MessageSquare,
} from "lucide-react";
import AdminNotificationsTab from "@/components/admin/AdminNotificationsTab";
import CommunicationDashboard from "@/components/admin/CommunicationDashboard";
import RoleBadge from "@/components/admin/RoleBadge";
import UserModal, { type UserFormData } from "@/components/admin/UserModal";
import { logger } from "@/lib/logger";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAuthRbac } from "@/hooks/useAuthRbac";
import { SubRole } from "@/lib/rbac/client-roles";
import {
  adminApi,
  type OrgSettings,
  type AdminUser,
  type AdminRole,
  type AuditLogEntry,
} from "@/lib/api/admin";
import {
  useUsers,
  useRoles,
  useAuditLogs,
  useOrgSettings,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@/hooks/useAdminData";

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  subRole?: SubRole; // STRICT v4.1: Team Member sub-role
  status: "Active" | "Inactive" | "Locked";
  lastLogin: string;
  department: string;
  phone?: string;
  createdAt: string;
  org_id: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  createdAt: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  status: "Success" | "Failed";
  ip: string;
  details?: string;
}

interface SystemSetting {
  key: string;
  value: string;
  category: string;
  description: string;
  type: "string" | "number" | "boolean";
}

// interface ApiResponse<T> {
//   data: T;
//   error?: string;
//   message?: string;
// }

const AdminModule: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session, status: sessionStatus } = useSession();
  const { isSuperAdmin, isLoading: rbacLoading } = useAuthRbac();

  // Session + RBAC helpers
  const sessionUser = session?.user;
  const authLoading = sessionStatus === "loading" || rbacLoading;
  const isCorporateAdmin = sessionUser?.role === "ADMIN";
  const hasAdminAccess = isSuperAdmin || isCorporateAdmin;
  const orgId = sessionUser?.orgId ?? undefined;
  const activeOrgId = orgId ?? "platform";

  // State management
  const [activeTab, setActiveTab] = useState<
    | "users"
    | "roles"
    | "audit"
    | "settings"
    | "tenants"
    | "billing"
    | "notifications"
    | "communications"
  >("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // User management state
  const [userModalOpen, setUserModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Settings state
  const [editedSettings, setEditedSettings] = useState<Map<string, string>>(
    new Map(),
  );

  // TanStack Query hooks for data fetching (Step 3)
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useUsers({ limit: 100, search: searchQuery || undefined });
  const {
    data: rolesData,
    isLoading: isLoadingRoles,
    error: rolesError,
  } = useRoles({ limit: 100 });
  const {
    data: auditLogsData,
    isLoading: isLoadingAuditLogs,
    error: auditLogsError,
  } = useAuditLogs({ limit: 100 });
  const {
    data: orgSettings,
    isLoading: isLoadingOrgSettings,
    error: orgSettingsError,
  } = useOrgSettings(activeOrgId);

  // Mutations
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  // Map API data to UI format
  const users = useMemo(
    () => (usersData ? usersData.map(mapAdminUser) : []),
    [usersData]
  );
  const roles = useMemo(
    () => (rolesData ? rolesData.map(mapAdminRole) : []),
    [rolesData]
  );
  const auditLogs = useMemo(
    () => (auditLogsData ? auditLogsData.map(mapAuditLogEntry) : []),
    [auditLogsData]
  );
  const settings = useMemo(
    () => (orgSettings ? normalizeSettingsFromOrg(orgSettings) : []),
    [orgSettings]
  );

  // Determine loading state based on active tab
  const isLoadingData =
    (activeTab === "users" && isLoadingUsers) ||
    (activeTab === "roles" && isLoadingRoles) ||
    (activeTab === "audit" && isLoadingAuditLogs) ||
    (activeTab === "settings" && isLoadingOrgSettings);

  const mapAdminUser = (adminUser: AdminUser): User => {
    // Normalize role to canonical form for STRICT v4.1
    let canonicalRole = adminUser.role || adminUser.roles?.[0];
    
    // Handle special cases
    if (adminUser.isSuperAdmin) {
      canonicalRole = "SUPER_ADMIN";
    } else if (!canonicalRole) {
      canonicalRole = "TENANT"; // Default fallback
    }
    
    // Normalize legacy role names (e.g., "Super Admin" -> "SUPER_ADMIN")
    // This ensures UI always works with canonical enums
    canonicalRole = canonicalRole.toUpperCase().replace(/\s+/g, "_");
    
    return {
      id: adminUser.id,
      name:
        adminUser.name ||
        adminUser.email ||
        adminUser.username ||
        t("admin.users.table.unknownUser", "Unknown user"),
      email: adminUser.email || adminUser.username || "—",
      role: canonicalRole,
      subRole: adminUser.subRole as SubRole | undefined, // Preserve STRICT v4.1 sub-role
      status: adminUser.isActive ? "Active" : "Inactive",
      lastLogin:
        adminUser.updatedAt?.toString() ||
        adminUser.createdAt?.toString() ||
        t("admin.users.table.noActivity", "No activity recorded"),
      department:
        adminUser.orgId || t("admin.users.table.departmentFallback", "General"),
      phone: adminUser.username,
      createdAt: adminUser.createdAt?.toString() || new Date().toISOString(),
      // ORGID-FIX: Use empty string for missing orgId (type requires string)
      org_id: adminUser.orgId || "",
    };
  };

  const mapAdminRole = (role: AdminRole): Role => ({
    id: role.id,
    name: role.name,
    description: role.description || "",
    permissions: role.permissions || [],
    userCount: role.permissions ? role.permissions.length : 0,
    createdAt: role.createdAt || "",
  });

  const mapAuditLogEntry = (entry: AuditLogEntry): AuditLog => ({
    id: entry.id,
    timestamp: entry.timestamp,
    user: entry.actorEmail || entry.actorId,
    action: entry.action,
    resource: entry.resourceType
      ? `${entry.resourceType}/${entry.resourceId ?? ""}`
      : entry.action,
    status: entry.success ? "Success" : "Failed",
    ip: entry.ipAddress || "—",
    details:
      entry.errorMessage ||
      (entry.meta ? JSON.stringify(entry.meta) : undefined),
  });

  const formatUserStatus = (status: User["status"]): string => {
    switch (status) {
      case "Active":
        return t("admin.users.status.active", "Active");
      case "Inactive":
        return t("admin.users.status.inactive", "Inactive");
      case "Locked":
        return t("admin.users.status.locked", "Locked");
      default:
        return status;
    }
  };

  const formatAuditStatus = (status: AuditLog["status"]): string => {
    return status === "Success"
      ? t("admin.audit.status.success", "Success")
      : t("admin.audit.status.failed", "Failed");
  };

  const normalizeSettingsFromOrg = (payload: OrgSettings): SystemSetting[] => {
    const rows: SystemSetting[] = [
      {
        key: "org.name",
        value: payload.name || "",
        category: "General",
        description: t(
          "admin.settings.fields.orgName",
          "Organization display name",
        ),
        type: "string",
      },
      {
        key: "org.timezone",
        value: payload.timezone || "",
        category: "General",
        description: t("admin.settings.fields.timezone", "Default timezone"),
        type: "string",
      },
      {
        key: "org.language",
        value: payload.language || "en",
        category: "Localization",
        description: t("admin.settings.fields.language", "Default language"),
        type: "string",
      },
    ];

    Object.entries(payload.features || {}).forEach(([featureKey, enabled]) => {
      rows.push({
        key: `feature.${featureKey}`,
        value: String(enabled),
        category: "Features",
        description: t(
          "admin.settings.fields.featureToggle",
          "Feature availability",
        ),
        type: "boolean",
      });
    });

    return rows;
  };

  // RBAC Check
  useEffect(() => {
    if (authLoading) return;

    if (!sessionUser) {
      router.replace(
        `/login?callbackUrl=${encodeURIComponent("/administration")}`,
      );
      return;
    }

    if (!hasAdminAccess) {
      logger.warn("Access denied to admin module", { role: sessionUser.role });
      router.replace("/dashboard");
    }
  }, [authLoading, sessionUser, hasAdminAccess, router]);

  // Handle query errors (Step 3: TanStack Query integration)
  useEffect(() => {
    const queryError =
      (activeTab === "users" && usersError) ||
      (activeTab === "roles" && rolesError) ||
      (activeTab === "audit" && auditLogsError) ||
      (activeTab === "settings" && orgSettingsError);

    if (queryError) {
      const errorMessage =
        queryError instanceof Error
          ? queryError.message
          : t("admin.common.errors.fetchData", "Failed to fetch data");
      setError(errorMessage);
      logger.error(`Failed to fetch ${activeTab} data:`, queryError);
    } else {
      setError(null);
    }
  }, [
    activeTab,
    usersError,
    rolesError,
    auditLogsError,
    orgSettingsError,
    t,
  ]);

  // User actions
  const handleAddUser = () => {
    setEditingUser(null);
    setUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserModalOpen(true);
  };

  const handleSaveUser = async (userData: UserFormData) => {
    try {
      if (editingUser) {
        // Update existing user with org scoping (B.1 Multi-tenancy Enforcement)
        await updateUserMutation.mutateAsync({
          id: editingUser.id,
          data: {
            name: userData.name,
            email: userData.email,
            role: userData.role,
            orgId: activeOrgId, // Enforce tenant scope to prevent cross-tenant updates
            isActive: userData.status ? userData.status !== "Inactive" : undefined,
            // Include subRole if provided (STRICT v4.1)
            ...(userData.subRole ? { subRole: userData.subRole } : {}),
          },
        });
        setSuccessMessage(
          t("admin.users.toast.updated", "User updated successfully"),
        );
      } else {
        // Create new user
        await createUserMutation.mutateAsync({
          name: userData.name!,
          email: userData.email!,
          role: userData.role!,
          orgId: activeOrgId,
          // Include subRole if provided (STRICT v4.1)
          ...(userData.subRole ? { subRole: userData.subRole } : {}),
        });
        setSuccessMessage(
          t("admin.users.toast.created", "User created successfully"),
        );
      }
      setUserModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : t("admin.users.errors.save", "Failed to save user");
      setError(errorMessage);
      logger.error("Failed to save user:", err);
      throw err; // Re-throw so UserModal can show the error
    }
  };

  const handleToggleUserStatus = async (
    userId: string,
    currentStatus: string,
  ) => {
    try {
      const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
      await updateUserMutation.mutateAsync({
        id: userId,
        data: { isActive: newStatus === "Active", orgId: activeOrgId },
      });
      setSuccessMessage(
        newStatus === "Active"
          ? t("admin.users.toast.activated", "User activated successfully")
          : t("admin.users.toast.deactivated", "User deactivated successfully"),
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(t("admin.users.errors.status", "Failed to update user status"));
      logger.error("Failed to update user status:", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        t(
          "admin.users.confirmDelete",
          "Are you sure you want to delete this user?",
        ),
      )
    )
      return;

    try {
      await deleteUserMutation.mutateAsync(userId);
      setSuccessMessage(
        t("admin.users.toast.deleted", "User deleted successfully"),
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(t("admin.users.errors.delete", "Failed to delete user"));
      logger.error("Failed to delete user:", err);
    }
  };

  // Settings actions
  const handleSettingChange = (key: string, value: string) => {
    const newEdited = new Map(editedSettings);
    newEdited.set(key, value);
    setEditedSettings(newEdited);
  };

  const handleSaveSettings = async () => {
    try {
      if (!orgSettings) return;

      const updates: Partial<OrgSettings> = {};
      const featureUpdates: Record<string, boolean> = {};

      editedSettings.forEach((value, key) => {
        if (key === "org.name") {
          updates.name = value;
        } else if (key === "org.timezone") {
          updates.timezone = value;
        } else if (key === "org.language") {
          updates.language = value;
        } else if (key.startsWith("feature.")) {
          featureUpdates[key.replace("feature.", "")] = value === "true";
        }
      });

      if (Object.keys(featureUpdates).length) {
        updates.features = {
          ...(orgSettings.features || {}),
          ...featureUpdates,
        };
      }

      const _updated = await adminApi.updateOrgSettings(activeOrgId, updates);
      // Note: orgSettings and settings will be updated automatically via TanStack Query refetch
      setEditedSettings(new Map());
      setSuccessMessage(
        t("admin.settings.toast.saved", "Settings saved successfully"),
      );
      logger.info("Settings updated", { count: editedSettings.size });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(t("admin.settings.errors.save", "Failed to save settings"));
      logger.error("Failed to save settings:", err);
    }
  };

  // Define tabs before any early returns (React Hooks rule)
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: "users", label: t("admin.tabs.users", "Users"), icon: Users },
      { id: "roles", label: t("admin.tabs.roles", "Roles"), icon: Shield },
      {
        id: "audit",
        label: t("admin.tabs.audit", "Audit Logs"),
        icon: Activity,
      },
      {
        id: "settings",
        label: t("admin.tabs.settings", "Settings"),
        icon: SettingsIcon,
      },
    ];

    if (isSuperAdmin) {
      baseTabs.push(
        {
          id: "notifications",
          label: t("admin.tabs.notifications", "Send Notifications"),
          icon: Bell,
        },
        {
          id: "communications",
          label: t("admin.tabs.communications", "Communications"),
          icon: MessageSquare,
        },
        {
          id: "tenants",
          label: t("admin.tabs.tenants", "Tenant Management"),
          icon: Globe,
        },
        {
          id: "billing",
          label: t("admin.tabs.billing", "Subscriptions & Billing"),
          icon: DollarSign,
        },
      );
    }

    return baseTabs;
  }, [isSuperAdmin, t]);

  // Loading and access control
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
          <p className="text-gray-600">
            {t("admin.common.loadingSession", "Loading session...")}
          </p>
        </div>
      </div>
    );
  }

  if (!sessionUser || !hasAdminAccess) {
    return null; // Router will redirect
  }

  const renderUsers = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t("admin.users.title", "User Management")}
          </h2>
          <p className="text-gray-600 mt-1">
            {t("admin.users.subtitle", "Manage organization users and access")}
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button"
            onClick={() => {
              /* Export functionality */
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            aria-label={t("admin.users.actions.exportAria", "Export users")}
          >
            <Download size={20} />
            <span className="hidden sm:inline">
              {t("admin.common.export", "Export")}
            </span>
          </button>
          <button type="button"
            onClick={handleAddUser}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center gap-2"
            aria-label={t("admin.users.actions.addAria", "Add new user")}
          >
            <UserPlus size={20} />
            {t("admin.users.actions.add", "Add User")}
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder={t("admin.users.searchPlaceholder", "Search users...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full ps-10 pe-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            aria-label={t("admin.users.searchAria", "Search users")}
          />
        </div>
        <button type="button"
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          aria-label={t("admin.users.actions.filterAria", "Filter users")}
        >
          <Filter size={20} />
          {t("admin.common.filters", "Filters")}
        </button>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.users.table.user", "User")}
              </th>
              <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.users.table.role", "Role")}
              </th>
              <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.users.table.status", "Status")}
              </th>
              <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.users.table.lastLogin", "Last Login")}
              </th>
              <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.users.table.department", "Department")}
              </th>
              <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.users.table.actions", "Actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoadingData ? (
              <tr>
                <td colSpan={6} className="text-center p-6">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="text-center p-6 text-destructive">
                  <AlertCircle className="inline mb-1" size={20} /> {error}
                </td>
              </tr>
            ) : (
              users
                .filter(
                  (u) =>
                    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchQuery.toLowerCase()),
                )
                .map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.role} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : user.status === "Locked"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {formatUserStatus(user.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.lastLogin}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.department}
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button"
                          onClick={() => handleEditUser(user)}
                          className="p-2 hover:bg-gray-100 rounded"
                          title={t("admin.users.actions.edit", "Edit user")}
                          aria-label={`${t("admin.users.actions.edit", "Edit user")} ${user.name}`}
                        >
                          <Edit size={18} />
                        </button>
                        <button type="button"
                          onClick={() =>
                            handleToggleUserStatus(user.id, user.status)
                          }
                          className="p-2 hover:bg-gray-100 rounded"
                          title={
                            user.status === "Active"
                              ? t(
                                  "admin.users.actions.deactivate",
                                  "Deactivate user",
                                )
                              : t(
                                  "admin.users.actions.activate",
                                  "Activate user",
                                )
                          }
                          aria-label={`${
                            user.status === "Active"
                              ? t(
                                  "admin.users.actions.deactivate",
                                  "Deactivate user",
                                )
                              : t(
                                  "admin.users.actions.activate",
                                  "Activate user",
                                )
                          } ${user.name}`}
                        >
                          {user.status === "Active" ? (
                            <Lock size={18} />
                          ) : (
                            <Unlock size={18} />
                          )}
                        </button>
                        <button type="button"
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 hover:bg-gray-100 rounded text-destructive"
                          title={t("admin.users.actions.delete", "Delete user")}
                          aria-label={`${t("admin.users.actions.delete", "Delete user")} ${user.name}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRoles = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t("admin.roles.title", "Role Management")}
          </h2>
          <p className="text-gray-600 mt-1">
            {t("admin.roles.subtitle", "Define roles and permissions")}
          </p>
        </div>
        <button type="button"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center gap-2"
          aria-label={t("admin.roles.actions.addAria", "Add new role")}
        >
          <Shield size={20} />
          {t("admin.roles.actions.add", "Add Role")}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingData ? (
          <div className="col-span-full text-center p-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          roles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/20 rounded-lg">
                    <UserCog size={24} className="text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{role.name}</h3>
                    <p className="text-sm text-gray-500">
                      {t("admin.roles.usersCount", "{{count}} users").replace(
                        "{{count}}",
                        String(role.userCount),
                      )}
                    </p>
                  </div>
                </div>
                <button type="button"
                  className="p-1 hover:bg-gray-100 rounded"
                  aria-label={t("admin.roles.actions.more", "More options")}
                >
                  <MoreVertical size={20} />
                </button>
              </div>
              <p className="text-gray-600 text-sm mb-4">{role.description}</p>
              <div className="flex flex-wrap gap-2">
                {role.permissions.slice(0, 3).map((perm) => (
                  <span
                    key={perm}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                  >
                    {perm}
                  </span>
                ))}
                {role.permissions.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {t(
                      "admin.roles.morePermissions",
                      "+{{count}} more",
                    ).replace("{{count}}", String(role.permissions.length - 3))}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderAuditLogs = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t("admin.audit.title", "Audit Logs")}
        </h2>
        <p className="text-gray-600 mt-1">
          {t(
            "admin.audit.subtitle",
            "System activity and security audit trail",
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <select
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          aria-label={t("admin.audit.filters.actionAria", "Filter by action")}
        >
          <option value="">
            {t("admin.audit.filters.allActions", "All Actions")}
          </option>
          <option>
            {t("admin.audit.filters.userCreated", "User Created")}
          </option>
          <option>
            {t("admin.audit.filters.userUpdated", "User Updated")}
          </option>
          <option>{t("admin.audit.filters.login", "Login")}</option>
          <option>{t("admin.audit.filters.logout", "Logout")}</option>
        </select>
        <select
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          aria-label={t("admin.audit.filters.statusAria", "Filter by status")}
        >
          <option value="">
            {t("admin.audit.filters.allStatus", "All Status")}
          </option>
          <option>{t("admin.audit.status.success", "Success")}</option>
          <option>{t("admin.audit.status.failed", "Failed")}</option>
        </select>
        <input
          type="date"
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          aria-label={t("admin.audit.filters.fromDate", "From date")}
        />
        <input
          type="date"
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          aria-label={t("admin.audit.filters.toDate", "To date")}
        />
      </div>

      {/* Audit table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                {t("admin.audit.table.timestamp", "Timestamp")}
              </th>
              <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                {t("admin.audit.table.user", "User")}
              </th>
              <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                {t("admin.audit.table.action", "Action")}
              </th>
              <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                {t("admin.audit.table.resource", "Resource")}
              </th>
              <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                {t("admin.audit.table.status", "Status")}
              </th>
              <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                {t("admin.audit.table.ip", "IP Address")}
              </th>
              <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase">
                {t("admin.audit.table.details", "Details")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoadingData ? (
              <tr>
                <td colSpan={7} className="text-center p-6">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.user}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    {log.resource}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.status === "Success"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {formatAuditStatus(log.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    {log.ip}
                  </td>
                  <td className="px-6 py-4 text-end">
                    {log.details && (
                      <button type="button"
                        className="p-2 hover:bg-gray-100 rounded"
                        title={t(
                          "admin.audit.actions.viewDetails",
                          "View details",
                        )}
                        aria-label={t(
                          "admin.audit.actions.viewDetails",
                          "View log details",
                        )}
                      >
                        <Eye size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSettings = () => {
    const categories = Array.from(new Set(settings.map((s) => s.category)));
    const hasChanges = editedSettings.size > 0;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t("admin.settings.title", "System Settings")}
            </h2>
            <p className="text-gray-600 mt-1">
              {t("admin.settings.subtitle", "Configure system-wide parameters")}
            </p>
          </div>
          {hasChanges && (
            <div className="flex gap-3">
              <button type="button"
                onClick={() => setEditedSettings(new Map())}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                aria-label={t(
                  "admin.settings.buttons.cancelAria",
                  "Cancel changes",
                )}
              >
                <X size={20} />
                {t("admin.settings.buttons.cancel", "Cancel")}
              </button>
              <button type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center gap-2"
                aria-label={t(
                  "admin.settings.buttons.saveAria",
                  "Save settings",
                )}
              >
                <Save size={20} />
                {t("admin.settings.buttons.save", "Save Changes")}
              </button>
            </div>
          )}
        </div>

        {isLoadingData ? (
          <div className="text-center p-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          categories.map((category) => (
            <div key={category} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <SettingsIcon size={20} />
                {category}
              </h3>
              <div className="space-y-4">
                {settings
                  .filter((s) => s.category === category)
                  .map((setting) => {
                    const currentValue =
                      editedSettings.get(setting.key) ?? setting.value;
                    const hasChanged = editedSettings.has(setting.key);

                    return (
                      <div
                        key={setting.key}
                        className="flex items-center justify-between py-3 border-b last:border-b-0"
                      >
                        <div className="flex-1">
                          <label
                            htmlFor={setting.key}
                            className="block font-medium text-gray-900"
                          >
                            {setting.key
                              .split(".")[1]
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                            {hasChanged && (
                              <span className="ms-2 text-primary text-sm">
                                ●
                              </span>
                            )}
                          </label>
                          <p className="text-sm text-gray-500 mt-1">
                            {setting.description}
                          </p>
                        </div>
                        <div className="w-64 ms-4">
                          {setting.type === "boolean" ? (
                            <select
                              id={setting.key}
                              value={currentValue}
                              onChange={(e) =>
                                handleSettingChange(setting.key, e.target.value)
                              }
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                            >
                              <option value="true">
                                {t("admin.settings.options.enabled", "Enabled")}
                              </option>
                              <option value="false">
                                {t(
                                  "admin.settings.options.disabled",
                                  "Disabled",
                                )}
                              </option>
                            </select>
                          ) : setting.type === "number" ? (
                            <input
                              id={setting.key}
                              type="number"
                              value={currentValue}
                              onChange={(e) =>
                                handleSettingChange(setting.key, e.target.value)
                              }
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                            />
                          ) : (
                            <input
                              id={setting.key}
                              type="text"
                              value={currentValue}
                              onChange={(e) =>
                                handleSettingChange(setting.key, e.target.value)
                              }
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderTenantManagement = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {t("admin.tenants.title", "Tenant Management")}
        </h2>
        <p className="text-gray-600 mt-1">
          {t(
            "admin.tenants.subtitle",
            "Manage corporate organizations, branding, and module assignments.",
          )}
        </p>
        <div className="mt-6 border rounded-lg p-4 bg-slate-50 text-sm text-slate-600">
          {t(
            "admin.tenants.placeholder",
            "Tenant management tooling is restricted to Super Admin users. Connect to the platform directory to view and update organizations.",
          )}
        </div>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {t("admin.billing.title", "Subscriptions & Billing")}
        </h2>
        <p className="text-gray-600 mt-1">
          {t(
            "admin.billing.subtitle",
            "Track plans, invoices, and platform revenue operations.",
          )}
        </p>
        <div className="mt-6 border rounded-lg p-4 bg-slate-50 text-sm text-slate-600">
          {t(
            "admin.billing.placeholder",
            "Billing tooling hooks into /api/admin/billing endpoints. Wire the adminApi billing client to surface plan limits, invoices, and dunning events.",
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success/Error notifications */}
      {successMessage && (
        <div className="fixed top-4 end-4 z-50 bg-success/90 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in">
          <Check size={20} />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="fixed top-4 end-4 z-50 bg-destructive/90 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-secondary/20 rounded-lg">
              <Shield size={32} className="text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t("admin.header.title", "Administration")}
              </h1>
              <p className="text-gray-600">
                {t(
                  "admin.header.subtitle",
                  "System configuration and user management",
                )}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 border-b overflow-x-auto">
            {tabs.map((tab) => (
              <button type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                aria-current={activeTab === tab.id ? "page" : undefined}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "users" && renderUsers()}
        {activeTab === "roles" && renderRoles()}
        {activeTab === "audit" && renderAuditLogs()}
        {activeTab === "settings" && renderSettings()}
        {activeTab === "notifications" && isSuperAdmin && (
          <AdminNotificationsTab t={t} />
        )}
        {activeTab === "communications" && isSuperAdmin && (
          <CommunicationDashboard t={t} isRTL={false} />
        )}
        {activeTab === "tenants" && renderTenantManagement()}
        {activeTab === "billing" && renderBilling()}
      </div>

      {/* User Modal - Create/Edit Users with Sub-Role Support */}
      <UserModal
        isOpen={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        editingUser={editingUser}
        t={t}
      />
    </div>
  );
};

export default AdminModule;
