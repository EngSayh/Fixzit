"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingBag, Package, Users, FileText, ClipboardList,
  Truck, Star, Filter, Search, Settings
} from 'lucide-react';

const SOUQ_MODULES = [
  { icon: Package, label: 'Catalog', route: '/souq/catalog' },
  { icon: Users, label: 'Vendors', route: '/souq/vendors' },
  { icon: FileText, label: 'RFQs & Bids', route: '/souq/rfqs' },
  { icon: ClipboardList, label: 'Orders & POs', route: '/souq/orders' },
  { icon: Truck, label: 'Shipping', route: '/souq/shipping' },
  { icon: Star, label: 'Reviews', route: '/souq/reviews' },
  { icon: Filter, label: 'Categories', route: '/souq/categories' },
  { icon: Search, label: 'Advanced Search', route: '/souq/search' },
  { icon: Settings, label: 'Vendor Portal', route: '/souq/vendor' },
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
              ? 'bg-[#00A859] text-white'
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

