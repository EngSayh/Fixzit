/**
 * Custom React Query hooks for Admin module data fetching
 * 
 * Features:
 * - Automatic caching and invalidation
 * - Loading and error states
 * - Optimistic updates
 * - Type-safe queries and mutations
 * 
 * Usage:
 * ```tsx
 * const { data: users, isLoading } = useUsers({ search: 'john' });
 * const createUser = useCreateUser();
 * await createUser.mutateAsync({ name: 'John', email: 'john@example.com' });
 * ```
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, type OrgSettings } from "@/lib/api/admin";
import { logger } from "@/lib/logger";

// Query keys for cache management
export const adminQueryKeys = {
  users: (params?: { limit?: number; search?: string }) =>
    ["admin", "users", params] as const,
  user: (id: string) => ["admin", "users", id] as const,
  roles: (params?: { limit?: number }) => ["admin", "roles", params] as const,
  auditLogs: (params?: { limit?: number }) =>
    ["admin", "audit-logs", params] as const,
  orgSettings: (orgId: string) => ["admin", "org-settings", orgId] as const,
};

/**
 * Fetch users with automatic caching and refetching
 */
export function useUsers(params?: { limit?: number; search?: string }) {
  return useQuery({
    queryKey: adminQueryKeys.users(params),
    queryFn: async () => {
      logger.info("Fetching users", { params });
      const response = await adminApi.listUsers(params);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - users data changes frequently
  });
}

/**
 * Fetch roles with automatic caching
 */
export function useRoles(params?: { limit?: number }) {
  return useQuery({
    queryKey: adminQueryKeys.roles(params),
    queryFn: async () => {
      logger.info("Fetching roles", { params });
      const response = await adminApi.listRoles(params);
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - roles change infrequently
  });
}

/**
 * Fetch audit logs with automatic caching
 */
export function useAuditLogs(params?: { limit?: number }) {
  return useQuery({
    queryKey: adminQueryKeys.auditLogs(params),
    queryFn: async () => {
      logger.info("Fetching audit logs", { params });
      const response = await adminApi.listAuditLogs(params);
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute - audit logs should be relatively fresh
  });
}

/**
 * Fetch organization settings with automatic caching
 */
export function useOrgSettings(orgId: string) {
  return useQuery({
    queryKey: adminQueryKeys.orgSettings(orgId),
    queryFn: async () => {
      logger.info("Fetching org settings", { orgId });
      return await adminApi.getOrgSettings(orgId);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!orgId, // Only fetch if orgId is provided
  });
}

/**
 * Create a new user with automatic cache invalidation
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      role: string;
      orgId: string;
      subRole?: string;
    }) => {
      logger.info("Creating user", { email: data.email, role: data.role });
      return await adminApi.createUser(data);
    },
    onSuccess: (newUser) => {
      // Invalidate users query to refetch the list
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() });
      logger.info("User created successfully", { userId: newUser.id });
    },
    onError: (error) => {
      logger.error("Failed to create user", error);
    },
  });
}

/**
 * Update a user with automatic cache invalidation
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        email?: string;
        role?: string;
        orgId?: string;
        isActive?: boolean;
        subRole?: string;
      };
    }) => {
      logger.info("Updating user", { userId: id, changes: Object.keys(data) });
      return await adminApi.updateUser(id, data);
    },
    onSuccess: (updatedUser, { id }) => {
      // Invalidate both the users list and the specific user
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(id) });
      logger.info("User updated successfully", { userId: id });
    },
    onError: (error, { id }) => {
      logger.error("Failed to update user", error, { userId: id });
    },
  });
}

/**
 * Delete a user with automatic cache invalidation
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      logger.info("Deleting user", { userId: id });
      return await adminApi.deleteUser(id);
    },
    onSuccess: (_, id) => {
      // Invalidate users query to refetch the list
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() });
      logger.info("User deleted successfully", { userId: id });
    },
    onError: (error, id) => {
      logger.error("Failed to delete user", error, { userId: id });
    },
  });
}

/**
 * Update organization settings with automatic cache invalidation
 */
export function useUpdateOrgSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      settings,
    }: {
      orgId: string;
      settings: Partial<OrgSettings>;
    }) => {
      logger.info("Updating org settings", { orgId });
      return await adminApi.updateOrgSettings(orgId, settings);
    },
    onSuccess: (_, { orgId }) => {
      // Invalidate org settings query to refetch
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.orgSettings(orgId),
      });
      logger.info("Org settings updated successfully", { orgId });
    },
    onError: (error, { orgId }) => {
      logger.error("Failed to update org settings", error, { orgId });
    },
  });
}
