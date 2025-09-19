// Complete 14-Role RBAC System based on Fixzit Blueprint Bible
// Implements all roles, permissions, and module access as specified in Governance V6

class FixzitRBACSystem {
  constructor() {
    this.roles = this.initializeRoles();
    this.modules = this.initializeModules();
    this.permissions = this.initializePermissions();
    this.roleModuleMatrix = this.initializeRoleModuleMatrix();
  }

  // 14 Complete Roles as specified in Blueprint Bible
  initializeRoles() {
    return {
      // System Level Roles
      SUPER_ADMIN: {
        id: 'super_admin',
        name: 'Super Admin',
        description: 'Full system access across all organizations',
        level: 'system',
        scope: 'global',
        canSwitchOrgs: true,
        canManageSubscriptions: true,
        maxProperties: null, // Unlimited
        features: ['all']
      },

      // Corporate Level Roles
      CORPORATE_ADMIN: {
        id: 'corporate_admin',
        name: 'Corporate Admin',
        description: 'Full admin access within corporate organization',
        level: 'corporate',
        scope: 'organization',
        canSwitchOrgs: false,
        canManageSubscriptions: false,
        maxProperties: null, // Based on subscription
        features: ['admin', 'finance', 'hr', 'compliance', 'reports']
      },

      CORPORATE_USER: {
        id: 'corporate_user',
        name: 'Corporate User',
        description: 'Limited corporate access based on subscription',
        level: 'corporate',
        scope: 'organization',
        canSwitchOrgs: false,
        canManageSubscriptions: false,
        maxProperties: 10, // Subscription-based limit
        features: ['dashboard', 'properties', 'work_orders', 'reports_basic']
      },

      // Property Management Roles
      PROPERTY_MANAGER: {
        id: 'property_manager',
        name: 'Property Manager',
        description: 'Manages properties, tenants, and maintenance',
        level: 'operational',
        scope: 'properties',
        canSwitchOrgs: false,
        canManageSubscriptions: false,
        maxProperties: 50,
        features: ['properties', 'work_orders', 'tenants', 'maintenance', 'reports']
      },

      FINANCE_OFFICER: {
        id: 'finance_officer',
        name: 'Finance Officer',
        description: 'Financial management and accounting',
        level: 'operational',
        scope: 'finance',
        canSwitchOrgs: false,
        canManageSubscriptions: false,
        maxProperties: null,
        features: ['finance', 'invoicing', 'payments', 'budgets', 'reports_financial']
      },

      HR_MANAGER: {
        id: 'hr_manager',
        name: 'HR Manager',
        description: 'Human resources and employee management',
        level: 'operational',
        scope: 'hr',
        canSwitchOrgs: false,
        canManageSubscriptions: false,
        maxProperties: null,
        features: ['hr', 'employees', 'payroll', 'recruitment', 'training']
      },

      ADMIN_OFFICER: {
        id: 'admin_officer',
        name: 'Admin Officer',
        description: 'Administrative tasks and system configuration',
        level: 'operational',
        scope: 'admin',
        canSwitchOrgs: false,
        canManageSubscriptions: false,
        maxProperties: null,
        features: ['admin', 'users', 'settings', 'system_config']
      },

      CRM_OFFICER: {
        id: 'crm_officer',
        name: 'CRM Officer',
        description: 'Customer relationship management and sales',
        level: 'operational',
        scope: 'crm',
        canSwitchOrgs: false,
        canManageSubscriptions: false,
        maxProperties: null,
        features: ['crm', 'customers', 'leads', 'contracts', 'marketing']
      },

      // Field and Service Roles
      TECHNICIAN: {
        id: 'technician',
        name: 'Technician',
        description: 'Field service and maintenance execution',
        level: 'field',
        scope: 'work_orders',
        canSwitchOrgs: false,
        canManageSubscriptions: false,
        maxProperties: null,
        features: ['work_orders_assigned', 'mobile_app', 'time_tracking', 'photos']
      },

      // External Roles
      VENDOR: {
        id: 'vendor',
        name: 'Vendor',
        description: 'External service providers and suppliers',
        level: 'external',
        scope: 'marketplace',
        canSwitchOrgs: false,
        canManageSubscriptions: false,
        maxProperties: null,
        features: ['vendor_portal', 'rfqs', 'bids', 'orders', 'invoicing_vendor']
      },

      TENANT: {
        id: 'tenant',
        name: 'Tenant/Client',
        description: 'Property tenants and service clients',
        level: 'external',
        scope: 'tenant',
        canSwitchOrgs: false,
        canManageSubscriptions: false,
        maxProperties: null,
        features: ['tenant_portal', 'service_requests', 'payments_tenant', 'documents']
      },

      // Specialized Roles
      COMPLIANCE_LEGAL: {
        id: 'compliance_legal',
        name: 'Compliance/Legal',
        description: 'Compliance monitoring and legal affairs',
        level: 'specialized',
        scope: 'compliance',
        canSwitchOrgs: false,
        canManageSubscriptions: false,
        maxProperties: null,
        features: ['compliance', 'legal', 'contracts', 'audits', 'risk_management']
      },

      SUPPORT_AGENT: {
        id: 'support_agent',
        name: 'Support Agent',
        description: 'Customer support and helpdesk',
        level: 'specialized',
        scope: 'support',
        canSwitchOrgs: false,
        canManageSubscriptions: false,
        maxProperties: null,
        features: ['support', 'tickets', 'knowledge_base', 'live_chat']
      },

      // Property Owner Role
      OWNER: {
        id: 'owner',
        name: 'Owner',
        description: 'Property owners with investment oversight',
        level: 'stakeholder',
        scope: 'owned_properties',
        canSwitchOrgs: false,
        canManageSubscriptions: false,
        maxProperties: null,
        features: ['owner_dashboard', 'financial_reports', 'approvals', 'switch_agent', 'statements']
      }
    };
  }

  // Complete Module System
  initializeModules() {
    return {
      // Core Platform Modules
      DASHBOARD: {
        id: 'dashboard',
        name: 'Dashboard',
        icon: 'dashboard',
        category: 'core',
        tabs: ['overview', 'my_work', 'alerts', 'calendar', 'reports'],
        deepLinks: true,
        mobileSupport: true
      },

      PROPERTIES: {
        id: 'properties',
        name: 'Properties',
        icon: 'building',
        category: 'core',
        tabs: ['list', 'map', 'calendar', 'documents', 'analytics'],
        subModules: ['units', 'tenants', 'leases', 'inspections'],
        deepLinks: true,
        mobileSupport: true
      },

      WORK_ORDERS: {
        id: 'work_orders',
        name: 'Work Orders',
        icon: 'wrench',
        category: 'operations',
        tabs: ['board', 'list', 'map', 'calendar', 'gantt', 'sla_watchlist'],
        subModules: ['pm_plans', 'service_history', 'quotes', 'approvals'],
        deepLinks: true,
        mobileSupport: true,
        slaTracking: true
      },

      FINANCE: {
        id: 'finance',
        name: 'Finance',
        icon: 'dollar-sign',
        category: 'business',
        tabs: ['invoices', 'payments', 'expenses', 'budgets', 'reports', 'zatca'],
        subModules: ['collections', 'statements', 'doa_approvals'],
        deepLinks: true,
        mobileSupport: true,
        auditTrail: true
      },

      HR: {
        id: 'hr',
        name: 'HR Management',
        icon: 'users',
        category: 'business',
        tabs: ['directory', 'attendance', 'leave', 'payroll', 'recruitment', 'training', 'performance'],
        subModules: ['onboarding', 'offboarding', 'evaluations'],
        deepLinks: true,
        mobileSupport: true
      },

      CRM: {
        id: 'crm',
        name: 'CRM',
        icon: 'user-check',
        category: 'business',
        tabs: ['customers', 'leads', 'contracts', 'feedback', 'marketing'],
        subModules: ['gdpr_consent', 'communication_history'],
        deepLinks: true,
        mobileSupport: true,
        gdprCompliant: true
      },

      MARKETPLACE: {
        id: 'marketplace',
        name: 'Marketplace',
        icon: 'shopping-bag',
        category: 'business',
        tabs: ['catalog', 'rfqs', 'bids', 'orders', 'vendors', 'ratings'],
        subModules: ['procurement', 'delivery', 'quality_control'],
        deepLinks: true,
        mobileSupport: true
      },

      SUPPORT: {
        id: 'support',
        name: 'Support & Helpdesk',
        icon: 'headphones',
        category: 'service',
        tabs: ['tickets', 'knowledge_base', 'live_chat', 'sla_monitoring', 'csat'],
        subModules: ['ai_assistant', 'tutorials', 'guides'],
        deepLinks: true,
        mobileSupport: true,
        aiEnabled: true
      },

      COMPLIANCE: {
        id: 'compliance',
        name: 'Compliance & Legal',
        icon: 'shield',
        category: 'governance',
        tabs: ['contracts', 'disputes', 'audits', 'risk', 'policies'],
        subModules: ['digital_signatures', 'document_management'],
        deepLinks: true,
        mobileSupport: false,
        auditTrail: true
      },

      REPORTS: {
        id: 'reports',
        name: 'Reports & Analytics',
        icon: 'bar-chart-3',
        category: 'analytics',
        tabs: ['dashboards', 'custom_reports', 'scheduled', 'exports'],
        subModules: ['business_intelligence', 'predictive_analytics'],
        deepLinks: true,
        mobileSupport: true
      },

      ADMINISTRATION: {
        id: 'administration',
        name: 'System Management',
        icon: 'settings',
        category: 'system',
        tabs: ['users_roles', 'subscriptions_billing', 'integrations', 'settings'],
        subModules: ['api_management', 'audit_logs'],
        deepLinks: true,
        mobileSupport: false
      },

      PREVENTIVE: {
        id: 'preventive',
        name: 'Preventive Maintenance',
        icon: 'calendar-check',
        category: 'operations',
        tabs: ['schedules', 'plans', 'history', 'analytics'],
        subModules: ['asset_management', 'warranties'],
        deepLinks: true,
        mobileSupport: true
      },

      SETTINGS: {
        id: 'settings',
        name: 'Settings',
        icon: 'cog',
        category: 'system',
        tabs: ['profile', 'preferences', 'notifications', 'security'],
        subModules: ['api_keys', 'integrations'],
        deepLinks: true,
        mobileSupport: true
      }
    };
  }

  // Comprehensive Permission System
  initializePermissions() {
    return {
      // Dashboard Permissions
      'dashboard.read': 'View dashboard',
      'dashboard.customize': 'Customize dashboard layout',
      'dashboard.export': 'Export dashboard data',

      // Properties Permissions
      'properties.read': 'View properties',
      'properties.create': 'Create new properties',
      'properties.update': 'Update property information',
      'properties.delete': 'Delete properties',
      'properties.manage_units': 'Manage property units',
      'properties.manage_tenants': 'Manage tenants',
      'properties.view_financials': 'View property financials',

      // Work Orders Permissions
      'work_orders.read': 'View work orders',
      'work_orders.create': 'Create work orders',
      'work_orders.update': 'Update work orders',
      'work_orders.delete': 'Delete work orders',
      'work_orders.assign': 'Assign work orders',
      'work_orders.approve': 'Approve work orders',
      'work_orders.close': 'Close work orders',
      'work_orders.view_all': 'View all work orders',
      'work_orders.view_assigned': 'View assigned work orders only',

      // Finance Permissions
      'finance.read': 'View financial data',
      'finance.create': 'Create financial records',
      'finance.update': 'Update financial records',
      'finance.delete': 'Delete financial records',
      'finance.approve_invoices': 'Approve invoices',
      'finance.process_payments': 'Process payments',
      'finance.manage_budgets': 'Manage budgets',
      'finance.view_reports': 'View financial reports',
      'finance.zatca_access': 'Access ZATCA features',

      // HR Permissions
      'hr.read': 'View HR data',
      'hr.create': 'Create HR records',
      'hr.update': 'Update HR records',
      'hr.delete': 'Delete HR records',
      'hr.manage_employees': 'Manage employees',
      'hr.process_payroll': 'Process payroll',
      'hr.manage_recruitment': 'Manage recruitment',
      'hr.view_performance': 'View performance data',

      // CRM Permissions
      'crm.read': 'View CRM data',
      'crm.create': 'Create CRM records',
      'crm.update': 'Update CRM records',
      'crm.delete': 'Delete CRM records',
      'crm.manage_leads': 'Manage leads',
      'crm.manage_customers': 'Manage customers',
      'crm.manage_contracts': 'Manage contracts',

      // Marketplace Permissions
      'marketplace.read': 'View marketplace',
      'marketplace.create': 'Create marketplace items',
      'marketplace.update': 'Update marketplace items',
      'marketplace.delete': 'Delete marketplace items',
      'marketplace.manage_vendors': 'Manage vendors',
      'marketplace.process_rfqs': 'Process RFQs',
      'marketplace.approve_bids': 'Approve bids',

      // Support Permissions
      'support.read': 'View support tickets',
      'support.create': 'Create support tickets',
      'support.update': 'Update support tickets',
      'support.delete': 'Delete support tickets',
      'support.manage_kb': 'Manage knowledge base',
      'support.live_chat': 'Access live chat',

      // Compliance Permissions
      'compliance.read': 'View compliance data',
      'compliance.create': 'Create compliance records',
      'compliance.update': 'Update compliance records',
      'compliance.manage_audits': 'Manage audits',
      'compliance.digital_signatures': 'Manage digital signatures',
      'compliance.view_audit_trail': 'View audit trail',

      // Reports Permissions
      'reports.read': 'View reports',
      'reports.create': 'Create custom reports',
      'reports.schedule': 'Schedule reports',
      'reports.export': 'Export reports',
      'reports.advanced_analytics': 'Access advanced analytics',

      // Administration Permissions
      'admin.read': 'View admin data',
      'admin.create': 'Create admin records',
      'admin.update': 'Update admin records',
      'admin.delete': 'Delete admin records',
      'admin.manage_users': 'Manage users',
      'admin.manage_roles': 'Manage roles',
      'admin.manage_subscriptions': 'Manage subscriptions',
      'admin.system_settings': 'Manage system settings',

      // Special Owner Permissions
      'owner.read': 'View owner data',
      'owner.switch_agent': 'Switch property management agent',
      'owner.view_statements': 'View financial statements',
      'owner.approve_major_expenses': 'Approve major expenses',
      'owner.export_statements': 'Export financial statements',

      // Vendor Permissions
      'vendor.read': 'View vendor data',
      'vendor.update_profile': 'Update vendor profile',
      'vendor.submit_bids': 'Submit bids',
      'vendor.manage_orders': 'Manage orders',
      'vendor.view_payments': 'View payments',

      // Tenant Permissions
      'tenant.read': 'View tenant data',
      'tenant.create_requests': 'Create service requests',
      'tenant.view_payments': 'View payment history',
      'tenant.access_documents': 'Access lease documents'
    };
  }

  // Role-Module Access Matrix (Full/Limited/Tab-only/None)
  initializeRoleModuleMatrix() {
    return {
      // SUPER_ADMIN - Full access to everything
      super_admin: {
        dashboard: 'full',
        properties: 'full',
        work_orders: 'full',
        finance: 'full',
        hr: 'full',
        crm: 'full',
        marketplace: 'full',
        support: 'full',
        compliance: 'full',
        reports: 'full',
        administration: 'full',
        preventive: 'full',
        settings: 'full'
      },

      // CORPORATE_ADMIN - Full access within organization
      corporate_admin: {
        dashboard: 'full',
        properties: 'full',
        work_orders: 'full',
        finance: 'full',
        hr: 'full',
        crm: 'full',
        marketplace: 'limited', // No vendor management
        support: 'full',
        compliance: 'full',
        reports: 'full',
        administration: 'limited', // No subscription management
        preventive: 'full',
        settings: 'full'
      },

      // CORPORATE_USER - Limited access based on subscription
      corporate_user: {
        dashboard: 'limited',
        properties: 'limited', // Max 10 properties
        work_orders: 'limited',
        finance: 'tab_only', // View only
        hr: 'none',
        crm: 'tab_only',
        marketplace: 'tab_only',
        support: 'limited',
        compliance: 'none',
        reports: 'limited',
        administration: 'none',
        preventive: 'limited',
        settings: 'limited'
      },

      // PROPERTY_MANAGER - Property-focused access
      property_manager: {
        dashboard: 'full',
        properties: 'full',
        work_orders: 'full',
        finance: 'limited', // Property-related only
        hr: 'tab_only',
        crm: 'limited', // Tenant-related only
        marketplace: 'limited', // Vendor sourcing only
        support: 'limited',
        compliance: 'tab_only',
        reports: 'limited',
        administration: 'none',
        preventive: 'full',
        settings: 'limited'
      },

      // FINANCE_OFFICER - Finance-focused access
      finance_officer: {
        dashboard: 'limited',
        properties: 'tab_only', // Financial view only
        work_orders: 'tab_only', // Cost view only
        finance: 'full',
        hr: 'tab_only', // Payroll view only
        crm: 'tab_only', // Customer billing only
        marketplace: 'limited', // Vendor payments only
        support: 'none',
        compliance: 'limited', // Financial compliance only
        reports: 'full', // Financial reports
        administration: 'none',
        preventive: 'tab_only',
        settings: 'limited'
      },

      // HR_MANAGER - HR-focused access
      hr_manager: {
        dashboard: 'limited',
        properties: 'none',
        work_orders: 'none',
        finance: 'limited', // HR budget only
        hr: 'full',
        crm: 'none',
        marketplace: 'none',
        support: 'limited', // HR tickets only
        compliance: 'limited', // HR compliance only
        reports: 'limited', // HR reports only
        administration: 'limited', // User management only
        preventive: 'none',
        settings: 'limited'
      },

      // ADMIN_OFFICER - Administrative access
      admin_officer: {
        dashboard: 'limited',
        properties: 'tab_only',
        work_orders: 'tab_only',
        finance: 'tab_only',
        hr: 'tab_only',
        crm: 'tab_only',
        marketplace: 'tab_only',
        support: 'limited',
        compliance: 'limited',
        reports: 'limited',
        administration: 'full',
        preventive: 'tab_only',
        settings: 'full'
      },

      // CRM_OFFICER - CRM-focused access
      crm_officer: {
        dashboard: 'limited',
        properties: 'tab_only', // Customer properties only
        work_orders: 'tab_only', // Customer service only
        finance: 'tab_only', // Customer billing only
        hr: 'none',
        crm: 'full',
        marketplace: 'limited', // Customer sourcing only
        support: 'limited', // Customer support only
        compliance: 'limited', // GDPR only
        reports: 'limited', // CRM reports only
        administration: 'none',
        preventive: 'none',
        settings: 'limited'
      },

      // TECHNICIAN - Field work access
      technician: {
        dashboard: 'limited',
        properties: 'tab_only', // Assigned properties only
        work_orders: 'limited', // Assigned work orders only
        finance: 'none',
        hr: 'none',
        crm: 'none',
        marketplace: 'none',
        support: 'limited', // Submit tickets only
        compliance: 'none',
        reports: 'none',
        administration: 'none',
        preventive: 'limited', // Assigned PM tasks only
        settings: 'limited'
      },

      // VENDOR - Vendor portal access
      vendor: {
        dashboard: 'limited',
        properties: 'none',
        work_orders: 'limited', // Assigned work only
        finance: 'limited', // Vendor payments only
        hr: 'none',
        crm: 'none',
        marketplace: 'limited', // Vendor functions only
        support: 'limited',
        compliance: 'tab_only',
        reports: 'limited', // Vendor performance only
        administration: 'none',
        preventive: 'none',
        settings: 'limited'
      },

      // TENANT - Tenant portal access
      tenant: {
        dashboard: 'limited',
        properties: 'tab_only', // Own unit only
        work_orders: 'limited', // Own requests only
        finance: 'limited', // Own payments only
        hr: 'none',
        crm: 'none',
        marketplace: 'none',
        support: 'limited',
        compliance: 'none',
        reports: 'none',
        administration: 'none',
        preventive: 'none',
        settings: 'limited'
      },

      // COMPLIANCE_LEGAL - Compliance-focused access
      compliance_legal: {
        dashboard: 'limited',
        properties: 'tab_only', // Compliance view only
        work_orders: 'tab_only', // Safety compliance only
        finance: 'tab_only', // Financial compliance only
        hr: 'tab_only', // HR compliance only
        crm: 'tab_only', // GDPR compliance only
        marketplace: 'tab_only', // Vendor compliance only
        support: 'limited',
        compliance: 'full',
        reports: 'limited', // Compliance reports only
        administration: 'tab_only',
        preventive: 'tab_only',
        settings: 'limited'
      },

      // SUPPORT_AGENT - Support-focused access
      support_agent: {
        dashboard: 'limited',
        properties: 'tab_only', // Support context only
        work_orders: 'tab_only', // Support tickets only
        finance: 'tab_only', // Billing support only
        hr: 'none',
        crm: 'limited', // Customer support only
        marketplace: 'tab_only', // Vendor support only
        support: 'full',
        compliance: 'none',
        reports: 'limited', // Support reports only
        administration: 'none',
        preventive: 'none',
        settings: 'limited'
      },

      // OWNER - Owner-specific access
      owner: {
        dashboard: 'full', // Owner dashboard
        properties: 'limited', // Owned properties only
        work_orders: 'limited', // Major approvals only
        finance: 'full', // Full financial access for owned properties
        hr: 'none',
        crm: 'none',
        marketplace: 'none',
        support: 'limited',
        compliance: 'tab_only',
        reports: 'full', // Owner reports
        administration: 'none',
        preventive: 'tab_only',
        settings: 'limited'
      }
    };
  }

  // Role-based Sidebar Generation
  generateSidebar(userRole, organizationId = null) {
    const roleConfig = this.roles[userRole.toUpperCase()];
    if (!roleConfig) {
      throw new Error(`Unknown role: ${userRole}`);
    }

    const sidebar = {
      role: userRole,
      sections: [],
      specialFeatures: []
    };

    // Main Navigation Section
    const mainNavigation = {
      title: 'Main Navigation',
      items: []
    };

    // Business Modules Section
    const businessModules = {
      title: 'Business Modules',
      items: []
    };

    // Administration Section
    const administration = {
      title: 'Administration',
      items: []
    };

    // Add modules based on role access
    Object.entries(this.roleModuleMatrix[userRole] || {}).forEach(([moduleId, access]) => {
      if (access === 'none') return;

      const module = this.modules[moduleId.toUpperCase()];
      if (!module) return;

      const sidebarItem = {
        id: moduleId,
        name: module.name,
        icon: module.icon,
        path: `/${moduleId.replace('_', '-')}`,
        access: access,
        badge: this.getModuleBadge(moduleId, userRole),
        tabs: access === 'full' ? module.tabs : this.getAccessibleTabs(module.tabs, access),
        mobileSupported: module.mobileSupport
      };

      // Categorize into appropriate section
      if (module.category === 'core') {
        mainNavigation.items.push(sidebarItem);
      } else if (module.category === 'system' || module.category === 'governance') {
        administration.items.push(sidebarItem);
      } else {
        businessModules.items.push(sidebarItem);
      }
    });

    // Add sections with items
    if (mainNavigation.items.length > 0) sidebar.sections.push(mainNavigation);
    if (businessModules.items.length > 0) sidebar.sections.push(businessModules);
    if (administration.items.length > 0) sidebar.sections.push(administration);

    // Add special features based on role
    sidebar.specialFeatures = this.getSpecialFeatures(userRole);

    return sidebar;
  }

  // Role-based Permission Checking
  hasPermission(userRole, permission, context = {}) {
    const roleConfig = this.roles[userRole.toUpperCase()];
    if (!roleConfig) return false;

    // Super admin has all permissions
    if (userRole === 'super_admin') return true;

    // Check specific permission patterns
    const [module, action] = permission.split('.');
    const moduleAccess = this.roleModuleMatrix[userRole]?.[module];

    if (!moduleAccess || moduleAccess === 'none') return false;

    // Full access grants all permissions for the module
    if (moduleAccess === 'full') return true;

    // Limited access - check specific permissions
    if (moduleAccess === 'limited') {
      return this.checkLimitedPermission(userRole, permission, context);
    }

    // Tab-only access - only read permissions
    if (moduleAccess === 'tab_only') {
      return action === 'read';
    }

    return false;
  }

  checkLimitedPermission(userRole, permission, context) {
    const limitedPermissions = {
      corporate_user: [
        'dashboard.read', 'properties.read', 'properties.create', 'work_orders.read', 
        'work_orders.create', 'reports.read', 'support.create'
      ],
      property_manager: [
        'dashboard.read', 'properties.read', 'properties.create', 'properties.update',
        'work_orders.read', 'work_orders.create', 'work_orders.update', 'work_orders.assign',
        'finance.read', 'crm.read', 'crm.create', 'marketplace.read', 'reports.read'
      ],
      finance_officer: [
        'finance.read', 'finance.create', 'finance.update', 'finance.approve_invoices',
        'finance.process_payments', 'finance.manage_budgets', 'finance.zatca_access',
        'reports.read', 'reports.create'
      ],
      // Add more limited permissions for other roles...
    };

    return limitedPermissions[userRole]?.includes(permission) || false;
  }

  // Module Access Validation
  canAccessModule(userRole, moduleId, context = {}) {
    const access = this.roleModuleMatrix[userRole]?.[moduleId];
    
    if (!access || access === 'none') return false;

    // Check subscription limits for corporate users
    if (userRole === 'corporate_user' && moduleId === 'properties') {
      const propertyCount = context.userPropertyCount || 0;
      const maxProperties = this.roles.CORPORATE_USER.maxProperties;
      return propertyCount < maxProperties;
    }

    // Check scope restrictions
    const roleConfig = this.roles[userRole.toUpperCase()];
    if (roleConfig.scope && !this.isWithinScope(roleConfig.scope, moduleId, context)) {
      return false;
    }

    return true;
  }

  isWithinScope(scope, moduleId, context) {
    switch (scope) {
      case 'global':
        return true;
      case 'organization':
        return context.organizationId === context.userOrganizationId;
      case 'properties':
        return ['properties', 'work_orders', 'tenants', 'preventive'].includes(moduleId);
      case 'finance':
        return ['finance', 'reports'].includes(moduleId);
      case 'hr':
        return ['hr', 'reports'].includes(moduleId);
      case 'owned_properties':
        return context.propertyOwnerId === context.userId;
      default:
        return true;
    }
  }

  // Utility Methods
  getModuleBadge(moduleId, userRole) {
    // Return notification counts or status badges
    const badges = {
      work_orders: { count: 8, color: 'red' },
      support: { count: 3, color: 'orange' },
      compliance: { status: 'alert', color: 'yellow' }
    };

    return badges[moduleId] || null;
  }

  getAccessibleTabs(allTabs, accessLevel) {
    if (accessLevel === 'full') return allTabs;
    if (accessLevel === 'tab_only') return [allTabs[0]]; // First tab only
    
    // Limited access gets most tabs except admin ones
    return allTabs.filter(tab => !['admin', 'settings', 'advanced'].includes(tab));
  }

  getSpecialFeatures(userRole) {
    const specialFeatures = {
      super_admin: ['organization_switch', 'system_monitor', 'global_settings'],
      corporate_admin: ['user_management', 'subscription_overview'],
      owner: ['switch_agent', 'export_statements', 'approval_workflow'],
      vendor: ['bid_notifications', 'performance_metrics'],
      tenant: ['service_requests', 'payment_portal']
    };

    return specialFeatures[userRole] || [];
  }

  // Role Hierarchy and Inheritance
  getRoleHierarchy() {
    return {
      super_admin: [],
      corporate_admin: ['corporate_user'],
      property_manager: ['technician'],
      finance_officer: [],
      hr_manager: [],
      admin_officer: [],
      crm_officer: [],
      technician: [],
      vendor: [],
      tenant: [],
      compliance_legal: [],
      support_agent: [],
      owner: []
    };
  }

  canAssumeRole(currentRole, targetRole) {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy[currentRole]?.includes(targetRole) || false;
  }

  // Dynamic Permission Evaluation
  evaluatePermission(userRole, permission, context = {}) {
    // Base permission check
    if (!this.hasPermission(userRole, permission, context)) {
      return { granted: false, reason: 'Insufficient permissions' };
    }

    // Additional context-based checks
    const [module, action] = permission.split('.');

    // Property-based restrictions
    if (module === 'properties' && context.propertyId) {
      if (!this.canAccessProperty(userRole, context.propertyId, context)) {
        return { granted: false, reason: 'Property access denied' };
      }
    }

    // Time-based restrictions (e.g., payroll only during payroll period)
    if (module === 'hr' && action === 'process_payroll') {
      if (!this.isPayrollPeriod()) {
        return { granted: false, reason: 'Outside payroll processing period' };
      }
    }

    // Approval workflow restrictions
    if (action === 'approve' && context.approvalRequired) {
      if (!this.canApprove(userRole, context.approvalAmount, context.approvalType)) {
        return { granted: false, reason: 'Approval authority exceeded' };
      }
    }

    return { granted: true };
  }

  canAccessProperty(userRole, propertyId, context) {
    // Implement property access logic based on role and ownership
    switch (userRole) {
      case 'owner':
        return context.ownedProperties?.includes(propertyId);
      case 'property_manager':
        return context.managedProperties?.includes(propertyId);
      case 'tenant':
        return context.tenantProperties?.includes(propertyId);
      default:
        return true; // Admin roles can access all
    }
  }

  canApprove(userRole, amount, approvalType) {
    const approvalLimits = {
      property_manager: { max: 10000, types: ['maintenance', 'supplies'] },
      finance_officer: { max: 50000, types: ['invoices', 'expenses', 'budgets'] },
      corporate_admin: { max: 100000, types: ['all'] },
      owner: { max: null, types: ['major_expenses', 'contracts'] }
    };

    const limit = approvalLimits[userRole];
    if (!limit) return false;

    if (limit.max && amount > limit.max) return false;
    if (!limit.types.includes('all') && !limit.types.includes(approvalType)) return false;

    return true;
  }

  isPayrollPeriod() {
    // Implement payroll period logic
    const now = new Date();
    const dayOfMonth = now.getDate();
    return dayOfMonth >= 25 || dayOfMonth <= 5; // Last 5 days of month + first 5 days
  }

  // Export for use in middleware and components
  getPermissionsForRole(userRole) {
    const roleAccess = this.roleModuleMatrix[userRole] || {};
    const permissions = [];

    Object.entries(roleAccess).forEach(([moduleId, access]) => {
      if (access !== 'none') {
        const modulePermissions = Object.keys(this.permissions).filter(perm => 
          perm.startsWith(`${moduleId}.`)
        );

        if (access === 'full') {
          permissions.push(...modulePermissions);
        } else if (access === 'limited') {
          permissions.push(...modulePermissions.filter(perm => 
            perm.endsWith('.read') || perm.endsWith('.create')
          ));
        } else if (access === 'tab_only') {
          permissions.push(...modulePermissions.filter(perm => perm.endsWith('.read')));
        }
      }
    });

    return permissions;
  }
}

module.exports = FixzitRBACSystem;