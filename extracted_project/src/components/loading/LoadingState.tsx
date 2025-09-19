"use client";

import React from 'react';
import { Loader2, Sparkles, Zap, AlertTriangle } from 'lucide-react';
import { GlassCard } from '../theme';
import type { LoadingState as LoadingStateType } from '../../lib/types/ui';

interface LoadingStateProps extends LoadingStateType {
  variant?: 'full' | 'inline' | 'skeleton' | 'spinner';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  loadingText = 'Loading...',
  progress,
  stage,
  error,
  variant = 'full',
  size = 'md',
  className = ''
}) => {
  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <GlassCard className="p-6 text-center max-w-md border-red-200 bg-red-50/10">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Error</h3>
          <p className="text-sm text-white/80 mb-4">{error.message}</p>
          {error.retryable && error.retryAction && (
            <button
              onClick={error.retryAction}
              className="px-4 py-2 bg-red-500/20 text-red-200 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Try Again
            </button>
          )}
        </GlassCard>
      </div>
    );
  }

  if (!isLoading) return null;

  // Size configurations
  const sizeConfig = {
    sm: { spinner: 'w-4 h-4', text: 'text-sm', card: 'p-4' },
    md: { spinner: 'w-6 h-6', text: 'text-base', card: 'p-6' },
    lg: { spinner: 'w-8 h-8', text: 'text-lg', card: 'p-8' }
  };

  const config = sizeConfig[size];

  // Full screen loading
  if (variant === 'full') {
    return (
      <div className={`min-h-screen flex items-center justify-center relative ${className}`}>
        {/* Aurora Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0061A8]/20 via-[#0ea5e9]/20 to-[#00A859]/20" />
        
        <GlassCard className={`${config.card} text-center max-w-sm mx-auto relative z-10`} variant="strong">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-brand-500 to-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-float">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className={`${config.spinner} border-2 border-white/20 border-t-brand-400 rounded-full animate-spin mx-auto`} />
              <div className="space-y-2">
                <h3 className={`${config.text} font-semibold text-white`}>{loadingText}</h3>
                {stage && (
                  <p className="text-sm text-white/60">{stage}</p>
                )}
                {progress !== undefined && (
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-brand-400 to-accent-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Inline loading
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Loader2 className={`${config.spinner} animate-spin text-brand-400`} />
        <span className={`${config.text} text-white/80`}>{loadingText}</span>
        {progress !== undefined && (
          <span className="text-sm text-white/60">({progress}%)</span>
        )}
      </div>
    );
  }

  // Spinner only
  if (variant === 'spinner') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Loader2 className={`${config.spinner} animate-spin text-brand-400`} />
      </div>
    );
  }

  // Skeleton loading
  if (variant === 'skeleton') {
    return (
      <div className={`space-y-4 ${className}`}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return null;
};

// Skeleton components
const SkeletonCard: React.FC = () => (
  <GlassCard className="p-4 animate-pulse">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-white/20 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/20 rounded w-3/4" />
        <div className="h-3 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  </GlassCard>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => (
  <GlassCard className="p-4">
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, index) => (
          <div key={index} className="h-4 bg-white/30 rounded animate-pulse" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div key={colIndex} className="h-3 bg-white/20 rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  </GlassCard>
);

export const SkeletonChart: React.FC = () => (
  <GlassCard className="p-6">
    <div className="space-y-4">
      <div className="h-4 bg-white/30 rounded w-1/4 animate-pulse" />
      <div className="h-48 bg-white/20 rounded animate-pulse" />
      <div className="flex justify-center space-x-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-white/30 rounded-full animate-pulse" />
            <div className="h-3 bg-white/20 rounded w-16 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  </GlassCard>
);

export default LoadingState;