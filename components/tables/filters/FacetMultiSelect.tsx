/**
 * FacetMultiSelect Component
 * 
 * Multi-select dropdown with search for faceted filtering
 * Used for categories, statuses, priorities, etc.
 * 
 * @example
 * ```tsx
 * <FacetMultiSelect
 *   label="Status"
 *   options={[
 *     { value: 'open', label: 'Open', count: 12 },
 *     { value: 'in-progress', label: 'In Progress', count: 8 }
 *   ]}
 *   selected={['open']}
 *   onChange={(values) => setFilters({ status: values })}
 * />
 * ```
 */

import React, { useState, useMemo } from 'react';
import { Check, Search } from '@/components/ui/icons';

export interface FacetOption {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface FacetMultiSelectProps {
  label: string;
  options: FacetOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
  maxHeight?: string;
  className?: string;
}

export function FacetMultiSelect({
  label,
  options,
  selected,
  onChange,
  searchable = true,
  maxHeight = '300px',
  className,
}: FacetMultiSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    
    const query = searchQuery.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [options, searchQuery]);
  
  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };
  
  const handleSelectAll = () => {
    onChange(filteredOptions.map((opt) => opt.value));
  };
  
  const handleClearAll = () => {
    onChange([]);
  };
  
  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={handleSelectAll}
          >
            Select all
          </button>
          {selected.length > 0 && (
            <button
              type="button"
              className="text-xs text-gray-500 hover:underline"
              onClick={handleClearAll}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      
      {searchable && options.length > 5 && (
        <div className="relative mb-3">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${label.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 ps-10 pe-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      )}
      
      <div
        className="space-y-1 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800"
        style={{ maxHeight }}
      >
        {filteredOptions.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No options found
          </div>
        ) : (
          filteredOptions.map((option) => (
            <label
              key={option.value}
              className={[
                'flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700',
                option.disabled ? 'cursor-not-allowed opacity-50' : '',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => handleToggle(option.value)}
                disabled={option.disabled}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
              />
              <span className="flex-1 text-gray-700 dark:text-gray-200">
                {option.label}
              </span>
              {option.count !== undefined && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {option.count}
                </span>
              )}
              {selected.includes(option.value) && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </label>
          ))
        )}
      </div>
    </div>
  );
}
