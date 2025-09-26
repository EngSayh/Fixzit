'use client&apos;;

import { useEffect, useMemo, useRef, useState } from &apos;react&apos;;
import { CircleDollarSign, Search } from &apos;lucide-react&apos;;
import { useCurrency, CURRENCY_OPTIONS, type CurrencyOption } from &apos;@/src/contexts/CurrencyContext&apos;;

interface CurrencySelectorProps {
  variant?: &apos;default&apos; | &apos;compact&apos;;
}

export default function CurrencySelector({ variant = &apos;default&apos; }: CurrencySelectorProps) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(&apos;');
  const containerRef = useRef<HTMLDivElement>(null);

  const current = useMemo<CurrencyOption>(() => {
    return CURRENCY_OPTIONS.find(option => option.code === currency) ?? CURRENCY_OPTIONS[0];
  }, [currency]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return CURRENCY_OPTIONS;
    }
    return CURRENCY_OPTIONS.filter(option => {
      return (
        option.code.toLowerCase().includes(term) ||
        option.name.toLowerCase().includes(term)
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
  const dropdownWidth = variant === &apos;compact&apos; ? &apos;w-56&apos; : &apos;w-64&apos;;

  const toggle = () => setOpen(prev => !prev);

  const handleSelect = (option: CurrencyOption) => {
    setCurrency(option.code);
    setOpen(false);
    setQuery(&apos;');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Currency ${current.code}`}
        onClick={toggle}
        className={`flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors ${buttonPadding}`}
      >
        <CircleDollarSign className="h-4 w-4" />
        <span className="flex items-center gap-2">
          <span className="text-sm" aria-hidden>
            {current.flag}
          </span>
          {variant === &apos;compact&apos; ? (
            <span className="text-xs font-semibold">{current.code}</span>
          ) : (
            <span className="text-sm font-semibold">{current.code}</span>
          )}
        </span>
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg ${dropdownWidth} right-0`}
        >
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              className="w-full rounded border border-gray-300 bg-white pl-7 pr-2 py-1.5 text-sm focus:border-[#0061A8] focus:outline-none focus:ring-1 focus:ring-[#0061A8]/30"
              placeholder="Type to filter currencies"
              aria-label="Type to filter currencies"
            />
          </div>
          <ul className="max-h-64 overflow-auto" role="listbox">
            {filtered.map(option => (
              <li key={option.code}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-gray-100 ${
                    option.code === current.code ? &apos;bg-[#0061A8]/10 text-[#0061A8]&apos; : &apos;'
                  }`}
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
