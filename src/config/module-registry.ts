export type AppKey = 'fm' | 'souq' | 'aqar';
export type ModuleKey =
  | 'dashboard' | 'work-orders' | 'properties' | 'finance' | 'hr'
  | 'administration' | 'crm' | 'marketplace' | 'support'
  | 'compliance' | 'reports' | 'system';

export type RoleKey =
  | 'super_admin' | 'admin' | 'corporate_owner' | 'team_member'
  | 'technician' | 'property_manager' | 'tenant' | 'vendor' | 'guest';

export type SearchEntity =
  | 'work_orders' | 'properties' | 'units' | 'assets' | 'tenants' | 'vendors' | 'invoices'
  | 'products' | 'services' | 'rfqs' | 'orders'
  | 'listings' | 'projects' | 'agents';

export interface AppConfig {
  label: string;
  defaultPlaceholder: string;
  searchEntities: SearchEntity[];
  quickActions: (role: RoleKey) => { id: string; label: string; href: string; perm: string }[];
}

export const APPS: Record<AppKey, AppConfig> = {
  fm: {
    label: 'Fixzit Facility Management (FM)',
    defaultPlaceholder: 'Search work orders, properties, tenants…',
    searchEntities: ['work_orders','properties','units','assets','tenants','vendors','invoices'],
    quickActions: (role) => [
      { id:'new_wo', label:'New Work Order', href:'/work-orders/new', perm:'wo.create' },
      { id:'new_inspection', label:'New Inspection', href:'/inspections/new', perm:'inspections.create' },
      { id:'new_invoice', label:'New Invoice', href:'/finance/invoices/new', perm:'finance.invoice.create' },
    ]
  },
  souq: {
    label: 'Fixizit Souq',
    defaultPlaceholder: 'Search catalog, vendors, RFQs, orders…',
    searchEntities: ['products','services','vendors','rfqs','orders'],
    quickActions: (role) => [
      { id:'new_rfq', label:'New RFQ', href:'/marketplace/rfqs/new', perm:'souq.rfq.create' },
      { id:'new_po', label:'Create PO', href:'/marketplace/orders/new', perm:'souq.po.create' },
      { id:'add_item', label:'Add Product/Service', href:'/marketplace/items/new', perm:'souq.item.create' },
    ]
  },
  aqar: {
    label: 'Aqar Souq',
    defaultPlaceholder: 'Search listings, projects, agents…',
    searchEntities: ['listings','projects','agents'],
    quickActions: (role) => [
      { id:'post_property', label:'Post Property', href:'/aqar/listings/new', perm:'aqar.listing.create' },
      { id:'valuation', label:'New Valuation Request', href:'/aqar/valuation/new', perm:'aqar.valuation.create' },
    ]
  }
};