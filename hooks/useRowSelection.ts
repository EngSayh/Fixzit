/**
 * @file useRowSelection hook for managing table row selection state
 * Used with DataTableStandard's selectable prop
 */
import { useState, useCallback, useMemo } from "react";

export interface UseRowSelectionOptions<T> {
  /** Function to get unique ID from row (defaults to row.id) */
  getRowId?: (row: T) => string;
  /** Initial selected row IDs */
  initialSelection?: Set<string>;
}

export interface UseRowSelectionReturn {
  /** Currently selected row IDs */
  selectedRows: Set<string>;
  /** Number of selected rows */
  selectedCount: number;
  /** Callback to update selection (for DataTableStandard's onSelectionChange) */
  onSelectionChange: (selected: Set<string>) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Check if a specific row is selected */
  isSelected: (rowId: string) => boolean;
  /** Get array of selected row IDs */
  selectedIds: string[];
}

/**
 * Hook for managing table row selection state.
 * 
 * @example
 * ```tsx
 * const { selectedRows, onSelectionChange, selectedCount, clearSelection } = useRowSelection();
 * 
 * <DataTableStandard
 *   selectable
 *   selectedRows={selectedRows}
 *   onSelectionChange={onSelectionChange}
 *   // ...
 * />
 * 
 * {selectedCount > 0 && (
 *   <FloatingBulkActions
 *     selectedCount={selectedCount}
 *     onClearSelection={clearSelection}
 *     // ...
 *   />
 * )}
 * ```
 */
export function useRowSelection<T extends Record<string, unknown>>(
  options: UseRowSelectionOptions<T> = {}
): UseRowSelectionReturn {
  const { initialSelection = new Set<string>() } = options;

  const [selectedRows, setSelectedRows] = useState<Set<string>>(initialSelection);

  const onSelectionChange = useCallback((selected: Set<string>) => {
    setSelectedRows(selected);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const isSelected = useCallback(
    (rowId: string) => selectedRows.has(rowId),
    [selectedRows]
  );

  const selectedIds = useMemo(
    () => Array.from(selectedRows),
    [selectedRows]
  );

  const selectedCount = selectedRows.size;

  return {
    selectedRows,
    selectedCount,
    onSelectionChange,
    clearSelection,
    isSelected,
    selectedIds,
  };
}
