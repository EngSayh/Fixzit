/**
 * useFilterPresets Hook
 * 
 * React hook for managing filter presets.
 * Supports fetching, creating, and deleting user filter presets.
 * 
 * @module hooks/useFilterPresets
 */

import useSWR, { mutate } from "swr";
import { useCallback } from "react";
import { logger } from "@/lib/logger";
import { type FilterEntityType } from "@/lib/filters/entities";

export type EntityType = FilterEntityType;

export interface FilterPreset {
  _id: string;
  user_id: string;
  org_id: string;
  entity_type: EntityType;
  name: string;
  filters: Record<string, unknown>;
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

interface FetchPresetsResponse {
  presets: FilterPreset[];
  count: number;
}

const fetcher = async (url: string): Promise<FetchPresetsResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to fetch presets" }));
    throw new Error(error.error || "Failed to fetch presets");
  }
  return res.json();
};

export interface UseFilterPresetsOptions {
  entityType?: EntityType;
  enabled?: boolean;
}

export interface UseFilterPresetsReturn {
  presets: FilterPreset[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  createPreset: (data: {
    entity_type: EntityType;
    name: string;
    filters: Record<string, unknown>;
    sort?: { field: string; direction: "asc" | "desc" };
    is_default?: boolean;
  }) => Promise<FilterPreset>;
  deletePreset: (id: string) => Promise<void>;
  defaultPreset: FilterPreset | undefined;
  refresh: () => Promise<void>;
}

export function useFilterPresets({
  entityType,
  enabled = true,
}: UseFilterPresetsOptions = {}): UseFilterPresetsReturn {
  const url = entityType
    ? `/api/filters/presets?entity_type=${entityType}`
    : "/api/filters/presets";

  const { data, error, isLoading } = useSWR<FetchPresetsResponse>(
    enabled ? url : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const createPreset = useCallback(
    async (data: {
      entity_type: EntityType;
      name: string;
      filters: Record<string, unknown>;
      sort?: { field: string; direction: "asc" | "desc" };
      is_default?: boolean;
    }): Promise<FilterPreset> => {
      const res = await fetch("/api/filters/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to create preset" }));
        throw new Error(error.error || "Failed to create preset");
      }

      const result = await res.json();
      
      // Revalidate cache
      await mutate(url);
      
      logger.info("[useFilterPresets] Created preset", { name: data.name });
      return result.preset;
    },
    [url]
  );

  const deletePreset = useCallback(
    async (id: string): Promise<void> => {
      const res = await fetch(`/api/filters/presets/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to delete preset" }));
        throw new Error(error.error || "Failed to delete preset");
      }

      // Revalidate cache
      await mutate(url);
      
      logger.info("[useFilterPresets] Deleted preset", { presetId: id });
    },
    [url]
  );

  const refresh = useCallback(async () => {
    await mutate(url);
  }, [url]);

  const defaultPreset = data?.presets?.find((p) => p.is_default);

  return {
    presets: data?.presets,
    isLoading,
    error,
    createPreset,
    deletePreset,
    defaultPreset,
    refresh,
  };
}
