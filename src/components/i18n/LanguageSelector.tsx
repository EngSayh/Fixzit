'use client';
import { useEffect, useMemo, useState } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from '@/src/contexts/TranslationContext';

type Lang = { code: string; name: string; native: string; country?: string; flag: string; dir:'ltr'|'rtl' };

const DEFAULTS: Lang[] = [
  { code:'ar', name:'Arabic',    native:'العربية',  country:'SA', flag:'🇸🇦', dir:'rtl' },
  { code:'en', name:'English',   native:'English',  country:'UK', flag:'🇬🇧', dir:'ltr' },
  { code:'fr', name:'French',    native:'Français', country:'FR', flag:'🇫🇷', dir:'ltr' },
  { code:'pt', name:'Portuguese',native:'Português',country:'PT', flag:'🇵🇹', dir:'ltr' },
  { code:'ru', name:'Russian',   native:'Русский',  country:'RU', flag:'🇷🇺', dir:'ltr' },
  { code:'es', name:'Spanish',   native:'Español',  country:'ES', flag:'🇪🇸', dir:'ltr' },
  { code:'ur', name:'Urdu',      native:'اردو',     country:'PK', flag:'🇵🇰', dir:'rtl' },
  { code:'hi', name:'Hindi',     native:'हिंदी',    country:'IN', flag:'🇮🇳', dir:'ltr' },
  { code:'zh', name:'Chinese',   native:'中文',      country:'CN', flag:'🇨🇳', dir:'ltr' }
];

export default function LanguageSelector() {
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
    return DEFAULTS.filter(l => l.code.includes(searchTerm) || l.name.toLowerCase().includes(searchTerm) || l.native.includes(q));
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

  return (
    <div className="relative">
      <button
        aria-label={`Language ${sel.name}`}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1 rounded-md hover:bg-white/10 transition-colors ${
          isRTL ? 'flex-row-reverse' : ''
        }`}
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm">{sel.flag} {sel.native} ({sel.code.toUpperCase()})</span>
      </button>
      {open && (
        <div className={`absolute right-0 top-10 w-80 bg-white text-gray-800 rounded-lg shadow-lg z-50 p-3 ${
          isRTL ? 'left-0 right-auto' : ''
        }`}>
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder={t('common.search.placeholder', 'Type to filter (e.g., ar, Français)')}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-2 text-sm"
          />
          <ul className="max-h-64 overflow-auto space-y-1">
            {list.map(l => (
              <li key={l.code}>
                <button
                  aria-label={`${l.name} ${l.country}`}
                  onClick={() => handleLanguageChange(l)}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-md text-left ${
                    isRTL ? 'flex-row-reverse' : ''
                  } ${l.code === language ? 'bg-blue-50 text-blue-600' : ''}`}
                >
                  <span className="text-lg">{l.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{l.native}</div>
                    <div className="text-xs text-gray-500">{l.name} · {l.code.toUpperCase()}</div>
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