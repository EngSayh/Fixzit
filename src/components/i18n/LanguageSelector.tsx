'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Search } from 'lucide-react';
import { useTranslation } from '@/src/contexts/TranslationContext';

type Lang = { code: string; name: string; native: string; country?: string; flag: string; dir:'ltr'|'rtl' };

const DEFAULTS: Lang[] = [
  { code:'ar', name:'Arabic',    native:'العربية',  country:'المملكة العربية السعودية', flag:'🇸🇦', dir:'rtl' },
  { code:'en', name:'English',   native:'English',  country:'United Kingdom', flag:'🇬🇧', dir:'ltr' },
  { code:'fr', name:'French',    native:'Français', country:'France', flag:'🇫🇷', dir:'ltr' },
  { code:'pt', name:'Portuguese',native:'Português',country:'Portugal', flag:'🇵🇹', dir:'ltr' },
  { code:'ru', name:'Russian',   native:'Русский',  country:'Россия', flag:'🇷🇺', dir:'ltr' },
  { code:'es', name:'Spanish',   native:'Español',  country:'España', flag:'🇪🇸', dir:'ltr' },
  { code:'ur', name:'Urdu',      native:'اردو',     country:'پاکستان', flag:'🇵🇰', dir:'rtl' },
  { code:'hi', name:'Hindi',     native:'हिंदी',    country:'भारत', flag:'🇮🇳', dir:'ltr' },
  { code:'zh', name:'Chinese',   native:'中文',      country:'中国', flag:'🇨🇳', dir:'ltr' }
];

interface LanguageSelectorProps {
  variant?: 'default' | 'compact';
}

export default function LanguageSelector({ variant = 'default' }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use the translation context directly - it has its own fallback
  const { t, language, setLanguage, isRTL } = useTranslation();

  // Set client flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const sel = DEFAULTS.find(l => l.code === language) || DEFAULTS[1];

  const list = useMemo(() => {
    const searchTerm = q.trim().toLowerCase();
    if (!searchTerm) return DEFAULTS;
    return DEFAULTS.filter(l => 
      l.code.toLowerCase().includes(searchTerm) || 
      l.name.toLowerCase().includes(searchTerm) || 
      l.native.toLowerCase().includes(searchTerm) ||
      l.country?.toLowerCase().includes(searchTerm)
    );
  }, [q]);

  // Handle language change - context already handles DOM updates
  const handleLanguageChange = (lang: Lang) => {
    try {
      setLanguage(lang.code as any);
      setOpen(false);
    } catch (error) {
      console.warn('Error changing language:', error);
      // Fallback to page reload
      if (typeof window !== 'undefined') {
        localStorage.setItem('fxz.lang', lang.code);
        window.location.reload();
      }
    }
  };

  const buttonPadding = variant === 'compact' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';
  const dropdownWidth = variant === 'compact' ? 'w-64' : 'w-80';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Language ${sel.name}`}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-md hover:bg-white/10 transition-colors ${
          isRTL ? 'flex-row-reverse' : ''
        } ${buttonPadding}`}
      >
        <Globe className="h-4 w-4" />
        <span className="flex items-center gap-1">
          <span className="text-sm" aria-hidden>
            {sel.flag}
          </span>
          {variant === 'compact' ? (
            <span className="text-xs font-medium">
              {sel.code.toUpperCase()}
            </span>
          ) : (
            <span className="text-sm font-medium">
              {sel.native}
            </span>
          )}
        </span>
        {variant !== 'compact' && (
          <span className="text-xs text-white/80 hidden sm:inline">{sel.code.toUpperCase()}</span>
        )}
      </button>
      {open && (
        <div
          className={`absolute z-50 mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg ${dropdownWidth} ${
            isRTL ? 'left-0' : 'right-0'
          }`}
        >
          <div className="relative mb-2">
            <Search className={`pointer-events-none absolute top-2 h-4 w-4 text-gray-400 ${isRTL ? 'right-2' : 'left-2'}`} />
            <input
              type="text"
              value={q}
              onChange={event => setQ(event.target.value)}
              className={`w-full rounded border border-gray-300 bg-white ${isRTL ? 'pr-7 pl-2' : 'pl-7 pr-2'} py-1.5 text-sm focus:border-[#0061A8] focus:outline-none focus:ring-1 focus:ring-[#0061A8]/30`}
              placeholder={t('common.search.languages', 'Type to filter languages')}
              aria-label={t('common.search.languages', 'Type to filter languages')}
            />
          </div>
          <ul className="max-h-72 overflow-auto" role="listbox">
            {list.map(l => (
              <li key={l.code}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-gray-100 ${
                    l.code === language ? 'bg-[#0061A8]/10 text-[#0061A8]' : ''
                  } ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                  onClick={() => handleLanguageChange(l)}
                  role="option"
                  aria-selected={l.code === language}
                >
                  <span className="text-lg" aria-hidden>
                    {l.flag}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium leading-tight">{l.native}</div>
                    <div className="text-xs text-gray-500">
                      {l.country} · {l.code.toUpperCase()}
                    </div>
                  </div>
                  {l.code === language && (
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}