'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useResponsiveLayout } from '@/contexts/ResponsiveContext';
import {
  LayoutDashboard, ClipboardList, Building2, DollarSign, Users, Settings, UserCheck,
  ShoppingBag, Headphones, Shield, BarChart3, Cog, Bell
} from 'lucide-react';

// Role-based module permissions
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    'dashboard', 'work-orders', 'properties', 'assets', 'tenants', 'vendors',
    'projects', 'rfqs', 'invoices', 'finance', 'hr', 'administration',
    'crm', 'marketplace', 'support', 'compliance', 'reports', 'system'
  ],
  CORPORATE_ADMIN: [
    'dashboard', 'work-orders', 'properties', 'assets', 'tenants', 'vendors',
    'projects', 'rfqs', 'invoices', 'finance', 'hr', 'crm', 'support', 'reports'
  ],
  FM_MANAGER: [
    'dashboard', 'work-orders', 'properties', 'assets', 'tenants', 'vendors',
    'projects', 'rfqs', 'invoices', 'finance', 'support'
  ],
  PROPERTY_MANAGER: [
    'dashboard', 'properties', 'tenants', 'maintenance', 'reports'
  ],
  TENANT: [
    'dashboard', 'properties', 'tenants', 'support'
  ],
  VENDOR: [
    'dashboard', 'marketplace', 'orders', 'support'
  ],
  SUPPORT: [
    'dashboard', 'support', 'tickets'
  ],
  AUDITOR: [
    'dashboard', 'compliance', 'reports', 'audit'
  ],
  PROCUREMENT: [
    'dashboard', 'vendors', 'rfqs', 'orders', 'procurement'
  ],
  EMPLOYEE: [
    'dashboard', 'hr', 'support'
  ],
  CUSTOMER: [
    'marketplace', 'orders', 'support'
  ]
};

// Subscription-based module access
const SUBSCRIPTION_PLANS = {
  BASIC: ['dashboard', 'properties', 'tenants', 'maintenance', 'support'],
  PROFESSIONAL: ['dashboard', 'work-orders', 'properties', 'assets', 'tenants', 'vendors', 'rfqs', 'invoices', 'finance', 'hr', 'crm', 'support', 'reports'],
  ENTERPRISE: ['dashboard', 'work-orders', 'properties', 'assets', 'tenants', 'vendors', 'projects', 'rfqs', 'invoices', 'finance', 'hr', 'crm', 'marketplace', 'support', 'compliance', 'reports', 'system', 'administration']
};

const MODULES = [
  { id:'dashboard',    name:'nav.dashboard',          icon:LayoutDashboard, path:'/fm/dashboard', category:'core' },
  { id:'work-orders',  name:'nav.work-orders',        icon:ClipboardList,   path:'/fm/work-orders', category:'fm' },
  { id:'properties',   name:'nav.properties',         icon:Building2,       path:'/fm/properties', category:'fm' },
  { id:'assets',       name:'nav.assets',             icon:Settings,        path:'/fm/assets', category:'fm' },
  { id:'tenants',      name:'nav.tenants',            icon:Users,           path:'/fm/tenants', category:'fm' },
  { id:'vendors',      name:'nav.vendors',            icon:ShoppingBag,     path:'/fm/vendors', category:'procurement' },
  { id:'projects',     name:'nav.projects',           icon:ClipboardList,   path:'/fm/projects', category:'fm' },
  { id:'rfqs',         name:'nav.rfqs',        icon:ClipboardList,   path:'/fm/rfqs', category:'procurement' },
  { id:'invoices',     name:'nav.invoices',           icon:DollarSign,      path:'/fm/invoices', category:'finance' },
  { id:'finance',      name:'nav.finance',            icon:DollarSign,      path:'/fm/finance', category:'finance' },
  { id:'hr',           name:'nav.hr',           icon:Users,           path:'/fm/hr', category:'hr' },
  { id:'crm',          name:'nav.crm',                icon:UserCheck,       path:'/fm/crm', category:'crm' },
  { id:'marketplace',  name:'nav.marketplace',        icon:ShoppingBag,     path:'/marketplace', category:'marketplace' },
  { id:'support',      name:'nav.support',      icon:Headphones,      path:'/fm/support', category:'support' },
  { id:'compliance',   name:'nav.compliance',   icon:Shield,          path:'/fm/compliance', category:'compliance' },
  { id:'reports',      name:'nav.reports',icon:BarChart3,       path:'/fm/reports', category:'reporting' },
  { id:'system',       name:'nav.system',  icon:Cog,             path:'/fm/system', category:'admin' },
  { id:'administration', name:'nav.administration', icon:Settings, path:'/fm/administration', category:'admin' },
  { id:'maintenance',  name:'nav.maintenance',        icon:Settings,        path:'/fm/maintenance', category:'fm' },
  { id:'orders',       name:'nav.orders',             icon:ClipboardList,   path:'/fm/orders', category:'procurement' }
];

// User account links
const USER_LINKS = [
  { id:'profile', name:'nav.profile', icon:UserCheck, path:'/profile' },
  { id:'settings', name:'nav.settings', icon:Settings, path:'/settings' },
  { id:'notifications', name:'nav.notifications', icon:Bell, path:'/notifications' }
];

const CATEGORY_FALLBACKS: Record<string, string> = {
  core: 'Core',
  fm: 'Facility Management',
  procurement: 'Procurement',
  finance: 'Finance',
  hr: 'Human Resources',
  crm: 'Customer Relations',
  marketplace: 'Marketplace',
  support: 'Support',
  compliance: 'Compliance',
  reporting: 'Reporting',
  admin: 'Administration'
};

interface SidebarProps {
  role?: string;
  subscription?: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  tenantId?: string;
}

export default function Sidebar({ role = 'guest', subscription = 'BASIC', tenantId: _tenantId }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { responsiveClasses: _responsiveClasses, screenInfo } = useResponsiveLayout();

  // Call useTranslation unconditionally at top level (React Rules of Hooks)
  const translationContext = useTranslation();
  const t = translationContext?.t ?? ((key: string, fallback?: string) => fallback || key);
  const translationIsRTL = translationContext?.isRTL ?? false;

  const active = useMemo(() => pathname, [pathname]);

  // Check authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        setIsAuthenticated(response.ok);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // Get allowed modules based on role and subscription
  const getAllowedModules = (userRole: string, userSubscription: string) => {
    const roleModules = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
    const subscriptionModules = SUBSCRIPTION_PLANS[userSubscription as keyof typeof SUBSCRIPTION_PLANS] || [];

    // Intersection of role and subscription permissions
    return MODULES.filter(module => {
      return roleModules.includes(module.id) && subscriptionModules.includes(module.id);
    });
  };

  const allowedModules = getAllowedModules(role, subscription);

  // Group modules by category for better organization
  const groupedModules = allowedModules.reduce((acc, module) => {
    const category = module.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(module);
    return acc;
  }, {} as Record<string, typeof MODULES>);

  const getCategoryName = (category: string) => t(`sidebar.category.${category}`, CATEGORY_FALLBACKS[category] || category);

  return (
            <aside className={`${screenInfo.isMobile || screenInfo.isTablet ? `fixed inset-y-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${translationIsRTL ? 'right-0' : 'left-0'}` : 'sticky top-14 w-64 h-[calc(100vh-3.5rem)]'} bg-[#0061A8] text-white overflow-y-auto shadow-lg border-[#0061A8]/20 ${translationIsRTL ? 'border-l' : 'border-r'}`} style={{ backgroundColor: '#0061A8' }}>{/* FIXED: was #023047 (banned) */}
      <div className={`${screenInfo.isMobile ? 'p-3' : 'p-4'}`}>
        <div className={`font-bold text-lg mb-6 text-white ${translationIsRTL ? 'text-right' : ''}`}>{t('common.brand', 'Fixzit Enterprise')}</div>

        {/* Role and Subscription Info */}
        {role !== 'guest' && (
          <div className="mb-4 p-3 bg-[#0061A8] rounded-lg">
            <div className={`text-xs text-white/80 mb-1 ${translationIsRTL ? 'text-right' : ''}`}>{t('sidebar.role', 'Role')}</div>
            <div className={`text-sm font-medium text-white ${translationIsRTL ? 'text-right' : ''}`}>{role.replace(/_/g, ' ')}</div>
            <div className={`text-xs text-white/80 mt-1 ${translationIsRTL ? 'text-right' : ''}`}>
              {t('sidebar.planLabel', 'Plan')}: {subscription}
            </div>
          </div>
        )}

        {/* Main Modules grouped by category */}
        <nav className="space-y-6 mb-8">
          {Object.entries(groupedModules).map(([category, modules]) => (
            <div key={category}>
              <div className="text-xs font-medium text-gray-400 mb-2 px-3 uppercase tracking-wider">
                {getCategoryName(category)}
              </div>
              <div className="space-y-1">
                {modules.map(m => {
                  const Icon = m.icon;
                  const isActive = active === m.path || active?.startsWith(m.path + '/');
                  return (
                        <button
                          key={m.id}
                          onClick={() => router.push(m.path)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200
                                         ${isActive
                                           ? 'bg-[#0061A8] text-white shadow-md'
                                           : 'text-gray-300 hover:bg-white/10 hover:text-white hover:translate-x-1'} ${translationIsRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm font-medium">{t(m.name, m.name.replace('nav.', ''))}</span>
                          {isActive && <div className={`${translationIsRTL ? 'mr-auto' : 'ml-auto'} w-2 h-2 bg-white rounded-full`}></div>}
                        </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Account Links */}
        <div className="border-t border-white/20 pt-4">
          <div className={`text-xs font-medium text-gray-400 mb-3 px-3 uppercase tracking-wider ${translationIsRTL ? 'text-right' : ''}`}>{t('sidebar.account', 'Account')}</div>
          <nav className="space-y-1">
            {USER_LINKS.map(link => {
              const Icon = link.icon;
              const isActive = active === link.path || active?.startsWith(link.path + '/');
              return (
                <button
                  key={link.id}
                  onClick={() => router.push(link.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200
                             ${isActive
                               ? 'bg-[#0061A8] text-white shadow-md'
                               : 'text-gray-300 hover:bg-white/10 hover:text-white hover:translate-x-1'} ${translationIsRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{t(link.name, link.name.replace('nav.', ''))}</span>
                  {isActive && <div className={`${translationIsRTL ? 'mr-auto' : 'ml-auto'} w-2 h-2 bg-white rounded-full`}></div>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Help & Support - Only for authenticated users */}
        {isAuthenticated && (
          <div className="border-t border-white/20 pt-4 mt-4">
            <div className={`text-xs font-medium text-gray-400 mb-3 px-3 uppercase tracking-wider ${translationIsRTL ? 'text-right' : ''}`}>{t('sidebar.help', 'Help')}</div>
            <button
              onClick={() => router.push('/help')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-gray-300 hover:bg-white/10 hover:text-white hover:translate-x-1 ${translationIsRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
            >
              <Headphones className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{t('sidebar.helpCenter', 'Help Center')}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
