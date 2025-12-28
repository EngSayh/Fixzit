"use client";

/**
 * Superadmin Sidebar Navigation
 * Complete control center navigation with collapsible groups
 * 
 * @module components/superadmin/SuperadminSidebar
 */

import { useState } from "react";
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
  ScrollText,
  Package,
  UserCheck,
  Upload,
  PieChart,
  Headphones,
  Store,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  href: string;
  icon: typeof Bug;
  labelKey: string;
  badge?: string;
}

interface NavGroup {
  id: string;
  labelKey: string;
  icon: typeof Bug;
  items: NavItem[];
}

// Grouped navigation structure
const SUPERADMIN_NAV_GROUPS: NavGroup[] = [
  {
    id: "ssot",
    labelKey: "superadmin.groups.ssot",
    icon: ScrollText,
    items: [
      { href: "/superadmin/issues", icon: Bug, labelKey: "superadmin.nav.issues" },
      { href: "/superadmin/ssot", icon: ScrollText, labelKey: "superadmin.nav.ssot" },
    ],
  },
  {
    id: "organization",
    labelKey: "superadmin.groups.organization",
    icon: Building2,
    items: [
      { href: "/superadmin/tenants", icon: Building2, labelKey: "superadmin.nav.tenants" },
      { href: "/superadmin/users", icon: Users, labelKey: "superadmin.nav.users" },
      { href: "/superadmin/roles", icon: Shield, labelKey: "superadmin.nav.roles" },
      { href: "/superadmin/impersonate", icon: UserCheck, labelKey: "superadmin.nav.impersonate" },
    ],
  },
  {
    id: "marketplace",
    labelKey: "superadmin.groups.marketplace",
    icon: Store,
    items: [
      { href: "/superadmin/vendors", icon: Store, labelKey: "superadmin.nav.vendors" },
      { href: "/superadmin/catalog", icon: Package, labelKey: "superadmin.nav.catalog" },
    ],
  },
  {
    id: "system",
    labelKey: "superadmin.groups.system",
    icon: Settings,
    items: [
      { href: "/superadmin/system", icon: Settings, labelKey: "superadmin.nav.system" },
      { href: "/superadmin/features", icon: Zap, labelKey: "superadmin.nav.features" },
      { href: "/superadmin/integrations", icon: Globe, labelKey: "superadmin.nav.integrations" },
      { href: "/superadmin/jobs", icon: Activity, labelKey: "superadmin.nav.jobs" },
    ],
  },
  {
    id: "data",
    labelKey: "superadmin.groups.data",
    icon: Database,
    items: [
      { href: "/superadmin/database", icon: Database, labelKey: "superadmin.nav.database" },
      { href: "/superadmin/import-export", icon: Upload, labelKey: "superadmin.nav.importExport" },
      { href: "/superadmin/translations", icon: Languages, labelKey: "superadmin.nav.translations" },
    ],
  },
  {
    id: "security",
    labelKey: "superadmin.groups.security",
    icon: Lock,
    items: [
      { href: "/superadmin/security", icon: Lock, labelKey: "superadmin.nav.security" },
      { href: "/superadmin/audit", icon: FileText, labelKey: "superadmin.nav.audit" },
    ],
  },
  {
    id: "finance",
    labelKey: "superadmin.groups.finance",
    icon: CreditCard,
    items: [
      { href: "/superadmin/billing", icon: CreditCard, labelKey: "superadmin.nav.billing" },
      { href: "/superadmin/reports", icon: PieChart, labelKey: "superadmin.nav.reports" },
      { href: "/superadmin/analytics", icon: BarChart3, labelKey: "superadmin.nav.analytics" },
    ],
  },
  {
    id: "communication",
    labelKey: "superadmin.groups.communication",
    icon: Bell,
    items: [
      { href: "/superadmin/notifications", icon: Bell, labelKey: "superadmin.nav.notifications" },
      { href: "/superadmin/support", icon: Headphones, labelKey: "superadmin.nav.support" },
    ],
  },
];

interface SuperadminSidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function SuperadminSidebar({ collapsed: controlledCollapsed, onCollapsedChange }: SuperadminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  
  // Internal collapsed state (if not controlled)
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  
  // Track expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Auto-expand the group containing the current route
    const activeGroup = SUPERADMIN_NAV_GROUPS.find(g => 
      g.items.some(item => pathname === item.href)
    );
    return new Set(activeGroup ? [activeGroup.id] : ["ssot", "organization"]);
  });

  const toggleCollapsed = () => {
    const newValue = !collapsed;
    if (onCollapsedChange) {
      onCollapsedChange(newValue);
    } else {
      setInternalCollapsed(newValue);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => pathname === item.href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={cn(
          "bg-slate-900 border-e border-slate-800 flex flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo/Header */}
        <div className={cn(
          "border-b border-slate-800 flex items-center",
          collapsed ? "p-3 justify-center" : "p-4"
        )}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  type="button"
                  onClick={() => router.push("/superadmin")}
                  className="p-2 rounded-lg hover:bg-slate-800"
                >
                  <Shield className="h-6 w-6 text-blue-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                {t("superadmin.title")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3 flex-1">
              <Shield className="h-7 w-7 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-white font-bold text-base truncate">
                  {t("superadmin.title")}
                </h2>
                <p className="text-slate-400 text-xs truncate">
                  {t("superadmin.controlCenter")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {SUPERADMIN_NAV_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = expandedGroups.has(group.id);
            const groupActive = isGroupActive(group);

            return (
              <div key={group.id} className="space-y-0.5">
                {/* Group Header */}
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          const firstItem = group.items[0];
                          if (firstItem) router.push(firstItem.href);
                        }}
                        className={cn(
                          "w-full flex items-center justify-center p-3 rounded-lg transition-colors",
                          groupActive
                            ? "bg-blue-600/20 text-blue-400"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        )}
                      >
                        <GroupIcon className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                      <div className="space-y-1">
                        <p className="font-medium">{t(group.labelKey, group.id)}</p>
                        <div className="text-xs text-slate-400">
                          {group.items.map(item => t(item.labelKey)).join(", ")}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      groupActive
                        ? "bg-slate-800/50 text-white"
                        : "text-slate-400 hover:bg-slate-800/30 hover:text-slate-300"
                    )}
                  >
                    <GroupIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-start truncate">
                      {t(group.labelKey, group.id)}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                    )}
                  </button>
                )}

                {/* Group Items */}
                {!collapsed && isExpanded && (
                  <div className="ms-4 border-s border-slate-800 ps-2 space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      const label = t(item.labelKey);

                      return (
                        <button
                          type="button"
                          key={item.href}
                          onClick={() => router.push(item.href)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                            isActive
                              ? "bg-blue-600 text-white"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{label}</span>
                          {item.badge && (
                            <span className="ms-auto bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse Toggle & Footer */}
        <div className="border-t border-slate-800 p-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {collapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5" />
                <span className="text-sm">{t("common.collapse", "Collapse")}</span>
              </>
            )}
          </button>
          {!collapsed && (
            <p className="text-xs text-slate-500 text-center mt-2">
              Fixzit Superadmin v2.0
            </p>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
