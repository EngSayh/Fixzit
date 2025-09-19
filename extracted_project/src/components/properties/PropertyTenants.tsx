'use client';

import React, { useState } from 'react';
import { Property, Tenant, TENANT_STATUS_CONFIG } from '../../../types/properties';

interface PropertyTenantsProps {
  property: Property;
}

// Mock tenant data
const mockTenants: Tenant[] = [
  {
    id: 'tenant-001',
    firstName: 'Ahmed',
    lastName: 'Al-Rashid',
    email: 'ahmed.rashid@email.com',
    phone: '+966 50 123 4567',
    nationalId: '1234567890',
    emergencyContact: 'Sarah Al-Rashid',
    emergencyPhone: '+966 50 987 6543',
    moveInDate: '2023-01-15',
    status: 'active',
    notes: 'Excellent tenant, always pays on time',
    orgId: 'org-1',
    createdBy: 'user-1',
    createdAt: '2023-01-01T10:00:00Z',
    updatedAt: '2023-01-01T10:00:00Z',
    currentUnit: {
      id: 'unit-001',
      propertyId: 'prop-001',
      unitNumber: 'A101',
      type: 'Office Suite',
      bedrooms: 0,
      bathrooms: 2,
      areaSqm: 150,
      rentAmount: 4500,
      status: 'occupied',
      orgId: 'org-1',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    totalPayments: 54000,
    outstandingBalance: 0,
    avgRating: 4.8
  },
  {
    id: 'tenant-002',
    firstName: 'Fatima',
    lastName: 'Al-Zahra',
    email: 'fatima.zahra@email.com',
    phone: '+966 55 234 5678',
    nationalId: '2345678901',
    emergencyContact: 'Mohammed Al-Zahra',
    emergencyPhone: '+966 55 876 5432',
    moveInDate: '2023-06-01',
    status: 'active',
    notes: 'Professional tenant, CEO of tech startup',
    orgId: 'org-1',
    createdBy: 'user-1',
    createdAt: '2023-05-15T10:00:00Z',
    updatedAt: '2023-05-15T10:00:00Z',
    currentUnit: {
      id: 'unit-003',
      propertyId: 'prop-001',
      unitNumber: 'B201',
      type: 'Executive Office',
      bedrooms: 0,
      bathrooms: 2,
      areaSqm: 200,
      rentAmount: 6000,
      status: 'occupied',
      orgId: 'org-1',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    totalPayments: 42000,
    outstandingBalance: 0,
    avgRating: 4.9
  },
  {
    id: 'tenant-003',
    firstName: 'Omar',
    lastName: 'Al-Sayed',
    email: 'omar.sayed@email.com',
    phone: '+966 56 345 6789',
    status: 'inactive',
    moveInDate: '2022-03-01',
    moveOutDate: '2023-12-31',
    notes: 'Former tenant, moved to larger office',
    orgId: 'org-1',
    createdBy: 'user-1',
    createdAt: '2022-02-15T10:00:00Z',
    updatedAt: '2023-12-31T10:00:00Z',
    totalPayments: 132000,
    outstandingBalance: 0,
    avgRating: 4.6
  }
];

export default function PropertyTenants({ property }: PropertyTenantsProps) {
  const [tenants, setTenants] = useState<Tenant[]>(mockTenants);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState('name');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddTenant, setShowAddTenant] = useState(false);

  const filteredTenants = tenants.filter(tenant => {
    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.phone?.includes(searchTerm);
    
    return matchesStatus && matchesSearch;
  });

  const sortedTenants = [...filteredTenants].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      case 'moveIn':
        return new Date(b.moveInDate || '').getTime() - new Date(a.moveInDate || '').getTime();
      case 'rent':
        return (b.currentUnit?.rentAmount || 0) - (a.currentUnit?.rentAmount || 0);
      case 'rating':
        return (b.avgRating || 0) - (a.avgRating || 0);
      default:
        return 0;
    }
  });

  const getStatusStats = () => {
    return tenants.reduce((acc, tenant) => {
      acc[tenant.status] = (acc[tenant.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const statusStats = getStatusStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tenants ({tenants.length})</h2>
          <p className="text-sm text-gray-600">Manage tenant information and lease details</p>
        </div>
        <button
          onClick={() => setShowAddTenant(true)}
          className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#005098] flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Tenant
        </button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(TENANT_STATUS_CONFIG).map(([status, config]) => (
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

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search tenants by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
            >
              <option value="all">All Status</option>
              {Object.entries(TENANT_STATUS_CONFIG).map(([status, config]) => (
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
              <option value="name">Name</option>
              <option value="moveIn">Move-in Date</option>
              <option value="rent">Rent Amount</option>
              <option value="rating">Rating</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tenants List */}
      {sortedTenants.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchTerm ? 'No tenants match your search criteria.' : 'This property doesn\'t have any tenants yet.'}
          </p>
          <button
            onClick={() => setShowAddTenant(true)}
            className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#005098]"
          >
            Add First Tenant
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {sortedTenants.map((tenant) => {
              const statusConfig = TENANT_STATUS_CONFIG[tenant.status];
              return (
                <div key={tenant.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-[#0061A8] text-white rounded-full flex items-center justify-center font-medium">
                          {tenant.firstName.charAt(0)}{tenant.lastName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {tenant.firstName} {tenant.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">{tenant.email}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <span className="text-xs text-gray-500">Current Unit</span>
                          <div className="text-sm font-medium text-gray-900">
                            {tenant.currentUnit ? tenant.currentUnit.unitNumber : 'None'}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Monthly Rent</span>
                          <div className="text-sm font-medium text-gray-900">
                            {tenant.currentUnit ? formatCurrency(tenant.currentUnit.rentAmount) : '-'}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Move-in Date</span>
                          <div className="text-sm font-medium text-gray-900">
                            {tenant.moveInDate ? new Date(tenant.moveInDate).toLocaleDateString() : '-'}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Phone</span>
                          <div className="text-sm font-medium text-gray-900">
                            {tenant.phone || '-'}
                          </div>
                        </div>
                      </div>

                      {tenant.status === 'active' && tenant.avgRating && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-gray-500">Rating:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${star <= tenant.avgRating! ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="text-sm text-gray-600 ml-1">{tenant.avgRating.toFixed(1)}</span>
                          </div>
                        </div>
                      )}

                      {tenant.notes && (
                        <div className="mt-3">
                          <span className="text-xs text-gray-500">Notes:</span>
                          <p className="text-sm text-gray-700 mt-1">{tenant.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button className="p-2 text-gray-400 hover:text-[#0061A8] rounded-lg hover:bg-gray-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button className="p-2 text-gray-400 hover:text-[#0061A8] rounded-lg hover:bg-gray-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Tenant Modal */}
      {showAddTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Tenant</h3>
            <p className="text-sm text-gray-500 mb-6">
              Tenant registration form will be implemented here with comprehensive tenant information and lease details.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddTenant(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddTenant(false)}
                className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#005098]"
              >
                Add Tenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}