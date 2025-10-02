// Module configuration for TopBar dynamic behavior
export type AppKey = 'fm' | 'souq' | 'aqar';
export type ModuleKey = 'dashboard' | 'work_orders' | 'properties' | 'finance' | 'hr' | 'admin' | 'crm' | 'marketplace' | 'aqar_souq' | 'vendors' | 'support' | 'compliance';
export type SearchEntity = 'work_orders' | 'properties' | 'units' | 'tenants' | 'vendors' | 'invoices' | 'products' | 'services' | 'rfqs' | 'orders' | 'listings' | 'projects' | 'agents';

export interface AppConfig {
  id: AppKey;
  label: string;
  routePrefix: string;
  searchPlaceholder: string;
  searchEntities: SearchEntity[];
  quickActions: Array<{
    id: string;
    label: string;
    href: string;
    permission: string;
  }>;
}

export const APPS: Record<AppKey, AppConfig> = {
  fm: {
    id: 'fm',
    label: 'Fixzit Facility Management (FM)',
    routePrefix: '/fm',
    searchPlaceholder: 'Search Work Orders, Properties, Tenants, Vendors, Invoices...',
    searchEntities: ['work_orders', 'properties', 'units', 'tenants', 'vendors', 'invoices'],
    quickActions: [
      { id: 'new_wo', label: 'New Work Order', href: '/work-orders/new', permission: 'wo.create' },
      { id: 'new_inspection', label: 'New Inspection', href: '/inspections/new', permission: 'inspections.create' },
      { id: 'new_invoice', label: 'New Invoice', href: '/finance/invoices/new', permission: 'finance.invoice.create' },
    ]
  },
  souq: {
    id: 'souq',
    label: 'Fixizit Souq',
    routePrefix: '/marketplace',
    searchPlaceholder: 'Search Products, Services, Vendors, RFQs, Orders...',
    searchEntities: ['products', 'services', 'vendors', 'rfqs', 'orders'],
    quickActions: [
      { id: 'new_rfq', label: 'New RFQ', href: '/marketplace/rfqs/new', permission: 'souq.rfq.create' },
      { id: 'new_po', label: 'Create PO', href: '/marketplace/orders/new', permission: 'souq.po.create' },
      { id: 'add_item', label: 'Add Product/Service', href: '/marketplace/items/new', permission: 'souq.item.create' },
    ]
  },
  aqar: {
    id: 'aqar',
    label: 'Aqar Souq',
    routePrefix: '/aqar',
    searchPlaceholder: 'Search Listings, Projects, Agents...',
    searchEntities: ['listings', 'projects', 'agents'],
    quickActions: [
      { id: 'post_property', label: 'Post Property', href: '/aqar/listings/new', permission: 'aqar.listing.create' },
      { id: 'valuation', label: 'New Valuation Request', href: '/aqar/valuation/new', permission: 'aqar.valuation.create' },
    ]
  }
};

export function detectAppFromPath(pathname: string): AppKey {
  if (pathname.startsWith('/aqar')) return 'aqar';
  if (pathname.startsWith('/marketplace') || pathname.startsWith('/souq')) return 'souq';
  return 'fm'; // Default to FM for dashboard, work-orders, properties, etc.
}

export function getModuleFromPath(pathname: string): ModuleKey {
  if (pathname.startsWith('/work-orders')) return 'work_orders';
  if (pathname.startsWith('/properties')) return 'properties';
  if (pathname.startsWith('/finance')) return 'finance';
  if (pathname.startsWith('/hr')) return 'hr';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/crm')) return 'crm';
  if (pathname.startsWith('/marketplace') || pathname.startsWith('/souq')) return 'marketplace';
  if (pathname.startsWith('/aqar')) return 'aqar_souq';
  if (pathname.startsWith('/vendors')) return 'vendors';
  if (pathname.startsWith('/support')) return 'support';
  if (pathname.startsWith('/compliance')) return 'compliance';
  return 'dashboard';
}