import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  DollarSign,
  Users,
  Settings,
  UserCheck,
  Headphones,
  Shield,
  BarChart3,
  Cog,
  Factory,
} from "@/components/ui/icons";

/**
 * FM App Sidebar Navigation
 * NOTE: Sub-pages are implemented as tabs on pages, not nested sidebar items.
 */
export const SIDEBAR_ITEMS = [
  {
    id: "dashboard",
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
    path: "/fm/dashboard",
    group: "Core",
  },
  {
    id: "work-orders",
    labelKey: "nav.workOrders",
    icon: ClipboardList,
    path: "/fm/work-orders",
    group: "Operations",
  },
  {
    id: "properties",
    labelKey: "nav.properties",
    icon: Building2,
    path: "/fm/properties",
    group: "Operations",
  },
  {
    id: "vendors",
    labelKey: "nav.vendors",
    icon: Factory,
    path: "/fm/vendors",
    group: "Operations",
  },
  {
    id: "finance",
    labelKey: "nav.finance",
    icon: DollarSign,
    path: "/fm/finance",
    group: "Finance",
  },
  {
    id: "hr",
    labelKey: "nav.hr",
    icon: Users,
    path: "/fm/hr",
    group: "People",
  },
  {
    id: "crm",
    labelKey: "nav.crm",
    icon: UserCheck,
    path: "/fm/crm",
    group: "Core",
  },
  {
    id: "support",
    labelKey: "nav.support",
    icon: Headphones,
    path: "/fm/support",
    group: "Support",
  },
  {
    id: "compliance",
    labelKey: "nav.compliance",
    icon: Shield,
    path: "/fm/compliance",
    group: "Governance",
  },
  {
    id: "reports",
    labelKey: "nav.reports",
    icon: BarChart3,
    path: "/fm/reports",
    group: "Core",
  },
  {
    id: "administration",
    labelKey: "nav.admin",
    icon: Settings,
    path: "/fm/administration",
    group: "Operations",
  },
  {
    id: "system",
    labelKey: "nav.system",
    icon: Cog,
    path: "/fm/system",
    group: "System",
  },
];
