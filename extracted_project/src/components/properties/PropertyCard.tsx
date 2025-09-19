'use client';

import React from 'react';
import Link from 'next/link';
import { Property, PROPERTY_TYPE_CONFIG } from '../../../types/properties';

interface PropertyCardProps {
  property: Property;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

export default function PropertyCard({ 
  property, 
  onEdit, 
  onDelete, 
  compact = false 
}: PropertyCardProps) {
  const typeConfig = PROPERTY_TYPE_CONFIG[property.type];
  
  const occupancyRate = property.occupancyRate || 0;
  const monthlyRevenue = property.monthlyRevenue || 0;
  const occupiedUnits = property.occupiedUnits || 0;
  const vacantUnits = property.vacantUnits || 0;

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 ${
      compact ? 'p-4' : 'p-6'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{typeConfig.icon}</span>
            <Link 
              href={`/properties/${property.id}`}
              className="text-lg font-semibold text-gray-900 hover:text-[#0061A8] transition-colors"
            >
              {property.name}
            </Link>
          </div>
          
          <p className="text-sm text-gray-600 mb-2">{property.address}</p>
          
          <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
            {typeConfig.label}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(property.id)}
              className="p-2 text-gray-400 hover:text-[#0061A8] transition-colors"
              title="Edit Property"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          
          {onDelete && (
            <button
              onClick={() => onDelete(property.id)}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete Property"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Occupancy</span>
            <span className={`text-xs font-bold ${getOccupancyColor(occupancyRate)}`}>
              {occupancyRate.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {occupiedUnits}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              {vacantUnits}
            </span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Revenue</span>
            <span className="text-xs font-bold text-[#0061A8]">
              {formatCurrency(monthlyRevenue)}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            per month
          </div>
        </div>
      </div>

      {/* Unit Summary */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            <span className="font-medium text-gray-900">{property.totalUnits}</span> units
          </span>
          
          {property.yearBuilt && (
            <span className="text-gray-600">
              Built <span className="font-medium text-gray-900">{property.yearBuilt}</span>
            </span>
          )}
        </div>
      </div>

      {/* Amenities Preview */}
      {property.amenities && property.amenities.length > 0 && !compact && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {property.amenities.slice(0, 3).map((amenity, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
              >
                {amenity}
              </span>
            ))}
            {property.amenities.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                +{property.amenities.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Status Indicators */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          {/* Maintenance Indicator */}
          {property.workOrders && property.workOrders.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-orange-600">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{property.workOrders.length} WO</span>
            </div>
          )}

          {/* Lease Expiration Warning */}
          {property.expiringLeases && property.expiringLeases > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>{property.expiringLeases} expiring</span>
            </div>
          )}
        </div>

        <Link
          href={`/properties/${property.id}`}
          className="px-3 py-1 bg-[#0061A8] text-white rounded-md text-xs font-medium hover:bg-[#005098] transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}