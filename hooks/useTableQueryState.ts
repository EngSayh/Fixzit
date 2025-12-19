/**
 * useTableQueryState Hook
 * 
 * Syncs table state (search, filters, sort, pagination) with URL query params
 * and localStorage for persistence across sessions.
 * 
 * @example
 * ```tsx
 * const { state, updateState, resetState } = useTableQueryState('work-orders', {
 *   page: 1,
 *   pageSize: 20,
 *   sort: [{ id: 'createdAt', desc: true }]
 * });
 * ```
 */

import { useEffect, useState, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export interface TableState {
  page?: number;
  pageSize?: number;
  q?: string; // search query
  sort?: Array<{ id: string; desc: boolean }>;
  filters?: Record<string, unknown>;
}

const DEFAULT_STATE: TableState = {
  page: 1,
  pageSize: 20,
  q: '',
  sort: [],
  filters: {},
};

/**
 * Serialize table state to URL-friendly format
 */
function serializeState(state: TableState): URLSearchParams {
  const params = new URLSearchParams();
  
  if (state.page && state.page !== 1) {
    params.set('page', state.page.toString());
  }
  
  if (state.pageSize && state.pageSize !== 20) {
    params.set('pageSize', state.pageSize.toString());
  }
  
  if (state.q) {
    params.set('q', state.q);
  }
  
  if (state.sort && state.sort.length > 0) {
    params.set('sort', JSON.stringify(state.sort));
  }
  
  if (state.filters && Object.keys(state.filters).length > 0) {
    // Compact filter encoding: key:value,key2:value2
    const filterPairs = Object.entries(state.filters)
      .filter(([, v]) => v != null && v !== '' && (Array.isArray(v) ? v.length > 0 : true))
      .map(([k, v]) => `${k}:${JSON.stringify(v)}`);
    
    if (filterPairs.length > 0) {
      params.set('filters', filterPairs.join(','));
    }
  }
  
  return params;
}

/**
 * Parse URL query params into table state
 */
function parseState(searchParams: URLSearchParams): TableState {
  const state: TableState = { ...DEFAULT_STATE };
  
  const pageStr = searchParams.get('page');
  if (pageStr) state.page = parseInt(pageStr, 10) || 1;
  
  const pageSizeStr = searchParams.get('pageSize');
  if (pageSizeStr) state.pageSize = parseInt(pageSizeStr, 10) || 20;
  
  const q = searchParams.get('q');
  if (q) state.q = q;
  
  const sortStr = searchParams.get('sort');
  if (sortStr) {
    try {
      state.sort = JSON.parse(sortStr);
    } catch {
      state.sort = [];
    }
  }
  
  const filtersStr = searchParams.get('filters');
  if (filtersStr) {
    try {
      const filters: Record<string, unknown> = {};
      const pairs = filtersStr.split(',');
      
      pairs.forEach((pair) => {
        const [key, valueStr] = pair.split(':');
        if (key && valueStr) {
          filters[key] = JSON.parse(valueStr);
        }
      });
      
      state.filters = filters;
    } catch {
      state.filters = {};
    }
  }
  
  return state;
}

/**
 * Hook: useTableQueryState
 */
export function useTableQueryState(moduleKey: string, initialState?: Partial<TableState>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  // Initialize state from URL or localStorage
  const [state, setState] = useState<TableState>(() => {
    // 1. Try URL first
    const urlState = searchParams ? parseState(searchParams) : {};
    
    // 2. Merge with localStorage if no URL state
    if (!searchParams || !searchParams.toString()) {
      try {
        const stored = localStorage.getItem(`table-state:${moduleKey}`);
        if (stored) {
          const parsedStored = JSON.parse(stored) as TableState;
          return { ...DEFAULT_STATE, ...initialState, ...parsedStored };
        }
      } catch {
        // Ignore localStorage errors
      }
    }
    
    return { ...DEFAULT_STATE, ...initialState, ...urlState };
  });
  
  // Persist to localStorage on state change
  useEffect(() => {
    try {
      localStorage.setItem(`table-state:${moduleKey}`, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [moduleKey, state]);
  
  /**
   * Update table state and sync to URL
   */
  const updateState = useCallback(
    (updates: Partial<TableState>) => {
      setState((prev) => {
        const next = { ...prev, ...updates };
        
        // Reset page to 1 when filters/search change
        if (updates.filters !== undefined || updates.q !== undefined) {
          next.page = 1;
        }
        
        return next;
      });
      
      // Update URL without full page reload
      startTransition(() => {
        const newState = { ...state, ...updates };
        if (updates.filters !== undefined || updates.q !== undefined) {
          newState.page = 1;
        }
        
        const params = serializeState(newState);
        const newUrl = `${pathname || '/'}?${params.toString()}`;
        router.push(newUrl, { scroll: false });
      });
    },
    [state, pathname, router]
  );
  
  /**
   * Reset to default state
   */
  const resetState = useCallback(() => {
    setState({ ...DEFAULT_STATE, ...initialState });
    
    startTransition(() => {
      router.push(pathname || '/', { scroll: false });
    });
    
    try {
      localStorage.removeItem(`table-state:${moduleKey}`);
    } catch {
      // Ignore
    }
  }, [moduleKey, pathname, router, initialState]);
  
  /**
   * Set a single param (convenience)
   */
  const setParam = useCallback(
    (key: keyof TableState, value: TableState[keyof TableState]) => {
      updateState({ [key]: value });
    },
    [updateState]
  );
  
  return {
    state,
    updateState,
    resetState,
    setParam,
    isPending,
  };
}
