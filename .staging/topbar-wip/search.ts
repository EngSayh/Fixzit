/**
 * Module-aware search utilities
 */

import type { ModuleId } from '@/types/topbar';
import { SEARCH_SCOPES } from '@/config/modules';

/**
 * Fetch search suggestions for current module
 */
export async function fetchSuggestions(
  query: string,
  module: ModuleId,
  tenantId: string
): Promise<any[]> {
  if (!query || query.length < 2) return [];

  // Validate that the module exists in SEARCH_SCOPES
  const scope = SEARCH_SCOPES[module];
  if (!scope) {
    console.error(`Search scope not found for module: ${module}`);
    return [];
  }

  try {
    const response = await fetch(
      `${scope.apiPath}?q=${encodeURIComponent(query)}&types=${scope.entityTypes.join(',')}`,
      {
        headers: {
          'x-tenant-id': tenantId,
        },
      }
    );

    if (!response.ok) return [];
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Search suggestions fetch failed:', error);
    return [];
  }
}

/**
 * Navigate to search results page
 */
export function routeToResults(query: string, module: ModuleId): string {
  return `/${module}/search?q=${encodeURIComponent(query)}`;
}
