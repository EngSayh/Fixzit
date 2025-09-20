'use client';

import React from 'react';
import { WorkOrder, WorkOrderStatus, STATUS_CONFIG } from '../../../types/work-orders';
import WorkOrderCard from './WorkOrderCard';

interface WorkOrderKanbanBoardProps {
  workOrders: WorkOrder[];
  onStatusChange?: (id: string, status: string) => void;
  onAssign?: (id: string) => void;
  loading?: boolean;
}

export default function WorkOrderKanbanBoard({ 
  workOrders, 
  onStatusChange, 
  onAssign, 
  loading = false 
}: WorkOrderKanbanBoardProps) {
  // Define kanban columns
  const columns: { status: WorkOrderStatus; label: string; color: string }[] = [
    { status: 'open', label: 'Open', color: 'border-blue-500' },
    { status: 'assigned', label: 'Assigned', color: 'border-purple-500' },
    { status: 'in_progress', label: 'In Progress', color: 'border-orange-500' },
    { status: 'on_hold', label: 'On Hold', color: 'border-yellow-500' },
    { status: 'completed', label: 'Completed', color: 'border-green-500' }
  ];

  // Group work orders by status
  const groupedWorkOrders = workOrders.reduce((acc, workOrder) => {
    if (!acc[workOrder.status]) {
      acc[workOrder.status] = [];
    }
    acc[workOrder.status].push(workOrder);
    return acc;
  }, {} as Record<WorkOrderStatus, WorkOrder[]>);

  if (loading) {
    return (
      <div className="flex gap-6 overflow-x-auto">
        {columns.map((column) => (
          <div key={column.status} className="flex-shrink-0 w-80">
            <div className="bg-white rounded-lg border-2 border-gray-200 h-full">
              <div className="p-4 border-b border-gray-200">
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const handleDrop = (e: React.DragEvent, targetStatus: WorkOrderStatus) => {
    e.preventDefault();
    const workOrderId = e.dataTransfer.getData('text/plain');
    if (workOrderId && onStatusChange) {
      onStatusChange(workOrderId, targetStatus);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragStart = (e: React.DragEvent, workOrderId: string) => {
    e.dataTransfer.setData('text/plain', workOrderId);
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-6">
      {columns.map((column) => {
        const columnWorkOrders = groupedWorkOrders[column.status] || [];
        const statusConfig = STATUS_CONFIG[column.status];
        
        return (
          <div 
            key={column.status} 
            className="flex-shrink-0 w-80"
            onDrop={(e) => handleDrop(e, column.status)}
            onDragOver={handleDragOver}
          >
            <div className={`bg-white rounded-lg border-2 ${column.color} h-full`}>
              {/* Column Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{statusConfig.icon}</span>
                    <h3 className="font-semibold text-gray-900">{column.label}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                    {columnWorkOrders.length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div className="p-4 space-y-4 min-h-[500px] max-h-[calc(100vh-200px)] overflow-y-auto">
                {columnWorkOrders.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">📝</div>
                    <p className="text-sm">No {column.label.toLowerCase()} work orders</p>
                  </div>
                ) : (
                  columnWorkOrders.map((workOrder) => (
                    <div
                      key={workOrder.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, workOrder.id)}
                      className="cursor-move"
                    >
                      <WorkOrderCard
                        workOrder={workOrder}
                        onStatusChange={onStatusChange}
                        onAssign={onAssign}
                        compact={true}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}