import { ModuleKey } from '@/src/lib/rbac';
import {
  LayoutDashboard, ClipboardList, Building2, DollarSign,
  Users, Settings, UserCheck, ShoppingBag, Headphones,
  Shield, BarChart3, Cog, Wrench, FileText, Landmark, Map,
  Package, Truck, Star, Search
} from 'lucide-react';

export type MenuItem = {
  id: string;
  label: string;
  path: string;
  module: ModuleKey;
  icon?: any;
  children?: MenuItem[];
};

export const FM_MENU: MenuItem[] = [
  { id:'dashboard', label:'Dashboard', path:'/fm/dashboard', module:'dashboard', icon:LayoutDashboard },
  { id:'wo', label:'Work Orders', path:'/fm/work-orders', module:'work_orders', icon:ClipboardList,
    children:[
      { id:'wo-create', label:'Create', path:'/fm/work-orders/create', module:'work_orders' },
      { id:'wo-assign', label:'Assign & Track', path:'/fm/work-orders/assign', module:'work_orders' },
      { id:'wo-pm', label:'Preventive', path:'/fm/work-orders/pm', module:'preventive', icon:Wrench },
      { id:'wo-history', label:'Service History', path:'/fm/work-orders/history', module:'work_orders' }
    ]
  },
  { id:'props', label:'Properties', path:'/fm/properties', module:'properties', icon:Building2,
    children:[
      { id:'units', label:'Units & Tenants', path:'/fm/properties/units', module:'properties' },
      { id:'leases', label:'Lease Management', path:'/fm/properties/leases', module:'leases', icon:Landmark },
      { id:'inspections', label:'Inspections', path:'/fm/properties/inspections', module:'inspections' },
      { id:'docs', label:'Documents', path:'/fm/properties/documents', module:'documents', icon:FileText }
    ]
  },
  { id:'fin', label:'Finance', path:'/fm/finance', module:'finance', icon:DollarSign,
    children:[
      { id:'invoices', label:'Invoices', path:'/fm/finance/invoices', module:'finance' },
      { id:'payments', label:'Payments', path:'/fm/finance/payments', module:'finance' },
      { id:'expenses', label:'Expenses', path:'/fm/finance/expenses', module:'finance' },
      { id:'budgets', label:'Budgets', path:'/fm/finance/budgets', module:'budgets' },
      { id:'fin-reports', label:'Reports', path:'/fm/finance/reports', module:'finance' }
    ]
  },
  { id:'hr', label:'Human Resources', path:'/fm/hr', module:'hr', icon:Users },
  { id:'admin', label:'Administration', path:'/fm/administration', module:'administration', icon:Settings },
  { id:'crm', label:'CRM', path:'/fm/crm', module:'crm', icon:UserCheck },
  { id:'market', label:'Marketplace', path:'/marketplace', module:'marketplace', icon:ShoppingBag },
  { id:'support', label:'Support', path:'/fm/support', module:'support', icon:Headphones },
  { id:'compliance', label:'Compliance & Legal', path:'/fm/compliance', module:'compliance', icon:Shield },
  { id:'reports', label:'Reports & Analytics', path:'/fm/reports', module:'reports', icon:BarChart3 },
  { id:'system', label:'System Management', path:'/fm/system', module:'system', icon:Cog } // Super Admin only
];

// Aqar Real‑Estate — focused on listing exploration & agent owner flows (benchmarked)
export const AQAR_MENU: MenuItem[] = [
  { id:'aqar-browse', label:'Explore Listings', path:'/aqar/browse', module:'properties', icon:Building2 },
  { id:'aqar-map', label:'Map View', path:'/aqar/map', module:'properties', icon:Map },
  { id:'aqar-saved', label:'Saved Searches', path:'/aqar/saved', module:'properties' },
  { id:'aqar-leads', label:'Leads & Inquiries', path:'/aqar/leads', module:'crm', icon:UserCheck },
  { id:'aqar-mylist', label:'My Listings', path:'/aqar/my-listings', module:'properties' },
  { id:'aqar-post', label:'Post Property', path:'/aqar/post', module:'properties' },
  { id:'aqar-insights', label:'Neighborhood Insights', path:'/aqar/insights', module:'reports' } // تقييم الحي
];

// Material Market — Amazon‑style categories & filters, enforced Fixzit theme
export const MARKET_MENU: MenuItem[] = [
  { id:'market-home', label:'Marketplace Home', path:'/souq', module:'marketplace', icon:ShoppingBag },
  { id:'market-catalog', label:'Catalog', path:'/souq/catalog', module:'marketplace', icon:Package,
    children: [
      { id:'market-categories', label:'Categories', path:'/souq/categories', module:'marketplace' },
      { id:'market-brands', label:'Brands', path:'/souq/brands', module:'marketplace' },
      { id:'market-deals', label:'Deals', path:'/souq/deals', module:'marketplace' }
    ]
  },
  { id:'market-vendors', label:'Vendors', path:'/souq/vendors', module:'marketplace', icon:Users },
  { id:'market-rfqs', label:'RFQs & Bids', path:'/souq/rfqs', module:'marketplace', icon:FileText },
  { id:'market-orders', label:'Orders & POs', path:'/souq/orders', module:'marketplace', icon:ClipboardList,
    children: [
      { id:'market-orders-list', label:'My Orders', path:'/souq/orders', module:'marketplace' },
      { id:'market-orders-create', label:'Create Order', path:'/souq/orders/create', module:'marketplace' },
      { id:'market-orders-history', label:'Order History', path:'/souq/orders/history', module:'marketplace' }
    ]
  },
  { id:'market-shipping', label:'Shipping & Logistics', path:'/souq/shipping', module:'marketplace', icon:Truck },
  { id:'market-reviews', label:'Reviews & Ratings', path:'/souq/reviews', module:'marketplace', icon:Star },
  { id:'market-search', label:'Advanced Search', path:'/souq/search', module:'marketplace', icon:Search },
  { id:'market-vendor-portal', label:'Vendor Portal', path:'/souq/vendor', module:'marketplace', icon:Settings }
];
