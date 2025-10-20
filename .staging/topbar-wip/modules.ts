/**
 * Module Registry for Dynamic TopBar
 * Centralizes module detection and search scope configuration
 */

import type { ModuleId, SearchScopeConfig } from '@/types/topbar';

export const MODULE_LABELS: Record<ModuleId, { en: string; ar: string }> = {
  'fm': { en: 'Facility Management', ar: 'إدارة المنشآت' },
  'fixzit-souq': { en: 'Fixzit Souq', ar: 'سوق فيكزيت' },
  'aqar-souq': { en: 'Aqar Souq', ar: 'سوق عقار' },
};

export const SEARCH_SCOPES: Record<ModuleId, SearchScopeConfig> = {
  'fm': {
    label: { en: 'Facility Management', ar: 'إدارة المنشآت' },
    entityTypes: ['work-orders', 'properties', 'tenants', 'vendors', 'invoices', 'assets'],
    apiPath: '/api/fm/search',
  },
  'fixzit-souq': {
    label: { en: 'Fixzit Souq', ar: 'سوق فيكزيت' },
    entityTypes: ['products', 'orders', 'vendors', 'categories'],
    apiPath: '/api/souq/search',
  },
  'aqar-souq': {
    label: { en: 'Aqar Souq', ar: 'سوق عقار' },
    entityTypes: ['listings', 'properties', 'agents', 'transactions'],
    apiPath: '/api/aqar/search',
  },
};

/**
 * Detect current module from URL pathname
 */
export function detectModule(pathname: string): ModuleId {
  if (pathname.startsWith('/fm')) return 'fm';
  if (pathname.startsWith('/souq')) return 'fixzit-souq';
  if (pathname.startsWith('/aqar')) return 'aqar-souq';
  return 'fm'; // Default fallback
}
