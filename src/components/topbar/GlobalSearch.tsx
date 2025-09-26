'use client&apos;;

import { useState, useEffect, useRef } from &apos;react&apos;;
import { useTopBar } from &apos;@/src/contexts/TopBarContext&apos;;
import { Search, Command } from &apos;lucide-react&apos;;

interface SearchResult {
  id: string;
  entity: string;
  title: string;
  subtitle: string;
  href: string;
}

export default function GlobalSearch() {
  const { app, searchPlaceholder, searchEntities } = useTopBar();
  const [query, setQuery] = useState(&apos;');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

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
      try {
        const params = new URLSearchParams({
          app,
          q: query,
          entities: searchEntities.join(&apos;,')
        });

        const response = await fetch(`/api/search?${params}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
          setOpen(true);
        }
      } catch (error) {
        console.error(&apos;Search failed:&apos;, error);
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

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener(&apos;mousedown&apos;, handleClickOutside);
    return () => document.removeEventListener(&apos;mousedown&apos;, handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === &apos;k') {
        event.preventDefault();
        const input = document.querySelector(&apos;input[aria-label="Global search"]&apos;) as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }
    };

    document.addEventListener(&apos;keydown&apos;, handleKeyDown);
    return () => document.removeEventListener(&apos;keydown&apos;, handleKeyDown);
  }, []);

  const handleResultClick = (href: string) => {
    setOpen(false);
    setQuery(&apos;');
    window.location.href = href;
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-lg">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          placeholder={searchPlaceholder}
          aria-label="Global search"
          className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs text-gray-400">
          <Command className="w-3 h-3" />
          <span>K</span>
        </div>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto"></div>
              <div className="text-xs mt-2">Searching...</div>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={`${result.entity}-${result.id}`}
                  onClick={() => handleResultClick(result.href)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-xs text-gray-500 mt-1">{result.subtitle}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">
                      {result.entity.replace(&apos;_', &apos; ')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query && !loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="text-sm">No results found for "{query}"</div>
              <div className="text-xs mt-1">Try different keywords</div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}