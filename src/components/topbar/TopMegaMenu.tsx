'use client';
import { useTopBar } from '@/src/contexts/TopBarContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

const MODULES = [
  { label:'Dashboard', href:'/dashboard' },
  { label:'Work Orders', href:'/work-orders' },
  { label:'Properties', href:'/properties' },
  { label:'Finance', href:'/finance' },
  { label:'HR', href:'/hr' },
  { label:'Administration', href:'/admin' },
  { label:'CRM', href:'/crm' },
  { label:'Marketplace', href:'/marketplace' },
  { label:'Support', href:'/support' },
  { label:'Compliance', href:'/compliance' },
  { label:'Reports', href:'/reports' },
  { label:'System', href:'/system' },
];

export function TopMegaMenu() {
  const { topMenuCollapsed, setTopMenuCollapsed, isRTL } = useTopBar();

  return (
    <div className="border-t border-white/10 bg-white/5">
      <div className="mx-auto max-w-screen-2xl px-4 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setTopMenuCollapsed(!topMenuCollapsed)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
            aria-expanded={!topMenuCollapsed}
          >
            {topMenuCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            <span>Modules</span>
          </button>
        </div>

        {!topMenuCollapsed && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {MODULES.map(module => (
              <Link
                key={module.href}
                href={module.href}
                className="block p-2 rounded hover:bg-white/10 text-sm transition-colors"
              >
                {module.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}