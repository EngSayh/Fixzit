"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { DefaultSession } from "next-auth";
import { useTranslation } from "@/contexts/TranslationContext";
import { logger } from "@/lib/logger";

type Role =
  | "Super Admin"
  | "Corporate Admin"
  | "Management"
  | "Finance"
  | "HR"
  | "Corporate Employee"
  | "Property Owner"
  | "Technician"
  | "Tenant / End-User";

type Counters = Record<string, number>;
type SessionUserExtras = DefaultSession["user"] & {
  role?: Role;
  orgId?: string;
};

type Item = {
  label: string;
  path: string;
  icon?: string;
  badgeKey?: string;
  badge?: number;
};

type Section = {
  title: string;
  items: Item[];
};

const NAV_BASE: Section[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: "🏠" },
      {
        label: "Work Orders",
        path: "/dashboard/work-orders",
        icon: "🔧",
        badgeKey: "workOrders",
      },
      { label: "Properties", path: "/dashboard/properties", icon: "🏢" },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        label: "Invoices",
        path: "/dashboard/finance/invoices",
        icon: "📑",
        badgeKey: "invoices",
      },
      { label: "Payments", path: "/dashboard/finance/payments", icon: "💳" },
      { label: "Expenses", path: "/dashboard/finance/expenses", icon: "💸" },
      { label: "Budgets", path: "/dashboard/finance/budgets", icon: "📊" },
      { label: "Reports", path: "/dashboard/finance/reports", icon: "📈" },
    ],
  },
  {
    title: "Human Resources",
    items: [
      {
        label: "Employee Directory",
        path: "/dashboard/hr/employees",
        icon: "👥",
      },
      {
        label: "Attendance & Leave",
        path: "/dashboard/hr/attendance",
        icon: "🗓️",
      },
      { label: "Payroll", path: "/dashboard/hr/payroll", icon: "🧾" },
      {
        label: "Recruitment (ATS)",
        path: "/dashboard/hr/recruitment",
        icon: "🧑‍💼",
      },
      { label: "Training", path: "/dashboard/hr/training", icon: "📚" },
      {
        label: "Performance",
        path: "/dashboard/hr/performance",
        icon: "🎯",
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "Delegation of Authority",
        path: "/dashboard/admin/doa",
        icon: "🏛️",
      },
      {
        label: "Policies & Procedures",
        path: "/dashboard/admin/policies",
        icon: "📜",
      },
      {
        label: "Asset Management",
        path: "/dashboard/admin/assets",
        icon: "📦",
      },
      {
        label: "Facilities & Fleet",
        path: "/dashboard/admin/facilities",
        icon: "🚚",
      },
    ],
  },
  {
    title: "CRM",
    items: [
      {
        label: "Customer Directory",
        path: "/dashboard/crm/customers",
        icon: "🗂️",
      },
      {
        label: "Leads & Opportunities",
        path: "/dashboard/crm/leads",
        icon: "🌱",
        badgeKey: "leads",
      },
      {
        label: "Contracts & Renewals",
        path: "/dashboard/crm/contracts",
        icon: "📄",
      },
      {
        label: "Feedback & Complaints",
        path: "/dashboard/crm/feedback",
        icon: "💬",
      },
    ],
  },
  {
    title: "Marketplace",
    items: [
      {
        label: "Vendors & Suppliers",
        path: "/dashboard/marketplace/vendors",
        icon: "🏷️",
      },
      {
        label: "Service Catalog",
        path: "/dashboard/marketplace/catalog",
        icon: "📚",
      },
      {
        label: "Procurement Requests",
        path: "/dashboard/marketplace/requests",
        icon: "🧾",
      },
      {
        label: "Bidding & RFQs",
        path: "/dashboard/marketplace/rfqs",
        icon: "📨",
      },
    ],
  },
  {
    title: "Support & Helpdesk",
    items: [
      { label: "Tickets", path: "/dashboard/support/tickets", icon: "🎧" },
      {
        label: "Knowledge Base",
        path: "/dashboard/support/kb",
        icon: "📖",
      },
      { label: "Live Chat / Bot", path: "/dashboard/support/chat", icon: "⚡" },
      { label: "SLA Monitoring", path: "/dashboard/support/sla", icon: "⏱️" },
    ],
  },
  {
    title: "Compliance & Legal",
    items: [
      { label: "Contracts", path: "/dashboard/compliance/contracts", icon: "📜" },
      {
        label: "Disputes & Claims",
        path: "/dashboard/compliance/disputes",
        icon: "⚖️",
      },
      { label: "Audit & Risk", path: "/dashboard/compliance/audit", icon: "🛡️" },
    ],
  },
  {
    title: "Reports & Analytics",
    items: [
      {
        label: "Standard Reports",
        path: "/dashboard/reports/standard",
        icon: "📈",
      },
      {
        label: "Custom Reports",
        path: "/dashboard/reports/custom",
        icon: "🧮",
      },
      {
        label: "Dashboards",
        path: "/dashboard/reports/dashboards",
        icon: "📊",
      },
    ],
  },
  {
    title: "System Management",
    items: [
      {
        label: "User Management",
        path: "/dashboard/system/users",
        icon: "👤",
      },
      {
        label: "Roles & Permissions",
        path: "/dashboard/system/roles",
        icon: "🔐",
      },
      {
        label: "Subscriptions & Billing",
        path: "/dashboard/system/billing",
        icon: "💳",
      },
      {
        label: "Integrations",
        path: "/dashboard/system/integrations",
        icon: "🔌",
      },
      { label: "Settings", path: "/dashboard/system/settings", icon: "⚙️" },
    ],
  },
];

const slugifyKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const SECTION_TRANSLATIONS: Record<string, { key: string; fallback: string }> = {
  "Main": { key: "sidebar.legacy.sections.main", fallback: "Main" },
  "Finance": { key: "sidebar.legacy.sections.finance", fallback: "Finance" },
  "Human Resources": { key: "sidebar.legacy.sections.human-resources", fallback: "Human Resources" },
  "Administration": { key: "sidebar.legacy.sections.administration", fallback: "Administration" },
  "CRM": { key: "sidebar.legacy.sections.crm", fallback: "CRM" },
  "Marketplace": { key: "sidebar.legacy.sections.marketplace", fallback: "Marketplace" },
  "Support & Helpdesk": { key: "sidebar.legacy.sections.support-and-helpdesk", fallback: "Support & Helpdesk" },
  "Compliance & Legal": { key: "sidebar.legacy.sections.compliance-and-legal", fallback: "Compliance & Legal" },
  "Reports & Analytics": { key: "sidebar.legacy.sections.reports-and-analytics", fallback: "Reports & Analytics" },
  "System Management": { key: "sidebar.legacy.sections.system-management", fallback: "System Management" },
};

const ITEM_TRANSLATIONS: Record<string, { key: string; fallback: string }> = {
  "Dashboard": { key: "sidebar.legacy.items.dashboard", fallback: "Dashboard" },
  "Work Orders": { key: "sidebar.legacy.items.work-orders", fallback: "Work Orders" },
  "Properties": { key: "sidebar.legacy.items.properties", fallback: "Properties" },
  "Invoices": { key: "sidebar.legacy.items.invoices", fallback: "Invoices" },
  "Payments": { key: "sidebar.legacy.items.payments", fallback: "Payments" },
  "Expenses": { key: "sidebar.legacy.items.expenses", fallback: "Expenses" },
  "Budgets": { key: "sidebar.legacy.items.budgets", fallback: "Budgets" },
  "Reports": { key: "sidebar.legacy.items.reports", fallback: "Reports" },
  "Employee Directory": { key: "sidebar.legacy.items.employee-directory", fallback: "Employee Directory" },
  "Attendance & Leave": { key: "sidebar.legacy.items.attendance-and-leave", fallback: "Attendance & Leave" },
  "Payroll": { key: "sidebar.legacy.items.payroll", fallback: "Payroll" },
  "Recruitment (ATS)": { key: "sidebar.legacy.items.recruitment-ats", fallback: "Recruitment (ATS)" },
  "Training": { key: "sidebar.legacy.items.training", fallback: "Training" },
  "Performance": { key: "sidebar.legacy.items.performance", fallback: "Performance" },
  "Delegation of Authority": { key: "sidebar.legacy.items.delegation-of-authority", fallback: "Delegation of Authority" },
  "Policies & Procedures": { key: "sidebar.legacy.items.policies-and-procedures", fallback: "Policies & Procedures" },
  "Asset Management": { key: "sidebar.legacy.items.asset-management", fallback: "Asset Management" },
  "Facilities & Fleet": { key: "sidebar.legacy.items.facilities-and-fleet", fallback: "Facilities & Fleet" },
  "Customer Directory": { key: "sidebar.legacy.items.customer-directory", fallback: "Customer Directory" },
  "Leads & Opportunities": { key: "sidebar.legacy.items.leads-and-opportunities", fallback: "Leads & Opportunities" },
  "Contracts & Renewals": { key: "sidebar.legacy.items.contracts-and-renewals", fallback: "Contracts & Renewals" },
  "Feedback & Complaints": { key: "sidebar.legacy.items.feedback-and-complaints", fallback: "Feedback & Complaints" },
  "Vendors & Suppliers": { key: "sidebar.legacy.items.vendors-and-suppliers", fallback: "Vendors & Suppliers" },
  "Service Catalog": { key: "sidebar.legacy.items.service-catalog", fallback: "Service Catalog" },
  "Procurement Requests": { key: "sidebar.legacy.items.procurement-requests", fallback: "Procurement Requests" },
  "Bidding & RFQs": { key: "sidebar.legacy.items.bidding-and-rfqs", fallback: "Bidding & RFQs" },
  "Tickets": { key: "sidebar.legacy.items.tickets", fallback: "Tickets" },
  "Knowledge Base": { key: "sidebar.legacy.items.knowledge-base", fallback: "Knowledge Base" },
  "Live Chat / Bot": { key: "sidebar.legacy.items.live-chat-bot", fallback: "Live Chat / Bot" },
  "SLA Monitoring": { key: "sidebar.legacy.items.sla-monitoring", fallback: "SLA Monitoring" },
  "Contracts": { key: "sidebar.legacy.items.contracts", fallback: "Contracts" },
  "Disputes & Claims": { key: "sidebar.legacy.items.disputes-and-claims", fallback: "Disputes & Claims" },
  "Audit & Risk": { key: "sidebar.legacy.items.audit-and-risk", fallback: "Audit & Risk" },
  "Standard Reports": { key: "sidebar.legacy.items.standard-reports", fallback: "Standard Reports" },
  "Custom Reports": { key: "sidebar.legacy.items.custom-reports", fallback: "Custom Reports" },
  "Dashboards": { key: "sidebar.legacy.items.dashboards", fallback: "Dashboards" },
  "User Management": { key: "sidebar.legacy.items.user-management", fallback: "User Management" },
  "Roles & Permissions": { key: "sidebar.legacy.items.roles-and-permissions", fallback: "Roles & Permissions" },
  "Subscriptions & Billing": { key: "sidebar.legacy.items.subscriptions-and-billing", fallback: "Subscriptions & Billing" },
  "Integrations": { key: "sidebar.legacy.items.integrations", fallback: "Integrations" },
  "Settings": { key: "sidebar.legacy.items.settings", fallback: "Settings" },
};

const getSectionTranslation = (title: string) =>
  SECTION_TRANSLATIONS[title] ?? {
    key: `sidebar.legacy.sections.${slugifyKey(title)}`,
    fallback: title,
  };

const getItemTranslation = (label: string) =>
  ITEM_TRANSLATIONS[label] ?? {
    key: `sidebar.legacy.items.${slugifyKey(label)}`,
    fallback: label,
  };

type LocalizedSection = {
  id: string;
  title: string;
  items: Item[];
};

type CounterMessage = {
  key: string;
  value: number;
};

const isCounterMessage = (input: unknown): input is CounterMessage => {
  if (typeof input !== "object" || input === null) {
    return false;
  }
  const maybe = input as Record<string, unknown>;
  return typeof maybe.key === "string" && typeof maybe.value === "number";
};

async function fetchCounters(orgId: string): Promise<Counters> {
  const res = await fetch(`/api/counters?org=${encodeURIComponent(orgId)}`, {
    cache: "no-store",
  });
  if (!res.ok) return {};
  return res.json();
}

function hasAccess(role: Role, path: string): boolean {
  if (role === "Super Admin") return true;
  if (role === "Corporate Admin") return !path.startsWith("/dashboard/system");
  if (role === "Management")
    return (
      path.startsWith("/dashboard/reports") ||
      path.startsWith("/dashboard/finance") ||
      path.startsWith("/dashboard/work-orders")
    );
  if (role === "Finance") return path.startsWith("/dashboard/finance");
  if (role === "HR") return path.startsWith("/dashboard/hr");
  if (role === "Corporate Employee")
    return path.startsWith("/dashboard/work-orders");
  if (role === "Property Owner")
    return (
      path.startsWith("/dashboard/properties") ||
      path.startsWith("/dashboard/finance")
    );
  if (role === "Technician") return path.startsWith("/dashboard/work-orders");
  if (role === "Tenant / End-User")
    return path.startsWith("/dashboard/work-orders");
  return false;
}

export default function ClientSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useTranslation();

  const sessionUser = session?.user as SessionUserExtras | undefined;
  const role: Role = sessionUser?.role ?? "Super Admin";
  const orgId = sessionUser?.orgId ?? "platform";

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = JSON.parse(localStorage.getItem("sidebarCollapsed") || "{}");
      return Object.entries(stored).reduce((acc, [key, value]) => {
        const normalized = slugifyKey(key);
        acc[normalized] = Boolean(value);
        return acc;
      }, {} as Record<string, boolean>);
    } catch {
      return {};
    }
  });

  const [counters, setCounters] = useState<Counters>({});
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (!orgId) return;
    fetchCounters(orgId).then(setCounters).catch((error) => {
      // Log counter fetch failures for debugging
      logger.warn('[Sidebar] Failed to fetch notification counters', { component: 'ClientSidebar', action: 'fetchCounters', error });
      // Set empty counters as fallback
      setCounters({});
    });

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) return;

    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!isCounterMessage(parsed)) {
        return;
      }
      setCounters((prev) => ({ ...prev, [parsed.key]: parsed.value }));
    };
    return () => ws.close();
  }, [orgId]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("sidebarCollapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  const navSections = useMemo<LocalizedSection[]>(() => {
    return NAV_BASE.map((section) => {
      const sectionId = slugifyKey(section.title);
      const sectionTranslation = getSectionTranslation(section.title);
      const title = t(sectionTranslation.key, sectionTranslation.fallback);
      const items = section.items
        .filter((item) => hasAccess(role, item.path))
        .map((item) => {
          const itemTranslation = getItemTranslation(item.label);
          return {
            ...item,
            label: t(itemTranslation.key, itemTranslation.fallback),
            badge: item.badgeKey ? counters[item.badgeKey] ?? 0 : 0,
          };
        });
      return { id: sectionId, title, items };
    }).filter((section) => section.items.length > 0);
  }, [role, counters, t]);

  const toggleSection = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const navHeading = t("sidebar.legacy.heading", "Navigation");
  const themeLabel = isDark
    ? t("sidebar.legacy.theme.light", "Light")
    : t("sidebar.legacy.theme.dark", "Dark");

  return (
    <aside className="h-screen w-64 border-r bg-[var(--light-surface)] dark:bg-[var(--dark-surface)]">
      <div className="p-3 flex items-center justify-between border-b">
        <span className="font-semibold text-sm">{navHeading}</span>
        <button
          className="text-xs text-slate-500"
          onClick={() => setIsDark((d) => !d)}
        >
          {themeLabel}
        </button>
      </div>
      <nav className="p-2 space-y-2">
        {navSections.map((section) => (
          <div key={section.id}>
            <button
              className="w-full flex items-center justify-between ps-2 pe-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide"
              onClick={() => toggleSection(section.id)}
            >
              <span>{section.title}</span>
              <span className="rtl-flip">
                {collapsed[section.id] ? "▸" : "▾"}
              </span>
            </button>
            {!collapsed[section.id] && (
              <ul className="mt-1 space-y-1">
                {section.items.map((item) => {
                  const active = pathname?.startsWith(item.path) ?? false;
                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                          active
                            ? "bg-[var(--primary)] text-white"
                            : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <span className="ms-2 rounded-full bg-destructive/90 text-white text-xs px-2">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
