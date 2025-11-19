'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchSuggestion {
  type: 'product' | 'category' | 'recent';
  text: string;
  fsin?: string;
  category?: string;
}

interface SearchBarProps {
  initialQuery?: string;
  onSearch?: (_query: string) => void;
  placeholder?: string;
  showSuggestions?: boolean;
}

export default function SearchBar({
  initialQuery = '',
  onSearch,
  placeholder = 'Search for products, brands, or categories...',
  showSuggestions = true,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search query (300ms)
  const debouncedQuery = useDebounce(query, 300);

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (!showSuggestions || !debouncedQuery.trim()) {
      setSuggestions(getRecentSearches());
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/souq/search?q=${encodeURIComponent(debouncedQuery)}&limit=5`
        );
        
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        
        const data = await response.json();
        
        // Transform results into suggestions
        const productSuggestions: SearchSuggestion[] = data.data.hits.slice(0, 5).map((hit: { title: string; fsin: string }) => ({
          type: 'product' as const,
          text: hit.title,
          fsin: hit.fsin,
        }));

        // Add category suggestions from facets
        const categorySuggestions: SearchSuggestion[] = Object.keys(data.data.facets?.categories || {})
          .slice(0, 3)
          .map(cat => ({
            type: 'category' as const,
            text: cat,
            category: cat,
          }));

        setSuggestions([...productSuggestions, ...categorySuggestions]);
      } catch (error) {
        console.error('Failed to fetch search suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery, showSuggestions]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle search submission
  const handleSearch = () => {
    if (!query.trim()) return;

    // Save to recent searches
    saveRecentSearch(query);
    
    // Close dropdown
    setShowDropdown(false);

    // Callback or navigate
    if (onSearch) {
      onSearch(query);
    } else {
      router.push(`/souq/search?q=${encodeURIComponent(query)}`);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'product' && suggestion.fsin) {
      router.push(`/souq/products/${suggestion.fsin}`);
    } else if (suggestion.type === 'category' && suggestion.category) {
      router.push(`/souq/search?category=${encodeURIComponent(suggestion.category)}`);
    } else {
      setQuery(suggestion.text);
      handleSearch();
    }
    
    setShowDropdown(false);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setSuggestions(getRecentSearches());
    inputRef.current?.focus();
  };

  // Get recent searches from localStorage
  const getRecentSearches = (): SearchSuggestion[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      return recent.slice(0, 5).map((text: string) => ({
        type: 'recent' as const,
        text,
      }));
    } catch {
      return [];
    }
  };

  // Save search to recent searches
  const saveRecentSearch = (searchQuery: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      const updated = [searchQuery, ...recent.filter((s: string) => s !== searchQuery)].slice(0, 10);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  };

  return (
    <div className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="block w-full ps-10 pe-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && showSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="py-2">
              {suggestions.map((suggestion, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleSelectSuggestion(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-4 py-2 text-start hover:bg-gray-50 flex items-center gap-3 ${
                      selectedIndex === index ? 'bg-gray-50' : ''
                    }`}
                  >
                    {suggestion.type === 'recent' && (
                      <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                    {suggestion.type === 'category' && (
                      <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                    {suggestion.type === 'product' && (
                      <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                    
                    <span className="text-sm text-gray-700 flex-1">
                      {suggestion.text}
                    </span>
                    
                    {suggestion.type === 'category' && (
                      <span className="text-xs text-gray-500">Category</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <div className="p-4 text-center text-gray-500">
              No suggestions found
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              Start typing to search...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
