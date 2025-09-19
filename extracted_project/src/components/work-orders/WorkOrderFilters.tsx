'use client';

import React from 'react';
import { WorkOrderFilters, WorkOrderCategory, WorkOrderPriority, WorkOrderStatus, CATEGORY_CONFIG, PRIORITY_CONFIG, STATUS_CONFIG } from '../../../types/work-orders';

interface WorkOrderFiltersProps {
  filters: WorkOrderFilters;
  onFiltersChange: (filters: WorkOrderFilters) => void;
  properties?: { id: string; name: string }[];
  users?: { id: string; firstName: string; lastName: string }[];
}

export default function WorkOrderFiltersComponent({ 
  filters, 
  onFiltersChange, 
  properties = [], 
  users = [] 
}: WorkOrderFiltersProps) {
  const updateFilter = (key: keyof WorkOrderFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: 'status' | 'priority' | 'category', value: string) => {
    if (key === 'status') {
      const currentArray = filters.status || [];
      const newArray = currentArray.includes(value as WorkOrderStatus)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value as WorkOrderStatus];
      updateFilter('status', newArray.length > 0 ? newArray : undefined);
    } else if (key === 'priority') {
      const currentArray = filters.priority || [];
      const newArray = currentArray.includes(value as WorkOrderPriority)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value as WorkOrderPriority];
      updateFilter('priority', newArray.length > 0 ? newArray : undefined);
    } else if (key === 'category') {
      const currentArray = filters.category || [];
      const newArray = currentArray.includes(value as WorkOrderCategory)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value as WorkOrderCategory];
      updateFilter('category', newArray.length > 0 ? newArray : undefined);
    }
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => 
    filters[key as keyof WorkOrderFilters] !== undefined && 
    filters[key as keyof WorkOrderFilters] !== ''
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <input
            type="text"
            placeholder="Search work orders..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.status?.includes(key as WorkOrderStatus) || false}
                  onChange={() => toggleArrayFilter('status', key)}
                  className="h-4 w-4 text-[#0061A8] focus:ring-[#0061A8] border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">{config.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <div className="space-y-2">
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.priority?.includes(key as WorkOrderPriority) || false}
                  onChange={() => toggleArrayFilter('priority', key)}
                  className="h-4 w-4 text-[#0061A8] focus:ring-[#0061A8] border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">{config.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <div className="space-y-2">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.category?.includes(key as WorkOrderCategory) || false}
                  onChange={() => toggleArrayFilter('category', key)}
                  className="h-4 w-4 text-[#0061A8] focus:ring-[#0061A8] border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">
                  {config.icon} {config.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Property Filter */}
        {properties.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property
            </label>
            <select
              value={filters.propertyId || ''}
              onChange={(e) => updateFilter('propertyId', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
            >
              <option value="">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Assigned To Filter */}
        {users.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned To
            </label>
            <select
              value={filters.assignedTo || ''}
              onChange={(e) => updateFilter('assignedTo', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date From
          </label>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date To
          </label>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
          />
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: "{filters.search}"
                <button
                  onClick={() => updateFilter('search', undefined)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            
            {filters.status?.map(status => (
              <span key={status} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Status: {STATUS_CONFIG[status].label}
                <button
                  onClick={() => toggleArrayFilter('status', status)}
                  className="ml-2 text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            ))}
            
            {filters.priority?.map(priority => (
              <span key={priority} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Priority: {PRIORITY_CONFIG[priority].label}
                <button
                  onClick={() => toggleArrayFilter('priority', priority)}
                  className="ml-2 text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            ))}
            
            {filters.category?.map(category => (
              <span key={category} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {CATEGORY_CONFIG[category].icon} {CATEGORY_CONFIG[category].label}
                <button
                  onClick={() => toggleArrayFilter('category', category)}
                  className="ml-2 text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}