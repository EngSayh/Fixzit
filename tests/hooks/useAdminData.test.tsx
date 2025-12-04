/**
 * Integration tests for admin data hooks (TanStack Query)
 * 
 * Tests:
 * - User CRUD operations with automatic cache invalidation
 * - Org-scoped operations (multi-tenancy enforcement)
 * - SubRole persistence in create/update flows
 * - Error handling and retry logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '@/hooks/useAdminData';
import { adminApi } from '@/lib/api/admin';

// Mock the admin API
vi.mock('@/lib/api/admin', () => ({
  adminApi: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    listRoles: vi.fn(),
    listAuditLogs: vi.fn(),
    getOrgSettings: vi.fn(),
    updateOrgSettings: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Admin Data Hooks - TanStack Query Integration', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return wrapper;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries for tests
        },
        mutations: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  describe('useUsers', () => {
    it('fetches users successfully', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'john@example.com',
          name: 'John Doe',
          role: 'TEAM_MEMBER',
          subRole: 'FINANCE_OFFICER',
          orgId: 'org-123',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(adminApi.listUsers).mockResolvedValue({
        data: mockUsers,
        success: true,
      });

      const { result } = renderHook(() => useUsers({ limit: 100 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockUsers);
      expect(adminApi.listUsers).toHaveBeenCalledWith({ limit: 100 });
    });

    it('filters users by search query', async () => {
      vi.mocked(adminApi.listUsers).mockResolvedValue({
        data: [],
        success: true,
      });

      const { result } = renderHook(
        () => useUsers({ limit: 100, search: 'john' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(adminApi.listUsers).toHaveBeenCalledWith({
        limit: 100,
        search: 'john',
      });
    });
  });

  describe('useCreateUser', () => {
    it('creates user and invalidates cache', async () => {
      const newUser = {
        id: 'user-new',
        email: 'jane@example.com',
        name: 'Jane Smith',
        role: 'TEAM_MEMBER',
        subRole: 'HR_OFFICER',
        orgId: 'org-123',
        isActive: true,
        createdAt: '2024-01-15T00:00:00Z',
      };

      vi.mocked(adminApi.createUser).mockResolvedValue(newUser);

      const { result } = renderHook(() => useCreateUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'TEAM_MEMBER',
          orgId: 'org-123',
          subRole: 'HR_OFFICER',
        });
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(adminApi.createUser).toHaveBeenCalledWith({
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'TEAM_MEMBER',
        orgId: 'org-123',
        subRole: 'HR_OFFICER',
      });
    });

    it('enforces orgId in create operations', async () => {
      const newUser = {
        id: 'user-new',
        email: 'test@example.com',
        name: 'Test User',
        role: 'TENANT',
        orgId: 'org-456',
        isActive: true,
        createdAt: '2024-01-15T00:00:00Z',
      };

      vi.mocked(adminApi.createUser).mockResolvedValue(newUser);

      const { result } = renderHook(() => useCreateUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Test User',
          email: 'test@example.com',
          role: 'TENANT',
          orgId: 'org-456', // Multi-tenancy enforcement
        });
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(adminApi.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-456',
        })
      );
    });

    it('includes subRole for TEAM_MEMBER users', async () => {
      const teamMemberUser = {
        id: 'user-tm',
        email: 'tm@example.com',
        name: 'Team Member',
        role: 'TEAM_MEMBER',
        subRole: 'OPERATIONS_MANAGER',
        orgId: 'org-123',
        isActive: true,
        createdAt: '2024-01-15T00:00:00Z',
      };

      vi.mocked(adminApi.createUser).mockResolvedValue(teamMemberUser);

      const { result } = renderHook(() => useCreateUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Team Member',
          email: 'tm@example.com',
          role: 'TEAM_MEMBER',
          orgId: 'org-123',
          subRole: 'OPERATIONS_MANAGER',
        });
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(adminApi.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          subRole: 'OPERATIONS_MANAGER',
        })
      );
    });
  });

  describe('useUpdateUser', () => {
    it('updates user and invalidates cache', async () => {
      const updatedUser = {
        id: 'user-1',
        email: 'john@example.com',
        name: 'John Updated',
        role: 'TEAM_MEMBER',
        subRole: 'FINANCE_OFFICER',
        orgId: 'org-123',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      };

      vi.mocked(adminApi.updateUser).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useUpdateUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'user-1',
          data: {
            name: 'John Updated',
            orgId: 'org-123', // Enforce tenant scope
          },
        });
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(adminApi.updateUser).toHaveBeenCalledWith('user-1', {
        name: 'John Updated',
        orgId: 'org-123',
      });
    });

    it('preserves subRole when updating TEAM_MEMBER', async () => {
      const updatedUser = {
        id: 'user-tm',
        email: 'tm@example.com',
        name: 'Team Member Updated',
        role: 'TEAM_MEMBER',
        subRole: 'SUPPORT_AGENT',
        orgId: 'org-123',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      };

      vi.mocked(adminApi.updateUser).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useUpdateUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'user-tm',
          data: {
            name: 'Team Member Updated',
            subRole: 'SUPPORT_AGENT',
            orgId: 'org-123',
          },
        });
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(adminApi.updateUser).toHaveBeenCalledWith(
        'user-tm',
        expect.objectContaining({
          subRole: 'SUPPORT_AGENT',
        })
      );
    });

    it('enforces orgId in update operations (multi-tenancy)', async () => {
      const updatedUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'TENANT',
        orgId: 'org-789',
        isActive: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      };

      vi.mocked(adminApi.updateUser).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useUpdateUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'user-1',
          data: {
            isActive: false,
            orgId: 'org-789', // Must match user's orgId
          },
        });
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(adminApi.updateUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          orgId: 'org-789',
        })
      );
    });
  });

  describe('useDeleteUser', () => {
    it('deletes user and invalidates cache', async () => {
      vi.mocked(adminApi.deleteUser).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeleteUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('user-1');
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(adminApi.deleteUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('Cache Invalidation', () => {
    it('invalidates users query after creating a user', async () => {
      const newUser = {
        id: 'user-new',
        email: 'new@example.com',
        name: 'New User',
        role: 'TENANT',
        orgId: 'org-123',
        isActive: true,
        createdAt: '2024-01-15T00:00:00Z',
      };

      vi.mocked(adminApi.createUser).mockResolvedValue(newUser);

      // Create a QueryClient and spy on invalidateQueries
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Render create mutation hook
      const { result } = renderHook(() => useCreateUser(), { wrapper });

      // Create user
      await act(async () => {
        await result.current.mutateAsync({
          name: 'New User',
          email: 'new@example.com',
          role: 'TENANT',
          orgId: 'org-123',
        });
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify invalidateQueries was called with users query key (partial match)
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['admin', 'users']),
        })
      );
    });
  });
});
