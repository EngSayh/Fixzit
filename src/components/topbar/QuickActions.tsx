'use client&apos;;

import { useTopBar } from &apos;@/src/contexts/TopBarContext&apos;;
import { useState } from &apos;react&apos;;
import { Plus, ChevronDown } from &apos;lucide-react&apos;;
import Link from &apos;next/link&apos;;

export default function QuickActions() {
  const { quickActions } = useTopBar();
  const [open, setOpen] = useState(false);

  if (quickActions.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-[#00A859] text-white rounded-md hover:bg-[#008a4a] transition-colors"
        aria-label="Quick actions"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium">Quick Actions</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-2">
            {quickActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors text-gray-700"
              >
                <Plus className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}