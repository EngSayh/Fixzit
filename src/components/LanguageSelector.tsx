'use client';

import * as React from 'react';
import { FlagIcon } from '@/src/components/FlagIcon';
import { useI18n } from '@/src/i18n/useI18n';
import { LOCALE_META, SUPPORTED_LOCALES, type Locale } from '@/src/i18n/config';

type Variant = 'compact' | 'full';

const LanguageSelectorComponent: React.FC<{ variant?: Variant }> = ({ variant = 'compact' }) => {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  const current = LOCALE_META[locale];

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return SUPPORTED_LOCALES.filter((code) => {
      if (!term) return true;
      const meta = LOCALE_META[code];
      const haystack = `${meta.nativeName} ${meta.countryName} ${meta.iso}`.toLowerCase();
      return haystack.includes(term);
    }).map((code) => ({ code, ...LOCALE_META[code] }));
  }, [query]);

  React.useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleSelect = (next: Locale) => {
    setLocale(next);
    setOpen(false);
    setQuery('');
  };

  const buttonPadding = variant === 'compact' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';
  const dropdownWidth = variant === 'compact' ? 'w-64' : 'w-80';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language ${current.nativeName} (${current.iso})`}
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors ${buttonPadding}`}
      >
        <FlagIcon code={current.flag} className="h-4 w-6" />
        {variant === 'full' ? (
          <>
            <span className="text-sm font-medium">{current.nativeName}</span>
            <span className="text-xs opacity-70">({current.iso})</span>
          </>
        ) : (
          <span className="text-xs font-semibold">{current.iso}</span>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-50 mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-gray-900 ${dropdownWidth}`}
        >
          <label className="block text-xs font-medium text-gray-500 mb-1" htmlFor="language-filter">
            Filter languages
          </label>
          <div className="relative mb-2">
            <input
              id="language-filter"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#0061A8] focus:outline-none focus:ring-1 focus:ring-[#0061A8]/40"
              placeholder="Type to filter…"
            />
          </div>
          <ul className="max-h-64 overflow-auto">
            {filtered.map((option) => (
              <li key={option.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.code === locale}
                  onClick={() => handleSelect(option.code as Locale)}
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-gray-100 ${
                    option.code === locale ? 'bg-[#0061A8]/10 text-[#0061A8]' : ''
                  }`}
                >
                  <FlagIcon code={option.flag} className="h-4 w-6" />
                  <span className="flex-1 text-sm font-medium">{option.nativeName}</span>
                  <span className="text-xs text-gray-500">{option.countryName}</span>
                  <span className="text-xs font-mono text-gray-400">{option.iso}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const LanguageSelector = LanguageSelectorComponent;
export default LanguageSelectorComponent;
