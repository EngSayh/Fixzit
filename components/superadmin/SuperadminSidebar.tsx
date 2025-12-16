"use client";

/**
 * Superadmin Sidebar Navigation
 * Complete control center navigation for all superadmin modules
 * 
 * @module components/superadmin/SuperadminSidebar
 */

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import {
  Bug,
  Users,
  Building2,
  Shield,
  FileText,
  Settings,
  Zap,
  Database,
  Globe,
  CreditCard,
  Languages,
  Activity,
  BarChart3,
  Lock,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: typeof Bug;
  labelKey: string;
  badge?: string;
}

const SUPERADMIN_NAV_ITEMS: NavItem[] = [
  {
    href: "/superadmin/issues",
    icon: Bug,
    labelKey: "superadmin.nav.issues",
  },
  {
    href: "/superadmin/tenants",
    icon: Building2,
    labelKey: "superadmin.nav.tenants",
  },
  {
    href: "/superadmin/users",
    icon: Users,
    labelKey: "superadmin.nav.users",
  },
  {
    href: "/superadmin/roles",
    icon: Shield,
    labelKey: "superadmin.nav.roles",
  },
  {
    href: "/superadmin/audit",
    icon: FileText,
    labelKey: "superadmin.nav.audit",
  },
  {
    href: "/superadmin/features",
    icon: Zap,
    labelKey: "superadmin.nav.features",
  },
  {
    href: "/superadmin/integrations",
    icon: Globe,
    labelKey: "superadmin.nav.integrations",
  },
  {
    href: "/superadmin/jobs",
    icon: Activity,
    labelKey: "superadmin.nav.jobs",
  },
  {
    href: "/superadmin/system",
    icon: Settings,
    labelKey: "superadmin.nav.system",
  },
  {
    href: "/superadmin/billing",
    icon: CreditCard,
    labelKey: "superadmin.nav.billing",
  },
  {
    href: "/superadmin/translations",
    icon: Languages,
    labelKey: "superadmin.nav.translations",
  },
  {
    href: "/superadmin/database",
    icon: Database,
    labelKey: "superadmin.nav.database",
  },
  {
    href: "/superadmin/security",
    icon: Lock,
    labelKey: "superadmin.nav.security",
  },
  {
    href: "/superadmin/analytics",
    icon: BarChart3,
    labelKey: "superadmin.nav.analytics",
  },
  {
    href: "/superadmin/notifications",
    icon: Bell,
    labelKey: "superadmin.nav.notifications",
  },
];

export function SuperadminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-500" />
          <div>
            <h2 className="text-white font-bold text-lg">
              {t("superadmin.title")}
            </h2>
            <p className="text-slate-400 text-xs">
              {t("superadmin.controlCenter")}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {SUPERADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const label = t(item.labelKey);

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{label}</span>
              {item.badge && (
                <span className="ms-auto bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800">
        <p className="text-xs text-slate-400 text-center">
          Fixzit Superadmin v2.0
        </p>
      </div>
    </aside>
  );
}
