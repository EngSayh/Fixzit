'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type Table as _Table,
  type Row,
  type Column,
  type HeaderGroup,
  type Header,
  type Cell,
  type CellContext,
  type HeaderContext,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  MessageSquare,
  Clock,
  Settings2,
} from '@/components/ui/icons';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FloatingBulkActionsBar } from './FloatingBulkActionsBar';
import { SkeletonTable } from './SkeletonTableEnhanced';

// ============================================
// Types
// ============================================

type Priority = 'P0' | 'P1' | 'P2' | 'P3';
type Status = 'open' | 'in_progress' | 'resolved' | 'blocked' | 'closed';
type Category = 'Bug' | 'Documentation' | 'Efficiency' | 'Missing Test' | 'Security' | 'Layout';

export interface Issue {
  id: string;
  priority: Priority;
  title: string;
  description?: string;
  status: Status;
  category: Category;
  module: string;
  spec: string;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  comments: number;
}

interface EnhancedIssueTableProps {
  issues: Issue[];
  isLoading?: boolean;
  onIssueClick?: (issue: Issue) => void;
  onIssueEdit?: (issue: Issue) => void;
  onIssueDelete?: (issueId: string) => void;
  onIssueDuplicate?: (issue: Issue) => void;
  onBulkAction?: (action: string, issueIds: string[], data?: unknown) => Promise<void>;
}

// ============================================
// Constants
// ============================================

const priorityConfig: Record<Priority, { label: string; color: string; bgColor: string }> = {
  P0: { 
    label: 'Critical', 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/20 border-red-500/50 hover:bg-red-500/30' 
  },
  P1: { 
    label: 'High', 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/20 border-orange-500/50 hover:bg-orange-500/30' 
  },
  P2: { 
    label: 'Medium', 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30' 
  },
  P3: { 
    label: 'Low', 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30' 
  },
};

const statusConfig: Record<Status, { label: string; color: string; bgColor: string }> = {
  open: { label: 'Open', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  in_progress: { label: 'In Progress', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  resolved: { label: 'Resolved', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/30' },
  blocked: { label: 'Blocked', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30' },
  closed: { label: 'Closed', color: 'text-zinc-400', bgColor: 'bg-zinc-500/10 border-zinc-500/30' },
};

// ============================================
// Column Helper
// ============================================

const columnHelper = createColumnHelper<Issue>();

// ============================================
// Helper Components
// ============================================

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp className="ms-2 h-4 w-4" />;
  if (sorted === 'desc') return <ChevronDown className="ms-2 h-4 w-4" />;
  return <ChevronsUpDown className="ms-2 h-4 w-4 opacity-50" />;
}

interface RowActionsProps {
  issue: Issue;
  isHovered: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

function RowActions({ issue: _issue, isHovered, onView, onEdit, onDelete, onDuplicate }: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {/* Quick actions on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-1"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-white"
                    onClick={onView}
                    aria-label="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View details</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-white"
                    onClick={onEdit}
                    aria-label="Edit issue"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit issue</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        )}
      </AnimatePresence>

      {/* More menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-muted border-input">
          <DropdownMenuItem onClick={onView} className="gap-2">
            <Eye className="h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit} className="gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate} className="gap-2">
            <Copy className="h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Copy Link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className="gap-2 text-red-400 focus:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// ============================================
// Main Component
// ============================================

export function EnhancedIssueTable({
  issues,
  isLoading = false,
  onIssueClick,
  onIssueEdit,
  onIssueDelete,
  onIssueDuplicate,
  onBulkAction,
}: EnhancedIssueTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [hoveredRowId, setHoveredRowId] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Columns definition
  const columns = React.useMemo(
    () => [
      // Selection column
      columnHelper.display({
        id: 'select',
        header: ({ table }: HeaderContext<Issue, unknown>) => {
          const isAllSelected = table.getIsAllPageRowsSelected();
          const isSomeSelected = table.getIsSomePageRowsSelected();
          return (
            <Checkbox
              checked={isAllSelected || isSomeSelected}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
              className="border-zinc-600"
              data-indeterminate={!isAllSelected && isSomeSelected}
            />
          );
        },
        cell: ({ row }: CellContext<Issue, unknown>) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="border-zinc-600"
          />
        ),
        size: 40,
      }),

      // ID column
      columnHelper.accessor('id', {
        header: 'ID',
        cell: (info: CellContext<Issue, string>) => (
          <span className="font-mono text-xs text-zinc-400">
            {info.getValue()}
          </span>
        ),
        size: 100,
      }),

      // Priority column
      columnHelper.accessor('priority', {
        header: ({ column }: HeaderContext<Issue, Priority>) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ms-3 h-8 text-zinc-400 hover:text-white"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label="Sort by priority"
          >
            Priority
            <SortIcon sorted={column.getIsSorted()} />
          </Button>
        ),
        cell: (info: CellContext<Issue, Priority>) => {
          const priority = info.getValue();
          const config = priorityConfig[priority];
          return (
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-medium transition-colors',
                config.bgColor,
                config.color,
                priority === 'P0' && 'animate-pulse'
              )}
            >
              {priority}
            </Badge>
          );
        },
        size: 80,
      }),

      // Title column
      columnHelper.accessor('title', {
        header: ({ column }: HeaderContext<Issue, string>) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ms-3 h-8 text-zinc-400 hover:text-white"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label="Sort by title"
          >
            Title
            <SortIcon sorted={column.getIsSorted()} />
          </Button>
        ),
        cell: (info: CellContext<Issue, string>) => (
          <div className="flex items-center gap-2 max-w-[300px]">
            <span className="truncate font-medium text-foreground">
              {info.getValue()}
            </span>
            {info.row.original.comments > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <MessageSquare className="h-3 w-3" />
                      {info.row.original.comments}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {info.row.original.comments} comment(s)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ),
        size: 300,
      }),

      // Status column
      columnHelper.accessor('status', {
        header: ({ column }: HeaderContext<Issue, Status>) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ms-3 h-8 text-zinc-400 hover:text-white"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label="Sort by status"
          >
            Status
            <SortIcon sorted={column.getIsSorted()} />
          </Button>
        ),
        cell: (info: CellContext<Issue, Status>) => {
          const status = info.getValue();
          const config = statusConfig[status];
          return (
            <Badge
              variant="outline"
              className={cn('text-xs', config.bgColor, config.color)}
            >
              {config.label}
            </Badge>
          );
        },
        size: 120,
      }),

      // Category column
      columnHelper.accessor('category', {
        header: 'Category',
        cell: (info: CellContext<Issue, Category>) => (
          <span className="text-sm text-muted-foreground">{info.getValue()}</span>
        ),
        size: 120,
      }),

      // Module column
      columnHelper.accessor('module', {
        header: 'Module',
        cell: (info: CellContext<Issue, string>) => (
          <span className="text-sm text-muted-foreground">{info.getValue()}</span>
        ),
        size: 100,
      }),

      // Assignee column
      columnHelper.accessor('assignee', {
        header: 'Assignee',
        cell: (info: CellContext<Issue, Issue['assignee']>) => {
          const assignee = info.getValue();
          if (!assignee) {
            return <span className="text-xs text-zinc-500">Unassigned</span>;
          }
          return (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                {assignee.avatar ? (
                  <img src={assignee.avatar} alt="" className="h-6 w-6 rounded-full" />
                ) : (
                  assignee.name.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                {assignee.name}
              </span>
            </div>
          );
        },
        size: 150,
      }),

      // Created At column
      columnHelper.accessor('createdAt', {
        header: ({ column }: HeaderContext<Issue, string>) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ms-3 h-8 text-zinc-400 hover:text-white"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label="Sort by creation date"
          >
            Created
            <SortIcon sorted={column.getIsSorted()} />
          </Button>
        ),
        cell: (info: CellContext<Issue, string>) => (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(info.getValue())}
          </div>
        ),
        size: 120,
      }),

      // Actions column
      columnHelper.display({
        id: 'actions',
        cell: ({ row }: CellContext<Issue, unknown>) => (
          <RowActions
            issue={row.original}
            isHovered={hoveredRowId === row.original.id}
            onView={() => onIssueClick?.(row.original)}
            onEdit={() => onIssueEdit?.(row.original)}
            onDelete={() => onIssueDelete?.(row.original.id)}
            onDuplicate={() => onIssueDuplicate?.(row.original)}
          />
        ),
        size: 80,
      }),
    ],
    [hoveredRowId, onIssueClick, onIssueEdit, onIssueDelete, onIssueDuplicate]
  );

  // Table instance
  const table = useReactTable({
    data: issues,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Selected IDs
  const selectedIds = Object.keys(rowSelection).filter((key) => rowSelection[key]);

  // Bulk action handlers
  const handleBulkAction = async (action: string, data?: unknown) => {
    if (!onBulkAction) return;
    setIsProcessing(true);
    try {
      await onBulkAction(action, selectedIds, data);
      setRowSelection({});
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <SkeletonTable rows={8} columns={9} />;
  }

  return (
    <div className="w-full">
      {/* Column Visibility Toggle */}
      <div className="flex items-center justify-end pb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" aria-label="Toggle column visibility">
              <Settings2 className="h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-muted border-input">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column: Column<Issue, unknown>) => column.getCanHide())
              .map((column: Column<Issue, unknown>) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<Issue>) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header: Header<Issue, unknown>) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            <AnimatePresence>
              {table.getRowModel().rows.map((row: Row<Issue>, index: number) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    'group transition-colors duration-150',
                    'hover:bg-muted/50',
                    row.getIsSelected() && 'bg-primary/10'
                  )}
                  onMouseEnter={() => setHoveredRowId(row.original.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  onClick={() => onIssueClick?.(row.original)}
                  style={{ cursor: onIssueClick ? 'pointer' : 'default' }}
                >
                  {row.getVisibleCells().map((cell: Cell<Issue, unknown>) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 whitespace-nowrap"
                      onClick={(e) => {
                        // Don't trigger row click for checkbox and actions
                        if (cell.column.id === 'select' || cell.column.id === 'actions') {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to previous page"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Go to next page"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <FloatingBulkActionsBar
        selectedCount={selectedIds.length}
        selectedIds={selectedIds}
        totalCount={issues.length}
        onClearSelection={() => setRowSelection({})}
        onSelectAll={() => {
          const allSelected: RowSelectionState = {};
          issues.forEach((issue) => {
            allSelected[issue.id] = true;
          });
          setRowSelection(allSelected);
        }}
        onBulkStatusChange={(status) => handleBulkAction('status', { status })}
        onBulkPriorityChange={(priority) => handleBulkAction('priority', { priority })}
        onBulkAssign={(userId) => handleBulkAction('assign', { userId })}
        onBulkDelete={() => handleBulkAction('delete')}
        onBulkArchive={() => handleBulkAction('archive')}
        onBulkDuplicate={() => handleBulkAction('duplicate')}
        onBulkAddTag={(tag) => handleBulkAction('tag', { tag })}
        isProcessing={isProcessing}
      />
    </div>
  );
}

export default EnhancedIssueTable;
