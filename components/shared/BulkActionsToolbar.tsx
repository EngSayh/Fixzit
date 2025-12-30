'use client';

/**
 * BulkActionsToolbar - Scaffolding for FEATURE-002
 * Target: Q2 2026 (Post-MVP)
 *
 * This component provides bulk operations UI for tables.
 * Currently a placeholder - full implementation pending post-MVP roadmap.
 *
 * @see docs/adr/ADR-002-bulk-operations.md
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckSquare, Trash2, Download, X } from '@/components/ui/icons';
import { toast } from 'sonner';

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline';
  onExecute: (items: T[]) => Promise<void>;
  isDisabled?: (items: T[]) => boolean;
}

interface BulkActionsToolbarProps<T> {
  selectedItems: T[];
  actions: BulkAction<T>[];
  onClearSelection: () => void;
  isProcessing?: boolean;
}

/**
 * Bulk Actions Toolbar Component
 *
 * Usage:
 * ```tsx
 * <BulkActionsToolbar
 *   selectedItems={selectedWorkOrders}
 *   actions={[
 *     { id: 'approve', label: 'Approve', onExecute: handleBulkApprove },
 *     { id: 'delete', label: 'Delete', variant: 'destructive', onExecute: handleBulkDelete },
 *   ]}
 *   onClearSelection={() => setSelectedIds([])}
 * />
 * ```
 */
export function BulkActionsToolbar<T>({
  selectedItems,
  actions,
  onClearSelection,
  isProcessing = false,
}: BulkActionsToolbarProps<T>) {
  const count = selectedItems.length;

  if (count === 0) {
    return null;
  }

  const handleAction = async (action: BulkAction<T>) => {
    try {
      await action.onExecute(selectedItems);
      onClearSelection();
      toast.success(`Bulk action "${action.label}" completed successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Bulk action failed: ${message}`);
    }
  };

  // Show all actions as buttons (simplified for MVP scaffolding)
  const primaryActions = actions;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
      <div className="flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {count} item{count !== 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="ms-auto flex items-center gap-2">
        {primaryActions.map((action) => (
          <Button
            key={action.id}
            size="sm"
            variant={action.variant || 'outline'}
            onClick={() => handleAction(action)}
            disabled={isProcessing || action.isDisabled?.(selectedItems)}
          >
            {action.icon}
            <span className="ms-1">{action.label}</span>
          </Button>
        ))}

        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          disabled={isProcessing}
        >
          <X className="h-4 w-4 me-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}

// Pre-built actions for common operations
export const createBulkDeleteAction = <T extends { _id: string }>(
  onDelete: (ids: string[]) => Promise<void>
): BulkAction<T> => ({
  id: 'delete',
  label: 'Delete',
  icon: <Trash2 className="h-4 w-4" />,
  variant: 'destructive',
  onExecute: async (items) => {
    await onDelete(items.map((item) => item._id));
  },
});

export const createBulkExportAction = <T,>(
  onExport: (items: T[]) => Promise<void>
): BulkAction<T> => ({
  id: 'export',
  label: 'Export',
  icon: <Download className="h-4 w-4" />,
  variant: 'outline',
  onExecute: onExport,
});

export default BulkActionsToolbar;
