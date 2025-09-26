"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map, Building2, Home, Search, Filter, Heart,
  TrendingUp, Star, Settings, BarChart3
} from &apos;lucide-react&apos;;

const AQAR_MODULES = [
  { icon: Map, label: &apos;Interactive Map&apos;, route: &apos;/aqar/map&apos; },
  { icon: Search, label: &apos;Property Search&apos;, route: &apos;/aqar/search&apos; },
  { icon: Building2, label: &apos;Properties&apos;, route: &apos;/aqar/properties&apos; },
  { icon: Home, label: &apos;My Listings&apos;, route: &apos;/aqar/listings&apos; },
  { icon: Filter, label: &apos;Advanced Filters&apos;, route: &apos;/aqar/filters&apos; },
  { icon: Heart, label: &apos;Favorites&apos;, route: &apos;/aqar/favorites&apos; },
  { icon: TrendingUp, label: &apos;Market Trends&apos;, route: &apos;/aqar/trends&apos; },
  { icon: Star, label: &apos;Premium Listings&apos;, route: &apos;/aqar/premium&apos; },
  { icon: BarChart3, label: &apos;Analytics&apos;, route: &apos;/aqar/analytics&apos; },
  { icon: Settings, label: &apos;Settings&apos;, route: &apos;/aqar/settings&apos; },
];

export default function AqarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
        Real Estate
      </div>
      {AQAR_MODULES.map(({ icon: Icon, label, route }) => (
        <Link
          key={route}
          href={route}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === route
              ? &apos;bg-[#FFB400] text-black&apos;
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
