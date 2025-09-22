// DEPRECATED: This file is a duplicate of LanguageSelector.tsx
// Keeping for reference but should be removed in production
// All language selection functionality is handled by src/components/LanguageSelector.tsx

// src/components/topbar/LanguageMenu.tsx
'use client';
import React, { useMemo, useState } from 'react';
import { useAppScope } from '@/src/contexts/AppScopeContext';

// STRICT v4: flag + native + ISO; type‑ahead; accessible labels.
const OPTIONS = [
  { code:'en', iso:'EN', flag:'🇬🇧', native:'English', country:'United Kingdom', aria:'English – United Kingdom' },
  { code:'ar', iso:'AR', flag:'🇸🇦', native:'العربية', country:'المملكة العربية السعودية', aria:'Arabic – Saudi Arabia' },
];

export default function LanguageMenu() {
  const { language, setLanguage } = useAppScope();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const filtered = useMemo(()=> {
    const f = filter.toLowerCase();
    return OPTIONS.filter(o => [o.iso, o.native, o.country, o.code].some(s=> s.toLowerCase().includes(f)));
  }, [filter]);

  const active = OPTIONS.find(o=>o.code===language) || OPTIONS[0];

  return (
    <div className="relative">
      <button onClick={()=>setOpen(v=>!v)} className="px-3 py-2 rounded hover:bg-slate-100 flex items-center gap-2" aria-haspopup="listbox" aria-expanded={open}>
        <span>{active.flag}</span><span className="text-sm">{active.native}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg p-2">
          <input aria-label="Filter languages" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Type to filter…" className="w-full text-sm px-2 py-1 border rounded mb-2" />
          <ul role="listbox" className="max-h-64 overflow-auto">
            {filtered.map(o=>(
              <li key={o.code}>
                <button
                  className="w-full text-left px-2 py-2 rounded hover:bg-slate-100 flex items-center gap-2"
                  aria-label={o.aria}
                  onClick={()=>{ setLanguage(o.code as any); setOpen(false); }}>
                  <span>{o.flag}</span><span className="text-sm">{o.native} <span className="text-xs text-slate-500">({o.iso})</span></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
