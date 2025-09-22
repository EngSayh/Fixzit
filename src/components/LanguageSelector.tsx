// src/components/LanguageSelector.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { LANGUAGES, type Lang } from '@/src/i18n/config';
import { useI18n } from '@/src/providers/RootProviders';
import Image from 'next/image';

export default function LanguageSelector() {
  const { lang, setLanguage, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return LANGUAGES;
    return LANGUAGES.filter(item =>
      item.nativeName.toLowerCase().includes(needle) ||
      item.countryName.toLowerCase().includes(needle) ||
      item.iso.toLowerCase().includes(needle) ||
      item.code.toLowerCase().includes(needle) ||
      // Arabic letter quick filter requirement (e.g., 'ع')
      (item.code === 'ar' && 'العربية'.includes(q))
    );
  }, [q]);

  const current = LANGUAGES.find(l => l.code === lang)!;

  return (
    <div className="relative">
      <button
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-black/10 focus:outline-none"
      >
        <Image src={current.flag} alt="" width={18} height={12} />
        <span className="text-sm">{current.nativeName} ({current.iso})</span>
      </button>

      {open && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute z-50 mt-2 w-64 rounded border bg-white shadow-lg p-2 ${dir === 'rtl' ? 'rtl' : ''}`}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
        >
          <input
            autoFocus
            aria-label="Filter languages"
            placeholder={dir === 'rtl' ? 'ابحث عن لغة…' : 'Filter languages…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full border rounded px-2 py-1 mb-2 text-sm"
          />
          <ul className="max-h-64 overflow-auto">
            {list.map(item => {
              const selected = item.code === lang;
              return (
                <li key={item.code}>
                  <button
                    role="option"
                    aria-selected={selected}
                    onClick={() => { setLanguage(item.code as Lang); setOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded text-left hover:bg-gray-100 ${selected ? 'bg-gray-50 font-medium' : ''}`}
                  >
                    <Image src={item.flag} alt="" width={18} height={12} />
                    <span className="text-sm">{item.nativeName} — {item.countryName} [{item.iso}]</span>
                  </button>
                </li>
              );
            })}
            {!list.length && (
              <li className="px-2 py-2 text-sm text-gray-500">{dir === 'rtl' ? 'لا نتائج' : 'No results'}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
