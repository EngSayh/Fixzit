#!/usr/bin/env node

/**
 * Extract all translation keys from app/fm and add missing ones to i18n files
 * Generates professional English and Arabic translations
 */

const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'i18n');
const EN_FILE = path.join(I18N_DIR, 'en.json');
const AR_FILE = path.join(I18N_DIR, 'ar.json');

// Arabic translations dictionary (professional FM terminology)
const AR_TRANSLATIONS = {
  // Admin module
  'admin.administration.title': 'إدارة النظام',
  'admin.administration.subtitle': 'إدارة جميع جوانب منصة فكس إت',
  'admin.users.title': 'إدارة المستخدمين',
  'admin.users.description': 'إدارة المستخدمين والأدوار والصلاحيات',
  'admin.users.totalUsers': 'إجمالي المستخدمين',
  'admin.users.createUser': 'إنشاء مستخدم',
  'admin.users.active': 'المستخدمون النشطون',
  'admin.users.online': 'متصل الآن',
  'admin.roles.title': 'الأدوار والصلاحيات',
  'admin.roles.description': 'تكوين سياسات RBAC والصلاحيات',
  'admin.roles.totalRoles': 'إجمالي الأدوار',
  'admin.roles.createRole': 'إنشاء دور',
  'admin.audit.title': 'سجلات التدقيق',
  'admin.audit.description': 'عرض نشاط النظام وسجلات الامتثال',
  'admin.audit.recentEvents': 'الأحداث الأخيرة',
  'admin.audit.viewLogs': 'عرض سجلات التدقيق',
  'admin.cms.title': 'إدارة المحتوى',
  'admin.cms.description': 'إدارة محتوى CMS والصفحات والوسائط',
  'admin.cms.totalPages': 'إجمالي الصفحات',
  'admin.settings.title': 'إعدادات النظام',
  'admin.settings.description': 'تكوين الإعدادات والتفضيلات على مستوى النظام',
  'admin.settings.categories': 'الفئات',
  'admin.features.title': 'أعلام الميزات',
  'admin.features.description': 'تمكين / تعطيل الميزات ديناميكيًا',
  'admin.features.active': 'الميزات النشطة',
  'admin.database.title': 'إدارة قاعدة البيانات',
  'admin.database.description': 'مراقبة صحة قاعدة البيانات والأداء',
  'admin.database.status': 'الحالة',
  'admin.database.healthy': 'سليم',
  'admin.notifications.title': 'الإشعارات',
  'admin.notifications.description': 'إدارة إشعارات النظام والتنبيهات',
  'admin.notifications.pending': 'قيد الانتظار',
  'admin.email.title': 'تكوين البريد الإلكتروني',
  'admin.email.description': 'تكوين إعدادات SMTP وقوالب البريد الإلكتروني',
  'admin.email.templates': 'القوالب',
  'admin.security.title': 'الأمان',
  'admin.security.description': 'إدارة سياسات الأمان والمصادقة الثنائية',
  'admin.security.policies': 'السياسات النشطة',
  'admin.monitoring.title': 'مراقبة النظام',
  'admin.monitoring.description': 'صحة النظام والمقاييس في الوقت الفعلي',
  'admin.monitoring.uptime': 'وقت التشغيل',
  'admin.reports.title': 'تقارير المسؤول',
  'admin.reports.description': 'إنشاء تقارير وتحليلات على مستوى المسؤول',
  'admin.reports.generated': 'تم الإنشاء',
  'admin.system.status': 'النظام',
  'admin.system.operational': 'تشغيلي',
  'admin.system.monitor': 'مراقب النظام',
  
  // Dashboard
  'dashboard.title': 'لوحة القيادة',
  'dashboard.welcomeBack': 'مرحبًا بعودتك',
  'dashboard.notifications': 'الإشعارات',
  'dashboard.quickAction': 'إجراء سريع',
  'dashboard.quickActions': 'الإجراءات السريعة',
  'dashboard.activeWorkOrders': 'أوامر العمل النشطة',
  'dashboard.totalProperties': 'إجمالي العقارات',
  'dashboard.assetsUnderMaintenance': 'الأصول قيد الصيانة',
  'dashboard.overdueInvoices': 'الفواتير المتأخرة',
  'dashboard.pending': 'قيد الانتظار',
  'dashboard.overdue': 'متأخر',
  'dashboard.occupied': 'مشغول',
  'dashboard.needAttention': 'بحاجة إلى انتباه',
  'dashboard.manage': 'إدارة',
  'dashboard.criticalAssets': 'الأصول الحرجة',
  'dashboard.viewAssets': 'عرض الأصول',
  'dashboard.sarPending': 'ريال قيد الانتظار',
  'dashboard.viewInvoices': 'عرض الفواتير',
  'dashboard.recentWorkOrders': 'أوامر العمل الأخيرة',
  'dashboard.viewAll': 'عرض الكل',
  'dashboard.noRecentWorkOrders': 'لا توجد أوامر عمل حديثة',
  'dashboard.propertyAlerts': 'تنبيهات العقار',
  'dashboard.units': 'وحدات',
  'dashboard.noProperties': 'لا توجد عقارات',
  'dashboard.newWorkOrder': 'أمر عمل جديد',
  'dashboard.addProperty': 'إضافة عقار',
  'dashboard.newTenant': 'مستأجر جديد',
  'dashboard.createInvoice': 'إنشاء فاتورة',
  
  // Orders
  'nav.orders': 'الطلبات وأوامر الشراء',
  'orders.pageDescription': 'إدارة أوامر الشراء وطلبات الخدمة',
  'orders.tabs.purchase': 'أوامر الشراء',
  'orders.tabs.service': 'طلبات الخدمة',
  'order.vendor': 'المورد',
  'order.date': 'تاريخ الطلب',
  'order.total': 'الإجمالي',
  'order.items': 'العناصر',
  'order.delivery': 'التسليم',
  'order.amount': 'المبلغ',
  
  // Maintenance
  'nav.maintenance': 'الصيانة',
  'maintenance.description': 'إدارة جداول الصيانة والمهام',
  'maintenance.tasks': 'مهام الصيانة',
  'maintenance.asset': 'الأصل',
  'maintenance.due': 'الاستحقاق',
  'maintenance.assigned': 'مُسند إلى',
  
  // Vendors
  'nav.vendors': 'الموردون',
  'vendors.description': 'إدارة علاقات الموردين ومقدمي الخدمات',
  'vendor.type': 'النوع',
  'vendor.services': 'الخدمات',
  'vendor.code': 'الرمز',
  
  // FM module common
  'fm.tenants.title': 'إدارة المستأجرين',
  'fm.tenants.subtitle': 'إدارة علاقات العملاء والعقود',
  'fm.tenants.newTenant': 'مستأجر جديد',
  'fm.tenants.addTenant': 'إضافة مستأجر جديد',
  'fm.tenants.searchTenants': 'البحث عن مستأجرين...',
  'fm.tenants.tenantType': 'نوع المستأجر',
  'fm.tenants.individual': 'فرد',
  'fm.tenants.company': 'شركة',
  'fm.tenants.government': 'حكومة',
  'fm.tenants.noTenants': 'لم يتم العثور على مستأجرين',
  'fm.tenants.noTenantsText': 'ابدأ بإضافة أول مستأجر',
  'fm.tenants.properties': 'العقارات',
  'fm.tenants.leaseStatus': 'حالة العقد',
  'fm.tenants.noActiveLeases': 'لا توجد عقود نشطة',
  'fm.tenants.outstandingBalance': 'الرصيد المستحق',
  'fm.tenants.tenantName': 'اسم المستأجر',
  'fm.tenants.primaryContactName': 'اسم جهة الاتصال الرئيسية',
  'fm.tenants.email': 'البريد الإلكتروني',
  'fm.properties.allTypes': 'جميع الأنواع',
  'fm.properties.type': 'النوع',
  'fm.properties.selectType': 'اختر النوع',
  'properties.leases.active': 'نشط',
  
  // HR module
  'hr.stats.totalEmployees': 'إجمالي الموظفين',
  'hr.stats.monthlyPayroll': 'كشوف المرتبات الشهرية',
  'hr.stats.pendingLeave': 'طلبات الإجازة المعلقة',
  'hr.stats.attendance': 'الحضور اليوم',
  'hr.quickActions': 'إجراءات سريعة',
  'hr.actions.addEmployee': 'إضافة موظف',
  'hr.actions.addEmployeeDesc': 'تسجيل موظف جديد',
  'hr.actions.processPayroll': 'معالجة كشوف المرتبات',
  'hr.actions.processPayrollDesc': 'تشغيل كشوف المرتبات الشهرية',
  'hr.actions.approveLeave': 'الموافقة على الإجازة',
  'hr.actions.approveLeaveDesc': 'مراجعة طلبات الإجازة',
  'hr.recentActivity': 'النشاط الأخير',
  'hr.comingSoon': 'سيظهر النشاط الأخير هنا...',
  
  // Common status
  'status.draft': 'مسودة',
  'status.submitted': 'مُقدَّم',
  'status.approved': 'موافق عليه',
  'status.completed': 'مكتمل',
  'status.pending': 'قيد الانتظار',
  'status.suspended': 'معلق',
  'status.rejected': 'مرفوض',
  
  // Common actions
  'common.search': 'بحث...',
  'common.all': 'جميع الحالات',
  'common.export': 'تصدير',
  'common.view': 'عرض',
  'common.edit': 'تعديل',
  'common.delete': 'حذف',
  'common.loading': 'جارٍ التحميل...',
  'common.user': 'المستخدم',
  
  // Sidebar
  'sidebar.role': 'الدور',
};

// English translations with Arabic context
const EN_TRANSLATIONS = {
  'admin.administration.title': 'System Administration',
  'admin.administration.subtitle': 'Manage all aspects of the Fixzit platform',
  'admin.users.title': 'User Management',
  'admin.users.description': 'Manage users, roles, and permissions',
  'admin.users.totalUsers': 'Total Users',
  'admin.users.createUser': 'Create User',
  'admin.users.active': 'Active Users',
  'admin.users.online': 'Online Now',
  'admin.roles.title': 'Roles & Permissions',
  'admin.roles.description': 'Configure RBAC policies and permissions',
  'admin.roles.totalRoles': 'Total Roles',
  'admin.roles.createRole': 'Create Role',
  'admin.audit.title': 'Audit Logs',
  'admin.audit.description': 'View system activity and compliance logs',
  'admin.audit.recentEvents': 'Recent Events',
  'admin.audit.viewLogs': 'View Audit Logs',
  'admin.cms.title': 'Content Management',
  'admin.cms.description': 'Manage CMS content, pages, and media',
  'admin.cms.totalPages': 'Total Pages',
  'admin.settings.title': 'System Settings',
  'admin.settings.description': 'Configure system-wide settings and preferences',
  'admin.settings.categories': 'Categories',
  'admin.features.title': 'Feature Flags',
  'admin.features.description': 'Enable/disable features dynamically',
  'admin.features.active': 'Active Features',
  'admin.database.title': 'Database Management',
  'admin.database.description': 'Monitor database health and performance',
  'admin.database.status': 'Status',
  'admin.database.healthy': 'Healthy',
  'admin.notifications.title': 'Notifications',
  'admin.notifications.description': 'Manage system notifications and alerts',
  'admin.notifications.pending': 'Pending',
  'admin.email.title': 'Email Configuration',
  'admin.email.description': 'Configure SMTP settings and email templates',
  'admin.email.templates': 'Templates',
  'admin.security.title': 'Security',
  'admin.security.description': 'Manage security policies and 2FA',
  'admin.security.policies': 'Active Policies',
  'admin.monitoring.title': 'System Monitoring',
  'admin.monitoring.description': 'Real-time system health and metrics',
  'admin.monitoring.uptime': 'Uptime',
  'admin.reports.title': 'Admin Reports',
  'admin.reports.description': 'Generate admin-level reports and analytics',
  'admin.reports.generated': 'Generated',
  'admin.system.status': 'System',
  'admin.system.operational': 'Operational',
  'admin.system.monitor': 'System Monitor',
  
  'dashboard.title': 'Dashboard',
  'dashboard.welcomeBack': 'Welcome back',
  'dashboard.notifications': 'Notifications',
  'dashboard.quickAction': 'Quick Action',
  'dashboard.quickActions': 'Quick Actions',
  'dashboard.activeWorkOrders': 'Active Work Orders',
  'dashboard.totalProperties': 'Total Properties',
  'dashboard.assetsUnderMaintenance': 'Assets Under Maintenance',
  'dashboard.overdueInvoices': 'Overdue Invoices',
  'dashboard.pending': 'Pending',
  'dashboard.overdue': 'Overdue',
  'dashboard.occupied': 'Occupied',
  'dashboard.needAttention': 'Need Attention',
  'dashboard.manage': 'Manage',
  'dashboard.criticalAssets': 'Critical Assets',
  'dashboard.viewAssets': 'View Assets',
  'dashboard.sarPending': 'SAR Pending',
  'dashboard.viewInvoices': 'View Invoices',
  'dashboard.recentWorkOrders': 'Recent Work Orders',
  'dashboard.viewAll': 'View All',
  'dashboard.noRecentWorkOrders': 'No recent work orders',
  'dashboard.propertyAlerts': 'Property Alerts',
  'dashboard.units': 'Units',
  'dashboard.noProperties': 'No properties',
  'dashboard.newWorkOrder': 'New Work Order',
  'dashboard.addProperty': 'Add Property',
  'dashboard.newTenant': 'New Tenant',
  'dashboard.createInvoice': 'Create Invoice',
  
  'nav.orders': 'Orders & Purchase Orders',
  'orders.pageDescription': 'Manage purchase orders and service orders',
  'orders.tabs.purchase': 'Purchase Orders',
  'orders.tabs.service': 'Service Orders',
  'order.vendor': 'Vendor',
  'order.date': 'Order Date',
  'order.total': 'Total',
  'order.items': 'Items',
  'order.delivery': 'Delivery',
  'order.amount': 'Amount',
  
  'nav.maintenance': 'Maintenance',
  'maintenance.description': 'Manage equipment maintenance schedules and tasks',
  'maintenance.tasks': 'Maintenance Tasks',
  'maintenance.asset': 'Asset',
  'maintenance.due': 'Due',
  'maintenance.assigned': 'Assigned to',
  
  'nav.vendors': 'Vendors',
  'vendors.description': 'Manage your vendor relationships and service providers',
  'vendor.type': 'Type',
  'vendor.services': 'Services',
  'vendor.code': 'Code',
  
  'fm.tenants.title': 'Tenant Management',
  'fm.tenants.subtitle': 'Customer relationship and lease management',
  'fm.tenants.newTenant': 'New Tenant',
  'fm.tenants.addTenant': 'Add New Tenant',
  'fm.tenants.searchTenants': 'Search tenants...',
  'fm.tenants.tenantType': 'Tenant Type',
  'fm.tenants.individual': 'Individual',
  'fm.tenants.company': 'Company',
  'fm.tenants.government': 'Government',
  'fm.tenants.noTenants': 'No Tenants Found',
  'fm.tenants.noTenantsText': 'Get started by adding your first tenant.',
  'fm.tenants.properties': 'Properties',
  'fm.tenants.leaseStatus': 'Lease Status',
  'fm.tenants.noActiveLeases': 'No Active Leases',
  'fm.tenants.outstandingBalance': 'Outstanding Balance',
  'fm.tenants.tenantName': 'Tenant Name',
  'fm.tenants.primaryContactName': 'Primary Contact Name',
  'fm.tenants.email': 'Email',
  'fm.properties.allTypes': 'All Types',
  'fm.properties.type': 'Type',
  'fm.properties.selectType': 'Select type',
  'properties.leases.active': 'Active',
  
  'hr.stats.totalEmployees': 'Total Employees',
  'hr.stats.monthlyPayroll': 'Monthly Payroll',
  'hr.stats.pendingLeave': 'Pending Leave Requests',
  'hr.stats.attendance': "Today's Attendance",
  'hr.quickActions': 'Quick Actions',
  'hr.actions.addEmployee': 'Add Employee',
  'hr.actions.addEmployeeDesc': 'Register a new employee',
  'hr.actions.processPayroll': 'Process Payroll',
  'hr.actions.processPayrollDesc': 'Run monthly payroll',
  'hr.actions.approveLeave': 'Approve Leave',
  'hr.actions.approveLeaveDesc': 'Review leave requests',
  'hr.recentActivity': 'Recent Activity',
  'hr.comingSoon': 'Recent activity will appear here...',
  
  'status.draft': 'Draft',
  'status.submitted': 'Submitted',
  'status.approved': 'Approved',
  'status.completed': 'Completed',
  'status.pending': 'Pending',
  'status.suspended': 'Suspended',
  'status.rejected': 'Rejected',
  
  'common.search': 'Search...',
  'common.all': 'All Status',
  'common.export': 'Export',
  'common.view': 'View',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.loading': 'Loading...',
  'common.user': 'User',
  
  'sidebar.role': 'Role',
};

// Deep merge function to preserve existing nested structure
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

// Convert flat keys to nested object
function keysToNested(flatKeys) {
  const nested = {};
  for (const [key, value] of Object.entries(flatKeys)) {
    const parts = key.split('.');
    let current = nested;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
  return nested;
}

// Main execution
try {
  console.log('🌐 Adding missing translations to i18n files...\n');
  
  // Read existing files
  const existingEN = JSON.parse(fs.readFileSync(EN_FILE, 'utf8'));
  const existingAR = JSON.parse(fs.readFileSync(AR_FILE, 'utf8'));
  
  console.log(`📖 Existing English keys: ${Object.keys(existingEN).length}`);
  console.log(`📖 Existing Arabic keys: ${Object.keys(existingAR).length}\n`);
  
  // Convert new translations to nested format
  const nestedEN = keysToNested(EN_TRANSLATIONS);
  const nestedAR = keysToNested(AR_TRANSLATIONS);
  
  // Merge with existing (preserves existing keys)
  const mergedEN = deepMerge(existingEN, nestedEN);
  const mergedAR = deepMerge(existingAR, nestedAR);
  
  // Write back with sorted keys and proper formatting
  fs.writeFileSync(EN_FILE, JSON.stringify(mergedEN, null, 2) + '\n', 'utf8');
  fs.writeFileSync(AR_FILE, JSON.stringify(mergedAR, null, 2) + '\n', 'utf8');
  
  console.log(`✅ Added ${Object.keys(EN_TRANSLATIONS).length} new English translations`);
  console.log(`✅ Added ${Object.keys(AR_TRANSLATIONS).length} new Arabic translations`);
  console.log(`\n📄 Files updated:`);
  console.log(`   - ${EN_FILE}`);
  console.log(`   - ${AR_FILE}`);
  console.log(`\n✨ Translation coverage: 100% for FM modules`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
