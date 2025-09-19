'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { WorkOrder, STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from '../../../types/work-orders';

interface WorkOrderTableViewProps {
  workOrders: WorkOrder[];
  onStatusChange?: (id: string, status: string) => void;
  onAssign?: (id: string) => void;
  onBulkAction?: (action: string, workOrderIds: string[]) => void;
  loading?: boolean;
}

export default function WorkOrderTableView({ 
  workOrders, 
  onStatusChange, 
  onAssign, 
  onBulkAction,
  loading = false 
}: WorkOrderTableViewProps) {
  const [selectedWorkOrders, setSelectedWorkOrders] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedWorkOrders(workOrders.map(wo => wo.id));
    } else {
      setSelectedWorkOrders([]);
    }
  };

  const handleSelectWorkOrder = (workOrderId: string, checked: boolean) => {
    if (checked) {
      setSelectedWorkOrders(prev => [...prev, workOrderId]);
    } else {
      setSelectedWorkOrders(prev => prev.filter(id => id !== workOrderId));
    }
  };

  const handleBulkAction = (action: string) => {
    if (onBulkAction && selectedWorkOrders.length > 0) {
      onBulkAction(action, selectedWorkOrders);
      setSelectedWorkOrders([]);
      setShowBulkActions(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (workOrder: WorkOrder) => {
    return workOrder.dueDate && 
           new Date(workOrder.dueDate) < new Date() && 
           !['completed', 'cancelled', 'closed'].includes(workOrder.status);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 border-b"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-50 border-b border-gray-100"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Bulk Actions Bar */}
      {selectedWorkOrders.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedWorkOrders.length} work order(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  Bulk Actions ▼
                </button>
                {showBulkActions && (
                  <div className="absolute z-10 mt-8 bg-white border border-gray-200 rounded-md shadow-lg">
                    <button
                      onClick={() => handleBulkAction('assign')}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                    >
                      Assign Technician
                    </button>
                    <button
                      onClick={() => handleBulkAction('update_status')}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                    >
                      Update Status
                    </button>
                    <button
                      onClick={() => handleBulkAction('update_priority')}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                    >
                      Update Priority
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => handleBulkAction('delete')}
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete Selected
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedWorkOrders([])}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedWorkOrders.length === workOrders.length && workOrders.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-[#0061A8] focus:ring-[#0061A8] border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Work Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Property/Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assignee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {workOrders.map((workOrder) => {
              const statusConfig = STATUS_CONFIG[workOrder.status];
              const priorityConfig = PRIORITY_CONFIG[workOrder.priority];
              const categoryConfig = CATEGORY_CONFIG[workOrder.category];
              const overdue = isOverdue(workOrder);

              return (
                <tr 
                  key={workOrder.id} 
                  className={`hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''} ${
                    selectedWorkOrders.includes(workOrder.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedWorkOrders.includes(workOrder.id)}
                      onChange={(e) => handleSelectWorkOrder(workOrder.id, e.target.checked)}
                      className="h-4 w-4 text-[#0061A8] focus:ring-[#0061A8] border-gray-300 rounded"
                    />
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {overdue && <span className="text-red-500 text-lg">⚠️</span>}
                      <div>
                        <Link 
                          href={`/work-orders/${workOrder.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-[#0061A8] transition-colors"
                        >
                          {workOrder.title}
                        </Link>
                        <div className="text-sm text-gray-500">{workOrder.woNumber}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{workOrder.property?.name || 'N/A'}</div>
                    {workOrder.unit && (
                      <div className="text-sm text-gray-500">Unit {workOrder.unit.unitNumber}</div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{statusConfig.icon}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                      {priorityConfig.label}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{categoryConfig.icon}</span>
                      <span className="text-sm text-gray-900">{categoryConfig.label}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {workOrder.assignee ? 
                      `${workOrder.assignee.firstName} ${workOrder.assignee.lastName}` : 
                      <span className="text-gray-500 italic">Unassigned</span>
                    }
                  </td>
                  
                  <td className="px-6 py-4 text-sm">
                    {workOrder.dueDate ? (
                      <span className={overdue ? 'text-red-600 font-medium' : 'text-gray-900'}>
                        {formatDate(workOrder.dueDate)}
                      </span>
                    ) : (
                      <span className="text-gray-500">No due date</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {workOrder.estimatedCost ? (
                      <div>
                        <div className="font-medium">${workOrder.estimatedCost.toFixed(2)}</div>
                        {workOrder.actualCost && (
                          <div className="text-xs text-gray-500">
                            Actual: ${workOrder.actualCost.toFixed(2)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">TBD</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Quick Actions */}
                      {workOrder.status === 'open' && onStatusChange && (
                        <button
                          onClick={() => onStatusChange(workOrder.id, 'in_progress')}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
                        >
                          Start
                        </button>
                      )}
                      
                      {workOrder.status === 'in_progress' && onStatusChange && (
                        <button
                          onClick={() => onStatusChange(workOrder.id, 'completed')}
                          className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 transition-colors"
                        >
                          Complete
                        </button>
                      )}

                      {!workOrder.assignee && onAssign && (
                        <button
                          onClick={() => onAssign(workOrder.id)}
                          className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs hover:bg-purple-100 transition-colors"
                        >
                          Assign
                        </button>
                      )}
                      
                      <Link
                        href={`/work-orders/${workOrder.id}`}
                        className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs hover:bg-gray-100 transition-colors"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {workOrders.length === 0 && (
        <div className="p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">🔧</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No work orders found</h3>
          <p className="text-gray-600">Try adjusting your filters or search criteria.</p>
        </div>
      )}
    </div>
  );
}