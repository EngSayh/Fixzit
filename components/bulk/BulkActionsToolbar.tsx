/**
 * FEATURE-002: Bulk Operations UI Component
 * 
 * @status IMPLEMENTED - Issue #293
 * @description Toolbar for bulk approve/reject/assign/delete operations
 * @targets WorkOrdersViewNew.tsx, InvoicesList.tsx, PropertyList.tsx
 * 
 * Features:
 * - Multi-select rows with checkbox
 * - Batch actions (approve, reject, assign, delete)
 * - Progress indicator for long-running operations
 * - Confirmation dialog for destructive actions
 * - Wired to POST /api/work-orders/bulk endpoint
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
  const [confirmAction, setConfirmAction] = React.useState<BulkAction<T> | null>(null);

  const executeAction = async (action: BulkAction<T>) => {
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
      setConfirmAction(null);
    }
  };

  const handleAction = async (action: BulkAction<T>) => {
    if (selectedItems.length === 0) return;

    // Show confirmation dialog if action requires confirmation
    if (action.confirmMessage) {
      setConfirmAction(action);
      return;
    }
    
    await executeAction(action);
  };

  const handleConfirm = async () => {
    if (confirmAction) {
      await executeAction(confirmAction);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmAction(null);
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <>
      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border rounded-lg p-6 max-w-md mx-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Confirm Action</h3>
            <p className="text-muted-foreground mb-4">{confirmAction.confirmMessage}</p>
            <p className="text-sm text-muted-foreground mb-4">
              This will affect {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancelConfirm} disabled={isProcessing}>
                Cancel
              </Button>
              <Button 
                variant={confirmAction.variant ?? 'default'} 
                onClick={handleConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin me-1" />
                ) : null}
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Toolbar */}
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
          className="ms-auto"
        >
          Clear selection
        </Button>
      </div>
    </>
  );
}

// ============================================================================
// PRESET ACTIONS (WIRED TO API)
// ============================================================================

/**
 * Helper to call bulk work order API
 */
async function callBulkWorkOrderAPI(
  action: 'update_status' | 'update_priority' | 'assign' | 'archive' | 'delete',
  workOrderIds: string[],
  params?: { status?: string; priority?: string; assigneeUserId?: string; reason?: string }
): Promise<{ affected: number; errors?: string[] }> {
  try {
    const response = await fetch('/api/work-orders/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        workOrderIds,
        ...params,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { 
        affected: 0, 
        errors: [data.error || `Bulk ${action} failed`] 
      };
    }
    
    return { 
      affected: data.results?.success ?? workOrderIds.length,
      errors: data.results?.failed?.map((f: { id: string; error: string }) => `${f.id}: ${f.error}`) ?? [],
    };
  } catch (error) {
    // Network error, timeout, or other fetch failure
    return {
      affected: 0,
      errors: [
        `Bulk ${action} request failed. Please check your connection and try again.`,
      ],
    };
  }
}

/**
 * Common bulk actions for work orders
 * Wired to POST /api/work-orders/bulk endpoint
 */
export const WORK_ORDER_BULK_ACTIONS: BulkAction<{ id: string }>[] = [
  {
    id: 'approve',
    label: 'Approve',
    icon: <Check className="h-4 w-4" />,
    handler: async (items) => {
      return callBulkWorkOrderAPI(
        'update_status',
        items.map(i => i.id),
        { status: 'COMPLETED', reason: 'Bulk approved' }
      );
    },
  },
  {
    id: 'reject',
    label: 'Reject',
    icon: <X className="h-4 w-4" />,
    confirmMessage: 'Are you sure you want to reject these items?',
    handler: async (items) => {
      return callBulkWorkOrderAPI(
        'update_status',
        items.map(i => i.id),
        { status: 'CANCELLED', reason: 'Bulk rejected' }
      );
    },
  },
  {
    id: 'assign',
    label: 'Assign',
    icon: <UserPlus className="h-4 w-4" />,
    handler: async (items) => {
      // NOTE: Bulk assignment requires selecting an assignee (user or vendor) via UI.
      // The current implementation does NOT provide assigneeUserId/assigneeVendorId
      // and would cause the /api/work-orders/bulk "assign" action to fail validation.
      // Until the user/vendor picker is implemented and wired here, we explicitly
      // return an error to avoid sending invalid API requests.
      return {
        affected: 0,
        errors: [
          'Bulk assignment is not yet implemented: this action requires a user/vendor picker to choose an assignee.',
        ],
      };
    },
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="h-4 w-4" />,
    variant: 'destructive',
    confirmMessage: 'This action cannot be undone. Delete selected items?',
    handler: async (items) => {
      return callBulkWorkOrderAPI(
        'delete',
        items.map(i => i.id),
        { reason: 'Bulk delete' }
      );
    },
  },
];

// ============================================================================
// EXPORTS
// ============================================================================

export default BulkActionsToolbar;
