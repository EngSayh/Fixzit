'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Tag,
  Archive,
  Copy,
  MoreHorizontal,
  ChevronDown,
} from '@/components/ui/icons';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Types
type Priority = 'P0' | 'P1' | 'P2' | 'P3';
type Status = 'open' | 'in_progress' | 'resolved' | 'blocked' | 'closed';

interface FloatingBulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  totalCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onBulkStatusChange: (status: Status) => void;
  onBulkPriorityChange: (priority: Priority) => void;
  onBulkAssign: (userId: string) => void;
  onBulkDelete: () => void;
  onBulkArchive: () => void;
  onBulkDuplicate: () => void;
  onBulkAddTag: (tag: string) => void;
  availableUsers?: Array<{ id: string; name: string; avatar?: string }>;
  availableTags?: string[];
  isProcessing?: boolean;
}

// Animation variants
const barVariants = {
  hidden: { 
    y: 100, 
    opacity: 0,
    scale: 0.95,
  },
  visible: { 
    y: 0, 
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 30,
    },
  },
  exit: { 
    y: 100, 
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  P0: { label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/50' },
  P1: { label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  P2: { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  P3: { label: 'Low', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
};

const statusConfig: Record<Status, { label: string; icon: typeof CheckCircle; color: string }> = {
  open: { label: 'Open', icon: AlertCircle, color: 'text-yellow-400' },
  in_progress: { label: 'In Progress', icon: AlertCircle, color: 'text-blue-400' },
  resolved: { label: 'Resolved', icon: CheckCircle, color: 'text-green-400' },
  blocked: { label: 'Blocked', icon: AlertCircle, color: 'text-red-400' },
  closed: { label: 'Closed', icon: CheckCircle, color: 'text-zinc-400' },
};

export function FloatingBulkActionsBar({
  selectedCount,
  selectedIds: _selectedIds,
  totalCount,
  onClearSelection,
  onSelectAll,
  onBulkStatusChange,
  onBulkPriorityChange,
  onBulkAssign,
  onBulkDelete,
  onBulkArchive,
  onBulkDuplicate,
  onBulkAddTag,
  availableUsers = [],
  availableTags = [],
  isProcessing = false,
}: FloatingBulkActionsBarProps) {
  const allSelected = selectedCount === totalCount;

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          variants={barVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="
            fixed bottom-6 left-1/2 -translate-x-1/2
            z-50 flex items-center gap-2
            px-4 py-3
            bg-card/95 backdrop-blur-lg
            border border-border
            rounded-xl shadow-2xl shadow-black/20
          "
        >
          {/* Selection Count */}
          <div className="flex items-center gap-3 pe-3 border-e border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onClearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {selectedCount} selected
              </span>
              <button type="button"
                onClick={allSelected ? onClearSelection : onSelectAll}
                className="text-xs text-primary hover:underline"
              >
                {allSelected ? 'Deselect all' : `Select all ${totalCount}`}
              </button>
            </div>
          </div>

          {/* Status Change */}
          <TooltipProvider>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={isProcessing}
                      className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Status</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Change status</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Set Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(statusConfig).map(([key, { label, icon: Icon, color }]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => onBulkStatusChange(key as Status)}
                    className="gap-2"
                  >
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span>{label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>

          {/* Priority Change */}
          <TooltipProvider>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={isProcessing}
                      className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Priority</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Change priority</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Set Priority</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(priorityConfig).map(([key, { label, color }]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => onBulkPriorityChange(key as Priority)}
                    className="gap-2"
                  >
                    <Badge variant="outline" className={`${color} text-xs`}>
                      {key}
                    </Badge>
                    <span>{label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>

          {/* Assign */}
          <TooltipProvider>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={isProcessing}
                      className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span className="hidden sm:inline">Assign</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Assign to user</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Assign To</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableUsers.length > 0 ? (
                  availableUsers.map((user) => (
                    <DropdownMenuItem
                      key={user.id}
                      onClick={() => onBulkAssign(user.id)}
                      className="gap-2"
                    >
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="h-6 w-6 rounded-full" />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span>{user.name}</span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No users available</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>

          {/* Separator */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* More Actions */}
          <TooltipProvider>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={isProcessing}
                      className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="hidden sm:inline">More</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>More actions</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48">
                {/* Tags Sub-menu */}
                {availableTags.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2">
                      <Tag className="h-4 w-4" />
                      <span>Add Tag</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {availableTags.map((tag) => (
                        <DropdownMenuItem
                          key={tag}
                          onClick={() => onBulkAddTag(tag)}
                        >
                          {tag}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                
                <DropdownMenuItem onClick={onBulkDuplicate} className="gap-2">
                  <Copy className="h-4 w-4" />
                  <span>Duplicate</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={onBulkArchive} className="gap-2">
                  <Archive className="h-4 w-4" />
                  <span>Archive</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={onBulkDelete} 
                  className="gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 ps-3 border-s border-border">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Processing...</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for managing bulk selection
export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const toggleSelection = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = React.useCallback(() => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, [items]);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = React.useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  // Keyboard handler for Shift+Click range selection
  const handleRangeSelection = React.useCallback(
    (clickedId: string, shiftKey: boolean) => {
      if (!shiftKey) {
        toggleSelection(clickedId);
        return;
      }

      // Get last selected item
      const selectedArray = Array.from(selectedIds);
      if (selectedArray.length === 0) {
        toggleSelection(clickedId);
        return;
      }

      const lastSelectedId = selectedArray[selectedArray.length - 1];
      const lastIndex = items.findIndex((item) => item.id === lastSelectedId);
      const clickedIndex = items.findIndex((item) => item.id === clickedId);

      if (lastIndex === -1 || clickedIndex === -1) {
        toggleSelection(clickedId);
        return;
      }

      // Select range
      const start = Math.min(lastIndex, clickedIndex);
      const end = Math.max(lastIndex, clickedIndex);
      const rangeIds = items.slice(start, end + 1).map((item) => item.id);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((id) => next.add(id));
        return next;
      });
    },
    [items, selectedIds, toggleSelection]
  );

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    handleRangeSelection,
    allSelected: selectedIds.size === items.length && items.length > 0,
  };
}

export default FloatingBulkActionsBar;
