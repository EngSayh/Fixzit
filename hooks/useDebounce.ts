/**
 * useDebounce Hook
 * 
 * Debounces a value to prevent excessive updates/API calls.
 * Useful for search inputs, form validation, and real-time filtering.
 * 
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     // Perform API search
 *   }
 * }, [debouncedSearchTerm]);
 * ```
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay expires
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebounceCallback Hook
 * 
 * Debounces a callback function to prevent excessive invocations.
 * Returns a memoized debounced version of the callback.
 * 
 * @example
 * ```tsx
 * const handleSearch = useDebounceCallback((term: string) => {
 *   fetch(`/api/search?q=${term}`);
 * }, 300);
 * 
 * return <input onChange={(e) => handleSearch(e.target.value)} />;
 * ```
 */

import { useCallback, useRef } from 'react';

export function useDebounceCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}
