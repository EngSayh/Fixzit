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
  LayoutDashboard,
  History,
  Grid3x3,
  FileCheck,
  Wallet,
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
      { href: "/superadmin/fm-dashboard", icon: LayoutDashboard, labelKey: "superadmin.nav.fmDashboard" },
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
      { href: "/superadmin/user-logs", icon: History, labelKey: "superadmin.nav.userLogs" },
      { href: "/superadmin/roles", icon: Shield, labelKey: "superadmin.nav.roles" },
      { href: "/superadmin/permissions", icon: Grid3x3, labelKey: "superadmin.nav.permissions" },
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
      { href: "/superadmin/footer-content", icon: FileCheck, labelKey: "superadmin.nav.footerContent" },
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
      { href: "/superadmin/subscriptions", icon: Wallet, labelKey: "superadmin.nav.subscriptions" },
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
          "bg-card border-e border-border flex flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo/Header */}
        <div className={cn(
          "border-b border-border flex items-center",
          collapsed ? "p-3 justify-center" : "p-4"
        )}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  type="button"
                  onClick={() => router.push("/superadmin")}
                  className="p-2 rounded-lg hover:bg-muted"
                  aria-label="Go to superadmin home"
                >
                  <Shield className="h-6 w-6 text-primary" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                {t("superadmin.title")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3 flex-1">
              <Shield className="h-7 w-7 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-foreground font-bold text-base truncate">
                  {t("superadmin.title")}
                </h2>
                <p className="text-muted-foreground text-xs truncate">
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
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        aria-label={`Navigate to ${group.id} section`}
                      >
                        <GroupIcon className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                      <div className="space-y-1">
                        <p className="font-medium">{t(group.labelKey, group.id)}</p>
                        <div className="text-xs text-muted-foreground">
                          {group.items.map(item => t(item.labelKey)).join(", ")}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`group-${group.id}-items`}
                    aria-label={`Toggle ${group.id} group`}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      groupActive
                        ? "bg-muted/50 text-foreground"
                        : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
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
                  <div id={`group-${group.id}-items`} className="ms-4 border-s border-border ps-2 space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      const label = t(item.labelKey);

                      return (
                        <button
                          type="button"
                          key={item.href}
                          onClick={() => router.push(item.href)}
                          aria-label={`Navigate to ${label}`}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground/80 hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{label}</span>
                          {item.badge && (
                            <span className="ms-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
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
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
            <p className="text-xs text-muted-foreground text-center mt-2">
              {t("superadmin.version", "Fixzit Superadmin v2.0")}
            </p>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
