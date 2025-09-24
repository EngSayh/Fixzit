// src/components/topbar/LanguageMenu.tsx
'use client';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useAppScope } from '@/src/contexts/AppScopeContext';
import { ChevronDown } from 'lucide-react';

// STRICT v4: flag + native + ISO; type-ahead; accessible labels
const OPTIONS = [
  { code: 'en', iso: 'EN', flag: '🇬🇧', native: 'English', country: 'United Kingdom', aria: 'English – United Kingdom' },
  { code: 'ar', iso: 'AR', flag: '🇸🇦', native: 'العربية', country: 'المملكة العربية السعودية', aria: 'Arabic – Saudi Arabia' },
  // Add more languages as needed: FR, PT, RU, ES, UR, HI, ZH
];

export default function LanguageMenu() {
  const { language, setLanguage } = useAppScope();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const f = filter.toLowerCase();
    return OPTIONS.filter(o => 
      [o.iso, o.native, o.country, o.code].some(s => s.toLowerCase().includes(f))
    );
  }, [filter]);

  const active = OPTIONS.find(o => o.code === language) || OPTIONS[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button 
        onClick={() => setOpen(v => !v)} 
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-sm"
        aria-haspopup="listbox" 
        aria-expanded={open}
        aria-label={active.aria}
        data-testid="lang-selector"
      >
        <span className="text-lg" role="img" aria-hidden="true">{active.flag}</span>
        <span className="font-medium">{active.native}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border rounded-lg shadow-lg p-2 z-50">
          <input 
            aria-label="Filter languages" 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            placeholder="Type to filter..." 
            className="w-full text-sm px-3 py-2 border rounded-md mb-2 outline-none focus:ring-2 focus:ring-[#0061A8]" 
          />
          <ul role="listbox" className="max-h-64 overflow-auto">
            {filtered.map(o => (
              <li key={o.code}>
                <button
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                    o.code === language ? 'bg-[#0061A8]/10 text-[#0061A8]' : ''
                  }`}
                  aria-label={o.aria}
                  onClick={() => { 
                    setLanguage(o.code as any); 
                    setOpen(false);
                    setFilter('');
                  }}
                >
                  <span className="text-lg" role="img" aria-hidden="true">{o.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{o.native}</div>
                    <div className="text-xs text-gray-500">{o.country}</div>
                  </div>
                  <span className="text-xs font-medium text-gray-400">{o.iso}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}