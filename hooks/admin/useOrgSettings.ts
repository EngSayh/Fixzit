/**
 * Organization Settings Hook
 *
 * SWR-based hook for organization settings management.
 */

"use client";

import useSWR from "swr";
import { useCallback } from "react";
import { adminApi, OrgSettings } from "@/lib/api/admin";

export function useOrgSettings(orgId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    orgId ? ["org-settings", orgId] : null,
    () => adminApi.getOrgSettings(orgId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // Settings change infrequently
    },
  );

  const updateSettings = useCallback(
    async (settingsData: Partial<OrgSettings>) => {
      const updatedSettings = await adminApi.updateOrgSettings(
        orgId,
        settingsData,
      );

      // Optimistic update
      mutate(updatedSettings, { revalidate: true });

      return updatedSettings;
    },
    [orgId, mutate],
  );

  return {
    settings: data,
    isLoading,
    error,
    updateSettings,
    refresh: mutate,
  };
}
