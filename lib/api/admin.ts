/**
 * Admin API Client
 *
 * Typed API client for admin module operations.
 * All functions use fetch with proper error handling and type safety.
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  username?: string;
  role: string;
  roles: string[];
  isSuperAdmin: boolean;
  isActive: boolean;
  orgId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRole {
  id: string;
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  wildcard: boolean;
  systemReserved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  meta?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}

export interface OrgSettings {
  id: string;
  orgId: string;
  name: string;
  domain?: string;
  logo?: string;
  timezone: string;
  language: string;
  features: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

/**
 * User Management API
 */
export const adminApi = {
  // Users
  async listUsers(
    params: PaginationParams = {},
  ): Promise<PaginatedResponse<AdminUser>> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page.toString());
    if (params.limit) query.set("limit", params.limit.toString());
    if (params.search) query.set("search", params.search);
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);

    const res = await fetch(`/api/admin/users?${query}`);
    if (!res.ok) throw new Error(`Failed to fetch users: ${res.statusText}`);
    return res.json();
  },

  async getUser(userId: string): Promise<AdminUser> {
    const res = await fetch(`/api/admin/users/${userId}`);
    if (!res.ok) throw new Error(`Failed to fetch user: ${res.statusText}`);
    return res.json();
  },

  async createUser(data: Partial<AdminUser>): Promise<AdminUser> {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create user: ${res.statusText}`);
    return res.json();
  },

  async updateUser(
    userId: string,
    data: Partial<AdminUser>,
  ): Promise<AdminUser> {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update user: ${res.statusText}`);
    return res.json();
  },

  async deleteUser(userId: string): Promise<void> {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Failed to delete user: ${res.statusText}`);
  },

  async assignRoles(userId: string, roleIds: string[]): Promise<AdminUser> {
    const res = await fetch(`/api/admin/users/${userId}/roles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleIds }),
    });
    if (!res.ok) throw new Error(`Failed to assign roles: ${res.statusText}`);
    return res.json();
  },

  // Roles
  async listRoles(
    params: PaginationParams = {},
  ): Promise<PaginatedResponse<AdminRole>> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page.toString());
    if (params.limit) query.set("limit", params.limit.toString());
    if (params.search) query.set("search", params.search);

    const res = await fetch(`/api/admin/roles?${query}`);
    if (!res.ok) throw new Error(`Failed to fetch roles: ${res.statusText}`);
    return res.json();
  },

  async getRole(roleId: string): Promise<AdminRole> {
    const res = await fetch(`/api/admin/roles/${roleId}`);
    if (!res.ok) throw new Error(`Failed to fetch role: ${res.statusText}`);
    return res.json();
  },

  async createRole(data: Partial<AdminRole>): Promise<AdminRole> {
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create role: ${res.statusText}`);
    return res.json();
  },

  async updateRole(
    roleId: string,
    data: Partial<AdminRole>,
  ): Promise<AdminRole> {
    const res = await fetch(`/api/admin/roles/${roleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update role: ${res.statusText}`);
    return res.json();
  },

  async deleteRole(roleId: string): Promise<void> {
    const res = await fetch(`/api/admin/roles/${roleId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Failed to delete role: ${res.statusText}`);
  },

  // Audit Logs
  async listAuditLogs(
    params: PaginationParams & {
      actorId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<PaginatedResponse<AuditLogEntry>> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page.toString());
    if (params.limit) query.set("limit", params.limit.toString());
    if (params.search) query.set("search", params.search);
    if (params.actorId) query.set("actorId", params.actorId);
    if (params.action) query.set("action", params.action);
    if (params.startDate) query.set("startDate", params.startDate);
    if (params.endDate) query.set("endDate", params.endDate);

    const res = await fetch(`/api/admin/audit?${query}`);
    if (!res.ok)
      throw new Error(`Failed to fetch audit logs: ${res.statusText}`);
    return res.json();
  },

  async exportAuditLogs(
    params: {
      startDate?: string;
      endDate?: string;
      format?: "csv" | "json";
    } = {},
  ): Promise<Blob> {
    const query = new URLSearchParams();
    if (params.startDate) query.set("startDate", params.startDate);
    if (params.endDate) query.set("endDate", params.endDate);
    if (params.format) query.set("format", params.format);

    const res = await fetch(`/api/admin/audit/export?${query}`);
    if (!res.ok)
      throw new Error(`Failed to export audit logs: ${res.statusText}`);
    return res.blob();
  },

  // Organization Settings
  async getOrgSettings(orgId: string): Promise<OrgSettings> {
    const res = await fetch(`/api/admin/org/${orgId}/settings`);
    if (!res.ok)
      throw new Error(`Failed to fetch org settings: ${res.statusText}`);
    return res.json();
  },

  async updateOrgSettings(
    orgId: string,
    data: Partial<OrgSettings>,
  ): Promise<OrgSettings> {
    const res = await fetch(`/api/admin/org/${orgId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok)
      throw new Error(`Failed to update org settings: ${res.statusText}`);
    return res.json();
  },
};
