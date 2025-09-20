'use client';

import React from 'react';
import Link from 'next/link';
import { WorkOrder, CATEGORY_CONFIG, PRIORITY_CONFIG, STATUS_CONFIG } from '../../../types/work-orders';

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onStatusChange?: (id: string, status: string) => void;
  onAssign?: (id: string) => void;
  compact?: boolean;
}

export default function WorkOrderCard({ 
  workOrder, 
  onStatusChange, 
  onAssign, 
  compact = false 
}: WorkOrderCardProps) {
  const categoryConfig = CATEGORY_CONFIG[workOrder.category];
  const priorityConfig = PRIORITY_CONFIG[workOrder.priority];
  const statusConfig = STATUS_CONFIG[workOrder.status];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = workOrder.dueDate && new Date(workOrder.dueDate) < new Date() && 
    !['completed', 'cancelled', 'closed'].includes(workOrder.status);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 ${
      compact ? 'p-4' : 'p-6'
    } ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-medium text-gray-900">
              {categoryConfig.icon}
            </span>
            <Link 
              href={`/work-orders/${workOrder.id}`}
              className="text-lg font-semibold text-gray-900 hover:text-[#0061A8] transition-colors"
            >
              {workOrder.title}
            </Link>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{workOrder.woNumber}</span>
            {workOrder.property && (
              <>
                <span>•</span>
                <span>{workOrder.property.name}</span>
                {workOrder.unit && (
                  <>
                    <span>•</span>
                    <span>Unit {workOrder.unit.unitNumber}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Priority Badge */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
          {priorityConfig.label}
        </div>
      </div>

      {/* Description */}
      {!compact && workOrder.description && (
        <p className="text-gray-700 text-sm mb-4 line-clamp-2">
          {workOrder.description}
        </p>
      )}

      {/* Status and Category */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
          {statusConfig.label}
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${categoryConfig.color}`}>
          {categoryConfig.label}
        </div>

        {isOverdue && (
          <div className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Overdue
          </div>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-600">Created:</span>
          <span className="ml-2 font-medium">{formatDate(workOrder.createdAt)}</span>
        </div>
        
        {workOrder.dueDate && (
          <div>
            <span className="text-gray-600">Due:</span>
            <span className={`ml-2 font-medium ${isOverdue ? 'text-red-600' : ''}`}>
              {formatDate(workOrder.dueDate)}
            </span>
          </div>
        )}
        
        <div>
          <span className="text-gray-600">Creator:</span>
          <span className="ml-2 font-medium">
            {workOrder.creator?.firstName} {workOrder.creator?.lastName}
          </span>
        </div>
        
        <div>
          <span className="text-gray-600">Assignee:</span>
          <span className="ml-2 font-medium">
            {workOrder.assignee ? 
              `${workOrder.assignee.firstName} ${workOrder.assignee.lastName}` : 
              'Unassigned'
            }
          </span>
        </div>
      </div>

      {/* Cost and Time Estimates */}
      {!compact && (workOrder.estimatedCost || workOrder.estimatedHours) && (
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          {workOrder.estimatedCost && (
            <div>
              <span className="text-gray-600">Est. Cost:</span>
              <span className="ml-2 font-medium text-green-600">
                ${workOrder.estimatedCost.toFixed(2)}
              </span>
            </div>
          )}
          
          {workOrder.estimatedHours && (
            <div>
              <span className="text-gray-600">Est. Hours:</span>
              <span className="ml-2 font-medium">{workOrder.estimatedHours}h</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {/* Quick Status Actions */}
          {workOrder.status === 'open' && onStatusChange && (
            <button
              onClick={() => onStatusChange(workOrder.id, 'in_progress')}
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100 transition-colors"
            >
              Start Work
            </button>
          )}
          
          {workOrder.status === 'in_progress' && onStatusChange && (
            <button
              onClick={() => onStatusChange(workOrder.id, 'completed')}
              className="px-3 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium hover:bg-green-100 transition-colors"
            >
              Complete
            </button>
          )}

          {!workOrder.assignee && onAssign && (
            <button
              onClick={() => onAssign(workOrder.id)}
              className="px-3 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium hover:bg-purple-100 transition-colors"
            >
              Assign
            </button>
          )}
        </div>

        <Link
          href={`/work-orders/${workOrder.id}`}
          className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-100 transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}