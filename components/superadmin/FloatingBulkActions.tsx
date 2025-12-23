/**
 * Floating Bulk Actions Bar
 * Appears at bottom-center when rows are selected
 */
"use client";

import React from 'react';
import { Trash2, Archive, CheckCircle, X } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';

interface FloatingBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onMarkResolved?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

export const FloatingBulkActions: React.FC<FloatingBulkActionsProps> = ({
  selectedCount,
  onClearSelection,
  onMarkResolved,
  onArchive,
  onDelete,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-semibold text-sm">
            {selectedCount}
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {selectedCount === 1 ? '1 item selected' : `${selectedCount} items selected`}
          </span>
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        <div className="flex items-center gap-2">
          {onMarkResolved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkResolved}
              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              <CheckCircle className="w-4 h-4 me-2" />
              Mark Resolved
            </Button>
          )}
          
          {onArchive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onArchive}
              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Archive className="w-4 h-4 me-2" />
              Archive
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4 me-2" />
              Delete
            </Button>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
