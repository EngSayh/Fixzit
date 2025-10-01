'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Search } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { LANGUAGE_OPTIONS, type LanguageOption, type LanguageCode } from '@/data/language-options';

interface LanguageSelectorProps {
  variant?: 'default' | 'compact';
}

/**
 * Language selector dropdown for switching the application's locale.
 *
 * Renders a button that opens a searchable list of predefined languages. Allows choosing a language which calls the translation context's setter (when available), updates document `dir` and `lang` immediately to reflect RTL/LTR changes, and falls back to persisting the choice in localStorage + page reload if the translation context is absent or an error occurs.
 *
 * @param {'default' | 'compact'} [variant='default'] - UI density variant; `'default'` shows native name and code badge, `'compact'` shows a minimal code-only display.
 * @returns {JSX.Element} A React element containing the language selector trigger and dropdown.
 */
export default function LanguageSelector({ variant = 'default' }: LanguageSelectorProps) {
  const { language, setLanguage, isRTL, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const current = useMemo<LanguageOption>(() => {
    return LANGUAGE_OPTIONS.find(option => option.language === language) ?? LANGUAGE_OPTIONS[0];
  }, [language]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return LANGUAGE_OPTIONS;
    }
    return LANGUAGE_OPTIONS.filter(option => {
      return (
        option.locale.toLowerCase().includes(term) ||
        option.iso.toLowerCase().includes(term) ||
        option.native.toLowerCase().includes(term) ||
        option.english.toLowerCase().includes(term) ||
        option.country.toLowerCase().includes(term)
      );
    });
  }, [query]);

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

  const buttonPadding = variant === 'compact' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';
  const dropdownWidth = variant === 'compact' ? 'w-64' : 'w-80';

  const toggle = () => setOpen(prev => !prev);

  const handleSelect = (option: LanguageOption) => {
    setLanguage(option.language as LanguageCode);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${t('i18n.selectLanguageLabel', 'Select language')} ${current.native} (${current.iso})`}
        onClick={toggle}
        className={`flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors ${
          isRTL ? 'flex-row-reverse' : ''
        } ${buttonPadding}`}
      >
        <Globe className="h-4 w-4" />
        <span className="flex items-center gap-1">
          <span className="text-sm" aria-hidden>
            {current.flag}
          </span>
          {variant === 'compact' ? (
            <span className="text-xs font-medium">
              {current.iso}
            </span>
          ) : (
            <span className="text-sm font-medium">
              {current.native}
            </span>
          )}
        </span>
        {variant !== 'compact' && (
          <span className="text-xs text-white/80 hidden sm:inline">{current.iso}</span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg ${dropdownWidth} ${
            isRTL ? 'left-0' : 'right-0'
          }`}
        >
          <div className="relative mb-2">
            <Search className={`pointer-events-none absolute top-2 h-4 w-4 text-gray-400 ${isRTL ? 'right-2' : 'left-2'}`} aria-hidden="true" focusable="false" />
            <input
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              className={`w-full rounded border border-gray-300 bg-white ${isRTL ? 'pr-7 pl-2 text-right' : 'pl-7 pr-2'} py-1.5 text-sm focus:border-[#0061A8] focus:outline-none focus:ring-1 focus:ring-[#0061A8]/30`}
              placeholder={t('i18n.filterLanguages', 'Type to filter languages')}
              aria-label={t('i18n.filterLanguages', 'Type to filter languages')}
            />
          </div>
          <ul className="max-h-72 overflow-auto" role="listbox">
            {filtered.map(option => (
              <li key={option.locale}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-gray-100 ${
                    option.locale === current.locale ? 'bg-[#0061A8]/10 text-[#0061A8]' : ''
                  } ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                  onClick={() => handleSelect(option)}
                  role="option"
                  aria-selected={option.locale === current.locale}
                >
                  <span className="text-lg" aria-hidden>
                    {option.flag}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium leading-tight">{option.native}</div>
                    <div className="text-xs text-gray-500">
                      {option.country} · {option.iso}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

