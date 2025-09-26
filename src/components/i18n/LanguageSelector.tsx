'use client&apos;;

import { useEffect, useMemo, useRef, useState } from &apos;react&apos;;
import { Globe, Search } from &apos;lucide-react&apos;;
import { useTranslation } from &apos;@/src/contexts/TranslationContext&apos;;
import { LANGUAGE_OPTIONS, type LanguageOption } from &apos;@/src/data/language-options&apos;;

interface LanguageSelectorProps {
  variant?: &apos;default&apos; | &apos;compact&apos;;
}

export default function LanguageSelector({ variant = &apos;default&apos; }: LanguageSelectorProps) {
  const { locale, setLocale, isRTL } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(&apos;');
  const containerRef = useRef<HTMLDivElement>(null);

  const current = useMemo<LanguageOption>(() => {
    return LANGUAGE_OPTIONS.find(option => option.locale === locale) ?? LANGUAGE_OPTIONS[0];
  }, [locale]);

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

    document.addEventListener(&apos;mousedown&apos;, handleClick);
    return () => document.removeEventListener(&apos;mousedown&apos;, handleClick);
  }, [open]);

  const buttonPadding = variant === &apos;compact&apos; ? &apos;px-2 py-1 text-xs&apos; : &apos;px-3 py-2 text-sm&apos;;
  const dropdownWidth = variant === &apos;compact&apos; ? &apos;w-64&apos; : &apos;w-80&apos;;

  const toggle = () => setOpen(prev => !prev);

  const handleSelect = (option: LanguageOption) => {
    setLocale(option.locale);
    setOpen(false);
    setQuery(&apos;');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Language ${current.native} (${current.iso})`}
        onClick={toggle}
        className={`flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors ${
          isRTL ? &apos;flex-row-reverse&apos; : &apos;'
        } ${buttonPadding}`}
      >
        <Globe className="h-4 w-4" />
        <span className="flex items-center gap-1">
          <span className="text-sm" aria-hidden>
            {current.flag}
          </span>
          {variant === &apos;compact&apos; ? (
            <span className="text-xs font-medium">
              {current.iso}
            </span>
          ) : (
            <span className="text-sm font-medium">
              {current.native}
            </span>
          )}
        </span>
        {variant !== &apos;compact&apos; && (
          <span className="text-xs text-white/80 hidden sm:inline">{current.iso}</span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg ${dropdownWidth} ${
            isRTL ? &apos;left-0&apos; : &apos;right-0&apos;
          }`}
        >
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              className="w-full rounded border border-gray-300 bg-white pl-7 pr-2 py-1.5 text-sm focus:border-[#0061A8] focus:outline-none focus:ring-1 focus:ring-[#0061A8]/30"
              placeholder="Type to filter languages"
              aria-label="Type to filter languages"
            />
          </div>
          <ul className="max-h-72 overflow-auto" role="listbox">
            {filtered.map(option => (
              <li key={option.locale}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-gray-100 ${
                    option.locale === current.locale ? &apos;bg-[#0061A8]/10 text-[#0061A8]&apos; : &apos;'
                  } ${isRTL ? &apos;flex-row-reverse text-right&apos; : &apos;'}`}
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
