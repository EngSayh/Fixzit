// Module configuration for TopBar dynamic behavior
export type AppKey = 'fm' | 'souq' | 'aqar';
// FIX: Removed marketplace/aqar_souq (separate apps), added reports
export type ModuleKey = 'dashboard' | 'work_orders' | 'properties' | 'finance' | 'hr' | 'admin' | 'crm' | 'vendors' | 'support' | 'compliance' | 'reports';
export type SearchEntity = 'work_orders' | 'properties' | 'units' | 'tenants' | 'vendors' | 'invoices' | 'products' | 'services' | 'rfqs' | 'orders' | 'listings' | 'projects' | 'agents';

export interface AppConfig {
  id: AppKey;
  labelKey: string; // FIX: Use labelKey for i18n
  routePrefix: string;
  searchPlaceholderKey: string; // FIX: Use labelKey for i18n
  searchEntities: SearchEntity[];
  quickActions: Array<{
    id: string;
    labelKey: string; // FIX: Use labelKey for i18n
    href: string;
    permission: string;
  }>;
}

export const APPS: Record<AppKey, AppConfig> = {
  fm: {
    id: 'fm',
    labelKey: 'app.fm', // FIX: Use translation key
    routePrefix: '/fm',
    searchPlaceholderKey: 'common.search.placeholder', // FIX: Use translation key
    searchEntities: ['work_orders', 'properties', 'units', 'tenants', 'vendors', 'invoices'],
    quickActions: [
      { id: 'new_wo', labelKey: 'dashboard.newWorkOrder', href: '/fm/work-orders/new', permission: 'wo.create' }, // FIX: Added /fm prefix
      { id: 'new_property', labelKey: 'dashboard.addProperty', href: '/fm/properties/new', permission: 'properties.create' }, // FIX: Added /fm prefix
      { id: 'new_invoice', labelKey: 'dashboard.createInvoice', href: '/fm/finance/invoices/new', permission: 'finance.invoice.create' }, // FIX: Added /fm prefix
    ]
  },
  souq: {
    id: 'souq',
    labelKey: 'app.souq', // FIX: Use translation key
    routePrefix: '/marketplace',
    searchPlaceholderKey: 'souq.search.placeholder', // FIX: Use translation key
    searchEntities: ['products', 'services', 'vendors', 'rfqs', 'orders'],
    quickActions: [
      { id: 'new_rfq', labelKey: 'souq.newRFQ', href: '/marketplace/rfqs/new', permission: 'souq.rfq.create' },
      { id: 'new_po', labelKey: 'souq.createPO', href: '/marketplace/orders/new', permission: 'souq.po.create' },
      { id: 'add_item', labelKey: 'souq.addItem', href: '/marketplace/items/new', permission: 'souq.item.create' },
    ]
  },
  aqar: {
    id: 'aqar',
    labelKey: 'app.aqar', // FIX: Use translation key
    routePrefix: '/aqar',
    searchPlaceholderKey: 'aqar.search.placeholder', // FIX: Use translation key
    searchEntities: ['listings', 'projects', 'agents'],
    quickActions: [
      { id: 'post_property', labelKey: 'aqar.postProperty', href: '/aqar/listings/new', permission: 'aqar.listing.create' },
      { id: 'valuation', labelKey: 'aqar.newValuation', href: '/aqar/valuation/new', permission: 'aqar.valuation.create' },
    ]
  }
};

export function detectAppFromPath(pathname: string): AppKey {
  if (pathname.startsWith('/aqar')) return 'aqar';
  if (pathname.startsWith('/marketplace') || pathname.startsWith('/souq')) return 'souq';
  return 'fm'; // Default to FM for dashboard, work-orders, properties, etc.
}

/**
 * Detects the current *Module* (within the FM app) from the pathname.
 * This is used for highlighting the active item in the FM sidebar.
 * FIX: Now correctly checks for /fm/ prefix
 */
export function getModuleFromPath(pathname: string): ModuleKey {
  // FIX: Only detect modules within FM app
  if (!pathname.startsWith('/fm/')) {
    return 'dashboard'; // Default for non-FM paths
  }
  
  // FIX: Check for /fm/ prefixed paths
  if (pathname.startsWith('/fm/work-orders')) return 'work_orders';
  if (pathname.startsWith('/fm/properties')) return 'properties';
  if (pathname.startsWith('/fm/finance')) return 'finance';
  if (pathname.startsWith('/fm/hr')) return 'hr';
  if (pathname.startsWith('/fm/admin')) return 'admin';
  if (pathname.startsWith('/fm/crm')) return 'crm';
  if (pathname.startsWith('/fm/vendors')) return 'vendors';
  if (pathname.startsWith('/fm/support')) return 'support';
  if (pathname.startsWith('/fm/compliance')) return 'compliance';
  if (pathname.startsWith('/fm/reports')) return 'reports'; // FIX: Added missing reports module
  
  return 'dashboard';
}