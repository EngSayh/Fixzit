/**
 * Admin Roles Hook
 *
 * SWR-based data hook for role management.
 */

"use client";

import useSWR from "swr";
import { useState, useCallback } from "react";
import { adminApi, PaginationParams, AdminRole } from "@/lib/api/admin";

export interface UseAdminRolesOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export function useAdminRoles(options: UseAdminRolesOptions = {}) {
  const [params, setParams] = useState<UseAdminRolesOptions>({
    page: options.page || 1,
    limit: options.limit || 50, // Higher default for roles (typically fewer than users)
    search: options.search || "",
  });

  const key = ["admin-roles", params.page, params.limit, params.search];

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => adminApi.listRoles(params as PaginationParams),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // Roles change less frequently
    },
  );

  const setPage = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setParams((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setParams((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const createRole = useCallback(
    async (roleData: Partial<AdminRole>) => {
      const newRole = await adminApi.createRole(roleData);

      mutate(
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            data: [newRole, ...currentData.data],
            pagination: {
              ...currentData.pagination,
              total: currentData.pagination.total + 1,
            },
          };
        },
        { revalidate: true },
      );

      return newRole;
    },
    [mutate],
  );

  const updateRole = useCallback(
    async (roleId: string, roleData: Partial<AdminRole>) => {
      const updatedRole = await adminApi.updateRole(roleId, roleData);

      mutate(
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            data: currentData.data.map((r) =>
              r.id === roleId ? updatedRole : r,
            ),
          };
        },
        { revalidate: true },
      );

      return updatedRole;
    },
    [mutate],
  );

  const deleteRole = useCallback(
    async (roleId: string) => {
      await adminApi.deleteRole(roleId);

      mutate(
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            data: currentData.data.filter((r) => r.id !== roleId),
            pagination: {
              ...currentData.pagination,
              total: currentData.pagination.total - 1,
            },
          };
        },
        { revalidate: true },
      );
    },
    [mutate],
  );

  return {
    roles: data?.data || [],
    pagination: data?.pagination || {
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
    },
    isLoading,
    error,
    page: params.page,
    limit: params.limit,
    search: params.search,
    setPage,
    setLimit,
    setSearch,
    createRole,
    updateRole,
    deleteRole,
    refresh: mutate,
  };
}
