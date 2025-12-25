/**
 * NumericRangeFilter Component
 * 
 * Min/max numeric range inputs for amount, price, quantity filtering
 * 
 * @example
 * ```tsx
 * <NumericRangeFilter
 *   label="Amount"
 *   value={{ min: 0, max: 10000 }}
 *   onChange={(range) => setFilters({ amount: range })}
 *   prefix="SAR"
 * />
 * ```
 */

import React from 'react';

export interface NumericRange {
  min?: number;
  max?: number;
}

export interface NumericRangeFilterProps {
  label: string;
  value: NumericRange;
  onChange: (range: NumericRange) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function NumericRangeFilter({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  className,
}: NumericRangeFilterProps) {
  return (
    <div className={className}>
      <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
            Min {prefix || suffix ? `(${prefix || ''}${suffix || ''})` : ''}
          </label>
          <div className="relative">
            {prefix && (
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                {prefix}
              </span>
            )}
            <input
              type="number"
              value={value.min ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                onChange({ ...value, min: val });
              }}
              min={min}
              max={max}
              step={step}
              placeholder="No min"
              className={[
                'w-full rounded-md border border-gray-300 py-2 pe-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white',
                prefix ? 'ps-10' : 'ps-3',
              ].join(' ')}
            />
            {suffix && (
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                {suffix}
              </span>
            )}
          </div>
        </div>
        
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
            Max {prefix || suffix ? `(${prefix || ''}${suffix || ''})` : ''}
          </label>
          <div className="relative">
            {prefix && (
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                {prefix}
              </span>
            )}
            <input
              type="number"
              value={value.max ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                onChange({ ...value, max: val });
              }}
              min={min}
              max={max}
              step={step}
              placeholder="No max"
              className={[
                'w-full rounded-md border border-gray-300 py-2 pe-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white',
                prefix ? 'ps-10' : 'ps-3',
              ].join(' ')}
            />
            {suffix && (
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                {suffix}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
