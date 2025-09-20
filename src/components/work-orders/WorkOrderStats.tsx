'use client';

import React from 'react';
import { WorkOrderStats } from '../../../types/work-orders';

interface WorkOrderStatsProps {
  stats: WorkOrderStats | null;
  loading?: boolean;
}

export default function WorkOrderStatsComponent({ stats, loading = false }: WorkOrderStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: 'Total Work Orders',
      value: stats.total,
      color: 'bg-blue-50 text-blue-700',
      icon: '📋'
    },
    {
      label: 'Open',
      value: stats.open,
      color: 'bg-orange-50 text-orange-700',
      icon: '🔓'
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      color: 'bg-blue-50 text-blue-700',
      icon: '⚡'
    },
    {
      label: 'Completed',
      value: stats.completed,
      color: 'bg-green-50 text-green-700',
      icon: '✅'
    },
    {
      label: 'Emergency',
      value: stats.emergency,
      color: 'bg-red-50 text-red-700',
      icon: '🚨'
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      color: 'bg-red-50 text-red-700',
      icon: '⏰'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center text-lg`}>
              {stat.icon}
            </div>
          </div>
          
          {/* Progress bar for visual representation */}
          {stats.total > 0 && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${stat.color.includes('blue') ? 'bg-blue-500' : 
                    stat.color.includes('green') ? 'bg-green-500' :
                    stat.color.includes('orange') ? 'bg-orange-500' :
                    stat.color.includes('red') ? 'bg-red-500' : 'bg-gray-500'}`}
                  style={{ width: `${Math.min((stat.value / stats.total) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.total > 0 ? Math.round((stat.value / stats.total) * 100) : 0}% of total
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}