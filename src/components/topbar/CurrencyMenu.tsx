'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

type Currency = { code: 'SAR' | 'USD' | 'EUR' | 'AED' | 'GBP'; label: string; symbol: string };

const LIST: Currency[] = [
  { code: 'SAR', label: 'Saudi Riyal', symbol: '﷼' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'GBP', label: 'British Pound', symbol: '£' }
];

const STORAGE_KEY = 'fxz_currency';

export default function CurrencyMenu() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [code, setCode] = useState<Currency['code']>('SAR');

  useEffect(() => {
    try {
      const saved = (localStorage.getItem(STORAGE_KEY) as Currency['code']) || 'SAR';
      setCode(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
      document.cookie = `fxz_currency=${code}; path=/; max-age=31536000; SameSite=Lax`;
      // إشعار اختياري للمستمعين داخل نفس علامة التبويب
      window.dispatchEvent(new CustomEvent('fxz:currency', { detail: { code } }));
    } catch {}
  }, [code]);

  const current = useMemo(() => LIST.find(c => c.code === code) || LIST[0], [code]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return LIST;
    return LIST.filter(c =>
      c.code.toLowerCase().includes(t) || c.label.toLowerCase().includes(t) || c.symbol.includes(t)
    );
  }, [q]);

  return (
    <div className="relative">
      <button
        data-testid="currency-selector"
        aria-label={`Currency: ${current.label} (${current.code})`}
        onClick={() => setOpen(v => !v)}
        className="ml-1 px-2 py-1 rounded border hover:bg-slate-100 flex items-center gap-2"
      >
        <span className="text-base" aria-hidden>
          {current.symbol}
        </span>
        <span className="text-sm">{current.code}</span>
        <ChevronDown className="w-4 h-4 opacity-70" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-md border bg-white shadow-lg z-[70] p-2">
          <div className="flex items-center gap-2 p-2 border-b">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              aria-label="Filter currencies"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Type to filter… (e.g., SAR, $)"
              className="w-full outline-none text-sm placeholder-gray-400"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.map(c => (
              <li key={c.code}>
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-left"
                  onClick={() => {
                    setCode(c.code);
                    setOpen(false);
                  }}
                >
                  <span className="text-base" aria-hidden>
                    {c.symbol}
                  </span>
                  <span className="flex-1">{c.label}</span>
                  <span className="text-xs text-gray-600">{c.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


