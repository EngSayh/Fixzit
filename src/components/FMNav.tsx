'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Building2, 
  DollarSign,
  Users, 
  Settings, 
  UserCheck, 
  ShoppingBag, 
  Headphones,
  Shield, 
  BarChart3, 
  Cog, 
  Wrench, 
  FileText, 
  Landmark
} from 'lucide-react';
import { useI18n } from '@/src/providers/RootProviders';

export default function FMNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  
  const navItems = [
    {
      title: t('nav.core', 'Core'),
      items: [
        { 
          href: '/fm/dashboard', 
          label: t('nav.dashboard', 'Dashboard'), 
          icon: LayoutDashboard 
        },
        { 
          href: '/fm/work-orders', 
          label: t('nav.workOrders', 'Work Orders'), 
          icon: ClipboardList,
          children: [
            { href: '/fm/work-orders/create', label: t('nav.create', 'Create') },
            { href: '/fm/work-orders/assign', label: t('nav.assignTrack', 'Assign & Track') },
            { href: '/fm/work-orders/pm', label: t('nav.preventive', 'Preventive'), icon: Wrench },
            { href: '/fm/work-orders/history', label: t('nav.serviceHistory', 'Service History') }
          ]
        },
        { 
          href: '/fm/properties', 
          label: t('nav.properties', 'Properties'), 
          icon: Building2,
          children: [
            { href: '/fm/properties/units', label: t('nav.unitsTenants', 'Units & Tenants') },
            { href: '/fm/properties/leases', label: t('nav.leaseManagement', 'Lease Management'), icon: Landmark },
            { href: '/fm/properties/inspections', label: t('nav.inspections', 'Inspections') },
            { href: '/fm/properties/documents', label: t('nav.documents', 'Documents'), icon: FileText }
          ]
        },
        { 
          href: '/fm/finance', 
          label: t('nav.finance', 'Finance'), 
          icon: DollarSign,
          children: [
            { href: '/fm/finance/invoices', label: t('nav.invoices', 'Invoices') },
            { href: '/fm/finance/payments', label: t('nav.payments', 'Payments') },
            { href: '/fm/finance/expenses', label: t('nav.expenses', 'Expenses') },
            { href: '/fm/finance/budgets', label: t('nav.budgets', 'Budgets') },
            { href: '/fm/finance/reports', label: t('nav.reports', 'Reports') }
          ]
        },
        { 
          href: '/fm/hr', 
          label: t('nav.hr', 'Human Resources'), 
          icon: Users 
        },
        { 
          href: '/fm/administration', 
          label: t('nav.administration', 'Administration'), 
          icon: Settings 
        }
      ]
    },
    {
      title: t('nav.business', 'Business'),
      items: [
        { 
          href: '/fm/crm', 
          label: t('nav.crm', 'CRM'), 
          icon: UserCheck 
        },
        { 
          href: '/fm/marketplace', 
          label: t('nav.marketplace', 'Marketplace'), 
          icon: ShoppingBag 
        },
        { 
          href: '/fm/support', 
          label: t('nav.support', 'Support'), 
          icon: Headphones 
        },
        { 
          href: '/fm/compliance', 
          label: t('nav.compliance', 'Compliance & Legal'), 
          icon: Shield 
        },
        { 
          href: '/fm/reports', 
          label: t('nav.reports', 'Reports & Analytics'), 
          icon: BarChart3 
        },
        { 
          href: '/fm/system', 
          label: t('nav.system', 'System Management'), 
          icon: Cog 
        }
      ]
    }
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside className="w-64 bg-[#023047] text-white h-[calc(100vh-56px)] overflow-y-auto">
      {navItems.map((section) => (
        <div key={section.title}>
          <div className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">
            {section.title}
          </div>
          <nav className="px-2">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      active 
                        ? 'bg-[#0061A8] text-white' 
                        : 'text-gray-300 hover:bg-[#0061A8]/50 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                  
                  {item.children && active && (
                    <div className="ms-8 mt-1 space-y-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = pathname === child.href;
                        
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                              childActive
                                ? 'bg-[#00A859]/20 text-[#00A859]'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            {ChildIcon && <ChildIcon className="h-4 w-4" />}
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      ))}
    </aside>
  );
}