'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 7,
  className 
}: SkeletonTableProps) {
  return (
    <div className={cn('w-full rounded-lg border border-border overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-muted/50 px-4 py-3 flex items-center gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            className={cn(
              'h-4 bg-muted rounded animate-shimmer',
              i === 0 && 'w-8',
              i === 1 && 'w-16',
              i === 2 && 'w-12',
              i === 3 && 'w-48 flex-1',
              i === 4 && 'w-20',
              i === 5 && 'w-24',
              i === 6 && 'w-24',
              i > 6 && 'w-24'
            )}
            style={{
              backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
              backgroundSize: '200% 100%',
            }}
          />
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="px-4 py-4 flex items-center gap-4"
            style={{
              animationDelay: `${rowIndex * 50}ms`,
            }}
          >
            {/* Checkbox skeleton */}
            <div className="w-4 h-4 rounded bg-muted animate-shimmer" />
            
            {/* ID skeleton */}
            <div 
              className="w-16 h-4 bg-muted rounded animate-shimmer"
              style={{ animationDelay: `${rowIndex * 50 + 50}ms` }}
            />
            
            {/* Priority badge skeleton */}
            <div 
              className="w-12 h-6 bg-muted rounded-full animate-shimmer"
              style={{ animationDelay: `${rowIndex * 50 + 100}ms` }}
            />
            
            {/* Title skeleton */}
            <div className="flex-1 space-y-2">
              <div 
                className="h-4 bg-muted rounded animate-shimmer"
                style={{ 
                  width: `${60 + Math.random() * 30}%`,
                  animationDelay: `${rowIndex * 50 + 150}ms` 
                }}
              />
              <div 
                className="h-3 bg-muted/50 rounded animate-shimmer"
                style={{ 
                  width: `${30 + Math.random() * 20}%`,
                  animationDelay: `${rowIndex * 50 + 200}ms` 
                }}
              />
            </div>
            
            {/* Status badge skeleton */}
            <div 
              className="w-20 h-6 bg-muted rounded-full animate-shimmer"
              style={{ animationDelay: `${rowIndex * 50 + 250}ms` }}
            />
            
            {/* Category skeleton */}
            <div 
              className="w-24 h-4 bg-muted rounded animate-shimmer"
              style={{ animationDelay: `${rowIndex * 50 + 300}ms` }}
            />
            
            {/* Module skeleton */}
            <div 
              className="w-16 h-4 bg-muted rounded animate-shimmer"
              style={{ animationDelay: `${rowIndex * 50 + 350}ms` }}
            />
            
            {/* Date skeleton */}
            <div 
              className="w-20 h-4 bg-muted rounded animate-shimmer"
              style={{ animationDelay: `${rowIndex * 50 + 400}ms` }}
            />
            
            {/* Actions skeleton */}
            <div 
              className="w-8 h-8 bg-muted rounded animate-shimmer"
              style={{ animationDelay: `${rowIndex * 50 + 450}ms` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Individual skeleton components for reuse
export function SkeletonBadge({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        'h-6 w-16 bg-muted rounded-full animate-shimmer',
        className
      )} 
    />
  );
}

export function SkeletonText({ 
  className, 
  width = 'w-24' 
}: { 
  className?: string; 
  width?: string;
}) {
  return (
    <div 
      className={cn(
        'h-4 bg-muted rounded animate-shimmer',
        width,
        className
      )} 
    />
  );
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        'h-8 w-8 bg-muted rounded-full animate-shimmer',
        className
      )} 
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        'rounded-lg border border-border p-4 space-y-3',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <SkeletonText width="w-32" />
        <SkeletonBadge />
      </div>
      <SkeletonText width="w-full" />
      <SkeletonText width="w-3/4" />
      <div className="flex items-center gap-2 pt-2">
        <SkeletonAvatar />
        <SkeletonText width="w-20" />
      </div>
    </div>
  );
}

// KPI card skeleton
export function SkeletonKPICard({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        'rounded-lg border border-border bg-card p-4',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-16 bg-muted rounded animate-shimmer" />
        <div className="h-5 w-5 bg-muted rounded animate-shimmer" />
      </div>
      <div className="h-8 w-20 bg-muted rounded animate-shimmer mb-2" />
      <div className="h-3 w-24 bg-muted/50 rounded animate-shimmer" />
    </div>
  );
}

// Dashboard skeleton
export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonKPICard key={i} />
        ))}
      </div>

      {/* Priority Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-4 bg-muted rounded-full animate-shimmer" />
              <div className="h-4 w-16 bg-muted rounded animate-shimmer" />
            </div>
            <div className="h-8 w-12 bg-muted rounded animate-shimmer" />
          </div>
        ))}
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div 
            key={i}
            className="h-9 w-20 bg-muted rounded-lg animate-shimmer"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

      {/* Table skeleton */}
      <SkeletonTable rows={8} />
    </div>
  );
}

export default SkeletonTable;
