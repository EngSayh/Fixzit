"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, Building2, DollarSign, Users, Settings,
  UserCheck, ShoppingBag, Headphones, ShieldCheck, BarChart3, Cog
} from 'lucide-react';

const FM_MODULES = [
  { icon: LayoutDashboard, label: 'Dashboard', route: '/fm/dashboard' },
  { icon: ClipboardList, label: 'Work Orders', route: '/fm/work-orders' },
  { icon: Building2, label: 'Properties', route: '/fm/properties' },
  { icon: DollarSign, label: 'Finance', route: '/fm/finance' },
  { icon: Users, label: 'HR', route: '/fm/hr' },
  { icon: UserCheck, label: 'CRM', route: '/fm/crm' },
  { icon: ShoppingBag, label: 'Marketplace', route: '/fm/marketplace' },
  { icon: Headphones, label: 'Support', route: '/fm/support' },
  { icon: ShieldCheck, label: 'Compliance', route: '/fm/compliance' },
  { icon: BarChart3, label: 'Reports', route: '/fm/reports' },
  { icon: Cog, label: 'System', route: '/fm/system' },
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
              ? 'bg-[#0061A8] text-white'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

