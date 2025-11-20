'use client';

import React, { useEffect, useMemo, useRef, useState, useId } from 'react';
import { CircleDollarSign, Search } from 'lucide-react';
import { useCurrency, type CurrencyOption } from '@/contexts/CurrencyContext';
import { useTranslation } from '@/contexts/TranslationContext';

interface CurrencySelectorProps {
  variant?: 'default' | 'compact';
}

/**
 * A currency picker UI that displays the current currency and lets the user search and select another.
 *
 * Renders a button showing the current currency (flag and code) and a dropdown list of available currencies.
 * Typing in the dropdown's search input filters options by currency code or name (case-insensitive).
 * Selecting an option updates the active currency via CurrencyContext, closes the dropdown, and clears the search.
 * The dropdown also closes when clicking outside the component.
 *
 * @param {'default' | 'compact'} [variant='default'] - Visual variant of the control. `'default'` uses larger padding and width; `'compact'` reduces padding and width.
 * @returns {JSX.Element} A React element for the currency selector.
 */
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

  // keyboard handled on the input onKeyDown

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
    return () => {
      document.removeEventListener('mousedown', handleClick);
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
    <div className="relative" ref={containerRef} data-testid="currency-selector">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${t('i18n.selectCurrencyLabel', 'Select currency')} ${current.code}`}
        aria-controls={open ? listboxId : undefined}
        onClick={toggle}
        ref={buttonRef}
        className={`flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors ${buttonPadding} ${isRTL ? 'flex-row-reverse' : ''}`}
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
          className={`absolute z-[100] mt-2 rounded-2xl border border-border bg-card p-3 shadow-2xl ${dropdownWidth} max-w-[calc(100vw-2rem)] ${isRTL ? 'start-0' : 'end-0'} animate-in slide-in-from-top-2 duration-200`}
        >
          {/* Arrow pointer */}
          <div className={`hidden md:block absolute -top-2 w-3 h-3 bg-card border-l border-t border-border transform rotate-45 ${isRTL ? 'start-8' : 'end-8'}`}></div>
          <div className="relative mb-2">
            <Search className={`pointer-events-none absolute top-2 h-4 w-4 text-muted-foreground ${isRTL ? 'end-2' : 'start-2'}`} aria-hidden="true" focusable="false" />
            <input
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              ref={inputRef}
              role="searchbox"
              aria-describedby={hintId}
              aria-controls={listboxId}
              aria-activedescendant={open && filtered[activeIndex] ? `${listboxId}-option-${filtered[activeIndex].code}` : undefined}
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
                    setCurrency(target.code);
                    setOpen(false);
                    setQuery('');
                    queueMicrotask(() => buttonRef.current?.focus());
                  }
                }
              }}
              className={`w-full rounded border border-border bg-card ${isRTL ? 'pe-7 ps-2' : 'ps-7 pe-2'} py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30`}
              placeholder={t('i18n.filterCurrencies', 'Type to filter currencies')}
              aria-label={t('i18n.filterCurrencies', 'Type to filter currencies')}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="done"
            />
            <p id={hintId} className="sr-only">
              {t('a11y.currencySelectorHelp', 'Use arrow keys to navigate, Enter to select, Esc to close')}
            </p>
          </div>
          <ul className="max-h-64 overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" role="listbox" id={listboxId}>
            {filtered.map((option, idx) => (
              <li key={option.code}>
                <div
                  id={`${listboxId}-option-${option.code}`}
                  className={`flex w-full items-center gap-3 rounded-2xl px-2 py-2 hover:bg-muted cursor-pointer transition-colors ${
                    option.code === current.code ? 'bg-primary/10' : ''
                  } ${idx === activeIndex ? 'ring-1 ring-primary/30' : ''}`}
                  role="option"
                  aria-selected={option.code === current.code}
                  tabIndex={-1}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(option); }}
                >
                  <span className="text-lg" aria-hidden>
                    {option.flag}
                  </span>
                  <div className="flex-1">
                    <div className={`font-medium leading-tight ${option.code === current.code ? 'text-primary' : 'text-foreground'}`}>{option.code}</div>
                    <div className="text-xs text-muted-foreground">{option.name}</div>
                  </div>
                  <span className={`text-sm font-semibold ${option.code === current.code ? 'text-primary' : 'text-foreground'}`} aria-hidden>
                    {option.symbol}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
