/**
 * usePagination Hook
 * 
 * Centralized pagination state management with URL sync and smart defaults.
 * Supports page size options (25, 50, 100, all) and persists state to URL.
 * 
 * @example
 * ```tsx
 * const pagination = usePagination({
 *   totalItems: data?.total ?? 0,
 *   defaultPageSize: 25,
 *   syncToUrl: true,
 * });
 * 
 * // Use in API calls
 * const { data } = useSWR(`/api/items?page=${pagination.page}&limit=${pagination.pageSize}`);
 * 
 * // Use with Pagination component
 * <Pagination {...pagination.paginationProps} />
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

/** Standard page size options */
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number] | 'all';

export interface UsePaginationOptions {
  /** Total number of items (required for calculating pages) */
  totalItems: number;
  /** Default page size (default: 25) */
  defaultPageSize?: number;
  /** Whether to sync pagination state to URL (default: true) */
  syncToUrl?: boolean;
  /** URL parameter name for page (default: 'page') */
  pageParam?: string;
  /** URL parameter name for pageSize (default: 'pageSize') */
  pageSizeParam?: string;
  /** Maximum items when "all" is selected (safety limit, default: 1000) */
  maxAllItems?: number;
}

export interface PaginationState {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page (or total for 'all') */
  pageSize: number;
  /** Whether showing all items */
  isShowingAll: boolean;
  /** Total pages */
  totalPages: number;
  /** Total items */
  totalItems: number;
  /** First item index (1-indexed, for display) */
  startIndex: number;
  /** Last item index (1-indexed, for display) */
  endIndex: number;
  /** Has previous page */
  hasPrevious: boolean;
  /** Has next page */
  hasNext: boolean;
  /** Can go to first page */
  canGoFirst: boolean;
  /** Can go to last page */
  canGoLast: boolean;
}

export interface PaginationActions {
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  previousPage: () => void;
  /** Go to first page */
  firstPage: () => void;
  /** Go to last page */
  lastPage: () => void;
  /** Change page size */
  setPageSize: (size: number | 'all') => void;
  /** Reset to first page with default page size */
  reset: () => void;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  pageSizeOptions: readonly number[];
  showingAll: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number | 'all') => void;
}

export interface UsePaginationReturn extends PaginationState, PaginationActions {
  /** Props to spread on Pagination component */
  paginationProps: PaginationProps;
  /** Skip value for API calls (0-indexed offset) */
  skip: number;
  /** Limit value for API calls */
  limit: number;
}

export function usePagination(options: UsePaginationOptions): UsePaginationReturn {
  const {
    totalItems,
    defaultPageSize = 25,
    syncToUrl = true,
    pageParam = 'page',
    pageSizeParam = 'pageSize',
    maxAllItems = 1000,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current state from URL or use defaults
  const currentPage = useMemo(() => {
    if (!syncToUrl || !searchParams) return 1;
    const pageStr = searchParams.get(pageParam);
    const parsed = pageStr ? parseInt(pageStr, 10) : 1;
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  }, [searchParams, pageParam, syncToUrl]);

  const currentPageSize = useMemo(() => {
    if (!syncToUrl || !searchParams) return defaultPageSize;
    const sizeStr = searchParams.get(pageSizeParam);
    if (sizeStr === 'all') return Math.min(totalItems, maxAllItems);
    const parsed = sizeStr ? parseInt(sizeStr, 10) : defaultPageSize;
    return isNaN(parsed) || parsed < 1 ? defaultPageSize : parsed;
  }, [searchParams, pageSizeParam, defaultPageSize, totalItems, maxAllItems, syncToUrl]);

  const isShowingAll = useMemo(() => {
    if (!syncToUrl || !searchParams) return false;
    return searchParams.get(pageSizeParam) === 'all';
  }, [searchParams, pageSizeParam, syncToUrl]);

  // Calculate derived values
  const totalPages = useMemo(() => {
    if (totalItems === 0) return 1;
    if (isShowingAll) return 1;
    return Math.ceil(totalItems / currentPageSize);
  }, [totalItems, currentPageSize, isShowingAll]);

  // Ensure current page is valid
  const validPage = useMemo(() => {
    return Math.min(Math.max(1, currentPage), totalPages);
  }, [currentPage, totalPages]);

  const startIndex = useMemo(() => {
    if (totalItems === 0) return 0;
    return (validPage - 1) * currentPageSize + 1;
  }, [validPage, currentPageSize, totalItems]);

  const endIndex = useMemo(() => {
    if (totalItems === 0) return 0;
    return Math.min(validPage * currentPageSize, totalItems);
  }, [validPage, currentPageSize, totalItems]);

  // URL update helper
  const updateUrl = useCallback(
    (updates: { page?: number; pageSize?: number | 'all' }) => {
      if (!syncToUrl || !searchParams) return;

      const params = new URLSearchParams(searchParams.toString());

      if (updates.page !== undefined) {
        if (updates.page === 1) {
          params.delete(pageParam);
        } else {
          params.set(pageParam, updates.page.toString());
        }
      }

      if (updates.pageSize !== undefined) {
        if (updates.pageSize === defaultPageSize) {
          params.delete(pageSizeParam);
        } else if (updates.pageSize === 'all') {
          params.set(pageSizeParam, 'all');
        } else {
          params.set(pageSizeParam, updates.pageSize.toString());
        }
      }

      const queryString = params.toString();
      const basePath = pathname ?? '/';
      router.push(queryString ? `${basePath}?${queryString}` : basePath, {
        scroll: false,
      });
    },
    [syncToUrl, searchParams, pageParam, pageSizeParam, defaultPageSize, pathname, router]
  );

  // Actions
  const goToPage = useCallback(
    (page: number) => {
      const validatedPage = Math.min(Math.max(1, page), totalPages);
      updateUrl({ page: validatedPage });
    },
    [totalPages, updateUrl]
  );

  const nextPage = useCallback(() => {
    if (validPage < totalPages) {
      goToPage(validPage + 1);
    }
  }, [validPage, totalPages, goToPage]);

  const previousPage = useCallback(() => {
    if (validPage > 1) {
      goToPage(validPage - 1);
    }
  }, [validPage, goToPage]);

  const firstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const lastPage = useCallback(() => {
    goToPage(totalPages);
  }, [totalPages, goToPage]);

  const setPageSize = useCallback(
    (size: number | 'all') => {
      // Reset to page 1 when changing page size
      updateUrl({ page: 1, pageSize: size });
    },
    [updateUrl]
  );

  const reset = useCallback(() => {
    updateUrl({ page: 1, pageSize: defaultPageSize });
  }, [defaultPageSize, updateUrl]);

  // Build pagination props for component
  const paginationProps: PaginationProps = useMemo(
    () => ({
      currentPage: validPage,
      totalPages,
      totalItems,
      itemsPerPage: currentPageSize,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      showingAll: isShowingAll,
      onPageChange: goToPage,
      onPageSizeChange: setPageSize,
    }),
    [validPage, totalPages, totalItems, currentPageSize, isShowingAll, goToPage, setPageSize]
  );

  return {
    // State
    page: validPage,
    pageSize: currentPageSize,
    isShowingAll,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    hasPrevious: validPage > 1,
    hasNext: validPage < totalPages,
    canGoFirst: validPage > 1,
    canGoLast: validPage < totalPages,

    // Actions
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize,
    reset,

    // Props for component
    paginationProps,

    // API helpers
    skip: (validPage - 1) * currentPageSize,
    limit: isShowingAll ? maxAllItems : currentPageSize,
  };
}

export default usePagination;
