'use client';

import React from 'react';
import { WorkOrderStats } from '../../../types/work-orders';

interface QuickActionsProps {
  stats: WorkOrderStats | null;
  onCreateWorkOrder: () => void;
  onViewAll: (filter?: string) => void;
}

export default function QuickActions({ stats, onCreateWorkOrder, onViewAll }: QuickActionsProps) {
  const quickActionItems = [
    {
      label: 'Create Work Order',
      icon: '➕',
      color: 'bg-[#0061A8] hover:bg-[#005098] text-white',
      action: onCreateWorkOrder
    },
    {
      label: 'View Emergency',
      icon: '🚨',
      color: 'bg-red-50 hover:bg-red-100 text-red-700',
      count: stats?.emergency || 0,
      action: () => onViewAll('emergency')
    },
    {
      label: 'View Overdue',
      icon: '⏰',
      color: 'bg-orange-50 hover:bg-orange-100 text-orange-700',
      count: stats?.overdue || 0,
      action: () => onViewAll('overdue')
    },
    {
      label: 'View In Progress',
      icon: '⚡',
      color: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
      count: stats?.inProgress || 0,
      action: () => onViewAll('in_progress')
    }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActionItems.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className={`p-4 rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-md ${item.color}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{item.icon}</span>
              {item.count !== undefined && (
                <span className="text-2xl font-bold">{item.count}</span>
              )}
            </div>
            <p className="text-sm font-medium">{item.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}