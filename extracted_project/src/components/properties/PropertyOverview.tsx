'use client';

import React from 'react';
import { Property, Unit } from '../../../types/properties';

interface PropertyOverviewProps {
  property: Property;
  units: Unit[];
}

export default function PropertyOverview({ property, units }: PropertyOverviewProps) {
  const getUnitsByStatus = () => {
    const statusCounts = units.reduce((acc, unit) => {
      acc[unit.status] = (acc[unit.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return statusCounts;
  };

  const getExpiringLeases = () => {
    return units.filter(unit => unit.isLeaseExpiring).length;
  };

  const getAverageRent = () => {
    const totalRent = units.reduce((sum, unit) => sum + unit.rentAmount, 0);
    return units.length > 0 ? totalRent / units.length : 0;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const statusCounts = getUnitsByStatus();

  return (
    <div className="space-y-6">
      {/* Property Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Property Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Property Type:</span>
              <span className="text-sm font-medium text-gray-900 capitalize">{property.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Year Built:</span>
              <span className="text-sm font-medium text-gray-900">{property.yearBuilt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Area:</span>
              <span className="text-sm font-medium text-gray-900">
                {property.squareFootage?.toLocaleString()} sq ft
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Parking Spaces:</span>
              <span className="text-sm font-medium text-gray-900">{property.parkingSpaces}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Units:</span>
              <span className="text-sm font-medium text-gray-900">{property.totalUnits}</span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Monthly Revenue:</span>
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(property.monthlyRevenue || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Annual Revenue:</span>
              <span className="text-sm font-medium text-green-600">
                {formatCurrency((property.monthlyRevenue || 0) * 12)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Maintenance Costs:</span>
              <span className="text-sm font-medium text-red-600">
                {formatCurrency(property.maintenanceCosts || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average Rent/Unit:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(getAverageRent())}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Net Income:</span>
                <span className="text-sm font-bold text-green-600">
                  {formatCurrency((property.monthlyRevenue || 0) - (property.maintenanceCosts || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unit Status Overview */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Unit Status Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statusCounts.occupied || 0}</div>
            <div className="text-sm text-gray-600">Occupied</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{statusCounts.vacant || 0}</div>
            <div className="text-sm text-gray-600">Vacant</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{statusCounts.maintenance || 0}</div>
            <div className="text-sm text-gray-600">Maintenance</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.reserved || 0}</div>
            <div className="text-sm text-gray-600">Reserved</div>
          </div>
        </div>
      </div>

      {/* Description & Amenities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Description */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            {property.description}
          </p>
        </div>

        {/* Amenities */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {property.amenities?.map((amenity, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Location & Map Placeholder */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Interactive Map</h4>
          <p className="text-sm text-gray-500 mb-4">
            Property location will be displayed on an interactive map here.
            Coordinates: {property.latitude}, {property.longitude}
          </p>
          <div className="text-sm text-gray-600">
            {property.address}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
            <div className="text-2xl mb-2">🏠</div>
            <div className="text-sm font-medium text-gray-900">Add Unit</div>
          </button>
          <button className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm font-medium text-gray-900">Add Tenant</div>
          </button>
          <button className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
            <div className="text-2xl mb-2">📄</div>
            <div className="text-sm font-medium text-gray-900">Upload Document</div>
          </button>
          <button className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
            <div className="text-2xl mb-2">🔧</div>
            <div className="text-sm font-medium text-gray-900">Schedule Maintenance</div>
          </button>
        </div>
      </div>

      {/* Alerts & Notifications */}
      {getExpiringLeases() > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800">Upcoming Lease Expirations</h4>
              <p className="text-sm text-yellow-700 mt-1">
                {getExpiringLeases()} unit(s) have leases expiring within 90 days. Contact tenants to discuss renewal options.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}