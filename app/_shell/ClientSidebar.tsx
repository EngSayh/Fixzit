'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Wallet,
  Users,
  Shield,
  Building2,
  UserCog,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  ShoppingBag,
  Briefcase,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================
// TYPES
// ==========================================

type UserRole = 'super_admin' | 'fm_admin' | 'vendor' | 'tenant' | 'guest';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  roles: UserRole[]; // Who can see this item
}

interface CounterData {
  workOrders?: { open: number; overdue: number };
  invoices?: { unpaid: number; overdue: number };
  employees?: { total: number; onLeave: number };
  properties?: { total: number; vacant: number };
  customers?: { leads: number; active: number };
  support?: { open: number; pending: number };
  marketplace?: { listings: number; orders: number };
  system?: { users: number; tenants: number };
}

// ==========================================
// NAVIGATION ITEMS (ROLE-BASED)
// ==========================================

const navigationItems: NavItem[] = [
  // Super Admin Only
  {
    label: 'System Admin',
    href: '/dashboard/system',
    icon: Shield,
    roles: ['super_admin'],
  },

  // FM Admin + Super Admin
  {
    label: 'Finance',
    href: '/dashboard/finance',
    icon: Wallet,
    roles: ['super_admin', 'fm_admin'],
  },
  {
    label: 'Human Resources',
    href: '/dashboard/hr',
    icon: Users,
    roles: ['super_admin', 'fm_admin'],
  },
  {
    label: 'Admin & Operations',
    href: '/dashboard/admin',
    icon: Briefcase,
    roles: ['super_admin', 'fm_admin'],
  },
  {
    label: 'Properties',
    href: '/dashboard/properties',
    icon: Building2,
    roles: ['super_admin', 'fm_admin'],
  },
  {
    label: 'CRM',
    href: '/dashboard/crm',
    icon: UserCog,
    roles: ['super_admin', 'fm_admin'],
  },
  {
    label: 'Marketplace',
    href: '/dashboard/marketplace',
    icon: ShoppingBag,
    roles: ['super_admin', 'fm_admin'],
  },
  {
    label: 'Support',
    href: '/dashboard/support',
    icon: MessageSquare,
    roles: ['super_admin', 'fm_admin'],
  },
  {
    label: 'Compliance',
    href: '/dashboard/compliance',
    icon: FileText,
    roles: ['super_admin', 'fm_admin'],
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: ['super_admin', 'fm_admin'],
  },

  // Vendor Portal
  {
    label: 'Vendor Portal',
    href: '/dashboard/vendor',
    icon: ShoppingBag,
    roles: ['vendor'],
  },

  // Tenant Portal
  {
    label: 'My Dashboard',
    href: '/dashboard/tenant',
    icon: LayoutDashboard,
    roles: ['tenant'],
  },
  {
    label: 'My Requests',
    href: '/dashboard/tenant/requests',
    icon: MessageSquare,
    roles: ['tenant'],
  },

  // All authenticated users
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['super_admin', 'fm_admin', 'vendor', 'tenant'],
  },
];

// ==========================================
// CLIENT SIDEBAR COMPONENT
// ==========================================

export default function ClientSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [counters, setCounters] = useState<CounterData>({});
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark";
  });

  // Extract user role from session
  const userRole: UserRole = (session?.user as { role?: string })?.role as UserRole || 'guest';

  // Persist theme to localStorage and apply to document
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Fetch live counters from API
  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    const fetchCounters = async () => {
      try {
        const response = await fetch('/api/counters', {
          signal: abortController.signal,
        });
        
        // Handle auth errors explicitly
        if (response.status === 401 || response.status === 403) {
          // Session expired or lacks permission - redirect to login
          if (mounted && typeof window !== 'undefined') {
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
          }
          return;
        }
        
        if (!response.ok) throw new Error('Failed to fetch counters');
        
        const data = await response.json();
        if (mounted) {
          setCounters(data);
          setLoading(false);
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') return;
        
        if (mounted) {
          console.error('Failed to load sidebar counters:', error);
          setLoading(false);
        }
      }
    };

    fetchCounters();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchCounters, 30000);

    return () => {
      mounted = false;
      abortController.abort();
      clearInterval(interval);
    };
  }, []);

  // Filter navigation items based on user role
  const visibleItems = navigationItems.filter(item => 
    item.roles.includes(userRole)
  );

  // Get badge count for specific routes
  const getBadgeCount = (href: string): number | undefined => {
    if (loading) return undefined;

    switch (href) {
      case '/dashboard/finance':
        return counters.invoices?.unpaid;
      case '/dashboard/hr':
        return counters.employees?.onLeave;
      case '/dashboard/crm':
        return counters.customers?.leads;
      case '/dashboard/support':
        return counters.support?.open;
      case '/dashboard/marketplace':
        return counters.marketplace?.orders;
      case '/dashboard/system':
        return counters.system?.users;
      default:
        return undefined;
    }
  };

  return (
    <nav className="flex flex-col h-full p-4 space-y-2">
      {/* Logo/Brand */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground">Fixzit Dashboard</h2>
        <p className="text-xs text-muted-foreground">
          {userRole === 'super_admin' && 'Super Admin'}
          {userRole === 'fm_admin' && 'FM Admin'}
          {userRole === 'vendor' && 'Vendor'}
          {userRole === 'tenant' && 'Tenant'}
        </p>
      </div>

      {/* Navigation Items */}
      <ul className="flex-1 space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const badge = getBadgeCount(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg transition-colors group',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>

                {/* Badge */}
                {badge !== undefined && badge > 0 && (
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-semibold rounded-full',
                      isActive
                        ? 'bg-primary-foreground text-primary'
                        : 'bg-destructive text-destructive-foreground'
                    )}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs text-muted-foreground">Theme</span>
          <button
            onClick={() => setIsDark((d) => !d)}
            className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-accent transition-colors"
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Fixzit © {new Date().getFullYear()}
        </p>
      </div>
    </nav>
  );
}
