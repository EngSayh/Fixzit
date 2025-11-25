/**
 * Admin Users Hook
 *
 * SWR-based data hook for user management.
 * Provides pagination, optimistic updates, and error handling.
 */

"use client";

import useSWR from "swr";
import { useState, useCallback } from "react";
import { adminApi, PaginationParams, AdminUser } from "@/lib/api/admin";

export interface UseAdminUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function useAdminUsers(options: UseAdminUsersOptions = {}) {
  const [params, setParams] = useState<UseAdminUsersOptions>({
    page: options.page || 1,
    limit: options.limit || 20,
    search: options.search || "",
    sortBy: options.sortBy || "createdAt",
    sortOrder: options.sortOrder || "desc",
  });

  // SWR key includes all params for proper caching
  const key = [
    "admin-users",
    params.page,
    params.limit,
    params.search,
    params.sortBy,
    params.sortOrder,
  ];

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => adminApi.listUsers(params as PaginationParams),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Prevent duplicate requests within 5s
    },
  );

  // Pagination controls
  const setPage = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setParams((prev) => ({ ...prev, limit, page: 1 })); // Reset to page 1
  }, []);

  const setSearch = useCallback((search: string) => {
    setParams((prev) => ({ ...prev, search, page: 1 })); // Reset to page 1
  }, []);

  const setSort = useCallback(
    (sortBy: string, sortOrder: "asc" | "desc" = "asc") => {
      setParams((prev) => ({ ...prev, sortBy, sortOrder }));
    },
    [],
  );

  // CRUD operations with optimistic updates
  const createUser = useCallback(
    async (userData: Partial<AdminUser>) => {
      const newUser = await adminApi.createUser(userData);

      // Optimistic update: add new user to current data
      mutate(
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            data: [newUser, ...currentData.data],
            pagination: {
              ...currentData.pagination,
              total: currentData.pagination.total + 1,
            },
          };
        },
        { revalidate: true }, // Revalidate to ensure consistency
      );

      return newUser;
    },
    [mutate],
  );

  const updateUser = useCallback(
    async (userId: string, userData: Partial<AdminUser>) => {
      const updatedUser = await adminApi.updateUser(userId, userData);

      // Optimistic update: replace user in current data
      mutate(
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            data: currentData.data.map((u) =>
              u.id === userId ? updatedUser : u,
            ),
          };
        },
        { revalidate: true },
      );

      return updatedUser;
    },
    [mutate],
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      await adminApi.deleteUser(userId);

      // Optimistic update: remove user from current data
      mutate(
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            data: currentData.data.filter((u) => u.id !== userId),
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

  const assignRoles = useCallback(
    async (userId: string, roleIds: string[]) => {
      const updatedUser = await adminApi.assignRoles(userId, roleIds);

      // Optimistic update: update user roles
      mutate(
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            data: currentData.data.map((u) =>
              u.id === userId ? updatedUser : u,
            ),
          };
        },
        { revalidate: true },
      );

      return updatedUser;
    },
    [mutate],
  );

  return {
    // Data
    users: data?.data || [],
    pagination: data?.pagination || {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },

    // State
    isLoading,
    error,

    // Pagination controls
    page: params.page,
    limit: params.limit,
    search: params.search,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    setPage,
    setLimit,
    setSearch,
    setSort,

    // CRUD operations
    createUser,
    updateUser,
    deleteUser,
    assignRoles,

    // Manual revalidation
    refresh: mutate,
  };
}
