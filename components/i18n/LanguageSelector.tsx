'use client';

import { useEffect, useMemo, useRef, useState, useId } from 'react';
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
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const hintId = useId();

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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    // Focus the search input when opened
    queueMicrotask(() => inputRef.current?.focus());

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Refocus trigger only when transitioning from open -> closed
  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      queueMicrotask(() => buttonRef.current?.focus());
    }
    wasOpenRef.current = open;
  }, [open]);

  // Initialize the active option when opening or when the filter changes
  useEffect(() => {
    if (!open) return;
    const idx = filtered.findIndex(o => o.locale === current.locale);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, filtered, current.locale]);

  const buttonPadding = variant === 'compact' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';
  const dropdownWidth = variant === 'compact' ? 'w-64' : 'w-80';

  const toggle = () => setOpen(prev => !prev);

  const handleSelect = (option: LanguageOption) => {
    setLanguage(option.language as LanguageCode);
    setOpen(false);
    setQuery('');
    queueMicrotask(() => buttonRef.current?.focus());
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${t('i18n.selectLanguageLabel', 'Select language')} ${current.native} (${current.iso})`}
        aria-controls={open ? listboxId : undefined}
        onClick={toggle}
        ref={buttonRef}
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
          className={`absolute z-[100] mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-2xl ${dropdownWidth} max-w-[calc(100vw-2rem)] ${
            isRTL ? 'left-0' : 'right-0'
          } animate-in slide-in-from-top-2 duration-200`}
        >
          {/* Arrow pointer */}
          <div className={`hidden md:block absolute -top-2 w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45 ${isRTL ? 'left-8' : 'right-8'}`}></div>
          <div className="relative mb-2">
            <Search className={`pointer-events-none absolute top-2 h-4 w-4 text-gray-400 ${isRTL ? 'right-2' : 'left-2'}`} aria-hidden="true" focusable="false" />
            <input
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              ref={inputRef}
              role="searchbox"
              aria-describedby={hintId}
              aria-controls={listboxId}
              aria-activedescendant={open && filtered[activeIndex] ? `${listboxId}-option-${filtered[activeIndex].locale}` : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false);
                  queueMicrotask(() => buttonRef.current?.focus());
                } else if (e.key === 'ArrowDown' && filtered.length) {
                  e.preventDefault();
                  setActiveIndex(i => (i + 1) % filtered.length);
                } else if (e.key === 'ArrowUp' && filtered.length) {
                  e.preventDefault();
                  setActiveIndex(i => (i - 1 + filtered.length) % filtered.length);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const target = filtered[activeIndex];
                  if (target) {
                    setLanguage(target.language as LanguageCode);
                    setOpen(false);
                    setQuery('');
                    queueMicrotask(() => buttonRef.current?.focus());
                  }
                }
              }}
              className={`w-full rounded border border-gray-300 bg-white ${isRTL ? 'pr-7 pl-2 text-right' : 'pl-7 pr-2'} py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30`}
              placeholder={t('i18n.filterLanguages', 'Type to filter languages')}
              aria-label={t('i18n.filterLanguages', 'Type to filter languages')}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="done"
            />
            <p id={hintId} className="sr-only">
              {t('a11y.languageSelectorHelp', 'Use arrow keys to navigate, Enter to select, Esc to close')}
            </p>
          </div>
          <ul className="max-h-72 overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" role="listbox" id={listboxId}>
            {filtered.map((option, idx) => (
              <li key={option.locale}>
                <div
                  id={`${listboxId}-option-${option.locale}`}
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-100 ${
                    option.locale === current.locale ? 'bg-brand-500/10 text-brand-500' : ''
                  } ${idx === activeIndex ? 'ring-1 ring-brand-500/30' : ''} ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                  role="option"
                  aria-selected={option.locale === current.locale}
                  tabIndex={-1}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(option); }}
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
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

