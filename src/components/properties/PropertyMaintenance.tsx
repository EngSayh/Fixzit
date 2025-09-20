'use client';

import React, { useState } from 'react';
import { Property } from '../../../types/properties';

interface PropertyMaintenanceProps {
  property: Property;
}

// Mock maintenance data based on work orders integration
const mockMaintenanceRecords = [
  {
    id: 'wo-001',
    woNumber: 'WO-2024-001',
    title: 'HVAC System Maintenance',
    description: 'Quarterly HVAC system inspection and filter replacement',
    category: 'hvac',
    priority: 'medium',
    status: 'completed',
    unitId: 'unit-001',
    unitNumber: 'A101',
    assignedTo: 'John Smith',
    createdAt: '2024-01-15T10:00:00Z',
    completedAt: '2024-01-16T14:30:00Z',
    estimatedCost: 500,
    actualCost: 450,
    estimatedHours: 4,
    actualHours: 3.5,
    photos: [
      { id: 'photo-1', url: '/maintenance/hvac_before.jpg', type: 'before' },
      { id: 'photo-2', url: '/maintenance/hvac_after.jpg', type: 'after' }
    ]
  },
  {
    id: 'wo-002',
    woNumber: 'WO-2024-002',
    title: 'Elevator Inspection',
    description: 'Annual elevator safety inspection and certification',
    category: 'maintenance',
    priority: 'high',
    status: 'in_progress',
    assignedTo: 'Mike Johnson',
    createdAt: '2024-02-01T09:00:00Z',
    estimatedCost: 1200,
    estimatedHours: 8,
    photos: []
  },
  {
    id: 'wo-003',
    woNumber: 'WO-2024-003',
    title: 'Plumbing Repair - Unit B201',
    description: 'Fix leaking pipe in executive bathroom',
    category: 'plumbing',
    priority: 'high',
    status: 'open',
    unitId: 'unit-003',
    unitNumber: 'B201',
    createdAt: '2024-02-10T16:45:00Z',
    estimatedCost: 350,
    estimatedHours: 2,
    photos: [
      { id: 'photo-3', url: '/maintenance/plumbing_issue.jpg', type: 'before' }
    ]
  },
  {
    id: 'wo-004',
    woNumber: 'WO-2024-004',
    title: 'Parking Garage Lighting',
    description: 'Replace broken LED lights in parking garage section C',
    category: 'electrical',
    priority: 'medium',
    status: 'completed',
    assignedTo: 'Ahmed Hassan',
    createdAt: '2024-01-20T11:00:00Z',
    completedAt: '2024-01-21T10:00:00Z',
    estimatedCost: 800,
    actualCost: 750,
    estimatedHours: 6,
    actualHours: 5,
    photos: []
  }
];

const priorityConfig = {
  emergency: { label: 'Emergency', color: 'text-red-800', bgColor: 'bg-red-100' },
  high: { label: 'High', color: 'text-orange-800', bgColor: 'bg-orange-100' },
  medium: { label: 'Medium', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  low: { label: 'Low', color: 'text-gray-800', bgColor: 'bg-gray-100' }
};

const statusConfig = {
  draft: { label: 'Draft', color: 'text-gray-800', bgColor: 'bg-gray-100', icon: '📝' },
  open: { label: 'Open', color: 'text-blue-800', bgColor: 'bg-blue-100', icon: '🔓' },
  assigned: { label: 'Assigned', color: 'text-purple-800', bgColor: 'bg-purple-100', icon: '👤' },
  in_progress: { label: 'In Progress', color: 'text-orange-800', bgColor: 'bg-orange-100', icon: '⚡' },
  on_hold: { label: 'On Hold', color: 'text-yellow-800', bgColor: 'bg-yellow-100', icon: '⏸️' },
  completed: { label: 'Completed', color: 'text-green-800', bgColor: 'bg-green-100', icon: '✅' },
  closed: { label: 'Closed', color: 'text-gray-800', bgColor: 'bg-gray-100', icon: '🔒' },
  cancelled: { label: 'Cancelled', color: 'text-red-800', bgColor: 'bg-red-100', icon: '❌' }
};

const categoryConfig = {
  hvac: { label: 'HVAC', icon: '❄️', color: 'bg-blue-100 text-blue-800' },
  plumbing: { label: 'Plumbing', icon: '🚿', color: 'bg-cyan-100 text-cyan-800' },
  electrical: { label: 'Electrical', icon: '⚡', color: 'bg-yellow-100 text-yellow-800' },
  general: { label: 'General', icon: '🔧', color: 'bg-gray-100 text-gray-800' },
  cleaning: { label: 'Cleaning', icon: '🧹', color: 'bg-green-100 text-green-800' },
  maintenance: { label: 'Maintenance', icon: '⚙️', color: 'bg-purple-100 text-purple-800' }
};

export default function PropertyMaintenance({ property }: PropertyMaintenanceProps) {
  const [maintenanceRecords, setMaintenanceRecords] = useState(mockMaintenanceRecords);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState('date');
  const [showCreateWorkOrder, setShowCreateWorkOrder] = useState(false);

  const filteredRecords = maintenanceRecords.filter(record => {
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || record.category === filterCategory;
    return matchesStatus && matchesCategory;
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'priority':
        const priorityOrder = { emergency: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
      case 'status':
        return a.status.localeCompare(b.status);
      case 'cost':
        return (b.actualCost || b.estimatedCost || 0) - (a.actualCost || a.estimatedCost || 0);
      default:
        return 0;
    }
  });

  const getMaintenanceStats = () => {
    const stats = {
      total: maintenanceRecords.length,
      open: maintenanceRecords.filter(r => ['open', 'assigned', 'in_progress'].includes(r.status)).length,
      completed: maintenanceRecords.filter(r => r.status === 'completed').length,
      totalCost: maintenanceRecords.reduce((sum, r) => sum + (r.actualCost || r.estimatedCost || 0), 0),
      avgCost: 0,
      avgDuration: 0
    };
    
    stats.avgCost = stats.total > 0 ? stats.totalCost / stats.total : 0;
    
    const completedRecords = maintenanceRecords.filter(r => r.status === 'completed' && r.actualHours);
    stats.avgDuration = completedRecords.length > 0 
      ? completedRecords.reduce((sum, r) => sum + (r.actualHours || 0), 0) / completedRecords.length 
      : 0;

    return stats;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const stats = getMaintenanceStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Maintenance History ({maintenanceRecords.length})</h2>
          <p className="text-sm text-gray-600">Track maintenance requests and work orders for this property</p>
        </div>
        <button
          onClick={() => setShowCreateWorkOrder(true)}
          className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#005098] flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Work Order
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Work Orders</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.open}</div>
          <div className="text-sm text-gray-600">Open/In Progress</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-[#0061A8]">{formatCurrency(stats.totalCost)}</div>
          <div className="text-sm text-gray-600">Total Cost</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.avgDuration.toFixed(1)}h</div>
          <div className="text-sm text-gray-600">Avg Duration</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
            >
              <option value="all">All Status</option>
              {Object.entries(statusConfig).map(([status, config]) => (
                <option key={status} value={status}>{config.label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
            >
              <option value="all">All Categories</option>
              {Object.entries(categoryConfig).map(([category, config]) => (
                <option key={category} value={category}>{config.label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#0061A8] focus:border-[#0061A8]"
            >
              <option value="date">Date Created</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
              <option value="cost">Cost</option>
            </select>
          </div>

          <div className="text-sm text-gray-600">
            Showing {sortedRecords.length} of {maintenanceRecords.length} records
          </div>
        </div>
      </div>

      {/* Maintenance Records */}
      {sortedRecords.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance records found</h3>
          <p className="text-sm text-gray-500 mb-4">
            No maintenance records match your current filters.
          </p>
          <button
            onClick={() => setShowCreateWorkOrder(true)}
            className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#005098]"
          >
            Create First Work Order
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {sortedRecords.map((record) => {
              const categoryConf = categoryConfig[record.category as keyof typeof categoryConfig];
              const statusConf = statusConfig[record.status as keyof typeof statusConfig];
              const priorityConf = priorityConfig[record.priority as keyof typeof priorityConfig];

              return (
                <div key={record.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg">{categoryConf?.icon}</span>
                        <h3 className="text-lg font-medium text-gray-900">{record.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConf?.bgColor} ${statusConf?.color}`}>
                          {statusConf?.icon} {statusConf?.label}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityConf?.bgColor} ${priorityConf?.color}`}>
                          {priorityConf?.label}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{record.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Work Order:</span>
                          <div className="font-medium text-gray-900">{record.woNumber}</div>
                        </div>
                        {record.unitNumber && (
                          <div>
                            <span className="text-gray-500">Unit:</span>
                            <div className="font-medium text-gray-900">{record.unitNumber}</div>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Assigned To:</span>
                          <div className="font-medium text-gray-900">{record.assignedTo || 'Unassigned'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Created:</span>
                          <div className="font-medium text-gray-900">
                            {new Date(record.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Cost:</span>
                          <div className="font-medium text-[#0061A8]">
                            {formatCurrency(record.actualCost || record.estimatedCost || 0)}
                          </div>
                        </div>
                      </div>

                      {record.completedAt && (
                        <div className="mt-3 text-sm">
                          <span className="text-gray-500">Completed:</span>
                          <span className="ml-2 font-medium text-green-600">
                            {new Date(record.completedAt).toLocaleDateString()}
                          </span>
                          {record.actualHours && (
                            <span className="ml-4 text-gray-500">
                              Duration: <span className="font-medium">{record.actualHours}h</span>
                            </span>
                          )}
                        </div>
                      )}

                      {record.photos && record.photos.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs text-gray-500">Photos:</span>
                          <div className="flex gap-2 mt-1">
                            {record.photos.map((photo) => (
                              <div key={photo.id} className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                                📸
                              </div>
                            ))}
                          </div>
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Work Order Modal */}
      {showCreateWorkOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Work Order</h3>
            <p className="text-sm text-gray-500 mb-6">
              Work order creation form will be implemented here with comprehensive maintenance request details.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateWorkOrder(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateWorkOrder(false)}
                className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#005098]"
              >
                Create Work Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}