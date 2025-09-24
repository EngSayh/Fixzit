// src/config/dynamic-modules.ts - Module configuration for dynamic TopBar
export type ModuleId =
  | 'home'
  | 'work-orders'
  | 'properties'
  | 'finance'
  | 'hr'
  | 'administration'
  | 'crm'
  | 'marketplace-real-estate'
  | 'marketplace-materials'
  | 'support'
  | 'compliance'
  | 'reports'
  | 'system';

export type SearchEntity = 'workOrder' | 'property' | 'unit' | 'tenant' | 'vendor' | 'invoice' | 'listing' | 'product';

export interface ModuleConfig {
  id: ModuleId;
  label: string;
  labelAr: string;
  icon?: string;
  defaultSearchEntities: SearchEntity[];
  searchPlaceholder: string;
  searchPlaceholderAr: string;
  quickActions: { label: string; labelAr: string; href: string; perm: string }[];
}

export const MODULES: ModuleConfig[] = [
  { 
    id: 'home', 
    label: 'Home', 
    labelAr: 'الرئيسية',
    defaultSearchEntities: [], 
    searchPlaceholder: 'Search across Fixzit...',
    searchPlaceholderAr: 'البحث في جميع الأقسام...',
    quickActions: [] 
  },
  { 
    id: 'work-orders', 
    label: 'Work Orders', 
    labelAr: 'أوامر العمل',
    defaultSearchEntities: ['workOrder','property','unit','tenant','vendor'], 
    searchPlaceholder: 'Search Work Orders, Properties, Tenants...',
    searchPlaceholderAr: 'البحث في أوامر العمل، العقارات، المستأجرين...',
    quickActions: [
      { label: 'New Work Order', labelAr: 'أمر عمل جديد', href: '/work-orders/new', perm: 'wo.create' }
    ] 
  },
  { 
    id: 'properties', 
    label: 'Properties', 
    labelAr: 'العقارات',
    defaultSearchEntities: ['property','unit','tenant'], 
    searchPlaceholder: 'Search Properties, Units, Tenants...',
    searchPlaceholderAr: 'البحث في العقارات، الوحدات، المستأجرين...',
    quickActions: [
      { label: 'Add Property', labelAr: 'إضافة عقار', href: '/properties/new', perm: 'prop.create' }
    ] 
  },
  { 
    id: 'finance', 
    label: 'Finance', 
    labelAr: 'المالية',
    defaultSearchEntities: ['invoice','vendor','property'], 
    searchPlaceholder: 'Search Invoices & Payments...',
    searchPlaceholderAr: 'البحث في الفواتير والمدفوعات...',
    quickActions: [
      { label: 'New Invoice', labelAr: 'فاتورة جديدة', href: '/finance/invoices/new', perm: 'fin.invoice.create' }
    ] 
  },
  { 
    id: 'hr', 
    label: 'Human Resources', 
    labelAr: 'الموارد البشرية',
    defaultSearchEntities: [], 
    searchPlaceholder: 'Search Employees, Leave, Payroll...',
    searchPlaceholderAr: 'البحث في الموظفين، الإجازات، الرواتب...',
    quickActions: [] 
  },
  { 
    id: 'administration', 
    label: 'Administration', 
    labelAr: 'الإدارة',
    defaultSearchEntities: [], 
    searchPlaceholder: 'Search Settings, Users, Roles...',
    searchPlaceholderAr: 'البحث في الإعدادات، المستخدمين، الأدوار...',
    quickActions: [] 
  },
  { 
    id: 'crm', 
    label: 'CRM', 
    labelAr: 'إدارة العملاء',
    defaultSearchEntities: ['tenant','vendor','property'], 
    searchPlaceholder: 'Search Leads, Accounts, Contacts...',
    searchPlaceholderAr: 'البحث في العملاء، الحسابات، جهات الاتصال...',
    quickActions: [] 
  },
  { 
    id: 'marketplace-real-estate', 
    label: 'Aqar Souq', 
    labelAr: 'سوق العقار',
    defaultSearchEntities: ['listing','property','unit'], 
    searchPlaceholder: 'Search Listings (Buy/Rent/Projects)...',
    searchPlaceholderAr: 'البحث في العقارات (شراء/إيجار/مشاريع)...',
    quickActions: [
      { label: 'New Listing', labelAr: 'إعلان جديد', href: '/aqar/listings/new', perm: 're.listing.create' }
    ] 
  },
  { 
    id: 'marketplace-materials', 
    label: 'Fixzit Souq', 
    labelAr: 'سوق فيكسيت',
    defaultSearchEntities: ['product','vendor'], 
    searchPlaceholder: 'Search Products, Services, RFQs, Vendors...',
    searchPlaceholderAr: 'البحث في المنتجات، الخدمات، طلبات الأسعار، الموردين...',
    quickActions: [
      { label: 'Add Product', labelAr: 'إضافة منتج', href: '/souq/products/new', perm: 'mat.product.create' },
      { label: 'New RFQ', labelAr: 'طلب سعر جديد', href: '/souq/rfq/new', perm: 'mat.rfq.create' }
    ] 
  },
  { 
    id: 'support', 
    label: 'Support', 
    labelAr: 'الدعم',
    defaultSearchEntities: ['workOrder','tenant'], 
    searchPlaceholder: 'Search Tickets, KB articles...',
    searchPlaceholderAr: 'البحث في التذاكر، مقالات المعرفة...',
    quickActions: [] 
  },
  { 
    id: 'compliance', 
    label: 'Compliance & Legal', 
    labelAr: 'الامتثال والقانون',
    defaultSearchEntities: [], 
    searchPlaceholder: 'Search Compliance Documents...',
    searchPlaceholderAr: 'البحث في وثائق الامتثال...',
    quickActions: [] 
  },
  { 
    id: 'reports', 
    label: 'Reports & Analytics', 
    labelAr: 'التقارير والتحليلات',
    defaultSearchEntities: [], 
    searchPlaceholder: 'Search Reports & Dashboards...',
    searchPlaceholderAr: 'البحث في التقارير ولوحات المعلومات...',
    quickActions: [] 
  },
  { 
    id: 'system', 
    label: 'System Management', 
    labelAr: 'إدارة النظام',
    defaultSearchEntities: [], 
    searchPlaceholder: 'Search Users, Roles, Settings...',
    searchPlaceholderAr: 'البحث في المستخدمين، الأدوار، الإعدادات...',
    quickActions: [] 
  },
];

export const TOP_MENU_ORDER: ModuleId[] = [
  'home',
  'work-orders',
  'properties',
  'finance',
  'hr',
  'administration',
  'crm',
  'marketplace-real-estate',
  'marketplace-materials',
  'support',
  'compliance',
  'reports',
  'system',
];
