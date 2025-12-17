/**
 * Trend Indicator Component
 * Shows percentage change with color and arrow
 */
"use client";

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendIndicatorProps {
  value: number;
  label?: string;
  className?: string;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({ 
  value, 
  label,
  className 
}) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  return (
    <div className={cn(
      "flex items-center gap-1 text-sm font-medium",
      isPositive && "text-green-600 dark:text-green-400",
      !isPositive && !isNeutral && "text-red-600 dark:text-red-400",
      isNeutral && "text-gray-500",
      className
    )}>
      {!isNeutral && (
        isPositive ? 
          <TrendingUp className="w-4 h-4" /> : 
          <TrendingDown className="w-4 h-4" />
      )}
      <span>{isPositive ? '+' : ''}{value.toFixed(1)}%</span>
      {label && <span className="text-gray-500 dark:text-gray-400 font-normal">{label}</span>}
    </div>
  );
};
