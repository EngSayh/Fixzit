// src/components/topbar/ModuleSearch.tsx
'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useAppScope } from '@/src/contexts/AppScopeContext';
import { MODULES } from '@/src/config/dynamic-modules';
import { Search } from 'lucide-react';

export default function ModuleSearch() {
  const { moduleId, scopeMode, setScopeMode, language } = useAppScope();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const moduleConfig = MODULES.find(m => m.id === moduleId);
  const placeholder = language === 'ar' 
    ? (moduleConfig?.searchPlaceholderAr || 'ابحث...') 
    : (moduleConfig?.searchPlaceholder || 'Search...');
  
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Command palette (Cmd/Ctrl+K)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function performSearch(query: string) {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      // Call search API with current module scope
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&scope=${scopeMode}&module=${moduleId}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setOpen(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(q);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQ(e.target.value);
    // Debounced search
    if (e.target.value.length > 2) {
      performSearch(e.target.value);
    } else {
      setResults([]);
      setOpen(false);
    }
  };

  return (
    <>
      <div ref={searchRef} className="relative w-full max-w-xl">
        <form onSubmit={handleSubmit} className="flex rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
          {/* Scope Toggle Button */}
          <button
            type="button"
            onClick={() => setScopeMode(scopeMode === 'module' ? 'all' : 'module')}
            className="px-3 py-2 text-xs bg-gray-50 hover:bg-gray-100 border-r border-gray-200 font-medium transition-colors"
            title={t('Toggle search scope', 'تغيير نطاق البحث')}
          >
            {scopeMode === 'module' 
              ? t(moduleConfig?.label || 'This Module', moduleConfig?.labelAr || 'هذا القسم') 
              : t('All Modules', 'كل الأقسام')}
          </button>

          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={handleInputChange}
              className="w-full pl-10 pr-20 py-2 outline-none focus:ring-2 focus:ring-[#0061A8]/20"
              placeholder={placeholder}
              aria-label={t('Global search', 'البحث الشامل')}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-gray-500 bg-gray-100 rounded">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>
        </form>

        {/* Search Results Dropdown */}
        {open && results.length > 0 && (
          <div className="absolute z-50 mt-2 w-full max-h-96 overflow-auto bg-white shadow-lg rounded-lg border border-gray-200">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-3 py-2">
                {t('Search Results', 'نتائج البحث')} ({results.length})
              </div>
              {results.map((r, idx) => (
                <a
                  key={`${r.type}-${r.id}-${idx}`}
                  href={r.href}
                  className="block px-3 py-2 rounded hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{r.title}</div>
                      {r.subtitle && (
                        <div className="text-xs text-gray-500 mt-0.5">{r.subtitle}</div>
                      )}
                    </div>
                    {r.badge && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {r.badge}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Command Palette */}
      {paletteOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/30 flex items-start justify-center pt-24">
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl">
            <div className="p-4 border-b">
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  performSearch(e.target.value);
                }}
                className="w-full px-3 py-2 border rounded outline-none focus:ring-2 focus:ring-[#0061A8]"
                placeholder={t('Search commands, actions, and more...', 'ابحث عن الأوامر والإجراءات والمزيد...')}
              />
            </div>
            <div className="max-h-96 overflow-auto p-4">
              {/* Quick Actions */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 mb-2">
                  {t('Quick Actions', 'إجراءات سريعة')}
                </h3>
                {moduleConfig?.quickActions.map(action => (
                  <a
                    key={action.href}
                    href={action.href}
                    className="block px-3 py-2 rounded hover:bg-gray-50 text-sm"
                  >
                    + {language === 'ar' ? action.labelAr : action.label}
                  </a>
                ))}
              </div>

              {/* Search Results */}
              {results.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 mb-2">
                    {t('Search Results', 'نتائج البحث')}
                  </h3>
                  {results.map((r, idx) => (
                    <a
                      key={`${r.type}-${r.id}-${idx}`}
                      href={r.href}
                      className="block px-3 py-2 rounded hover:bg-gray-50"
                    >
                      <div className="text-sm">{r.title}</div>
                      {r.subtitle && <div className="text-xs text-gray-500">{r.subtitle}</div>}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setPaletteOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {t('Close', 'إغلاق')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}