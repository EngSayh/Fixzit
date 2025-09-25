'use client';
import { useEffect, useMemo, useState } from 'react';
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

export default function LanguageSelector({ variant = 'default' as 'default' | 'compact' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [isClient, setIsClient] = useState(false);

  // Use the actual translation context
  let t: (key: string, fallback?: string) => string;
  let language: string;
  let setLanguage: (lang: any) => void;
  let isRTL: boolean;

  try {
    const context = useTranslation();
    t = context.t;
    language = context.language;
    setLanguage = context.setLanguage;
    isRTL = context.isRTL;
  } catch {
    // Fallback when context is not available
    t = (key: string, fallback?: string) => fallback || key;
    language = 'en';
    setLanguage = (lang: any) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('fxz.lang', lang);
        window.location.reload();
      }
    };
    isRTL = false;
  }

  // Set client flag
  useEffect(() => {
    setIsClient(true);
  }, []);

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

  // Handle language change with proper RTL application
  const handleLanguageChange = (lang: Lang) => {
    try {
      setLanguage(lang.code as any);
      setOpen(false);

      // Apply RTL immediately without page reload
      if (typeof window !== 'undefined') {
        document.documentElement.dir = lang.dir;
        document.documentElement.lang = lang.code;
      }
    } catch (error) {
      console.warn('Error changing language:', error);
      // Fallback to page reload
      if (typeof window !== 'undefined') {
        localStorage.setItem('fxz.lang', lang.code);
        window.location.reload();
      }
    }
  };

  const buttonPadding = variant === 'compact' ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm';

  return (
    <div className={`relative ${isRTL ? 'text-right' : ''}`}>
      <button
        aria-label={`Language ${sel.name}`}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-md hover:bg-white/10 transition-colors ${
          isRTL ? 'flex-row-reverse' : ''
        } ${buttonPadding}`}
      >
        <Globe className="w-4 h-4" />
        <span className={variant === 'compact' ? 'text-xs' : 'text-sm'}>
          {sel.flag} {variant === 'compact' ? sel.code.toUpperCase() : sel.native}
        </span>
      </button>
      {open && (
        <div className={`absolute top-10 w-80 bg-white text-gray-800 rounded-lg shadow-lg z-50 p-3 ${
          isRTL ? 'left-0' : 'right-0'
        }`}>
          <div className="relative mb-2">
            <Search className={`pointer-events-none absolute top-2 h-4 w-4 text-gray-400 ${isRTL ? 'right-2' : 'left-2'}`} />
            <input
              type="text"
              value={q}
              onChange={event => setQ(event.target.value)}
              className={`w-full rounded border border-gray-300 bg-white ${isRTL ? 'pr-7 pl-2' : 'pl-7 pr-2'} py-1.5 text-sm focus:border-[#0061A8] focus:outline-none focus:ring-1 focus:ring-[#0061A8]/30`}
              placeholder={t('i18n.filterLanguages', 'Type to filter languages')}
              aria-label={t('i18n.filterLanguages', 'Type to filter languages')}
            />
          </div>
          <ul className="max-h-64 overflow-auto space-y-1">
            {list.map(l => (
              <li key={l.code}>
                <button
                  aria-label={`${l.name} ${l.country}`}
                  onClick={() => handleLanguageChange(l)}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-md ${
                    isRTL ? 'flex-row-reverse text-right' : 'text-left'
                  } ${l.code === language ? 'bg-blue-50 text-blue-600' : ''}`}
                >
                  <span className="text-lg">{l.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{l.native}</div>
                    <div className="text-xs text-gray-500">{l.country} · {l.code.toUpperCase()}</div>
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