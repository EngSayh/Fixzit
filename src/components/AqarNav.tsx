"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map, Building2, Home, Search, Filter, Heart,
  TrendingUp, Star, Settings, BarChart3
} from 'lucide-react';

const AQAR_MODULES = [
  { icon: Map, label: 'Interactive Map', route: '/aqar/map' },
  { icon: Building2, label: 'Properties', route: '/aqar/properties' },
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
              ? 'bg-[#FFB400] text-black'
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
