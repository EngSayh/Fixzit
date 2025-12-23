'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Search,
  Plus,
  FileText,
  Home,
  Users,
  Building2,
  Wrench,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
  Languages,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';

// Types
interface Issue {
  id: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'open' | 'in_progress' | 'resolved' | 'blocked';
}

interface CommandPaletteProps {
  recentIssues?: Issue[];
  onCreateIssue?: () => void;
  onNavigate?: (path: string) => void;
  onAction?: (action: string) => void;
}

// Priority badge colors
const priorityColors = {
  P0: 'bg-red-500/20 text-red-400 border-red-500/50',
  P1: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  P2: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  P3: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
};

// Status icons
const statusIcons = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle,
  blocked: AlertCircle,
};

export function CommandPalette({
  recentIssues = [],
  onCreateIssue,
  onNavigate,
  onAction,
}: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  // Global keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      router.push(path);
    }
  };

  return (
    <>
      {/* Trigger Button (optional - can be used in header) */}
      <button
        onClick={() => setOpen(true)}
        className="
          inline-flex items-center gap-2 px-3 py-1.5
          text-sm text-zinc-400
          bg-zinc-900 hover:bg-zinc-800
          border border-zinc-700 rounded-lg
          transition-colors duration-150
        "
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="
          hidden sm:inline-flex items-center gap-1
          px-1.5 py-0.5 text-xs
          bg-zinc-800 rounded
          border border-zinc-700
        ">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search issues, navigate, or run actions..." 
          className="border-none focus:ring-0"
        />
        <CommandList className="max-h-[400px]">
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-6">
              <Search className="h-10 w-10 text-zinc-600" />
              <p className="text-zinc-400">No results found.</p>
              <p className="text-xs text-zinc-500">
                Try searching for issues, modules, or actions
              </p>
            </div>
          </CommandEmpty>

          {/* Quick Actions */}
          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => handleSelect(() => onCreateIssue?.())}
              className="gap-2"
            >
              <Plus className="h-4 w-4 text-fixzit-orange" />
              <span>Create New Issue</span>
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect(() => onAction?.('export'))}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              <span>Export Issues</span>
              <CommandShortcut>⌘E</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect(() => onAction?.('refresh'))}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Refresh Data</span>
              <CommandShortcut>⌘R</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Recent Issues */}
          {recentIssues.length > 0 && (
            <>
              <CommandGroup heading="Recent Issues">
                {recentIssues.slice(0, 5).map((issue) => {
                  const StatusIcon = statusIcons[issue.status];
                  return (
                    <CommandItem
                      key={issue.id}
                      onSelect={() => handleSelect(() => navigate(`/superadmin/issues/${issue.id}`))}
                      className="gap-2"
                    >
                      <StatusIcon className="h-4 w-4 text-zinc-400" />
                      <Badge 
                        variant="outline" 
                        className={`${priorityColors[issue.priority]} text-xs px-1.5`}
                      >
                        {issue.priority}
                      </Badge>
                      <span className="truncate flex-1">{issue.title}</span>
                      <span className="text-xs text-zinc-500 font-mono">
                        {issue.id}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Navigation */}
          <CommandGroup heading="Navigate">
            <CommandItem
              onSelect={() => handleSelect(() => navigate('/superadmin'))}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect(() => navigate('/superadmin/issues'))}
              className="gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              <span>Issue Tracker</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect(() => navigate('/superadmin/tenants'))}
              className="gap-2"
            >
              <Building2 className="h-4 w-4" />
              <span>Tenants / Orgs</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect(() => navigate('/superadmin/users'))}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              <span>User Management</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect(() => navigate('/superadmin/roles'))}
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              <span>Roles & Permissions</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect(() => navigate('/superadmin/audit'))}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              <span>Audit Logs</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Settings */}
          <CommandGroup heading="Settings">
            <CommandItem
              onSelect={() => handleSelect(() => onAction?.('toggle-theme'))}
              className="gap-2"
            >
              <Moon className="h-4 w-4" />
              <span>Toggle Theme</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect(() => onAction?.('toggle-language'))}
              className="gap-2"
            >
              <Languages className="h-4 w-4" />
              <span>Switch Language (EN/AR)</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect(() => navigate('/superadmin/settings'))}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              <span>System Settings</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect(() => navigate('/superadmin/notifications'))}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Help & Account */}
          <CommandGroup heading="Help & Account">
            <CommandItem
              onSelect={() => handleSelect(() => onAction?.('help'))}
              className="gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Help & Documentation</span>
              <CommandShortcut>?</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect(() => onAction?.('logout'))}
              className="gap-2 text-red-400"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>

        {/* Footer */}
        <div className="
          flex items-center justify-between
          px-3 py-2
          border-t border-zinc-800
          text-xs text-zinc-500
        ">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">esc</kbd>
              close
            </span>
          </div>
          <span className="text-fixzit-blue">Fixzit Souq</span>
        </div>
      </CommandDialog>
    </>
  );
}

// Hook for keyboard shortcuts throughout the app
export function useCommandPaletteShortcuts() {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - Open command palette
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(true);
      }
      // Cmd/Ctrl + N - New issue (handled by parent)
      // Cmd/Ctrl + E - Export (handled by parent)
      // Cmd/Ctrl + / - Toggle sidebar
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('toggle-sidebar'));
      }
      // ? - Help
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        // Only if not in input
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('show-help'));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen };
}

export default CommandPalette;
