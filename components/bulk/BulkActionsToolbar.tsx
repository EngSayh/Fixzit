/**
 * FEATURE-002: Bulk Operations UI Component
 * 
 * @status SCAFFOLDING - Q2 2026
 * @description Toolbar for bulk approve/reject/assign/delete operations
 * @targets WorkOrdersViewNew.tsx, InvoicesList.tsx, PropertyList.tsx
 * 
 * Features:
 * - Multi-select rows with checkbox
 * - Batch actions (approve, reject, assign, delete)
 * - Progress indicator for long-running operations
 * - Undo capability (soft delete with 30s grace period)
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  X, 
  UserPlus, 
  Trash2, 
  Loader2,
} from '@/components/ui/icons';

// ============================================================================
// TYPES
// ============================================================================

export interface BulkAction<T = unknown> {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline';
  /** Confirm dialog message. If provided, shows confirmation before action */
  confirmMessage?: string;
  /** Handler receives selected items, returns count of affected items */
  handler: (selectedItems: T[]) => Promise<{ affected: number; errors?: string[] }>;
}

export interface BulkActionsToolbarProps<T> {
  selectedItems: T[];
  actions: BulkAction<T>[];
  onClearSelection: () => void;
  /** Called when an action completes successfully */
  onActionComplete?: (actionId: string, result: { affected: number }) => void;
  /** Called when an action fails */
  onActionError?: (actionId: string, errors: string[]) => void;
  className?: string;
}

// ============================================================================
// COMPONENT (PLACEHOLDER)
// ============================================================================

export function BulkActionsToolbar<T>({
  selectedItems,
  actions,
  onClearSelection,
  onActionComplete,
  onActionError,
  className = '',
}: BulkActionsToolbarProps<T>) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [processingAction, setProcessingAction] = React.useState<string | null>(null);

  const handleAction = async (action: BulkAction<T>) => {
    if (selectedItems.length === 0) return;

    // TODO: Implement confirmation dialog if action.confirmMessage is set
    
    setIsProcessing(true);
    setProcessingAction(action.id);

    try {
      const result = await action.handler(selectedItems);
      
      if (result.errors && result.errors.length > 0) {
        onActionError?.(action.id, result.errors);
      } else {
        onActionComplete?.(action.id, { affected: result.affected });
        onClearSelection();
      }
    } catch (error) {
      onActionError?.(action.id, [(error as Error).message]);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 p-2 bg-muted rounded-lg ${className}`}>
      <span className="text-sm font-medium px-2">
        {selectedItems.length} selected
      </span>

      <div className="flex items-center gap-1 flex-wrap">
        {/* Show all actions as buttons */}
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant ?? 'outline'}
            size="sm"
            disabled={isProcessing}
            onClick={() => handleAction(action)}
          >
            {processingAction === action.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              action.icon
            )}
            <span className="ms-1">{action.label}</span>
          </Button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        disabled={isProcessing}
        className="ml-auto"
      >
        Clear selection
      </Button>
    </div>
  );
}

// ============================================================================
// PRESET ACTIONS (TO BE WIRED Q2 2026)
// ============================================================================

/**
 * Common bulk actions for work orders
 * @todo Wire to API endpoints
 */
export const WORK_ORDER_BULK_ACTIONS: BulkAction<{ id: string }>[] = [
  {
    id: 'approve',
    label: 'Approve',
    icon: <Check className="h-4 w-4" />,
    handler: async (items) => {
      // TODO: Call POST /api/work-orders/bulk-approve
      void items.map(i => i.id);
      return { affected: items.length };
    },
  },
  {
    id: 'reject',
    label: 'Reject',
    icon: <X className="h-4 w-4" />,
    confirmMessage: 'Are you sure you want to reject these items?',
    handler: async (items) => {
      // TODO: Call POST /api/work-orders/bulk-reject
      void items.map(i => i.id);
      return { affected: items.length };
    },
  },
  {
    id: 'assign',
    label: 'Assign',
    icon: <UserPlus className="h-4 w-4" />,
    handler: async (items) => {
      // TODO: Open assignee picker modal, then call API
      void items.map(i => i.id);
      return { affected: items.length };
    },
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="h-4 w-4" />,
    variant: 'destructive',
    confirmMessage: 'This action cannot be undone. Delete selected items?',
    handler: async (items) => {
      // TODO: Call DELETE /api/work-orders/bulk
      void items.map(i => i.id);
      return { affected: items.length };
    },
  },
];

// ============================================================================
// EXPORTS
// ============================================================================

export default BulkActionsToolbar;
