'use client';

import { useTopBar } from '@/contexts/TopBarContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useState, useEffect, useRef } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function QuickActions() {
  const { quickActions } = useTopBar();
  const { t, isRTL } = useTranslation(); // FIX: Add t for translation
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click and Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [open]);

  if (quickActions.length === 0) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-success text-success-foreground rounded-md hover:bg-success/90 transition-colors"
        aria-label={t('topbar.quickActions', 'Quick actions')}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium">{t('topbar.quickActions', 'Quick Actions')}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-2 w-56 bg-popover rounded-lg shadow-lg border border-border z-50`}>
          <div className="p-2" role="menu">
            {quickActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors text-foreground ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                role="menuitem"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{t(action.labelKey, action.labelKey)}</span> {/* FIX: Use labelKey and translate */}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
