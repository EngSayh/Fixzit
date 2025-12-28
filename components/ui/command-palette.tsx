"use client";

/**
 * Command Palette Component (Cmd+K)
 * 
 * A Spotlight/Alfred-style command palette for power users.
 * Features:
 * - Global keyboard shortcut (Cmd+K / Ctrl+K)
 * - Permission-aware commands
 * - Fuzzy search
 * - Recent commands
 * - Keyboard navigation
 * 
 * @module components/ui/command-palette
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
import {
  SUPERADMIN_COMMANDS,
  filterCommands,
  groupCommandsByCategory,
  formatShortcut,
  getRecentCommands,
  addRecentCommand,
  getRecentCommandObjects,
  matchesShortcut,
  type Command,
  // CommandGroup type used for grouping logic
} from "@/services/ux/command-palette";

// Icons mapping
const ICON_MAP: Record<string, React.ReactNode> = {
  search: <SearchIcon />,
  home: <HomeIcon />,
  users: <UsersIcon />,
  building: <BuildingIcon />,
  wrench: <WrenchIcon />,
  invoice: <InvoiceIcon />,
  settings: <SettingsIcon />,
  plus: <PlusIcon />,
  eye: <EyeIcon />,
  edit: <EditIcon />,
  trash: <TrashIcon />,
  download: <DownloadIcon />,
  upload: <UploadIcon />,
  refresh: <RefreshIcon />,
  help: <HelpIcon />,
  keyboard: <KeyboardIcon />,
  moon: <MoonIcon />,
  sun: <SunIcon />,
  globe: <GlobeIcon />,
  shield: <ShieldIcon />,
  chart: <ChartIcon />,
  calendar: <CalendarIcon />,
  mail: <MailIcon />,
  bell: <BellIcon />,
};

interface CommandPaletteProps {
  /** User's permissions for filtering commands */
  permissions?: string[];
  /** User's roles for filtering commands */
  roles?: string[];
  /** Additional custom commands */
  customCommands?: Command[];
  /** Callback when a modal should be opened */
  onOpenModal?: (modalId: string, props?: Record<string, unknown>) => void;
  /** Callback when theme should toggle */
  onToggleTheme?: () => void;
}

export function CommandPalette({
  permissions = [],
  roles = [],
  customCommands = [],
  onOpenModal,
  onToggleTheme,
}: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();
  
  // Combine default and custom commands
  const allCommands = React.useMemo(
    () => [...SUPERADMIN_COMMANDS, ...customCommands],
    [customCommands]
  );
  
  // Get recent commands
  const recentIds = React.useMemo(() => getRecentCommands(), [open]);
  const recentCommands = React.useMemo(
    () => getRecentCommandObjects(allCommands, recentIds),
    [allCommands, recentIds]
  );
  
  // Filter commands based on query
  const filteredCommands = React.useMemo(() => {
    const filtered = filterCommands(allCommands, query, permissions, roles);
    
    // Add recent commands at the top if no query
    if (!query.trim() && recentCommands.length > 0) {
      return [...recentCommands, ...filtered.filter(cmd => !recentIds.includes(cmd.id))];
    }
    
    return filtered;
  }, [allCommands, query, permissions, roles, recentCommands, recentIds]);
  
  // Group commands
  const groupedCommands = React.useMemo(
    () => groupCommandsByCategory(filteredCommands),
    [filteredCommands]
  );
  
  // Global keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (matchesShortcut(e, "mod+k")) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  // Execute command action
  const executeCommand = React.useCallback((command: Command) => {
    setOpen(false);
    setQuery("");
    addRecentCommand(command.id);
    
    const { action } = command;
    
    switch (action.type) {
      case "navigate":
        router.push(action.path);
        break;
      case "modal":
        onOpenModal?.(action.modalId, action.props);
        break;
      case "external":
        window.open(action.url, "_blank", "noopener,noreferrer");
        break;
      case "toggle":
        if (action.setting === "theme") {
          onToggleTheme?.();
        }
        break;
      case "copy":
        navigator.clipboard.writeText(action.value);
        break;
      case "function":
        // Custom function handlers would be registered separately
        // Function execution is handled by registered handlers
        break;
    }
  }, [router, onOpenModal, onToggleTheme]);
  
  return (
    <CommandPrimitive.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Palette"
    >
      <div className="fixed inset-0 z-50 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
        <CommandPrimitive
          className={cn(
            "w-full max-w-lg overflow-hidden rounded-xl",
            "bg-card border border-border shadow-2xl",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-4">
            <SearchIcon className="h-5 w-5 text-muted-foreground shrink-0" />
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Type a command or search..."
              className={cn(
                "flex-1 h-14 bg-transparent px-3",
                "text-foreground placeholder:text-muted-foreground",
                "outline-none border-none focus:ring-0"
              )}
            />
            <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-2 text-xs text-muted-foreground">
              ESC
            </kbd>
          </div>
          
          {/* Command List */}
          <CommandPrimitive.List className="max-h-[400px] overflow-y-auto p-2">
            <CommandPrimitive.Empty className="py-8 text-center text-muted-foreground">
              No commands found.
            </CommandPrimitive.Empty>
            
            {groupedCommands.map((group) => (
              <CommandPrimitive.Group
                key={group.category}
                heading={group.label}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {group.commands.map((command) => (
                  <CommandItem
                    key={command.id}
                    command={command}
                    onSelect={() => executeCommand(command)}
                  />
                ))}
              </CommandPrimitive.Group>
            ))}
          </CommandPrimitive.List>
          
          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="h-5 rounded border border-border bg-muted px-1.5">↑</kbd>
              <kbd className="h-5 rounded border border-border bg-muted px-1.5">↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="h-5 rounded border border-border bg-muted px-1.5">↵</kbd>
              <span>Select</span>
            </div>
          </div>
        </CommandPrimitive>
      </div>
    </CommandPrimitive.Dialog>
  );
}

// =============================================================================
// COMMAND ITEM
// =============================================================================

interface CommandItemProps {
  command: Command;
  onSelect: () => void;
}

function CommandItem({ command, onSelect }: CommandItemProps) {
  const icon = ICON_MAP[command.icon] ?? <SearchIcon />;
  
  return (
    <CommandPrimitive.Item
      value={command.id}
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer",
        "text-foreground",
        "aria-selected:bg-muted",
        "hover:bg-muted/50"
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{command.label}</p>
        {command.description && (
          <p className="truncate text-sm text-muted-foreground">
            {command.description}
          </p>
        )}
      </div>
      {command.shortcut && (
        <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-2 text-xs text-muted-foreground">
          {formatShortcut(command.shortcut)}
        </kbd>
      )}
    </CommandPrimitive.Item>
  );
}

// =============================================================================
// ICON COMPONENTS (Inline SVGs for tree-shaking)
// =============================================================================

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

export default CommandPalette;
