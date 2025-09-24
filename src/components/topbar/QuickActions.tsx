'use client';
import Link from 'next/link';
import { useTopBar } from '@/src/contexts/TopBarContext';
import { Plus, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function QuickActions() {
  const { quickActions, isRTL } = useTopBar();
  const [open, setOpen] = useState(false);

  if (quickActions.length === 0) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded bg-[#FFB400] px-3 py-2 text-sm font-semibold text-black hover:bg-[#ffca3a] transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">New</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      
      {open && (
        <div className={`absolute top-full mt-2 w-48 rounded-md bg-white shadow-lg z-50 ${isRTL ? 'left-0' : 'right-0'}`}>
          <div className="p-1">
            {quickActions.map(action => (
              <Link
                key={action.id}
                href={action.href}
                className="block rounded px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
                onClick={() => setOpen(false)}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}