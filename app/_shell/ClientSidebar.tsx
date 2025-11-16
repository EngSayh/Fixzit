"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

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

  const role: Role = (session?.user as any)?.role || "Super Admin";
  const orgId = (session?.user as any)?.orgId || "platform";

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("sidebarCollapsed") || "{}");
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
    fetchCounters(orgId).then(setCounters).catch(() => {});

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) return;

    const ws = new WebSocket(wsUrl);
    ws.onmessage = (e) => {
      try {
        const { key, value } = JSON.parse(e.data);
        setCounters((prev) => ({ ...prev, [key]: value }));
      } catch {
        // ignore
      }
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

  const nav: Section[] = NAV_BASE.map((section) => ({
    ...section,
    items: section.items
      .filter((item) => hasAccess(role, item.path))
      .map((item) => ({
        ...item,
        badge: item.badgeKey ? counters[item.badgeKey] ?? 0 : 0,
      })),
  }));

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="h-screen w-64 border-r bg-[var(--light-surface)] dark:bg-[var(--dark-surface)]">
      <div className="p-3 flex items-center justify-between border-b">
        <span className="font-semibold text-sm">Navigation</span>
        <button
          className="text-xs text-slate-500"
          onClick={() => setIsDark((d) => !d)}
        >
          {isDark ? "Light" : "Dark"}
        </button>
      </div>
      <nav className="p-2 space-y-2">
        {nav.map((section) => (
          <div key={section.title}>
            <button
              className="w-full flex items-center justify-between ps-2 pe-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide"
              onClick={() => toggleSection(section.title)}
            >
              <span>{section.title}</span>
              <span className="rtl-flip">
                {collapsed[section.title] ? "▸" : "▾"}
              </span>
            </button>
            {!collapsed[section.title] && (
              <ul className="mt-1 space-y-1">
                {section.items.map((item) => {
                  const active = pathname.startsWith(item.path);
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
                          <span className="ml-2 rounded-full bg-destructive/90 text-white text-xs px-2">
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
