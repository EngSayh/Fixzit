import { 
  Home, Wrench, Banknote, Users, Settings, Building2, 
  Factory, LifeBuoy, Contact, LucideIcon, BarChart3, Shield 
} from "lucide-react";

/**
 * FM App Navigation Modules
 * NOTE: Marketplace and Aqar Souq are separate top-level apps (not FM modules)
 */
export type ModuleKey =
  | "dashboard" | "work_orders" | "finance" | "hr" | "admin" | "crm"
  | "properties" | "vendors" | "support" | "reports" | "compliance";

export const MODULES: Array<{
  key: ModuleKey;
  labelKey: string; // Translation key in format "nav.{module}"
  href: string;     // Path within FM app (should start with /fm/)
  icon: LucideIcon;
}> = [
  { key:"dashboard",   labelKey:"nav.dashboard",    href:"/fm/dashboard",    icon: Home },
  { key:"work_orders", labelKey:"nav.work_orders",  href:"/fm/work-orders",  icon: Wrench },
  { key:"finance",     labelKey:"nav.finance",      href:"/fm/finance",      icon: Banknote },
  { key:"hr",          labelKey:"nav.hr",           href:"/fm/hr",           icon: Users },
  { key:"admin",       labelKey:"nav.admin",        href:"/fm/admin",        icon: Settings },
  { key:"crm",         labelKey:"nav.crm",          href:"/fm/crm",          icon: Contact },
  { key:"properties",  labelKey:"nav.properties",   href:"/fm/properties",   icon: Building2 },
  { key:"vendors",     labelKey:"nav.vendors",      href:"/fm/vendors",      icon: Factory },
  { key:"support",     labelKey:"nav.support",      href:"/fm/support",      icon: LifeBuoy },
  { key:"reports",     labelKey:"nav.reports",      href:"/fm/reports",      icon: BarChart3 },
  { key:"compliance",  labelKey:"nav.compliance",   href:"/fm/compliance",   icon: Shield },
];

