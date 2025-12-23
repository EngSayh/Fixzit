/**
 * DateRangePicker Component
 * 
 * Date range selector with presets (Today, Last 7 days, etc.) and custom range
 * 
 * @example
 * ```tsx
 * <DateRangePicker
 *   label="Created Date"
 *   value={{ from: '2025-01-01', to: '2025-12-31' }}
 *   onChange={(range) => setFilters({ createdDate: range })}
 * />
 * ```
 */

import React from 'react';
import { Calendar } from '@/components/ui/icons';

export interface DateRange {
  from?: string; // ISO date string
  to?: string;
}

export interface DateRangePickerProps {
  label: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
];

function getPresetDates(preset: string): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (preset) {
    case 'today':
      return {
        from: today.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      };
    case '7d': {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return {
        from: sevenDaysAgo.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      };
    }
    case '30d': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return {
        from: thirtyDaysAgo.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      };
    }
    case 'quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
      return {
        from: quarterStart.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      };
    }
    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return {
        from: yearStart.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      };
    }
    default:
      return {};
  }
}

export function DateRangePicker({
  label,
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [showCustom, setShowCustom] = React.useState(false);
  
  const handlePresetClick = (preset: string) => {
    if (preset === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChange(getPresetDates(preset));
    }
  };
  
  return (
    <div className={className}>
      <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      
      <div className="mb-3 grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => handlePresetClick(preset.value)}
            className={[
              'rounded-md border px-3 py-2 text-xs font-medium transition-colors',
              preset.value === 'custom' && showCustom
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
            ].join(' ')}
          >
            {preset.label}
          </button>
        ))}
      </div>
      
      {(showCustom || value.from || value.to) && (
        <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
              From
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={value.from || ''}
                onChange={(e) => onChange({ ...value, from: e.target.value })}
                className="w-full rounded-md border border-gray-300 py-2 ps-10 pe-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
              To
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={value.to || ''}
                onChange={(e) => onChange({ ...value, to: e.target.value })}
                className="w-full rounded-md border border-gray-300 py-2 ps-10 pe-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
