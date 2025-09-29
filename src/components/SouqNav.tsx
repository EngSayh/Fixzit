"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingBag, Package, Users, FileText, ClipboardList,
  Truck, Star, Filter, Search, Settings
} from &apos;lucide-react&apos;;

const SOUQ_MODULES = [
  { icon: Package, label: &apos;Catalog&apos;, route: &apos;/souq/catalog&apos; },
  { icon: Users, label: &apos;Vendors&apos;, route: &apos;/souq/vendors&apos; },
  { icon: FileText, label: &apos;RFQs & Bids&apos;, route: &apos;/souq/rfqs&apos; },
  { icon: ClipboardList, label: &apos;Orders & POs&apos;, route: &apos;/souq/orders&apos; },
  { icon: Truck, label: &apos;Shipping&apos;, route: &apos;/souq/shipping&apos; },
  { icon: Star, label: &apos;Reviews&apos;, route: &apos;/souq/reviews&apos; },
  { icon: Filter, label: &apos;Categories&apos;, route: &apos;/souq/categories&apos; },
  { icon: Search, label: &apos;Advanced Search&apos;, route: &apos;/souq/search&apos; },
  { icon: Settings, label: &apos;Vendor Portal&apos;, route: &apos;/souq/vendor&apos; },
];

export default function SouqNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
        Marketplace
      </div>
      {SOUQ_MODULES.map(({ icon: Icon, label, route }) => (
        <Link
          key={route}
          href={route}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === route
              ? &apos;bg-[#00A859] text-white&apos;
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

