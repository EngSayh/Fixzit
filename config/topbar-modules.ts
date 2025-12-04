import type { UserRoleType } from "@/types/user";

export type AppKey = "fm" | "souq" | "aqar";
export type SearchEntity =
  | "workOrders"
  | "work_orders" // legacy alias, to be phased out
  | "properties"
  | "units"
  | "tenants"
  | "vendors"
  | "invoices"
  | "products"
  | "services"
  | "rfqs"
  | "orders"
  | "listings"
  | "projects"
  | "agents";

// Canonical constants to avoid repeating string literals across the app
export const WORK_ORDERS_ENTITY: SearchEntity = "workOrders";
export const WORK_ORDERS_ENTITY_LEGACY: SearchEntity = "work_orders";

export type ModuleScope =
  | "dashboard"
  | "work_orders" // legacy alias for routing, to be phased out
  | "workOrders"
  | "properties"
  | "finance"
  | "hr"
  | "administration"
  | "crm"
  | "support"
  | "compliance"
  | "reports"
  | "system"
  | "marketplace_materials"
  | "marketplace_real_estate";

export type SidebarModuleKey =
  | "dashboard"
  | "work_orders" // legacy alias for routing, to be phased out
  | "workOrders"
  | "properties"
  | "finance"
  | "hr"
  | "administration"
  | "crm"
  | "marketplace"
  | "support"
  | "compliance"
  | "reports"
  | "system";

export interface QuickActionConfig {
  id: string;
  labelKey: string;
  fallbackLabel: string;
  href: string;
  permission: string;
  roles?: UserRoleType[];
}

export interface SavedSearchConfig {
  id: string;
  labelKey: string;
  fallbackLabel: string;
  query: string;
  scope?: "module" | "all";
}

export interface ModuleScopeConfig {
  id: ModuleScope;
  app: AppKey;
  navKey?: SidebarModuleKey;
  labelKey: string;
  fallbackLabel: string;
  searchPlaceholderKey: string;
  placeholderFallback: string;
  searchEntities: SearchEntity[];
  savedSearches: SavedSearchConfig[];
  quickActions: QuickActionConfig[];
}

export interface AppConfig {
  id: AppKey;
  labelKey: string;
  routePrefix: string;
  searchPlaceholderKey: string;
  searchEntities: SearchEntity[];
  quickActions: QuickActionConfig[];
}

export const APPS: Record<AppKey, AppConfig> = {
  fm: {
    id: "fm",
    labelKey: "app.fm",
    routePrefix: "/fm",
    searchPlaceholderKey: "search.placeholders.fmDefault",
    searchEntities: [
      WORK_ORDERS_ENTITY,
      "properties",
      "units",
      "tenants",
      "vendors",
      "invoices",
    ],
    quickActions: [
      {
        id: "new_wo",
        labelKey: "dashboard.newWorkOrder",
        fallbackLabel: "New Work Order",
        href: "/fm/work-orders/new",
        permission: "wo.create",
        roles: [
          "SUPER_ADMIN",
          "CORPORATE_ADMIN",
          "ADMIN",
          "FM_MANAGER",
          "DISPATCHER",
        ],
      },
      {
        id: "new_property",
        labelKey: "dashboard.addProperty",
        fallbackLabel: "Add Property",
        href: "/fm/properties/new",
        permission: "properties.create",
        roles: [
          "SUPER_ADMIN",
          "CORPORATE_ADMIN",
          "ADMIN",
          "FM_MANAGER",
          "PROPERTY_MANAGER",
        ],
      },
      {
        id: "new_invoice",
        labelKey: "dashboard.createInvoice",
        fallbackLabel: "Create Invoice",
        href: "/fm/finance/invoices/new",
        permission: "finance.invoice.create",
        roles: ["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN", "FINANCE"],
      },
    ],
  },
  souq: {
    id: "souq",
    labelKey: "app.souq",
    routePrefix: "/marketplace",
    searchPlaceholderKey: "search.placeholders.marketplaceMaterials",
    searchEntities: ["products", "services", "vendors", "rfqs", "orders"],
    quickActions: [
      {
        id: "new_rfq",
        labelKey: "souq.newRFQ",
        fallbackLabel: "Create RFQ",
        href: "/marketplace/rfqs/new",
        permission: "souq.rfq.create",
        roles: ["SUPER_ADMIN", "PROCUREMENT", "FM_MANAGER"],
      },
      {
        id: "new_po",
        labelKey: "souq.createPO",
        fallbackLabel: "New Purchase Order",
        href: "/marketplace/orders/new",
        permission: "souq.po.create",
        roles: ["SUPER_ADMIN", "PROCUREMENT", "FINANCE"],
      },
      {
        id: "add_item",
        labelKey: "souq.addItem",
        fallbackLabel: "Add Product or Service",
        href: "/marketplace/items/new",
        permission: "souq.item.create",
        roles: ["SUPER_ADMIN", "PROCUREMENT", "VENDOR"],
      },
    ],
  },
  aqar: {
    id: "aqar",
    labelKey: "app.aqar",
    routePrefix: "/aqar",
    searchPlaceholderKey: "search.placeholders.marketplaceRealEstate",
    searchEntities: ["listings", "projects", "agents"],
    quickActions: [
      {
        id: "post_property",
        labelKey: "aqar.postProperty",
        fallbackLabel: "New Listing",
        href: "/aqar/listings/new",
        permission: "aqar.listing.create",
        roles: ["SUPER_ADMIN", "PROPERTY_MANAGER", "OWNER"],
      },
      {
        id: "valuation",
        labelKey: "aqar.newValuation",
        fallbackLabel: "Request Valuation",
        href: "/aqar/valuation/new",
        permission: "aqar.valuation.create",
        roles: ["SUPER_ADMIN", "PROPERTY_MANAGER", "OWNER"],
      },
    ],
  },
};

export const DEFAULT_SCOPE: ModuleScope = "dashboard";

// Normalize legacy scope strings to canonical
const normalizeScope = (scope: ModuleScope): ModuleScope =>
  scope === WORK_ORDERS_ENTITY_LEGACY ? WORK_ORDERS_ENTITY : scope;

const MODULE_SCOPE_CONFIG: Record<ModuleScope, ModuleScopeConfig> = {
  dashboard: {
    id: "dashboard",
    app: "fm",
    navKey: "dashboard",
    labelKey: "nav.dashboard",
    fallbackLabel: "Dashboard",
    searchPlaceholderKey: "search.placeholders.dashboard",
    placeholderFallback: "Search work orders, properties, tenants…",
    searchEntities: [WORK_ORDERS_ENTITY, "properties", "tenants"],
    savedSearches: [
      {
        id: "recent-activity",
        labelKey: "search.saved.recentOperations",
        fallbackLabel: "Recent operations across modules",
        query: "status:open updated:<7d",
        scope: "module",
      },
    ],
    quickActions: [],
  },
  workOrders: {
    id: WORK_ORDERS_ENTITY,
    app: "fm",
    navKey: WORK_ORDERS_ENTITY,
    labelKey: "nav.workOrders",
    fallbackLabel: "Work Orders",
    searchPlaceholderKey: "search.placeholders.workOrders",
    placeholderFallback: "Search work orders, technicians, assets…",
    searchEntities: [WORK_ORDERS_ENTITY, "properties", "tenants"],
    savedSearches: [
      {
        id: "urgent-wo",
        labelKey: "search.saved.workOrdersUrgent",
        fallbackLabel: "Urgent & overdue work orders",
        query: "status:urgent OR status:overdue",
        scope: "module",
      },
      {
        id: "preventive-wo",
        labelKey: "search.saved.workOrdersPreventive",
        fallbackLabel: "Upcoming preventive maintenance",
        query: "type:preventive due:<14d",
        scope: "module",
      },
    ],
    quickActions: [
      {
        id: "new_wo",
        labelKey: "dashboard.newWorkOrder",
        fallbackLabel: "New Work Order",
        href: "/fm/work-orders/new",
        permission: "wo.create",
        roles: ["SUPER_ADMIN", "CORPORATE_ADMIN", "FM_MANAGER", "DISPATCHER"],
      },
      {
        id: "assign_wo",
        labelKey: "dashboard.assignWorkOrder",
        fallbackLabel: "Assign Work Order",
        href: "/fm/work-orders/board",
        permission: "wo.assign",
        roles: ["SUPER_ADMIN", "CORPORATE_ADMIN", "FM_MANAGER", "DISPATCHER"],
      },
    ],
  },
  // Legacy alias for work_orders - maps to workOrders config
  work_orders: {
    id: "workOrders",
    app: "fm",
    navKey: "workOrders",
    labelKey: "nav.workOrders",
    fallbackLabel: "Work Orders",
    searchPlaceholderKey: "search.placeholders.workOrders",
    placeholderFallback: "Search work orders, technicians, assets…",
    searchEntities: ["workOrders", "properties", "tenants"],
    savedSearches: [],
    quickActions: [],
  },
  properties: {
    id: "properties",
    app: "fm",
    navKey: "properties",
    labelKey: "nav.properties",
    fallbackLabel: "Properties",
    searchPlaceholderKey: "search.placeholders.properties",
    placeholderFallback: "Search properties, units, tenants…",
    searchEntities: ["properties", "units", "tenants"],
    savedSearches: [
      {
        id: "vacant-units",
        labelKey: "search.saved.vacantUnits",
        fallbackLabel: "Vacant units needing action",
        query: "status:vacant sort:priority",
        scope: "module",
      },
    ],
    quickActions: [
      {
        id: "new_property",
        labelKey: "dashboard.addProperty",
        fallbackLabel: "Add Property",
        href: "/fm/properties/new",
        permission: "properties.create",
        roles: [
          "SUPER_ADMIN",
          "CORPORATE_ADMIN",
          "FM_MANAGER",
          "PROPERTY_MANAGER",
        ],
      },
    ],
  },
  finance: {
    id: "finance",
    app: "fm",
    navKey: "finance",
    labelKey: "nav.finance",
    fallbackLabel: "Finance",
    searchPlaceholderKey: "search.placeholders.finance",
    placeholderFallback: "Search invoices, payments, vendors…",
    searchEntities: ["invoices", "vendors", "orders"],
    savedSearches: [
      {
        id: "overdue-invoices",
        labelKey: "search.saved.financialOverdue",
        fallbackLabel: "Overdue invoices & payments",
        query: "invoice:status=overdue",
        scope: "module",
      },
    ],
    quickActions: [
      {
        id: "new_invoice",
        labelKey: "dashboard.createInvoice",
        fallbackLabel: "Create Invoice",
        href: "/fm/finance/invoices/new",
        permission: "finance.invoice.create",
        roles: ["SUPER_ADMIN", "CORPORATE_ADMIN", "FINANCE"],
      },
      {
        id: "record_payment",
        labelKey: "finance.recordPayment",
        fallbackLabel: "Record Payment",
        href: "/fm/finance/payments/new",
        permission: "finance.payment.create",
        roles: ["SUPER_ADMIN", "CORPORATE_ADMIN", "FINANCE"],
      },
    ],
  },
  hr: {
    id: "hr",
    app: "fm",
    navKey: "hr",
    labelKey: "nav.hr",
    fallbackLabel: "HR",
    searchPlaceholderKey: "search.placeholders.hr",
    placeholderFallback: "Search employees, requests, candidates…",
    searchEntities: ["tenants"],
    savedSearches: [],
    quickActions: [],
  },
  administration: {
    id: "administration",
    app: "fm",
    navKey: "administration",
    labelKey: "nav.administration",
    fallbackLabel: "Administration",
    searchPlaceholderKey: "search.placeholders.dashboard",
    placeholderFallback: "Search administrative records…",
    searchEntities: ["properties", WORK_ORDERS_ENTITY],
    savedSearches: [],
    quickActions: [],
  },
  crm: {
    id: "crm",
    app: "fm",
    navKey: "crm",
    labelKey: "nav.crm",
    fallbackLabel: "CRM",
    searchPlaceholderKey: "search.placeholders.dashboard",
    placeholderFallback: "Search customers, leads, contracts…",
    searchEntities: ["tenants", "properties"],
    savedSearches: [],
    quickActions: [],
  },
  support: {
    id: "support",
    app: "fm",
    navKey: "support",
    labelKey: "nav.support",
    fallbackLabel: "Support",
    searchPlaceholderKey: "search.placeholders.dashboard",
    placeholderFallback: "Search tickets and knowledge base…",
    searchEntities: [WORK_ORDERS_ENTITY],
    savedSearches: [],
    quickActions: [],
  },
  compliance: {
    id: "compliance",
    app: "fm",
    navKey: "compliance",
    labelKey: "nav.compliance",
    fallbackLabel: "Compliance",
    searchPlaceholderKey: "search.placeholders.dashboard",
    placeholderFallback: "Search policies, audits, disputes…",
    searchEntities: [WORK_ORDERS_ENTITY],
    savedSearches: [],
    quickActions: [],
  },
  reports: {
    id: "reports",
    app: "fm",
    navKey: "reports",
    labelKey: "nav.reports",
    fallbackLabel: "Reports",
    searchPlaceholderKey: "search.placeholders.dashboard",
    placeholderFallback: "Search reports and dashboards…",
    searchEntities: [WORK_ORDERS_ENTITY, "properties", "invoices"],
    savedSearches: [],
    quickActions: [],
  },
  system: {
    id: "system",
    app: "fm",
    navKey: "system",
    labelKey: "nav.system",
    fallbackLabel: "System Management",
    searchPlaceholderKey: "search.placeholders.dashboard",
    placeholderFallback: "Search users, roles, settings…",
    searchEntities: ["tenants"],
    savedSearches: [],
    quickActions: [],
  },
  marketplace_materials: {
    id: "marketplace_materials",
    app: "souq",
    navKey: "marketplace",
    labelKey: "app.souq",
    fallbackLabel: "Materials Marketplace",
    searchPlaceholderKey: "search.placeholders.marketplaceMaterials",
    placeholderFallback: "Search products, services, RFQs, vendors…",
    searchEntities: ["products", "services", "vendors", "rfqs", "orders"],
    savedSearches: [
      {
        id: "rfqs-expiring",
        labelKey: "search.saved.rfqsExpiring",
        fallbackLabel: "RFQs closing this week",
        query: "rfq:status=open due:<7d",
        scope: "module",
      },
      {
        id: "favorite-vendors",
        labelKey: "search.saved.marketplaceFavorites",
        fallbackLabel: "Preferred vendors & partners",
        query: "vendor:favorite=true",
        scope: "module",
      },
    ],
    quickActions: [
      {
        id: "create_rfq",
        labelKey: "souq.newRFQ",
        fallbackLabel: "Create RFQ",
        href: "/marketplace/rfqs/new",
        permission: "souq.rfq.create",
        roles: ["SUPER_ADMIN", "PROCUREMENT", "FM_MANAGER"],
      },
      {
        id: "new_po",
        labelKey: "souq.createPO",
        fallbackLabel: "New Purchase Order",
        href: "/marketplace/orders/new",
        permission: "souq.po.create",
        roles: ["SUPER_ADMIN", "PROCUREMENT", "FINANCE"],
      },
      {
        id: "add_item",
        labelKey: "souq.addItem",
        fallbackLabel: "Add Product or Service",
        href: "/marketplace/items/new",
        permission: "souq.item.create",
        roles: ["SUPER_ADMIN", "PROCUREMENT", "VENDOR"],
      },
    ],
  },
  marketplace_real_estate: {
    id: "marketplace_real_estate",
    app: "aqar",
    navKey: "marketplace",
    labelKey: "app.aqar",
    fallbackLabel: "Real Estate Marketplace",
    searchPlaceholderKey: "search.placeholders.marketplaceRealEstate",
    placeholderFallback: "Search listings, projects, brokers…",
    searchEntities: ["listings", "projects", "agents"],
    savedSearches: [
      {
        id: "new-listings",
        labelKey: "search.saved.listingsNew",
        fallbackLabel: "Newest listings on the market",
        query: "listing:status=active sort:-createdAt",
        scope: "module",
      },
      {
        id: "luxury",
        labelKey: "search.saved.listingsLuxury",
        fallbackLabel: "Premium & luxury inventory",
        query: "listing:segment=luxury",
        scope: "module",
      },
    ],
    quickActions: [
      {
        id: "new_listing",
        labelKey: "aqar.postProperty",
        fallbackLabel: "New Listing",
        href: "/aqar/listings/new",
        permission: "aqar.listing.create",
        roles: ["SUPER_ADMIN", "PROPERTY_MANAGER", "OWNER"],
      },
      {
        id: "valuation",
        labelKey: "aqar.newValuation",
        fallbackLabel: "Request Valuation",
        href: "/aqar/valuation/new",
        permission: "aqar.valuation.create",
        roles: ["SUPER_ADMIN", "PROPERTY_MANAGER", "OWNER"],
      },
    ],
  },
};

// Legacy alias support: map snake_case scope to canonical config
MODULE_SCOPE_CONFIG[WORK_ORDERS_ENTITY_LEGACY] = MODULE_SCOPE_CONFIG[WORK_ORDERS_ENTITY];

const MODULE_ROUTE_MATCHERS: { pattern: RegExp; scope: ModuleScope }[] = [
  { pattern: /^\/(fm\/)?work-orders/i, scope: WORK_ORDERS_ENTITY },
  { pattern: /^\/(fm\/)?properties/i, scope: "properties" },
  { pattern: /^\/(fm\/)?finance/i, scope: "finance" },
  { pattern: /^\/(fm\/)?hr/i, scope: "hr" },
  { pattern: /^\/(fm\/)?administration/i, scope: "administration" },
  { pattern: /^\/(fm\/)?crm/i, scope: "crm" },
  { pattern: /^\/(fm\/)?support/i, scope: "support" },
  { pattern: /^\/(fm\/)?compliance/i, scope: "compliance" },
  { pattern: /^\/(fm\/)?reports/i, scope: "reports" },
  { pattern: /^\/(fm\/)?system/i, scope: "system" },
  { pattern: /^\/aqar/i, scope: "marketplace_real_estate" },
  { pattern: /^\/marketplace/i, scope: "marketplace_materials" },
  { pattern: /^\/souq/i, scope: "marketplace_materials" },
  { pattern: /^\/dashboard/i, scope: "dashboard" },
  { pattern: /^\/fm(\/dashboard)?$/i, scope: "dashboard" },
];

export function detectAppFromPath(pathname: string): AppKey {
  if (pathname.startsWith("/aqar")) {
    return "aqar";
  }
  if (pathname.startsWith("/marketplace") || pathname.startsWith("/souq")) {
    return "souq";
  }
  return "fm";
}

export function detectModuleFromPath(pathname: string): ModuleScope {
  const target = pathname || "/";
  const hit = MODULE_ROUTE_MATCHERS.find((matcher) =>
    matcher.pattern.test(target),
  );
  return normalizeScope(hit?.scope ?? DEFAULT_SCOPE);
}

export function getModuleFromPath(pathname: string): ModuleScope {
  return detectModuleFromPath(pathname);
}

export function getModuleSearchConfig(scope: ModuleScope): ModuleScopeConfig {
  const normalized = normalizeScope(scope);
  return MODULE_SCOPE_CONFIG[normalized] ?? MODULE_SCOPE_CONFIG[DEFAULT_SCOPE];
}

export function getModuleSavedSearches(
  scope: ModuleScope,
): SavedSearchConfig[] {
  return getModuleSearchConfig(normalizeScope(scope)).savedSearches;
}

export function getModuleQuickActions(
  scope: ModuleScope,
  app: AppKey,
): QuickActionConfig[] {
  const normalized = normalizeScope(scope);
  const config = MODULE_SCOPE_CONFIG[normalized];
  if (config && config.quickActions.length) {
    return config.quickActions;
  }
  return APPS[app].quickActions;
}

export function getNavKeyForScope(
  scope: ModuleScope,
): SidebarModuleKey | undefined {
  const normalized = normalizeScope(scope);
  return MODULE_SCOPE_CONFIG[normalized]?.navKey;
}

export function getSearchEntitiesForScope(
  scope: ModuleScope,
  app: AppKey,
): SearchEntity[] {
  const normalized = normalizeScope(scope);
  const config = MODULE_SCOPE_CONFIG[normalized];
  if (config) {
    return config.searchEntities;
  }
  return APPS[app].searchEntities;
}
