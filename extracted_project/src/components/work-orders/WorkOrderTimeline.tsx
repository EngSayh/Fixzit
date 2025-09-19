'use client';

import React from 'react';
import { WorkOrderTimeline, WorkOrderComment, STATUS_CONFIG } from '../../../types/work-orders';

interface WorkOrderTimelineProps {
  timeline?: WorkOrderTimeline[];
  comments?: WorkOrderComment[];
  className?: string;
}

export default function WorkOrderTimelineComponent({ 
  timeline = [], 
  comments = [],
  className = ''
}: WorkOrderTimelineProps) {
  // Combine timeline and comments and sort by date
  const allItems = [
    ...timeline.map(item => ({
      ...item,
      type: 'timeline' as const,
      timestamp: item.performedAt,
      user: item.user
    })),
    ...comments.map(item => ({
      ...item,
      type: 'comment' as const,
      timestamp: item.createdAt,
      user: item.user
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getTimelineIcon = (action: string) => {
    const iconMap: Record<string, string> = {
      'created': '🆕',
      'assigned': '👤',
      'status_changed': '📊',
      'comment_added': '💬',
      'photo_uploaded': '📷',
      'priority_changed': '⚠️',
      'completed': '✅',
      'closed': '🔒',
      'reopened': '🔓',
      'updated': '✏️'
    };
    
    return iconMap[action] || '📝';
  };

  const getStatusIcon = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.icon || '📝';
  };

  if (allItems.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-400 text-4xl mb-3">📝</div>
        <p className="text-gray-600">No activity yet</p>
        <p className="text-sm text-gray-500">Timeline and comments will appear here</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {allItems.map((item, index) => (
        <div key={`${item.type}-${item.id}`} className="flex gap-4">
          {/* Avatar/Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              {item.user?.firstName ? (
                <span className="text-sm font-medium text-gray-700">
                  {item.user.firstName.charAt(0)}{item.user.lastName?.charAt(0)}
                </span>
              ) : (
                <span className="text-lg">
                  {item.type === 'timeline' ? getTimelineIcon(item.action) : '💬'}
                </span>
              )}
            </div>
            
            {/* Timeline line */}
            {index < allItems.length - 1 && (
              <div className="w-px bg-gray-200 ml-5 h-8 mt-2"></div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {item.user ? `${item.user.firstName} ${item.user.lastName}` : 'System'}
                  </span>
                  
                  {item.type === 'timeline' && (
                    <div className="flex items-center gap-1">
                      <span className="text-lg">{getTimelineIcon(item.action)}</span>
                      <span className="text-sm text-gray-600">
                        {item.action.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  
                  {item.type === 'comment' && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-600">commented</span>
                      {item.comment.startsWith('/') && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Command
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-gray-500">
                  {formatDate(item.timestamp)}
                </div>
              </div>

              {/* Content */}
              <div className="text-gray-700">
                {item.type === 'timeline' ? (
                  <div>
                    <p>{item.description || `${item.action.replace('_', ' ')} action performed`}</p>
                    
                    {/* Special handling for status changes */}
                    {item.action === 'status_changed' && item.description && (
                      <div className="mt-2 p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2 text-sm">
                          <span>Status changed to:</span>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(item.description)}
                            <span className="font-medium capitalize">
                              {item.description.replace('_', ' ')}
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="whitespace-pre-wrap">{item.comment}</p>
                    
                    {/* Comment type badge */}
                    {item.comment.startsWith('/') && (
                      <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Slash command executed
                      </div>
                    )}
                    
                    {/* Internal vs external comment indicator */}
                    {item.type === 'internal' && (
                      <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        Internal note - Not visible to customers
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reactions/Actions */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                    👍 <span>0</span>
                  </button>
                  <button className="text-sm text-gray-500 hover:text-gray-700">
                    Reply
                  </button>
                </div>
                
                {item.user && (
                  <div className="text-xs text-gray-400">
                    {item.user.role || 'User'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}