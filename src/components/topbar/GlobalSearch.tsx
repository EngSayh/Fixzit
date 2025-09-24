'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTopBar } from '@/src/contexts/TopBarContext';
import { Search } from 'lucide-react';

type Hit = { id: string; entity: string; title: string; subtitle?: string; href: string };

export function GlobalSearch() {
  const { app, searchEntities, placeholder, isRTL } = useTopBar();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const acRef = useRef<AbortController | null>(null);

  const params = useMemo(() =>
    new URLSearchParams({
      app,
      entities: searchEntities.join(','),
      q
    }), [app, searchEntities, q]);

  useEffect(() => {
    if (!q.trim()) { 
      setHits([]); 
      setOpen(false);
      return; 
    }
    
    acRef.current?.abort();
    const ac = new AbortController(); 
    acRef.current = ac;
    
    setLoading(true);
    fetch(`/api/search?${params.toString()}`, { signal: ac.signal })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((data: Hit[]) => {
        setHits(data);
        setOpen(true);
      })
      .catch(() => {/* swallow cancels */})
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mac = navigator.platform.toUpperCase().includes('MAC');
      const combo = mac ? e.metaKey && e.key.toLowerCase() === 'k' : e.ctrlKey && e.key.toLowerCase() === 'k';
      if (combo) { 
        e.preventDefault(); 
        setOpen(true);
        document.getElementById('global-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative flex-1 max-w-lg">
      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 opacity-70 ${isRTL ? 'right-3' : 'left-3'}`} />
        <input
          id="global-search-input"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder}
          aria-label="Global search"
          className={`w-full rounded-lg bg-white/15 px-10 py-2 text-sm placeholder-white/70 outline-none focus:ring-2 focus:ring-white/70 ${isRTL ? 'text-right' : ''}`}
        />
        {loading && (
          <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'}`}>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/70"></div>
          </div>
        )}
      </div>
      
      {open && hits.length > 0 && (
        <div 
          role="listbox" 
          className={`absolute top-full mt-2 max-h-96 w-full overflow-auto rounded-md bg-white p-1 text-sm text-gray-900 shadow-lg z-50 ${isRTL ? 'right-0' : 'left-0'}`}
        >
          {hits.map(h => (
            <a 
              key={`${h.entity}:${h.id}`} 
              href={h.href} 
              className="block rounded px-2 py-2 hover:bg-gray-100" 
              role="option"
            >
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