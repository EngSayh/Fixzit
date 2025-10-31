'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { useRouter } from 'next/navigation';
import { useTopBar } from '@/contexts/TopBarContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { Search, Command } from 'lucide-react';

interface SearchResult {
  id: string;
  entity: string;
  title: string;
  subtitle: string;
  href: string;
}

interface GlobalSearchProps {
  onResultClick?: () => void;
}

export default function GlobalSearch({ onResultClick }: GlobalSearchProps = {}) {
  const router = useRouter();
  const { app, searchPlaceholderKey, searchEntities } = useTopBar(); // FIX: Use searchPlaceholderKey
  const { t, isRTL } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const listboxId = useId();

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  // Debounced search
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          app,
          q: query,
          entities: searchEntities.join(',')
        });

        const response = await fetch(`/api/search?${params}`);
        if (!response.ok) {
          throw new Error('Search request failed');
        }
        const data = await response.json();
        setResults(data.results || []);
        setOpen(true);
      } catch (err) {
        console.error('Search failed:', err);
        setError('Search failed. Please try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, app, searchEntities]);

  // Close on outside click and Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [open]);

  // Keyboard shortcuts (Ctrl/Cmd + K to focus search)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResultClick = (href: string) => {
    setOpen(false);
    setQuery('');
    setError(null);
    onResultClick?.(); // Call optional callback before navigation
    router.push(href); // Use Next.js router for client-side navigation
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[activeIndex]) {
          handleResultClick(results[activeIndex].href);
        }
        break;
    }
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-lg">
      <div className="relative">
        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t(searchPlaceholderKey, 'Search...')} // FIX: Translate placeholder
          role="combobox"
          aria-label="Global search"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={open && results[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          className={`w-full ${isRTL ? 'pr-10 pl-20' : 'pl-10 pr-20'} py-2 border border-input rounded-md focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-background text-foreground`}
        />
        <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground`}>
          <Command className="w-3 h-3" />
          <span>K</span>
        </div>
      </div>

      {open && (
        <div 
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className={`absolute top-full ${isRTL ? 'right-0' : 'left-0'} mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto min-w-full`}
        >
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500 mx-auto"></div>
              <div className="text-xs mt-2">Searching...</div>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-600">
              <div className="text-sm">{error}</div>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.entity}-${result.id}`}
                  id={`${listboxId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => handleResultClick(result.href)}
                  className={`w-full px-4 py-3 text-left hover:bg-accent border-b border-border last:border-b-0 transition-colors ${
                    index === activeIndex ? 'bg-accent' : ''
                  }`}
                >
                  <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-foreground">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-xs text-muted-foreground mt-1">{result.subtitle}</div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      {result.entity.replace('_', ' ')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query && !loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="text-sm">No results found for &ldquo;{query}&rdquo;</div>
              <div className="text-xs mt-1">Try different keywords</div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
