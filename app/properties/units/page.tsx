'use client';

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

export default function PropertiesUnitsPage() {
  const { t } = useTranslation();
  const units = [
    {
      id: 'U-001',
      unitNumber: '1204',
      property: 'Tower A',
      type: '2BR Apartment',
      size: '120 sqm',
      tenant: 'John Smith',
      leaseStatus: 'Active',
      monthlyRent: 'SAR 8,500',
      occupancy: 'occupied'
    },
    {
      id: 'U-002',
      unitNumber: '1205',
      property: 'Tower A',
      type: '3BR Apartment',
      size: '150 sqm',
      tenant: 'Sarah Johnson',
      leaseStatus: 'Active',
      monthlyRent: 'SAR 12,000',
      occupancy: 'occupied'
    },
    {
      id: 'U-003',
      unitNumber: '901',
      property: 'Tower B',
      type: 'Studio',
      size: '45 sqm',
      tenant: 'Available',
      leaseStatus: 'Vacant',
      monthlyRent: 'SAR 4,500',
      occupancy: 'vacant'
    },
    {
      id: 'U-004',
      unitNumber: 'V-009',
      property: 'Villa Complex',
      type: '4BR Villa',
      size: '300 sqm',
      tenant: 'Ahmed Al-Rashid',
      leaseStatus: 'Active',
      monthlyRent: 'SAR 25,000',
      occupancy: 'occupied'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 border-green-200';
      case 'Expiring': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'Vacant': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOccupancyColor = (occupancy: string) => {
    switch (occupancy) {
      case 'occupied': return 'bg-green-100 text-green-800 border-green-200';
      case 'vacant': return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">Units & Tenants</h1>
          <p className="text-[var(--fixzit-text-secondary)]">Manage property units and tenant information</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Import Units</button>
          <button className="btn-primary">+ Add Unit</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Units</p>
              <p className="text-2xl font-bold text-[var(--fixzit-primary)]">156</p>
            </div>
            <div className="text-[var(--fixzit-primary-lighter)]">🏢</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Occupied</p>
              <p className="text-2xl font-bold text-[var(--fixzit-success)]">142</p>
            </div>
            <div className="text-[var(--fixzit-success-lighter)]">👥</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vacant</p>
              <p className="text-2xl font-bold text-[var(--fixzit-danger)]">14</p>
            </div>
            <div className="text-[var(--fixzit-danger-lighter)]">🏠</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
              <p className="text-2xl font-bold text-[var(--fixzit-secondary)]">91%</p>
            </div>
            <div className="text-purple-400">📊</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
              <option>All Properties</option>
              <option>Tower A</option>
              <option>Tower B</option>
              <option>Villa Complex</option>
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
              <option>All Types</option>
              <option>Studio</option>
              <option>1BR Apartment</option>
              <option>2BR Apartment</option>
              <option>3BR Apartment</option>
              <option>Villa</option>
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
              <option>All Status</option>
              <option>Occupied</option>
              <option>Vacant</option>
              <option>Maintenance</option>
            </select>
          </div>
          <button className="btn-primary">Filter</button>
        </div>
      </div>

      {/* Units Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Units Overview</h3>
          <div className="flex gap-2">
            <button className="btn-ghost">📄 Export</button>
            <button className="btn-ghost">📊 Analytics</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lease Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {units.map(unit => (
                <tr key={unit.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{unit.unitNumber}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{unit.property}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{unit.type}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{unit.size}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{unit.tenant}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{unit.monthlyRent}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(unit.leaseStatus)}`}>
                      {unit.leaseStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getOccupancyColor(unit.occupancy)}`}>
                      {unit.occupancy}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button className="text-[var(--fixzit-primary)] hover:text-[var(--fixzit-primary-darkest)]">{t('common.edit', 'Edit')}</button>
                      <button className="text-[var(--fixzit-success)] hover:text-[var(--fixzit-success-darkest)]">View Tenant</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">➕</div>
            <div className="text-sm font-medium">Add Unit</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm font-medium">Add Tenant</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium">Lease Management</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm font-medium">Rent Collection</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">Reports</div>
          </button>
          <button className="btn-ghost text-center">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">Settings</div>
          </button>
        </div>
      </div>
    </div>
  );
}

