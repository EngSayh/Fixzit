'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type Hit = { id: string; entity: string; title: string; subtitle?: string; href: string };

function scopeFromPath(path: string): { app: 'fm'|'aqar'|'souq'; placeholder: string } {
  if (path.startsWith('/aqar')) return { app: 'aqar', placeholder: 'Search listings, projects, agents…' };
  if (path.startsWith('/souq') || path.startsWith('/marketplace')) return { app: 'souq', placeholder: 'Search catalog, vendors, RFQs, orders…' };
  return { app: 'fm', placeholder: 'Search Work Orders, Properties, Tenants…' };
}

export default function GlobalSearch() {
  const pathname = usePathname() || '/';
  const { app, placeholder } = scopeFromPath(pathname);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const acRef = useRef<AbortController | null>(null);

  const params = useMemo(() => new URLSearchParams({ app, q }), [app, q]);

  useEffect(() => {
    if (!q.trim()) { setHits([]); return; }
    acRef.current?.abort();
    const ac = new AbortController(); acRef.current = ac;
    fetch(`/api/search?${params.toString()}`, { signal: ac.signal })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((data: Hit[]) => setHits(data || []))
      .catch(() => {});
  }, [params]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const combo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      if (combo) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        aria-label="Global search"
        className="w-full rounded bg-white/10 px-3 py-1 text-sm placeholder-white/70 outline-none focus:ring-2 focus:ring-white/70"
      />
      {open && hits.length > 0 && (
        <div role="listbox" className="absolute right-0 z-50 mt-1 max-h-96 w-[48ch] overflow-auto rounded-md bg-white p-1 text-sm text-gray-900 shadow-lg">
          {hits.map((h: Hit) => (
            <a key={`${h.entity}:${h.id}`} href={h.href} className="block rounded px-2 py-1 hover:bg-gray-100" role="option">
              <div className="font-medium">{h.title}</div>
              {h.subtitle && <div className="text-xs text-gray-500">{h.subtitle}</div>}
              <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">{h.entity}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

