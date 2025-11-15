// ==========================================
// Enhanced Navigation Configuration
// ==========================================
// Comprehensive navigation system with RBAC, subscription filtering,
// and multi-level menu support for Fixzit platform

import { LucideIcon } from 'lucide-react';

// ==========================================
// Types & Interfaces
// ==========================================

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN' 
  | 'MANAGER'
  | 'PROPERTY_MANAGER'
  | 'OWNER'
  | 'TENANT'
  | 'VENDOR'
  | 'EMPLOYEE'
  | 'GUEST';

export type SubscriptionPlan = 'FREE' | 'PRO' | 'ENTERPRISE' | 'CUSTOM';

// Badge counts type for dynamic badge values
export interface BadgeCounts {
  vacant_units?: number;
  work_orders?: number;
  pending_work_orders?: number;
  in_progress_work_orders?: number;
  urgent_work_orders?: number;
  marketplace_orders?: number;
  open_rfqs?: number;
  marketplace_products?: number;
  pending_bids?: number;
  new_bids?: number;
  aqar_leads?: number;
  pending_invoices?: number;
  overdue_invoices?: number;
  hr_applications?: number;
  crm_deals?: number;
  properties_needing_attention?: number;
  open_support_tickets?: number;
  pending_approvals?: number;
  [key: string]: number | undefined;
}

export interface NavigationBadge {
  text?: string;
  key?: string; // Key to lookup dynamic count from BadgeCounts
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  variant?: 'solid' | 'outline' | 'soft';
  pulse?: boolean;
}

export interface NavigationItem {
  id: string;
  label: string;
  labelAr?: string; // Arabic translation
  href?: string;
  icon?: LucideIcon;
  iconName?: string; // For dynamic icon loading
  badge?: NavigationBadge;
  
  // Access control
  roles?: UserRole[];
  subscriptionPlans?: SubscriptionPlan[];
  permissions?: string[];
  
  // Hierarchy
  children?: NavigationItem[];
  parent?: string;
  
  // Display options
  isNew?: boolean;
  isComingSoon?: boolean;
  isExternal?: boolean;
  separator?: boolean;
  hidden?: boolean;
  
  // Metadata
  description?: string;
  keywords?: string[];
  category?: string;
}

export interface NavigationSection {
  id: string;
  label: string;
  labelAr?: string;
  items: NavigationItem[];
  roles?: UserRole[];
  subscriptionPlans?: SubscriptionPlan[];
  collapsed?: boolean;
}

export interface NavigationConfig {
  sections: NavigationSection[];
  settings: {
    collapsible: boolean;
    persistState: boolean;
    showBadges: boolean;
    showTooltips: boolean;
    rtlSupport: boolean;
  };
}

// ==========================================
// Navigation Configuration
// ==========================================

export const navigationConfig: NavigationConfig = {
  settings: {
    collapsible: true,
    persistState: true,
    showBadges: true,
    showTooltips: true,
    rtlSupport: true,
  },
  sections: [
    // ==========================================
    // Dashboard Section
    // ==========================================
    {
      id: 'dashboard',
      label: 'Dashboard',
      labelAr: 'لوحة التحكم',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          labelAr: 'نظرة عامة',
          href: '/dashboard',
          iconName: 'LayoutDashboard',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'OWNER'],
        },
        {
          id: 'analytics',
          label: 'Analytics',
          labelAr: 'التحليلات',
          href: '/dashboard/analytics',
          iconName: 'BarChart3',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
          subscriptionPlans: ['PRO', 'ENTERPRISE'],
        },
        {
          id: 'reports',
          label: 'Reports',
          labelAr: 'التقارير',
          href: '/dashboard/reports',
          iconName: 'FileText',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'OWNER'],
        },
      ],
    },

    // ==========================================
    // Facility Management Section
    // ==========================================
    {
      id: 'facility_management',
      label: 'Facility Management',
      labelAr: 'إدارة المرافق',
      items: [
        {
          id: 'properties',
          label: 'Properties',
          labelAr: 'العقارات',
          href: '/fm/properties',
          iconName: 'Building2',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'OWNER'],
          children: [
            {
              id: 'property_list',
              label: 'Property List',
              labelAr: 'قائمة العقارات',
              href: '/fm/properties',
            },
            {
              id: 'add_property',
              label: 'Add Property',
              labelAr: 'إضافة عقار',
              href: '/fm/properties/add',
              roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
            },
            {
              id: 'property_types',
              label: 'Property Types',
              labelAr: 'أنواع العقارات',
              href: '/fm/properties/types',
              roles: ['SUPER_ADMIN', 'ADMIN'],
            },
          ],
        },
        {
          id: 'units',
          label: 'Units',
          labelAr: 'الوحدات',
          href: '/fm/units',
          iconName: 'Home',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'OWNER'],
          children: [
            {
              id: 'unit_list',
              label: 'Unit List',
              labelAr: 'قائمة الوحدات',
              href: '/fm/units',
            },
            {
              id: 'vacant_units',
              label: 'Vacant Units',
              labelAr: 'الوحدات الشاغرة',
              href: '/fm/units?status=vacant',
              badge: {
                key: 'vacant_units',
                color: 'green',
                variant: 'solid',
              },
            },
            {
              id: 'occupied_units',
              label: 'Occupied Units',
              labelAr: 'الوحدات المشغولة',
              href: '/fm/units?status=occupied',
            },
          ],
        },
        {
          id: 'work_orders',
          label: 'Work Orders',
          labelAr: 'أوامر العمل',
          href: '/fm/work-orders',
          iconName: 'Wrench',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'EMPLOYEE', 'TENANT'],
          badge: {
            key: 'work_orders',
            color: 'red',
            variant: 'solid',
            pulse: true,
          },
          children: [
            {
              id: 'all_work_orders',
              label: 'All Work Orders',
              labelAr: 'جميع أوامر العمل',
              href: '/fm/work-orders',
            },
            {
              id: 'pending_work_orders',
              label: 'Pending',
              labelAr: 'قيد الانتظار',
              href: '/fm/work-orders?status=pending',
              badge: {
                key: 'pending_work_orders',
                color: 'yellow',
                variant: 'solid',
              },
            },
            {
              id: 'in_progress_work_orders',
              label: 'In Progress',
              labelAr: 'قيد التنفيذ',
              href: '/fm/work-orders?status=in_progress',
              badge: {
                key: 'in_progress_work_orders',
                color: 'blue',
                variant: 'solid',
              },
            },
            {
              id: 'create_work_order',
              label: 'Create Work Order',
              labelAr: 'إنشاء أمر عمل',
              href: '/fm/work-orders/create',
              roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'TENANT'],
            },
          ],
        },
        {
          id: 'assets',
          label: 'Assets',
          labelAr: 'الأصول',
          href: '/fm/assets',
          iconName: 'Package',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER'],
          subscriptionPlans: ['PRO', 'ENTERPRISE'],
          children: [
            {
              id: 'asset_list',
              label: 'Asset List',
              labelAr: 'قائمة الأصول',
              href: '/fm/assets',
            },
            {
              id: 'maintenance_schedules',
              label: 'Maintenance Schedules',
              labelAr: 'جداول الصيانة',
              href: '/fm/assets/maintenance',
            },
            {
              id: 'asset_tracking',
              label: 'Asset Tracking',
              labelAr: 'تتبع الأصول',
              href: '/fm/assets/tracking',
              subscriptionPlans: ['ENTERPRISE'],
            },
          ],
        },
        {
          id: 'tenants',
          label: 'Tenants',
          labelAr: 'المستأجرون',
          href: '/fm/tenants',
          iconName: 'Users',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'OWNER'],
          children: [
            {
              id: 'tenant_list',
              label: 'Tenant List',
              labelAr: 'قائمة المستأجرين',
              href: '/fm/tenants',
            },
            {
              id: 'lease_agreements',
              label: 'Lease Agreements',
              labelAr: 'اتفاقيات الإيجار',
              href: '/fm/tenants/leases',
            },
            {
              id: 'tenant_portal',
              label: 'Tenant Portal',
              labelAr: 'بوابة المستأجرين',
              href: '/fm/tenants/portal',
              isNew: true,
            },
          ],
        },
      ],
    },

    // ==========================================
    // Souq Marketplace Section
    // ==========================================
    {
      id: 'marketplace',
      label: 'Souq Marketplace',
      labelAr: 'سوق الخدمات',
      items: [
        {
          id: 'vendors',
          label: 'Vendors',
          labelAr: 'الموردون',
          href: '/souq/vendors',
          iconName: 'Store',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'VENDOR'],
          children: [
            {
              id: 'vendor_directory',
              label: 'Vendor Directory',
              labelAr: 'دليل الموردين',
              href: '/souq/vendors',
            },
            {
              id: 'vendor_registration',
              label: 'Vendor Registration',
              labelAr: 'تسجيل المورد',
              href: '/souq/vendors/register',
              roles: ['SUPER_ADMIN', 'ADMIN'],
            },
            {
              id: 'vendor_ratings',
              label: 'Ratings & Reviews',
              labelAr: 'التقييمات والمراجعات',
              href: '/souq/vendors/ratings',
            },
          ],
        },
        {
          id: 'products',
          label: 'Products',
          labelAr: 'المنتجات',
          href: '/souq/products',
          iconName: 'ShoppingBag',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'VENDOR'],
          children: [
            {
              id: 'product_catalog',
              label: 'Product Catalog',
              labelAr: 'كتالوج المنتجات',
              href: '/souq/products',
            },
            {
              id: 'categories',
              label: 'Categories',
              labelAr: 'الفئات',
              href: '/souq/products/categories',
            },
            {
              id: 'inventory',
              label: 'Inventory',
              labelAr: 'المخزون',
              href: '/souq/products/inventory',
              roles: ['SUPER_ADMIN', 'ADMIN', 'VENDOR'],
            },
          ],
        },
        {
          id: 'services',
          label: 'Services',
          labelAr: 'الخدمات',
          href: '/souq/services',
          iconName: 'Settings',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'VENDOR'],
          children: [
            {
              id: 'service_catalog',
              label: 'Service Catalog',
              labelAr: 'كتالوج الخدمات',
              href: '/souq/services',
            },
            {
              id: 'service_packages',
              label: 'Service Packages',
              labelAr: 'حزم الخدمات',
              href: '/souq/services/packages',
            },
            {
              id: 'service_booking',
              label: 'Service Booking',
              labelAr: 'حجز الخدمات',
              href: '/souq/services/booking',
            },
          ],
        },
        {
          id: 'rfqs',
          label: 'RFQs',
          labelAr: 'طلبات التسعير',
          href: '/souq/rfqs',
          iconName: 'FileSearch',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'VENDOR'],
          children: [
            {
              id: 'rfq_list',
              label: 'RFQ List',
              labelAr: 'قائمة طلبات التسعير',
              href: '/souq/rfqs',
            },
            {
              id: 'create_rfq',
              label: 'Create RFQ',
              labelAr: 'إنشاء طلب تسعير',
              href: '/souq/rfqs/create',
              roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER'],
            },
            {
              id: 'my_bids',
              label: 'My Bids',
              labelAr: 'عروضي',
              href: '/souq/rfqs/my-bids',
              roles: ['VENDOR'],
            },
          ],
        },
        {
          id: 'orders',
          label: 'Orders',
          labelAr: 'الطلبات',
          href: '/souq/orders',
          iconName: 'ShoppingCart',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PROPERTY_MANAGER', 'VENDOR'],
          badge: {
            key: 'marketplace_orders',
            color: 'blue',
            variant: 'solid',
          },
          children: [
            {
              id: 'all_orders',
              label: 'All Orders',
              labelAr: 'جميع الطلبات',
              href: '/souq/orders',
            },
            {
              id: 'purchase_orders',
              label: 'Purchase Orders',
              labelAr: 'طلبات الشراء',
              href: '/souq/orders/purchase',
            },
            {
              id: 'order_tracking',
              label: 'Order Tracking',
              labelAr: 'تتبع الطلبات',
              href: '/souq/orders/tracking',
            },
          ],
        },
      ],
    },

    // ==========================================
    // Aqar Real Estate Section
    // ==========================================
    {
      id: 'real_estate',
      label: 'Aqar Real Estate',
      labelAr: 'عقار العقارات',
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OWNER'],
      subscriptionPlans: ['PRO', 'ENTERPRISE'],
      items: [
        {
          id: 'listings',
          label: 'Listings',
          labelAr: 'القوائم',
          href: '/aqar/listings',
          iconName: 'MapPin',
          children: [
            {
              id: 'active_listings',
              label: 'Active Listings',
              labelAr: 'القوائم النشطة',
              href: '/aqar/listings?status=active',
            },
            {
              id: 'draft_listings',
              label: 'Draft Listings',
              labelAr: 'المسودات',
              href: '/aqar/listings?status=draft',
            },
            {
              id: 'create_listing',
              label: 'Create Listing',
              labelAr: 'إنشاء قائمة',
              href: '/aqar/listings/create',
            },
          ],
        },
        {
          id: 'projects',
          label: 'Projects',
          labelAr: 'المشاريع',
          href: '/aqar/projects',
          iconName: 'Building',
          children: [
            {
              id: 'project_list',
              label: 'Project List',
              labelAr: 'قائمة المشاريع',
              href: '/aqar/projects',
            },
            {
              id: 'development_projects',
              label: 'Development Projects',
              labelAr: 'مشاريع التطوير',
              href: '/aqar/projects/development',
            },
            {
              id: 'project_sales',
              label: 'Project Sales',
              labelAr: 'مبيعات المشاريع',
              href: '/aqar/projects/sales',
            },
          ],
        },
        {
          id: 'agents',
          label: 'Agents',
          labelAr: 'الوكلاء',
          href: '/aqar/agents',
          iconName: 'UserCheck',
          children: [
            {
              id: 'agent_directory',
              label: 'Agent Directory',
              labelAr: 'دليل الوكلاء',
              href: '/aqar/agents',
            },
            {
              id: 'agent_performance',
              label: 'Performance',
              labelAr: 'الأداء',
              href: '/aqar/agents/performance',
            },
            {
              id: 'commissions',
              label: 'Commissions',
              labelAr: 'العمولات',
              href: '/aqar/agents/commissions',
            },
          ],
        },
        {
          id: 'leads',
          label: 'Leads',
          labelAr: 'العملاء المحتملون',
          href: '/aqar/leads',
          iconName: 'Target',
          badge: {
            key: 'aqar_leads',
            color: 'green',
            variant: 'solid',
          },
          children: [
            {
              id: 'lead_management',
              label: 'Lead Management',
              labelAr: 'إدارة العملاء المحتملين',
              href: '/aqar/leads',
            },
            {
              id: 'lead_scoring',
              label: 'Lead Scoring',
              labelAr: 'تقييم العملاء',
              href: '/aqar/leads/scoring',
              subscriptionPlans: ['ENTERPRISE'],
            },
            {
              id: 'conversion_tracking',
              label: 'Conversion Tracking',
              labelAr: 'تتبع التحويل',
              href: '/aqar/leads/conversion',
            },
          ],
        },
      ],
    },

    // ==========================================
    // Finance Section
    // ==========================================
    {
      id: 'finance',
      label: 'Finance',
      labelAr: 'المالية',
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      items: [
        {
          id: 'invoices',
          label: 'Invoices',
          labelAr: 'الفواتير',
          href: '/finance/invoices',
          iconName: 'FileText',
          children: [
            {
              id: 'all_invoices',
              label: 'All Invoices',
              labelAr: 'جميع الفواتير',
              href: '/finance/invoices',
            },
            {
              id: 'pending_invoices',
              label: 'Pending',
              labelAr: 'قيد الانتظار',
              href: '/finance/invoices?status=pending',
              badge: {
                key: 'pending_invoices',
                color: 'yellow',
                variant: 'solid',
              },
            },
            {
              id: 'overdue_invoices',
              label: 'Overdue',
              labelAr: 'متأخرة',
              href: '/finance/invoices?status=overdue',
              badge: {
                key: 'overdue_invoices',
                color: 'red',
                variant: 'solid',
              },
            },
            {
              id: 'create_invoice',
              label: 'Create Invoice',
              labelAr: 'إنشاء فاتورة',
              href: '/finance/invoices/create',
            },
          ],
        },
        {
          id: 'payments',
          label: 'Payments',
          labelAr: 'المدفوعات',
          href: '/finance/payments',
          iconName: 'CreditCard',
          children: [
            {
              id: 'payment_history',
              label: 'Payment History',
              labelAr: 'تاريخ المدفوعات',
              href: '/finance/payments',
            },
            {
              id: 'payment_methods',
              label: 'Payment Methods',
              labelAr: 'طرق الدفع',
              href: '/finance/payments/methods',
            },
            {
              id: 'recurring_payments',
              label: 'Recurring Payments',
              labelAr: 'المدفوعات المتكررة',
              href: '/finance/payments/recurring',
            },
          ],
        },
        {
          id: 'expenses',
          label: 'Expenses',
          labelAr: 'المصروفات',
          href: '/finance/expenses',
          iconName: 'Receipt',
          children: [
            {
              id: 'expense_tracking',
              label: 'Expense Tracking',
              labelAr: 'تتبع المصروفات',
              href: '/finance/expenses',
            },
            {
              id: 'expense_categories',
              label: 'Categories',
              labelAr: 'الفئات',
              href: '/finance/expenses/categories',
            },
            {
              id: 'expense_reports',
              label: 'Expense Reports',
              labelAr: 'تقارير المصروفات',
              href: '/finance/expenses/reports',
            },
          ],
        },
        {
          id: 'accounting',
          label: 'Accounting',
          labelAr: 'المحاسبة',
          href: '/finance/accounting',
          iconName: 'Calculator',
          subscriptionPlans: ['PRO', 'ENTERPRISE'],
          children: [
            {
              id: 'chart_of_accounts',
              label: 'Chart of Accounts',
              labelAr: 'دليل الحسابات',
              href: '/finance/accounting/accounts',
            },
            {
              id: 'general_ledger',
              label: 'General Ledger',
              labelAr: 'دفتر الأستاذ العام',
              href: '/finance/accounting/ledger',
            },
            {
              id: 'financial_statements',
              label: 'Financial Statements',
              labelAr: 'القوائم المالية',
              href: '/finance/accounting/statements',
            },
          ],
        },
        {
          id: 'budgeting',
          label: 'Budgeting',
          labelAr: 'الميزانية',
          href: '/finance/budgeting',
          iconName: 'TrendingUp',
          subscriptionPlans: ['ENTERPRISE'],
          isNew: true,
          children: [
            {
              id: 'budget_planning',
              label: 'Budget Planning',
              labelAr: 'تخطيط الميزانية',
              href: '/finance/budgeting/planning',
            },
            {
              id: 'budget_tracking',
              label: 'Budget Tracking',
              labelAr: 'تتبع الميزانية',
              href: '/finance/budgeting/tracking',
            },
            {
              id: 'variance_analysis',
              label: 'Variance Analysis',
              labelAr: 'تحليل الانحراف',
              href: '/finance/budgeting/variance',
            },
          ],
        },
      ],
    },

    // ==========================================
    // HR Management Section
    // ==========================================
    {
      id: 'human_resources',
      label: 'Human Resources',
      labelAr: 'الموارد البشرية',
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      subscriptionPlans: ['PRO', 'ENTERPRISE'],
      items: [
        {
          id: 'employees',
          label: 'Employees',
          labelAr: 'الموظفون',
          href: '/hr/employees',
          iconName: 'Users',
          children: [
            {
              id: 'employee_directory',
              label: 'Employee Directory',
              labelAr: 'دليل الموظفين',
              href: '/hr/employees',
            },
            {
              id: 'employee_onboarding',
              label: 'Onboarding',
              labelAr: 'إدماج الموظفين',
              href: '/hr/employees/onboarding',
            },
            {
              id: 'performance_reviews',
              label: 'Performance Reviews',
              labelAr: 'تقييمات الأداء',
              href: '/hr/employees/performance',
            },
          ],
        },
        {
          id: 'recruitment',
          label: 'Recruitment',
          labelAr: 'التوظيف',
          href: '/hr/recruitment',
          iconName: 'UserPlus',
          children: [
            {
              id: 'job_postings',
              label: 'Job Postings',
              labelAr: 'الوظائف المنشورة',
              href: '/hr/recruitment/jobs',
            },
            {
              id: 'applications',
              label: 'Applications',
              labelAr: 'الطلبات',
              href: '/hr/recruitment/applications',
              badge: {
                key: 'hr_applications',
                color: 'blue',
                variant: 'solid',
              },
            },
            {
              id: 'interview_scheduling',
              label: 'Interview Scheduling',
              labelAr: 'جدولة المقابلات',
              href: '/hr/recruitment/interviews',
            },
          ],
        },
        {
          id: 'payroll',
          label: 'Payroll',
          labelAr: 'كشوف المرتبات',
          href: '/hr/payroll',
          iconName: 'DollarSign',
          subscriptionPlans: ['ENTERPRISE'],
          children: [
            {
              id: 'payroll_processing',
              label: 'Payroll Processing',
              labelAr: 'معالجة الرواتب',
              href: '/hr/payroll/processing',
            },
            {
              id: 'salary_structure',
              label: 'Salary Structure',
              labelAr: 'هيكل الرواتب',
              href: '/hr/payroll/salary',
            },
            {
              id: 'tax_calculations',
              label: 'Tax Calculations',
              labelAr: 'حسابات الضرائب',
              href: '/hr/payroll/taxes',
            },
          ],
        },
        {
          id: 'attendance',
          label: 'Attendance',
          labelAr: 'الحضور',
          href: '/hr/attendance',
          iconName: 'Clock',
          children: [
            {
              id: 'time_tracking',
              label: 'Time Tracking',
              labelAr: 'تتبع الوقت',
              href: '/hr/attendance/tracking',
            },
            {
              id: 'leave_management',
              label: 'Leave Management',
              labelAr: 'إدارة الإجازات',
              href: '/hr/attendance/leave',
            },
            {
              id: 'overtime_tracking',
              label: 'Overtime Tracking',
              labelAr: 'تتبع الوقت الإضافي',
              href: '/hr/attendance/overtime',
            },
          ],
        },
      ],
    },

    // ==========================================
    // CRM Section
    // ==========================================
    {
      id: 'crm',
      label: 'CRM',
      labelAr: 'إدارة علاقات العملاء',
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      subscriptionPlans: ['PRO', 'ENTERPRISE'],
      items: [
        {
          id: 'contacts',
          label: 'Contacts',
          labelAr: 'جهات الاتصال',
          href: '/crm/contacts',
          iconName: 'Users',
          children: [
            {
              id: 'contact_list',
              label: 'Contact List',
              labelAr: 'قائمة جهات الاتصال',
              href: '/crm/contacts',
            },
            {
              id: 'contact_segmentation',
              label: 'Segmentation',
              labelAr: 'التقسيم',
              href: '/crm/contacts/segments',
            },
            {
              id: 'import_contacts',
              label: 'Import Contacts',
              labelAr: 'استيراد جهات الاتصال',
              href: '/crm/contacts/import',
            },
          ],
        },
        {
          id: 'deals',
          label: 'Deals',
          labelAr: 'الصفقات',
          href: '/crm/deals',
          iconName: 'Handshake',
          badge: {
            key: 'crm_deals',
            color: 'green',
            variant: 'solid',
          },
          children: [
            {
              id: 'deal_pipeline',
              label: 'Deal Pipeline',
              labelAr: 'خط أنابيب الصفقات',
              href: '/crm/deals',
            },
            {
              id: 'won_deals',
              label: 'Won Deals',
              labelAr: 'الصفقات المربوحة',
              href: '/crm/deals?status=won',
            },
            {
              id: 'forecast',
              label: 'Sales Forecast',
              labelAr: 'توقعات المبيعات',
              href: '/crm/deals/forecast',
            },
          ],
        },
        {
          id: 'activities',
          label: 'Activities',
          labelAr: 'الأنشطة',
          href: '/crm/activities',
          iconName: 'Activity',
          children: [
            {
              id: 'activity_timeline',
              label: 'Activity Timeline',
              labelAr: 'الجدول الزمني للأنشطة',
              href: '/crm/activities',
            },
            {
              id: 'tasks',
              label: 'Tasks',
              labelAr: 'المهام',
              href: '/crm/activities/tasks',
            },
            {
              id: 'meetings',
              label: 'Meetings',
              labelAr: 'الاجتماعات',
              href: '/crm/activities/meetings',
            },
          ],
        },
        {
          id: 'campaigns',
          label: 'Campaigns',
          labelAr: 'الحملات',
          href: '/crm/campaigns',
          iconName: 'Megaphone',
          subscriptionPlans: ['ENTERPRISE'],
          children: [
            {
              id: 'email_campaigns',
              label: 'Email Campaigns',
              labelAr: 'حملات البريد الإلكتروني',
              href: '/crm/campaigns/email',
            },
            {
              id: 'sms_campaigns',
              label: 'SMS Campaigns',
              labelAr: 'حملات الرسائل النصية',
              href: '/crm/campaigns/sms',
            },
            {
              id: 'campaign_analytics',
              label: 'Campaign Analytics',
              labelAr: 'تحليلات الحملات',
              href: '/crm/campaigns/analytics',
            },
          ],
        },
      ],
    },

    // ==========================================
    // Support Section
    // ==========================================
    {
      id: 'support',
      label: 'Support',
      labelAr: 'الدعم',
      items: [
        {
          id: 'tickets',
          label: 'Support Tickets',
          labelAr: 'تذاكر الدعم',
          href: '/support/tickets',
          iconName: 'MessageSquare',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'],
          badge: {
            key: 'open_support_tickets',
            color: 'red',
            variant: 'solid',
            pulse: true,
          },
          children: [
            {
              id: 'open_tickets',
              label: 'Open Tickets',
              labelAr: 'التذاكر المفتوحة',
              href: '/support/tickets?status=open',
            },
            {
              id: 'assigned_tickets',
              label: 'Assigned to Me',
              labelAr: 'مُخصصة لي',
              href: '/support/tickets?assignee=me',
            },
            {
              id: 'escalated_tickets',
              label: 'Escalated',
              labelAr: 'مُتصاعدة',
              href: '/support/tickets?status=escalated',
            },
          ],
        },
        {
          id: 'knowledge_base',
          label: 'Knowledge Base',
          labelAr: 'قاعدة المعرفة',
          href: '/support/kb',
          iconName: 'BookOpen',
          children: [
            {
              id: 'articles',
              label: 'Articles',
              labelAr: 'المقالات',
              href: '/support/kb/articles',
            },
            {
              id: 'faqs',
              label: 'FAQs',
              labelAr: 'الأسئلة الشائعة',
              href: '/support/kb/faqs',
            },
            {
              id: 'tutorials',
              label: 'Tutorials',
              labelAr: 'البرامج التعليمية',
              href: '/support/kb/tutorials',
            },
          ],
        },
        {
          id: 'live_chat',
          label: 'Live Chat',
          labelAr: 'الدردشة المباشرة',
          href: '/support/chat',
          iconName: 'MessageCircle',
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'],
          isNew: true,
        },
      ],
    },

    // ==========================================
    // Settings & Administration
    // ==========================================
    {
      id: 'administration',
      label: 'Administration',
      labelAr: 'الإدارة',
      roles: ['SUPER_ADMIN', 'ADMIN'],
      items: [
        {
          id: 'organization',
          label: 'Organization',
          labelAr: 'المؤسسة',
          href: '/admin/organization',
          iconName: 'Building',
          children: [
            {
              id: 'org_settings',
              label: 'Settings',
              labelAr: 'الإعدادات',
              href: '/admin/organization/settings',
            },
            {
              id: 'billing_subscription',
              label: 'Billing & Subscription',
              labelAr: 'الفواتير والاشتراك',
              href: '/admin/organization/billing',
            },
            {
              id: 'usage_analytics',
              label: 'Usage Analytics',
              labelAr: 'تحليلات الاستخدام',
              href: '/admin/organization/analytics',
            },
          ],
        },
        {
          id: 'users_permissions',
          label: 'Users & Permissions',
          labelAr: 'المستخدمون والصلاحيات',
          href: '/admin/users',
          iconName: 'Shield',
          children: [
            {
              id: 'user_management',
              label: 'User Management',
              labelAr: 'إدارة المستخدمين',
              href: '/admin/users',
            },
            {
              id: 'roles_permissions',
              label: 'Roles & Permissions',
              labelAr: 'الأدوار والصلاحيات',
              href: '/admin/users/roles',
            },
            {
              id: 'access_logs',
              label: 'Access Logs',
              labelAr: 'سجلات الوصول',
              href: '/admin/users/logs',
            },
          ],
        },
        {
          id: 'integrations',
          label: 'Integrations',
          labelAr: 'التكاملات',
          href: '/admin/integrations',
          iconName: 'Zap',
          children: [
            {
              id: 'api_keys',
              label: 'API Keys',
              labelAr: 'مفاتيح API',
              href: '/admin/integrations/api',
            },
            {
              id: 'webhooks',
              label: 'Webhooks',
              labelAr: 'Webhooks',
              href: '/admin/integrations/webhooks',
            },
            {
              id: 'third_party',
              label: 'Third Party Apps',
              labelAr: 'تطبيقات الطرف الثالث',
              href: '/admin/integrations/apps',
            },
          ],
        },
        {
          id: 'system_settings',
          label: 'System Settings',
          labelAr: 'إعدادات النظام',
          href: '/admin/system',
          iconName: 'Settings',
          children: [
            {
              id: 'general_settings',
              label: 'General Settings',
              labelAr: 'الإعدادات العامة',
              href: '/admin/system/general',
            },
            {
              id: 'notifications',
              label: 'Notifications',
              labelAr: 'الإشعارات',
              href: '/admin/system/notifications',
            },
            {
              id: 'email_templates',
              label: 'Email Templates',
              labelAr: 'قوالب البريد الإلكتروني',
              href: '/admin/system/email-templates',
            },
            {
              id: 'backup_restore',
              label: 'Backup & Restore',
              labelAr: 'النسخ الاحتياطي والاستعادة',
              href: '/admin/system/backup',
            },
          ],
        },
      ],
    },

    // ==========================================
    // Personal Settings
    // ==========================================
    {
      id: 'personal',
      label: 'Personal',
      labelAr: 'شخصي',
      items: [
        {
          id: 'profile',
          label: 'Profile',
          labelAr: 'الملف الشخصي',
          href: '/profile',
          iconName: 'User',
          children: [
            {
              id: 'personal_info',
              label: 'Personal Information',
              labelAr: 'المعلومات الشخصية',
              href: '/profile/personal',
            },
            {
              id: 'security_settings',
              label: 'Security Settings',
              labelAr: 'إعدادات الأمان',
              href: '/profile/security',
            },
            {
              id: 'notification_preferences',
              label: 'Notifications',
              labelAr: 'الإشعارات',
              href: '/profile/notifications',
            },
          ],
        },
        {
          id: 'preferences',
          label: 'Preferences',
          labelAr: 'التفضيلات',
          href: '/profile/preferences',
          iconName: 'Sliders',
          children: [
            {
              id: 'language_region',
              label: 'Language & Region',
              labelAr: 'اللغة والمنطقة',
              href: '/profile/preferences/language',
            },
            {
              id: 'theme_appearance',
              label: 'Theme & Appearance',
              labelAr: 'المظهر والثيم',
              href: '/profile/preferences/theme',
            },
            {
              id: 'dashboard_layout',
              label: 'Dashboard Layout',
              labelAr: 'تخطيط لوحة التحكم',
              href: '/profile/preferences/dashboard',
            },
          ],
        },
        {
          id: 'help_support',
          label: 'Help & Support',
          labelAr: 'المساعدة والدعم',
          href: '/help',
          iconName: 'HelpCircle',
          children: [
            {
              id: 'documentation',
              label: 'Documentation',
              labelAr: 'التوثيق',
              href: '/help/docs',
              isExternal: true,
            },
            {
              id: 'contact_support',
              label: 'Contact Support',
              labelAr: 'اتصل بالدعم',
              href: '/help/contact',
            },
            {
              id: 'feature_requests',
              label: 'Feature Requests',
              labelAr: 'طلبات الميزات',
              href: '/help/features',
            },
          ],
        },
        {
          separator: true,
          id: 'logout_separator',
          label: '',
        },
        {
          id: 'logout',
          label: 'Logout',
          labelAr: 'تسجيل الخروج',
          href: '/logout',
          iconName: 'LogOut',
        },
      ],
    },
  ],
};

// ==========================================
// Helper Functions
// ==========================================

/**
 * Filter navigation items based on user role and subscription plan
 */
export function filterNavigation(
  config: NavigationConfig,
  userRole: UserRole,
  subscriptionPlan: SubscriptionPlan
): NavigationConfig {
  const filteredSections = config.sections
    .map(section => {
      // Check section-level permissions
      if (section.roles && !section.roles.includes(userRole)) {
        return null;
      }
      if (section.subscriptionPlans && !section.subscriptionPlans.includes(subscriptionPlan)) {
        return null;
      }

      // Filter section items
      const filteredItems = filterNavigationItems(section.items, userRole, subscriptionPlan);
      
      if (filteredItems.length === 0) {
        return null;
      }

      return {
        ...section,
        items: filteredItems,
      };
    })
    .filter((section): section is NavigationSection => section !== null);

  return {
    ...config,
    sections: filteredSections,
  };
}

/**
 * Filter navigation items recursively
 */
function filterNavigationItems(
  items: NavigationItem[],
  userRole: UserRole,
  subscriptionPlan: SubscriptionPlan
): NavigationItem[] {
  return items
    .map(item => {
      // Check item-level permissions
      if (item.roles && !item.roles.includes(userRole)) {
        return null;
      }
      if (item.subscriptionPlans && !item.subscriptionPlans.includes(subscriptionPlan)) {
        return null;
      }
      if (item.hidden) {
        return null;
      }

      // Filter children recursively
      const filteredChildren = item.children
        ? filterNavigationItems(item.children, userRole, subscriptionPlan)
        : undefined;

      return {
        ...item,
        children: filteredChildren,
      };
    })
    .filter(item => item !== null) as NavigationItem[];
}

/**
 * Get navigation item by ID
 */
export function getNavigationItem(config: NavigationConfig, id: string): NavigationItem | null {
  for (const section of config.sections) {
    const item = findNavigationItemInItems(section.items, id);
    if (item) {
      return item;
    }
  }
  return null;
}

/**
 * Find navigation item in items array recursively
 */
function findNavigationItemInItems(items: NavigationItem[], id: string): NavigationItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findNavigationItemInItems(item.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Get breadcrumb trail for navigation item
 */
export function getBreadcrumb(config: NavigationConfig, id: string): NavigationItem[] {
  for (const section of config.sections) {
    const trail = findBreadcrumbInItems(section.items, id, []);
    if (trail) {
      return trail;
    }
  }
  return [];
}

/**
 * Find breadcrumb trail recursively
 */
function findBreadcrumbInItems(
  items: NavigationItem[],
  targetId: string,
  currentTrail: NavigationItem[]
): NavigationItem[] | null {
  for (const item of items) {
    const newTrail = [...currentTrail, item];
    
    if (item.id === targetId) {
      return newTrail;
    }
    
    if (item.children) {
      const foundTrail = findBreadcrumbInItems(item.children, targetId, newTrail);
      if (foundTrail) {
        return foundTrail;
      }
    }
  }
  return null;
}

/**
 * Check if user has access to specific navigation item
 */
export function hasAccessToItem(
  item: NavigationItem,
  userRole: UserRole,
  subscriptionPlan: SubscriptionPlan
): boolean {
  if (item.roles && !item.roles.includes(userRole)) {
    return false;
  }
  if (item.subscriptionPlans && !item.subscriptionPlans.includes(subscriptionPlan)) {
    return false;
  }
  if (item.hidden) {
    return false;
  }
  return true;
}
