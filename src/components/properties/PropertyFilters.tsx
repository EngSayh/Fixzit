'use client';

import React, { useState } from 'react';
import { PropertyFilters, PropertyType, UnitStatus, PROPERTY_TYPE_CONFIG, UNIT_STATUS_CONFIG } from '../../../types/properties';

interface PropertyFiltersProps {
  filters: PropertyFilters;
  onFiltersChange: (filters: PropertyFilters) => void;
  propertyCount?: number;
}

export default function PropertyFiltersComponent({ 
  filters, 
  onFiltersChange,
  propertyCount = 0 
}: PropertyFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilters = (updates: Partial<PropertyFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-gray-900">Filters</h3>
          {propertyCount > 0 && (
            <span className="text-sm text-gray-500">
              {propertyCount} {propertyCount === 1 ? 'property' : 'properties'}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear all
            </button>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <svg 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search properties..."
            value={filters.search || ''}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8] transition-colors"
          />
        </div>
      </div>

      {/* Expandable Filters */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Property Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PROPERTY_TYPE_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => {
                    const currentTypes = filters.type || [];
                    const newTypes = currentTypes.includes(type as PropertyType)
                      ? currentTypes.filter(t => t !== type)
                      : [...currentTypes, type as PropertyType];
                    updateFilters({ type: newTypes });
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.type?.includes(type as PropertyType)
                      ? 'bg-[#0061A8] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Unit Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unit Status</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(UNIT_STATUS_CONFIG).map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => {
                    const currentStatuses = filters.status || [];
                    const newStatuses = currentStatuses.includes(status as UnitStatus)
                      ? currentStatuses.filter(s => s !== status)
                      : [...currentStatuses, status as UnitStatus];
                    updateFilters({ status: newStatuses });
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.status?.includes(status as UnitStatus)
                      ? 'bg-[#0061A8] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Occupancy Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Occupancy Rate: {filters.occupancyRange?.[0] || 0}% - {filters.occupancyRange?.[1] || 100}%
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                value={filters.occupancyRange?.[0] || 0}
                onChange={(e) => {
                  const newMin = parseInt(e.target.value);
                  const currentMax = filters.occupancyRange?.[1] || 100;
                  updateFilters({ 
                    occupancyRange: [newMin, Math.max(newMin, currentMax)] 
                  });
                }}
                className="flex-1"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={filters.occupancyRange?.[1] || 100}
                onChange={(e) => {
                  const newMax = parseInt(e.target.value);
                  const currentMin = filters.occupancyRange?.[0] || 0;
                  updateFilters({ 
                    occupancyRange: [Math.min(currentMin, newMax), newMax] 
                  });
                }}
                className="flex-1"
              />
            </div>
          </div>

          {/* Revenue Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Revenue Range</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Min SAR"
                  value={filters.revenueRange?.[0] || ''}
                  onChange={(e) => {
                    const newMin = parseInt(e.target.value) || 0;
                    const currentMax = filters.revenueRange?.[1] || 999999;
                    updateFilters({ revenueRange: [newMin, currentMax] });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
                />
              </div>
              <span className="text-gray-500">to</span>
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Max SAR"
                  value={filters.revenueRange?.[1] || ''}
                  onChange={(e) => {
                    const newMax = parseInt(e.target.value) || 999999;
                    const currentMin = filters.revenueRange?.[0] || 0;
                    updateFilters({ revenueRange: [currentMin, newMax] });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              placeholder="Enter city or area..."
              value={filters.location || ''}
              onChange={(e) => updateFilters({ location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => updateFilters({ dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => updateFilters({ dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {filters.type?.map(type => (
              <span 
                key={type}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[#0061A8] text-white text-xs rounded-md"
              >
                {PROPERTY_TYPE_CONFIG[type].label}
                <button
                  onClick={() => {
                    const newTypes = filters.type?.filter(t => t !== type) || [];
                    updateFilters({ type: newTypes.length > 0 ? newTypes : undefined });
                  }}
                  className="ml-1 hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
            
            {filters.status?.map(status => (
              <span 
                key={status}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[#0061A8] text-white text-xs rounded-md"
              >
                {UNIT_STATUS_CONFIG[status].label}
                <button
                  onClick={() => {
                    const newStatuses = filters.status?.filter(s => s !== status) || [];
                    updateFilters({ status: newStatuses.length > 0 ? newStatuses : undefined });
                  }}
                  className="ml-1 hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}