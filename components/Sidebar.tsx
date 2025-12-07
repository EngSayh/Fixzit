"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Headphones as HeadphonesIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";
import { useResponsiveLayout } from "@/contexts/ResponsiveContext";
import { STORAGE_KEYS } from "@/config/constants";
import { SimpleTooltip } from "@/components/ui/tooltip";
import {
  MODULES,
  MODULE_SUB_VIEWS,
  USER_LINKS,
  ROLE_PERMISSIONS,
  SUBSCRIPTION_PLANS,
  resolveNavigationRole,
  type ModuleItem,
  type UserLinkItem,
  type ModuleId,
  type BadgeCounts,
} from "@/config/navigation";
import { logger } from "@/lib/logger";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  badgeCounts?: BadgeCounts;
}

type GovernanceGroup = "core" | "business" | "system";

type SubModuleItem = {
  id: string;
  name: string;
  fallbackLabel: string;
  path: string;
};

const COLLAPSE_KEY = STORAGE_KEYS.sidebarCollapsed;

const GOVERNANCE_GROUPS: Record<GovernanceGroup, ModuleId[]> = {
  core: ["dashboard", "workOrders", "properties", "finance", "hr"],
  business: ["crm", "marketplace", "support", "compliance", "reports"],
  system: ["system", "administration"],
};

const GOVERNANCE_CATEGORY_LABELS: Record<
  GovernanceGroup,
  { key: string; fallback: string }
> = {
  core: { key: "sidebar.category.core", fallback: "Core" },
  business: { key: "sidebar.category.business", fallback: "Business" },
  system: { key: "sidebar.category.system", fallback: "System Management" },
};

type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;
const PLAN_ALIASES: Record<string, SubscriptionPlanKey> = {
  STANDARD: "STANDARD",
  STARTER: "STANDARD",
  BASIC: "BASIC",
  PREMIUM: "PREMIUM",
  PROFESSIONAL: "PREMIUM",
  PRO_PLUS: "PREMIUM",
  ENTERPRISE_PLUS: "ENTERPRISE",
  ENTERPRISE_GROWTH: "ENTERPRISE",
};

const modulePathMap = MODULES.reduce<Record<ModuleId, string>>(
  (acc, module) => {
    acc[module.id] = module.path;
    return acc;
  },
  {} as Record<ModuleId, string>,
);

const buildSubModuleMap = (): Record<string, SubModuleItem[]> => {
  const map: Record<string, SubModuleItem[]> = {};
  Object.entries(MODULE_SUB_VIEWS).forEach(([moduleId, subItems]) => {
    const basePath = modulePathMap[moduleId as ModuleId];
    if (!basePath || !subItems?.length) return;
    const items = subItems.map((item) => ({
      id: item.id,
      name: item.name,
      fallbackLabel: item.fallbackLabel,
      path:
        item.kind === "path"
          ? `${basePath}${item.value}`
          : `${basePath}?view=${encodeURIComponent(item.value)}`,
    }));
    if (items.length) {
      map[basePath] = items;
    }
  });
  return map;
};

const SUB_MODULES_BY_PATH = buildSubModuleMap();

const normalizePlan = (value?: string): SubscriptionPlanKey => {
  if (!value) return "DEFAULT";
  const normalized = value.toUpperCase().replace(/[\s-]+/g, "_");
  if ((SUBSCRIPTION_PLANS as Record<string, readonly ModuleId[]>)[normalized]) {
    return normalized as SubscriptionPlanKey;
  }
  return PLAN_ALIASES[normalized] ?? "DEFAULT";
};

const formatLabel = (value?: string) => value?.replace(/_/g, " ") ?? "";

export default function Sidebar({
  className,
  onNavigate,
  badgeCounts,
}: SidebarProps) {
  const pathname = usePathname() || "";
  const { data: session, status } = useSession();
  const sessionUser = session?.user as
    | { role?: string; subscriptionPlan?: string; plan?: string; orgId?: string }
    | undefined;
  const [planOverride, setPlanOverride] = useState<string | null>(null);

  const { t, isRTL } = useTranslation();
  const { screenInfo } = useResponsiveLayout();

  const isAuthenticated = status === "authenticated" && !!sessionUser;
  const role = resolveNavigationRole(sessionUser?.role);
  const subscription = normalizePlan(
    planOverride ?? sessionUser?.subscriptionPlan ?? sessionUser?.plan,
  );

  // Tenant-scoped collapse key to prevent cross-tenant UI state bleed
  // Uses orgId prefix so different tenants have separate sidebar preferences
  const tenantScopedCollapseKey = useMemo(() => {
    const orgId = sessionUser?.orgId || "public";
    return `${orgId}:${COLLAPSE_KEY}`;
  }, [sessionUser?.orgId]);

  // Fetch subscription plan when not present in session to enforce gating
  useEffect(() => {
    const fetchPlan = async () => {
      if (!isAuthenticated || planOverride) return;
      try {
        const resp = await fetch("/api/subscriptions/tenant", {
          credentials: "include",
        });
        if (!resp.ok) return;
        const data = await resp.json();
        const plan =
          (data?.metadata?.plan as string) ||
          (data?.plan as string) ||
          (data?.subscription_plan as string);
        if (typeof plan === "string" && plan.trim()) {
          const normalized = normalizePlan(plan);
          if (normalized !== "DEFAULT") {
            setPlanOverride(normalized);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          logger.warn("[Sidebar] Failed to fetch subscription plan", { error });
        }
      }
    };
    fetchPlan();
  }, [isAuthenticated, planOverride]);

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from tenant-scoped localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(tenantScopedCollapseKey);
      if (stored) {
        setIsCollapsed(Boolean(JSON.parse(stored)));
      }
    } catch {
      // ignore corrupted state
    }
  }, [tenantScopedCollapseKey]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(tenantScopedCollapseKey, JSON.stringify(next));
        } catch {
          // ignore storage issues
        }
      }
      return next;
    });
  }, [tenantScopedCollapseKey]);

  const allowedModules = useMemo(() => {
    const roleModules = (ROLE_PERMISSIONS[role] ??
      ROLE_PERMISSIONS.guest) as readonly ModuleId[];
    const planModules = (SUBSCRIPTION_PLANS[subscription] ??
      SUBSCRIPTION_PLANS.DEFAULT) as readonly ModuleId[];
    const allowedIds = planModules.filter((id): id is ModuleId =>
      roleModules.includes(id as ModuleId),
    );

    if (
      process.env.NODE_ENV !== "production" &&
      roleModules.length > 0 &&
      planModules.length > 0 &&
      allowedIds.length === 0
    ) {
      logger.warn("[Sidebar] RBAC mismatch detected", {
        component: "Sidebar",
        role,
        subscription,
      });
    }

    const allowedSet = new Set(allowedIds);
    return MODULES.filter((module) => allowedSet.has(module.id));
  }, [role, subscription]);

  const groupedModules = useMemo(() => {
    const allowedById = new Map(
      allowedModules.map((module) => [module.id, module]),
    );
    return (
      Object.entries(GOVERNANCE_GROUPS) as [GovernanceGroup, ModuleId[]][]
    )
      .map(([group, ids]) => {
        const modules = ids
          .map((id) => allowedById.get(id))
          .filter((module): module is ModuleItem => Boolean(module));
        return modules.length ? [group, modules] : null;
      })
      .filter(Boolean) as Array<[GovernanceGroup, ModuleItem[]]>;
  }, [allowedModules]);

  const getCategoryName = useCallback(
    (group: GovernanceGroup) => {
      const label = GOVERNANCE_CATEGORY_LABELS[group];
      return t(label.key, label.fallback);
    },
    [t],
  );

  const isMobile = screenInfo.isMobile || screenInfo.isTablet;
  const asideWidth = isCollapsed ? "w-16" : "w-64";
  const CollapseIcon = isCollapsed
    ? isRTL
      ? ChevronLeft
      : ChevronRight
    : isRTL
      ? ChevronRight
      : ChevronLeft;

  const asideBase = isMobile
    ? `fixed inset-y-0 z-50 ${asideWidth} transform transition-transform duration-300 ease-in-out start-0`
    : `sticky top-16 ${asideWidth} h-[calc(100vh-4rem)] transition-[width] duration-300 ease-in-out`;

  const handleNavigate = useCallback(() => {
    if (isMobile && onNavigate) {
      onNavigate();
    }
  }, [isMobile, onNavigate]);

  const renderBadge = (module: ModuleItem) => {
    if (!module.badgeKey || !badgeCounts) return null;
    const value = badgeCounts[module.badgeKey];
    if (typeof value !== "number" || value <= 0) return null;
    return (
      <span
        className="fxz-sidebar-badge"
        aria-label={`${value} ${module.fallbackLabel}`}
      >
        {value}
      </span>
    );
  };

  return (
    <aside
      className={cn(
        asideBase,
        "fxz-sidebar shadow-lg overflow-y-auto flex flex-col",
        className,
      )}
      role="navigation"
      aria-label={t("sidebar.mainNav", "Main navigation")}
      dir={isRTL ? "rtl" : "ltr"}
      data-testid="sidebar"
    >
      <div className={cn(isMobile ? "p-3" : "p-4", "flex flex-col h-full")}>
        {!isMobile && (
          <SimpleTooltip 
            content={isCollapsed ? t("sidebar.expand", "Expand sidebar") : t("sidebar.collapse", "Collapse sidebar")}
            side={isRTL ? "left" : "right"}
          >
            <button
              onClick={toggleCollapse}
              className="mb-4 p-2 rounded-full border border-sidebar-border hover:bg-sidebar-accent transition-all duration-200 ms-auto text-sidebar-foreground"
              aria-label={
                isCollapsed
                  ? t("sidebar.expand", "Expand sidebar")
                  : t("sidebar.collapse", "Collapse sidebar")
              }
              data-cursor-interactive
            >
              <CollapseIcon className="h-4 w-4" aria-hidden />
            </button>
          </SimpleTooltip>
        )}

        {!isCollapsed && (
          <div className="font-bold text-lg mb-6 text-start text-sidebar-foreground">
            {t("common.brand", "Fixzit Enterprise")}
          </div>
        )}

        {isAuthenticated && !isCollapsed && (
          <section
            aria-label={t("sidebar.accountInfo", "Account info")}
            className="mb-4 rounded-2xl border border-sidebar-border bg-sidebar-accent/30 p-3"
          >
            <div className="text-xs opacity-80 mb-1 text-start text-sidebar-foreground">
              {t("sidebar.role", "Role")}
            </div>
            <div className="text-sm font-medium capitalize text-start text-sidebar-foreground">
              {formatLabel(role)}
            </div>
            <div className="text-xs opacity-80 mt-1 text-start text-sidebar-foreground">
              {t("sidebar.planLabel", "Plan")}: {formatLabel(subscription)}
            </div>
          </section>
        )}

        <nav
          className="flex-1 space-y-6"
          aria-label={t("sidebar.modules", "Modules")}
        >
          {groupedModules.map(([group, modules]) => (
            <section key={group} aria-label={getCategoryName(group)}>
              {!isCollapsed && (
                <div className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {getCategoryName(group)}
                </div>
              )}

              <ul className="space-y-1">
                {modules.map((module) => {
                  const Icon = module.icon;
                  const isActive =
                    pathname === module.path ||
                    pathname.startsWith(`${module.path}/`);
                  const subModules = SUB_MODULES_BY_PATH[module.path] || [];
                  const badge = renderBadge(module);

                  return (
                    <li key={module.id}>
                      <Link
                        href={module.path}
                        className={cn(
                          "fxz-sidebar-item",
                          isActive && "fxz-sidebar-item-active",
                          isCollapsed && "justify-center",
                        )}
                        aria-current={isActive ? "page" : undefined}
                        data-testid={`nav-${module.id}`}
                        prefetch={false}
                        onClick={handleNavigate}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" aria-hidden />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1">
                              {t(
                                module.name,
                                module.fallbackLabel ||
                                  module.name.replace("nav.", ""),
                              )}
                            </span>
                            {badge}
                            {isActive && (
                              <span
                                className="inline-block h-2 w-2 rounded-full bg-sidebar-primary ms-auto"
                                aria-hidden
                              />
                            )}
                          </>
                        )}
                      </Link>

                      {!isCollapsed && subModules.length > 0 && (
                        <ul className="mt-1 space-y-1">
                          {subModules.map((sub) => {
                            const isSubActive =
                              pathname === sub.path ||
                              pathname.startsWith(`${sub.path}/`);
                            return (
                              <li key={sub.id}>
                                <Link
                                  href={sub.path}
                                  className={cn(
                                    "flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs transition-all duration-200 ms-2 text-sidebar-foreground/80",
                                    isSubActive
                                      ? "bg-sidebar-accent text-sidebar-foreground"
                                      : "hover:bg-sidebar-accent/50",
                                  )}
                                  aria-current={
                                    isSubActive ? "page" : undefined
                                  }
                                  data-testid={`nav-${sub.id}`}
                                  prefetch={false}
                                  onClick={handleNavigate}
                                >
                                  <span
                                    className="inline-block h-1.5 w-1.5 rounded-full bg-sidebar-primary flex-shrink-0"
                                    aria-hidden
                                  />
                                  <span className="truncate">
                                    {t(sub.name, sub.fallbackLabel)}
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {groupedModules.length === 0 && !isCollapsed && (
            <p className="px-3 text-xs opacity-80" data-testid="sidebar-empty">
              {t(
                "sidebar.noModules",
                "No modules available for your role/plan.",
              )}
            </p>
          )}
        </nav>

        {!isCollapsed && (
          <div className="border-t border-sidebar-border pt-4 mt-4">
            <div className="fxz-sidebar-title mb-3">
              {t("sidebar.account", "Account")}
            </div>
            <ul
              className="space-y-1"
              aria-label={t("sidebar.account", "Account")}
            >
              {USER_LINKS.map((link: UserLinkItem) => {
                if (!isAuthenticated && link.requiresAuth) {
                  return null;
                }
                const Icon = link.icon;
                const isActive =
                  pathname === link.path ||
                  pathname.startsWith(`${link.path}/`);
                return (
                  <li key={link.id}>
                    <Link
                      href={link.path}
                      className={cn(
                        "fxz-sidebar-item",
                        isActive && "fxz-sidebar-item-active",
                      )}
                      aria-current={isActive ? "page" : undefined}
                      data-testid={`account-${link.id}`}
                      prefetch={false}
                      onClick={handleNavigate}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
                      <span className="text-sm font-medium">
                        {t(
                          link.name,
                          link.fallbackLabel ||
                            link.name.replace("sidebar.", ""),
                        )}
                      </span>
                      {isActive && (
                        <span
                          className="inline-block h-2 w-2 rounded-full bg-sidebar-primary ms-auto"
                          aria-hidden
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {isAuthenticated && !isCollapsed && (
          <div className="border-t border-sidebar-border pt-4 mt-4">
            <div className="fxz-sidebar-title mb-3">
              {t("sidebar.help", "Help")}
            </div>
            <Link
              href="/help"
              className={cn(
                "fxz-sidebar-item",
                isRTL ? "flex-row-reverse" : "",
              )}
              data-testid="nav-help"
              prefetch={false}
              onClick={handleNavigate}
            >
              <HeadphonesIcon className="h-5 w-5 flex-shrink-0" aria-hidden />
              <span>{t("sidebar.helpCenter", "Help Center")}</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
