/**
 * Table Skeleton Loader
 * Displays loading state for data tables
 * 
 * @module components/ui/TableSkeleton
 */

import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="w-full animate-pulse">
      {/* Header Row */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-3 mb-3">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div
            key={`header-${colIndex}`}
            className="h-4 bg-slate-200 dark:bg-slate-700 rounded flex-1"
            style={{ width: colIndex === 0 ? '40px' : undefined }}
          />
        ))}
      </div>

      {/* Data Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex gap-4 border-b border-slate-100 dark:border-slate-800 py-3"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-4 bg-slate-100 dark:bg-slate-800 rounded flex-1"
              style={{
                width: colIndex === 0 ? '40px' : undefined,
                opacity: 1 - rowIndex * 0.1,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Card List Skeleton
 * Displays loading state for mobile card lists
 */
export function CardListSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={`card-${index}`}
          className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
          style={{ opacity: 1 - index * 0.15 }}
        >
          {/* Title */}
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
          
          {/* Meta Info */}
          <div className="flex gap-2 mb-3">
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-20" />
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-24" />
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
          </div>
          
          {/* Footer */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-16" />
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
