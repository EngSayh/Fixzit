'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import { CircleDollarSign, Search } from 'lucide-react';
import { useCurrency, type CurrencyOption } from '@/src/contexts/CurrencyContext';
import { useTranslation } from '@/src/contexts/TranslationContext';

interface CurrencySelectorProps {
  variant?: 'default' | 'compact';
}

export default function CurrencySelector({ variant = 'default' }: CurrencySelectorProps) {
  const { currency, setCurrency, options } = useCurrency();
  const { t, isRTL } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const hintId = useId();

  const current = useMemo<CurrencyOption>(() => {
    return options.find(option => option.code === currency) ?? options[0];
  }, [currency, options]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter(option => {
      return (
        option.code.toLowerCase().includes(term) ||
        option.name.toLowerCase().includes(term)
      );
    });
  }, [query, options]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === 'Escape') {
        setOpen(false);
        queueMicrotask(() => buttonRef.current?.focus());
        return;
      }
      if (filtered.length === 0) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex(prev => (prev + 1) % filtered.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex(prev => (prev - 1 + filtered.length) % filtered.length);
        return;
      }
      if (event.key === 'Enter') {
        const target = filtered[activeIndex];
        if (target) {
          setCurrency(target.code);
          setOpen(false);
          setQuery('');
          queueMicrotask(() => buttonRef.current?.focus());
        }
      }
    },
    [open, filtered, activeIndex, setCurrency]
  );

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

    // Focus the search input when opened
    queueMicrotask(() => inputRef.current?.focus());

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  // Initialize the active option when opening or when the filter changes
  useEffect(() => {
    if (!open) return;
    const idx = filtered.findIndex(o => o.code === current.code);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, filtered, current.code]);

  const buttonPadding = variant === 'compact' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';
  const dropdownWidth = variant === 'compact' ? 'w-56' : 'w-64';

  const toggle = () => setOpen(prev => !prev);

  const handleSelect = (option: CurrencyOption) => {
    setCurrency(option.code);
    setOpen(false);
    setQuery('');
    queueMicrotask(() => buttonRef.current?.focus());
  };

  return (
    <div className={`relative ${isRTL ? 'text-right' : ''}`} ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${t('i18n.selectCurrencyLabel', 'Select currency')} ${current.code}`}
        aria-controls={open ? listboxId : undefined}
        onClick={toggle}
        ref={buttonRef}
        className={`flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors ${buttonPadding} ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <CircleDollarSign className="h-4 w-4" aria-hidden="true" focusable="false" />
        <span className="flex items-center gap-2">
          <span className="text-sm" aria-hidden>
            {current.flag}
          </span>
          {variant === 'compact' ? (
            <span className="text-xs font-semibold">{current.code}</span>
          ) : (
            <span className="text-sm font-semibold">{current.code}</span>
          )}
        </span>
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg ${dropdownWidth} ${isRTL ? 'left-0' : 'right-0'}`}
        >
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
              aria-activedescendant={open && filtered[activeIndex] ? `${listboxId}-option-${filtered[activeIndex].code}` : undefined}
              className={`w-full rounded border border-gray-300 bg-white ${isRTL ? 'pr-7 pl-2' : 'pl-7 pr-2'} py-1.5 text-sm focus:border-[#0061A8] focus:outline-none focus:ring-1 focus:ring-[#0061A8]/30`}
              placeholder={t('i18n.filterCurrencies', 'Type to filter currencies')}
              aria-label={t('i18n.filterCurrencies', 'Type to filter currencies')}
            />
            <p id={hintId} className="sr-only">
              {t('a11y.currencySelectorHelp', 'Use arrow keys to navigate, Enter to select, Esc to close')}
            </p>
          </div>
          <ul className="max-h-64 overflow-auto" role="listbox" id={listboxId}>
            {filtered.map((option, idx) => (
              <li key={option.code}>
                <button
                  type="button"
                  id={`${listboxId}-option-${option.code}`}
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-100 ${
                    option.code === current.code ? 'bg-[#0061A8]/10 text-[#0061A8]' : ''
                  } ${idx === activeIndex ? 'ring-1 ring-[#0061A8]/30' : ''} ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                  onClick={() => handleSelect(option)}
                  role="option"
                  aria-selected={option.code === current.code}
                >
                  <span className="text-lg" aria-hidden>
                    {option.flag}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium leading-tight">{option.code}</div>
                    <div className="text-xs text-gray-500">{option.name}</div>
                  </div>
                  <span className="text-sm font-semibold" aria-hidden>
                    {option.symbol}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
