import { Home, Wrench, Banknote, Users, Settings, Building2, Store, Landmark, Factory, LifeBuoy, Contact } from "lucide-react";

export type ModuleKey =
  | "dashboard" | "work_orders" | "finance" | "hr" | "admin" | "crm"
  | "properties" | "marketplace" | "aqar_souq" | "vendors" | "support";

export const MODULES: Array<{
  key: ModuleKey;
  labelKey: string;
  href: string;
  icon: any;
}> = [
  { key:"dashboard",   labelKey:"dashboard",   href:"/dashboard",   icon: Home },
  { key:"work_orders", labelKey:"work_orders", href:"/work-orders", icon: Wrench },
  { key:"finance",     labelKey:"finance",     href:"/finance",     icon: Banknote },
  { key:"hr",          labelKey:"hr",          href:"/hr",          icon: Users },
  { key:"admin",       labelKey:"admin",       href:"/admin",       icon: Settings },
  { key:"crm",         labelKey:"crm",         href:"/crm",         icon: Contact },
  { key:"properties",  labelKey:"properties",  href:"/properties",  icon: Building2 },
  { key:"marketplace", labelKey:"marketplace", href:"/marketplace", icon: Store },
  { key:"aqar_souq",   labelKey:"aqar_souq",   href:"/aqar",        icon: Landmark },
  { key:"vendors",     labelKey:"vendors",     href:"/vendors",     icon: Factory },
  { key:"support",     labelKey:"support",     href:"/support",     icon: LifeBuoy },
];

