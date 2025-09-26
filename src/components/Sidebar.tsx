'use client&apos;;
import { usePathname, useRouter } from &apos;next/navigation&apos;;
import { useMemo } from &apos;react&apos;;
import { useTranslation } from &apos;@/src/contexts/TranslationContext&apos;;
import { useResponsive } from &apos;@/src/contexts/ResponsiveContext&apos;;
import LanguageSelector from &apos;@/src/components/i18n/LanguageSelector&apos;;
import CurrencySelector from &apos;@/src/components/i18n/CurrencySelector&apos;;
import {
  LayoutDashboard, ClipboardList, Building2, DollarSign, Users, Settings, UserCheck,
  ShoppingBag, Headphones, Shield, BarChart3, Cog, FileText, CheckCircle, Bell
} from &apos;lucide-react&apos;;

// Role-based module permissions
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    &apos;dashboard&apos;, &apos;work-orders&apos;, &apos;properties&apos;, &apos;assets&apos;, &apos;tenants&apos;, &apos;vendors&apos;,
    &apos;projects&apos;, &apos;rfqs&apos;, &apos;invoices&apos;, &apos;finance&apos;, &apos;hr&apos;, &apos;administration&apos;,
    &apos;crm&apos;, &apos;marketplace&apos;, 'support&apos;, &apos;compliance&apos;, &apos;reports&apos;, 'system&apos;
  ],
  CORPORATE_ADMIN: [
    &apos;dashboard&apos;, &apos;work-orders&apos;, &apos;properties&apos;, &apos;assets&apos;, &apos;tenants&apos;, &apos;vendors&apos;,
    &apos;projects&apos;, &apos;rfqs&apos;, &apos;invoices&apos;, &apos;finance&apos;, &apos;hr&apos;, &apos;crm&apos;, 'support&apos;, &apos;reports&apos;
  ],
  FM_MANAGER: [
    &apos;dashboard&apos;, &apos;work-orders&apos;, &apos;properties&apos;, &apos;assets&apos;, &apos;tenants&apos;, &apos;vendors&apos;,
    &apos;projects&apos;, &apos;rfqs&apos;, &apos;invoices&apos;, &apos;finance&apos;, 'support&apos;
  ],
  PROPERTY_MANAGER: [
    &apos;dashboard&apos;, &apos;properties&apos;, &apos;tenants&apos;, &apos;maintenance&apos;, &apos;reports&apos;
  ],
  TENANT: [
    &apos;dashboard&apos;, &apos;properties&apos;, &apos;tenants&apos;, 'support&apos;
  ],
  VENDOR: [
    &apos;dashboard&apos;, &apos;marketplace&apos;, &apos;orders&apos;, 'support&apos;
  ],
  SUPPORT: [
    &apos;dashboard&apos;, 'support&apos;, &apos;tickets&apos;
  ],
  AUDITOR: [
    &apos;dashboard&apos;, &apos;compliance&apos;, &apos;reports&apos;, &apos;audit&apos;
  ],
  PROCUREMENT: [
    &apos;dashboard&apos;, &apos;vendors&apos;, &apos;rfqs&apos;, &apos;orders&apos;, &apos;procurement&apos;
  ],
  EMPLOYEE: [
    &apos;dashboard&apos;, &apos;hr&apos;, 'support&apos;
  ],
  CUSTOMER: [
    &apos;marketplace&apos;, &apos;orders&apos;, 'support&apos;
  ]
};

// Subscription-based module access
const SUBSCRIPTION_PLANS = {
  BASIC: [&apos;dashboard&apos;, &apos;properties&apos;, &apos;tenants&apos;, &apos;maintenance&apos;, 'support&apos;],
  PROFESSIONAL: [&apos;dashboard&apos;, &apos;work-orders&apos;, &apos;properties&apos;, &apos;assets&apos;, &apos;tenants&apos;, &apos;vendors&apos;, &apos;rfqs&apos;, &apos;invoices&apos;, &apos;finance&apos;, &apos;hr&apos;, &apos;crm&apos;, 'support&apos;, &apos;reports&apos;],
  ENTERPRISE: [&apos;dashboard&apos;, &apos;work-orders&apos;, &apos;properties&apos;, &apos;assets&apos;, &apos;tenants&apos;, &apos;vendors&apos;, &apos;projects&apos;, &apos;rfqs&apos;, &apos;invoices&apos;, &apos;finance&apos;, &apos;hr&apos;, &apos;crm&apos;, &apos;marketplace&apos;, 'support&apos;, &apos;compliance&apos;, &apos;reports&apos;, 'system&apos;, &apos;administration&apos;]
};

const MODULES = [
  { id:&apos;dashboard&apos;,    name:&apos;nav.dashboard&apos;,          icon:LayoutDashboard, path:&apos;/fm/dashboard&apos;, category:&apos;core&apos; },
  { id:&apos;work-orders&apos;,  name:&apos;nav.work-orders&apos;,        icon:ClipboardList,   path:&apos;/fm/work-orders&apos;, category:&apos;fm&apos; },
  { id:&apos;properties&apos;,   name:&apos;nav.properties&apos;,         icon:Building2,       path:&apos;/fm/properties&apos;, category:&apos;fm&apos; },
  { id:&apos;assets&apos;,       name:&apos;nav.assets&apos;,             icon:Settings,        path:&apos;/fm/assets&apos;, category:&apos;fm&apos; },
  { id:&apos;tenants&apos;,      name:&apos;nav.tenants&apos;,            icon:Users,           path:&apos;/fm/tenants&apos;, category:&apos;fm&apos; },
  { id:&apos;vendors&apos;,      name:&apos;nav.vendors&apos;,            icon:ShoppingBag,     path:&apos;/fm/vendors&apos;, category:&apos;procurement&apos; },
  { id:&apos;projects&apos;,     name:&apos;nav.projects&apos;,           icon:ClipboardList,   path:&apos;/fm/projects&apos;, category:&apos;fm&apos; },
  { id:&apos;rfqs&apos;,         name:&apos;nav.rfqs&apos;,        icon:ClipboardList,   path:&apos;/fm/rfqs&apos;, category:&apos;procurement&apos; },
  { id:&apos;invoices&apos;,     name:&apos;nav.invoices&apos;,           icon:DollarSign,      path:&apos;/fm/invoices&apos;, category:&apos;finance&apos; },
  { id:&apos;finance&apos;,      name:&apos;nav.finance&apos;,            icon:DollarSign,      path:&apos;/fm/finance&apos;, category:&apos;finance&apos; },
  { id:&apos;hr&apos;,           name:&apos;nav.hr&apos;,           icon:Users,           path:&apos;/fm/hr&apos;, category:&apos;hr&apos; },
  { id:&apos;crm&apos;,          name:&apos;nav.crm&apos;,                icon:UserCheck,       path:&apos;/fm/crm&apos;, category:&apos;crm&apos; },
  { id:&apos;marketplace&apos;,  name:&apos;nav.marketplace&apos;,        icon:ShoppingBag,     path:&apos;/marketplace&apos;, category:&apos;marketplace&apos; },
  { id:'support&apos;,      name:&apos;nav.support&apos;,      icon:Headphones,      path:&apos;/fm/support&apos;, category:'support&apos; },
  { id:&apos;compliance&apos;,   name:&apos;nav.compliance&apos;,   icon:Shield,          path:&apos;/fm/compliance&apos;, category:&apos;compliance&apos; },
  { id:&apos;reports&apos;,      name:&apos;nav.reports&apos;,icon:BarChart3,       path:&apos;/fm/reports&apos;, category:&apos;reporting&apos; },
  { id:'system&apos;,       name:&apos;nav.system&apos;,  icon:Cog,             path:&apos;/fm/system&apos;, category:&apos;admin&apos; },
  { id:&apos;maintenance&apos;,  name:&apos;nav.maintenance&apos;,        icon:Settings,        path:&apos;/fm/maintenance&apos;, category:&apos;fm&apos; },
  { id:&apos;orders&apos;,       name:&apos;nav.orders&apos;,             icon:ClipboardList,   path:&apos;/fm/orders&apos;, category:&apos;procurement&apos; }
];

// User account links
const USER_LINKS = [
  { id:&apos;profile&apos;, name:&apos;nav.profile&apos;, icon:UserCheck, path:&apos;/profile&apos; },
  { id:'settings&apos;, name:&apos;nav.settings&apos;, icon:Settings, path:&apos;/settings&apos; },
  { id:&apos;notifications&apos;, name:&apos;nav.notifications&apos;, icon:Bell, path:&apos;/notifications&apos; }
];

interface SidebarProps {
  role?: string;
  subscription?: &apos;BASIC&apos; | &apos;PROFESSIONAL&apos; | &apos;ENTERPRISE&apos;;
  tenantId?: string;
}

export default function Sidebar({ role = &apos;guest&apos;, subscription = &apos;BASIC&apos;, tenantId }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { responsiveClasses, screenInfo } = useResponsive();

  // Safe translation with fallback
  let t: (key: string, fallback?: string) => string;
  let translationIsRTL: boolean = false;
  try {
    const translationContext = useTranslation();
    t = translationContext.t;
    translationIsRTL = translationContext.isRTL;
  } catch {
    // Fallback translation function
    t = (key: string, fallback?: string) => fallback || key;
    translationIsRTL = false;
  }

  const active = useMemo(() => pathname, [pathname]);

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

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      core: &apos;Core&apos;,
      fm: &apos;Facility Management&apos;,
      procurement: &apos;Procurement&apos;,
      finance: &apos;Finance&apos;,
      hr: &apos;Human Resources&apos;,
      crm: &apos;Customer Relations&apos;,
      marketplace: &apos;Marketplace&apos;,
      support: &apos;Support&apos;,
      compliance: &apos;Compliance&apos;,
      reporting: &apos;Reporting&apos;,
      admin: &apos;Administration&apos;
    };
    return names[category] || category;
  };

  return (
            <aside className={`${screenInfo.isMobile || screenInfo.isTablet ? `fixed inset-y-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${translationIsRTL ? &apos;right-0&apos; : &apos;left-0&apos;}` : &apos;w-64&apos;} bg-[#023047] text-white h-screen overflow-y-auto shadow-lg border-r border-[#0061A8]/20 ${translationIsRTL ? &apos;border-l&apos; : &apos;border-r&apos;}`} style={{ backgroundColor: &apos;#023047&apos; }}>
      <div className={`${screenInfo.isMobile ? &apos;p-3&apos; : &apos;p-4&apos;}`}>
        <div className="font-bold text-lg mb-6 text-white">Fixzit Enterprise</div>

        {/* Role and Subscription Info */}
        {role !== &apos;guest&apos; && (
          <div className="mb-4 p-3 bg-[#0061A8] rounded-lg">
            <div className="text-xs text-white/80 mb-1">Role</div>
            <div className="text-sm font-medium text-white">{role.replace(&apos;_', &apos; ')}</div>
            <div className="text-xs text-white/80 mt-1">Plan: {subscription}</div>
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
                  const isActive = active === m.path || active?.startsWith(m.path + &apos;/');
                  return (
                        <button
                          key={m.id}
                          onClick={() => router.push(m.path)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200
                                         ${isActive
                                           ? &apos;bg-[#0061A8] text-white shadow-md&apos;
                                           : &apos;text-gray-300 hover:bg-white/10 hover:text-white hover:translate-x-1&apos;} ${translationIsRTL ? &apos;flex-row-reverse text-right&apos; : &apos;text-left&apos;}`}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm font-medium">{t(m.name, m.name.replace(&apos;nav.&apos;, &apos;'))}</span>
                          {isActive && <div className={`${translationIsRTL ? &apos;mr-auto&apos; : &apos;ml-auto&apos;} w-2 h-2 bg-white rounded-full`}></div>}
                        </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Account Links */}
        <div className="border-t border-white/20 pt-4">
          <div className="text-xs font-medium text-gray-400 mb-3 px-3 uppercase tracking-wider">Account</div>
          <nav className="space-y-1">
            {USER_LINKS.map(link => {
              const Icon = link.icon;
              const isActive = active === link.path || active?.startsWith(link.path + &apos;/');
              return (
                <button
                  key={link.id}
                  onClick={() => router.push(link.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-all duration-200
                             ${isActive
                               ? &apos;bg-[#0061A8] text-white shadow-md&apos;
                               : &apos;text-gray-300 hover:bg-white/10 hover:text-white hover:translate-x-1&apos;}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{t(link.name, link.name.replace(&apos;nav.&apos;, &apos;'))}</span>
                  {isActive && <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/20 pt-4 mt-4">
          <div className={`text-xs font-medium text-gray-400 mb-3 px-3 uppercase tracking-wider ${translationIsRTL ? &apos;text-right&apos; : &apos;'}`}>
            Preferences
          </div>
          <div className={`flex gap-2 px-3 ${translationIsRTL ? &apos;flex-row-reverse&apos; : &apos;'}`}>
            <LanguageSelector variant="compact" />
            <CurrencySelector variant="compact" />
          </div>
        </div>

        {/* Help & Support */}
        <div className="border-t border-white/20 pt-4 mt-4">
          <div className="text-xs font-medium text-gray-400 mb-3 px-3 uppercase tracking-wider">Help</div>
          <button
            onClick={() => router.push(&apos;/help&apos;)}
            className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-all duration-200 text-gray-300 hover:bg-white/10 hover:text-white hover:translate-x-1"
          >
            <Headphones className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Help Center</span>
          </button>
        </div>
      </div>
    </aside>
  );
}