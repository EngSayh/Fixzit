'use client';

import React, { useState } from 'react';
import { Property, Unit, UNIT_STATUS_CONFIG } from '../../../types/properties';

interface PropertyUnitsProps {
  property: Property;
  units: Unit[];
}

export default function PropertyUnits({ property, units }: PropertyUnitsProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState('unitNumber');
  const [showAddUnit, setShowAddUnit] = useState(false);

  const filteredUnits = units.filter(unit => {
    if (filterStatus === 'all') return true;
    return unit.status === filterStatus;
  });

  const sortedUnits = [...filteredUnits].sort((a, b) => {
    switch (sortBy) {
      case 'unitNumber':
        return a.unitNumber.localeCompare(b.unitNumber);
      case 'rent':
        return b.rentAmount - a.rentAmount;
      case 'area':
        return b.areaSqm - a.areaSqm;
      case 'status':
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusStats = () => {
    return units.reduce((acc, unit) => {
      acc[unit.status] = (acc[unit.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const statusStats = getStatusStats();

  const renderUnitCard = (unit: Unit) => {
    const statusConfig = UNIT_STATUS_CONFIG[unit.status];
    
    return (
      <div key={unit.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{unit.unitNumber}</h3>
            <p className="text-sm text-gray-600">{unit.type}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
            {statusConfig.icon} {statusConfig.label}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Area:</span>
            <span className="font-medium">{unit.areaSqm} sqm</span>
          </div>
          {unit.bedrooms > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Bedrooms:</span>
              <span className="font-medium">{unit.bedrooms}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Bathrooms:</span>
            <span className="font-medium">{unit.bathrooms}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Rent:</span>
            <span className="font-medium text-[#0061A8]">{formatCurrency(unit.rentAmount)}</span>
          </div>
          {unit.floor && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Floor:</span>
              <span className="font-medium">{unit.floor}</span>
            </div>
          )}
        </div>

        {unit.leaseExpiryDate && (
          <div className={`text-xs p-2 rounded-md mb-3 ${
            unit.isLeaseExpiring ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            Lease expires: {new Date(unit.leaseExpiryDate).toLocaleDateString()}
            {unit.daysUntilExpiry && unit.daysUntilExpiry < 90 && (
              <span className="font-medium"> ({unit.daysUntilExpiry} days)</span>
            )}
          </div>
        )}

        {unit.amenities && unit.amenities.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {unit.amenities.slice(0, 2).map((amenity, index) => (
                <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                  {amenity}
                </span>
              ))}
              {unit.amenities.length > 2 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  +{unit.amenities.length - 2} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <button className="text-sm text-[#0061A8] hover:text-[#005098] font-medium">
            View Details
          </button>
          <div className="flex items-center gap-2">
            <button className="p-1 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button className="p-1 text-gray-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTableView = () => (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lease Expiry</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedUnits.map((unit) => {
              const statusConfig = UNIT_STATUS_CONFIG[unit.status];
              return (
                <tr key={unit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{unit.unitNumber}</div>
                      {unit.floor && <div className="text-sm text-gray-500">Floor {unit.floor}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {unit.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {unit.areaSqm} sqm
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0061A8]">
                    {formatCurrency(unit.rentAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                      {statusConfig.icon} {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {unit.leaseExpiryDate ? (
                      <div className={unit.isLeaseExpiring ? 'text-red-600 font-medium' : ''}>
                        {new Date(unit.leaseExpiryDate).toLocaleDateString()}
                        {unit.daysUntilExpiry && unit.daysUntilExpiry < 90 && (
                          <div className="text-xs text-red-500">
                            {unit.daysUntilExpiry} days
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button className="text-[#0061A8] hover:text-[#005098]">Edit</button>
                      <button className="text-red-600 hover:text-red-900">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Units ({units.length})</h2>
          <p className="text-sm text-gray-600">Manage individual units within this property</p>
        </div>
        <button
          onClick={() => setShowAddUnit(true)}
          className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#005098] flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Unit
        </button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(UNIT_STATUS_CONFIG).map(([status, config]) => (
          <div key={status} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{statusStats[status] || 0}</div>
                <div className="text-sm text-gray-600">{config.label}</div>
              </div>
              <span className="text-2xl">{config.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
              >
                <option value="all">All Status</option>
                {Object.entries(UNIT_STATUS_CONFIG).map(([status, config]) => (
                  <option key={status} value={status}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
              >
                <option value="unitNumber">Unit Number</option>
                <option value="rent">Rent (High to Low)</option>
                <option value="area">Area (Large to Small)</option>
                <option value="status">Status</option>
              </select>
            </div>

            <div className="text-sm text-gray-600">
              Showing {sortedUnits.length} of {units.length} units
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-white text-[#0061A8] shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table' ? 'bg-white text-[#0061A8] shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Units Display */}
      {sortedUnits.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No units found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {filterStatus === 'all' 
              ? 'This property doesn\'t have any units yet.'
              : `No units found with status "${UNIT_STATUS_CONFIG[filterStatus]?.label}".`
            }
          </p>
          <button
            onClick={() => setShowAddUnit(true)}
            className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#005098]"
          >
            Add First Unit
          </button>
        </div>
      ) : (
        viewMode === 'grid' ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedUnits.map(renderUnitCard)}
          </div>
        ) : (
          renderTableView()
        )
      )}

      {/* Add Unit Modal */}
      {showAddUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Unit</h3>
            <p className="text-sm text-gray-500 mb-6">
              Unit creation form will be implemented here with comprehensive unit details.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddUnit(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddUnit(false)}
                className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#005098]"
              >
                Create Unit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}