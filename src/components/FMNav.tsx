"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, Building2, DollarSign, Users, Settings,
  UserCheck, ShoppingBag, Headphones, ShieldCheck, BarChart3, Cog
} from &apos;lucide-react&apos;;

const FM_MODULES = [
  { icon: LayoutDashboard, label: &apos;Dashboard&apos;, route: &apos;/fm/dashboard&apos; },
  { icon: ClipboardList, label: &apos;Work Orders&apos;, route: &apos;/fm/work-orders&apos; },
  { icon: Building2, label: &apos;Properties&apos;, route: &apos;/fm/properties&apos; },
  { icon: DollarSign, label: &apos;Finance&apos;, route: &apos;/fm/finance&apos; },
  { icon: Users, label: &apos;HR&apos;, route: &apos;/fm/hr&apos; },
  { icon: UserCheck, label: &apos;CRM&apos;, route: &apos;/fm/crm&apos; },
  { icon: ShoppingBag, label: &apos;Marketplace&apos;, route: &apos;/fm/marketplace&apos; },
  { icon: Headphones, label: &apos;Support&apos;, route: &apos;/fm/support&apos; },
  { icon: ShieldCheck, label: &apos;Compliance&apos;, route: &apos;/fm/compliance&apos; },
  { icon: BarChart3, label: &apos;Reports&apos;, route: &apos;/fm/reports&apos; },
  { icon: Cog, label: &apos;System&apos;, route: &apos;/fm/system&apos; },
];

export default function FMNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
        Core Modules
      </div>
      {FM_MODULES.map(({ icon: Icon, label, route }) => (
        <Link
          key={route}
          href={route}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === route
              ? &apos;bg-[#0061A8] text-white&apos;
              : &apos;text-gray-700 hover:bg-gray-100 hover:text-gray-900&apos;
          }`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

