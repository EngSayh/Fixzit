'use client';

import { useState } from 'react';
import { useTopBar } from '@/src/contexts/TopBarContext';
import { Globe, ChevronDown } from 'lucide-react';

type Lang = { code: string; native: string; country?: string; flag: string; dir: 'ltr'|'rtl' };

const LANGS: Lang[] = [
  { code:'ar', native:'العربية', country:'المملكة العربية السعودية', flag:'🇸🇦', dir:'rtl' },
  { code:'en', native:'English',  country:'United Kingdom', flag:'🇬🇧', dir:'ltr' },
  { code:'fr', native:'Français', country:'France',         flag:'🇫🇷', dir:'ltr' },
  { code:'pt', native:'Português',country:'Portugal',       flag:'🇵🇹', dir:'ltr' },
  { code:'ru', native:'Русский',  country:'Россия',         flag:'🇷🇺', dir:'ltr' },
  { code:'es', native:'Español',  country:'España',         flag:'🇪🇸', dir:'ltr' },
  { code:'ur', native:'اردو',     country:'پاکستان',         flag:'🇵🇰', dir:'rtl' },
  { code:'hi', native:'हिन्दी',   country:'भारत',           flag:'🇮🇳', dir:'ltr' },
  { code:'zh', native:'中文',     country:'中国',           flag:'🇨🇳', dir:'ltr' },
];

export function LanguageSelector() {
  const { language, setLanguage, isRTL } = useTopBar();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const current = LANGS.find(l => l.code === language) || LANGS[0];
  const filtered = LANGS.filter(l =>
    l.code.toLowerCase().includes(query.toLowerCase())
    || l.native.toLowerCase().includes(query.toLowerCase())
  );

  const apply = (lang: Lang) => {
    setLanguage(lang.code as 'en' | 'ar');
    setOpen(false);
  };

  return (
    <div className="relative">
      <button 
        aria-label="Language selector"
        className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-white/15 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.native}</span>
        <span className="text-xs opacity-70">({current.code.toUpperCase()})</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      
      {open && (
        <div className={`absolute top-full mt-2 w-64 rounded-md bg-white p-2 text-sm text-gray-900 shadow-lg z-50 ${isRTL ? 'left-0' : 'right-0'}`}>
          <input 
            aria-label="Search languages" 
            className="mb-2 w-full rounded border px-2 py-1 text-xs"
            placeholder="Type to filter… (ar / en / fr …)" 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
          />
          <ul role="listbox" aria-label="Languages" className="max-h-64 overflow-auto">
            {filtered.map(l => (
              <li key={l.code}>
                <button
                  aria-label={`${l.native} (${l.country ?? ''})`}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 hover:bg-gray-100 text-left"
                  onClick={() => apply(l)}
                >
                  <span>{l.flag}</span>
                  <span className="flex-1">{l.native}</span>
                  <span className="text-[10px] uppercase text-gray-500">{l.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}