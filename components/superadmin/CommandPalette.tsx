/**
 * Enhanced Command Palette (Cmd+K)
 * Global search for users, orgs, settings, navigation with recent issues
 * Apple Design: Clean, minimal, keyboard-first
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import {
  Search,
  Users,
  Building2,
  Settings,
  FileText,
  Clock,
  Bug,
  AlertCircle,
  Lightbulb,
  Wrench,
  Home,
  BarChart2,
  Shield,
  Database,
  Keyboard,
  ArrowRight,
  Hash,
} from 'lucide-react';
import {
  Command,
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
interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  shortcut?: string;
  category: 'navigation' | 'issues' | 'actions' | 'recent';
}

interface RecentIssue {
  id: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'bug' | 'feature' | 'improvement' | 'task';
}

// Priority color mapping
const priorityColors: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
};

// Type icon mapping
const typeIcons: Record<string, React.ElementType> = {
  bug: Bug,
  feature: Lightbulb,
  improvement: Wrench,
  task: FileText,
};

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Mock recent issues - in production, fetch from API/store
  const recentIssues: RecentIssue[] = [
    { id: 'FXZ-142', title: 'API rate limiting not working', priority: 'critical', type: 'bug' },
    { id: 'FXZ-138', title: 'Add dark mode to dashboard', priority: 'high', type: 'feature' },
    { id: 'FXZ-135', title: 'Optimize database queries', priority: 'medium', type: 'improvement' },
  ];

  // Navigation commands
  const navigationCommands: CommandAction[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Go to main dashboard',
      icon: Home,
      action: () => router.push('/superadmin'),
      shortcut: '⌘D',
      category: 'navigation',
    },
    {
      id: 'issues',
      label: 'Issue Tracker',
      description: 'View all issues',
      icon: FileText,
      action: () => router.push('/superadmin/issues'),
      shortcut: '⌘I',
      category: 'navigation',
    },
    {
      id: 'tenants',
      label: 'Tenants',
      description: 'Manage organizations',
      icon: Building2,
      action: () => router.push('/superadmin/tenants'),
      category: 'navigation',
    },
    {
      id: 'users',
      label: 'Users',
      description: 'User management',
      icon: Users,
      action: () => router.push('/superadmin/users'),
      category: 'navigation',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      description: 'View system analytics',
      icon: BarChart2,
      action: () => router.push('/superadmin/analytics'),
      category: 'navigation',
    },
    {
      id: 'settings',
      label: 'System Settings',
      description: 'Configure system',
      icon: Settings,
      action: () => router.push('/superadmin/system'),
      shortcut: '⌘,',
      category: 'navigation',
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      description: 'View audit trail',
      icon: Clock,
      action: () => router.push('/superadmin/audit'),
      category: 'navigation',
    },
    {
      id: 'security',
      label: 'Security',
      description: 'Security settings',
      icon: Shield,
      action: () => router.push('/superadmin/security'),
      category: 'navigation',
    },
    {
      id: 'database',
      label: 'Database',
      description: 'Database management',
      icon: Database,
      action: () => router.push('/superadmin/database'),
      category: 'navigation',
    },
  ];

  // Quick actions
  const quickActions: CommandAction[] = [
    {
      id: 'new-issue',
      label: 'Create New Issue',
      description: 'Report a bug or request a feature',
      icon: AlertCircle,
      action: () => router.push('/superadmin/issues/new'),
      shortcut: '⌘N',
      category: 'actions',
    },
    {
      id: 'shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      icon: Keyboard,
      action: () => {
        // Could open a shortcuts modal
        setOpen(false);
      },
      shortcut: '⌘/',
      category: 'actions',
    },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to toggle palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      
      // Quick shortcuts when palette is closed
      if (!open && (e.metaKey || e.ctrlKey)) {
        switch (e.key) {
          case 'd':
            e.preventDefault();
            router.push('/superadmin');
            break;
          case 'i':
            e.preventDefault();
            router.push('/superadmin/issues');
            break;
          case 'n':
            e.preventDefault();
            router.push('/superadmin/issues/new');
            break;
          case ',':
            e.preventDefault();
            router.push('/superadmin/system');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, router]);

  const handleSelect = useCallback((action: () => void) => {
    action();
    setOpen(false);
  }, []);

  const navigateToIssue = useCallback((issueId: string) => {
    router.push(`/superadmin/issues/${issueId}`);
    setOpen(false);
  }, [router]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="rounded-lg border shadow-md">
        <CommandInput 
          placeholder="Search commands, issues, users..." 
          className="h-12"
        />
        <CommandList className="max-h-[400px]">
          <CommandEmpty>
            <div className="flex flex-col items-center py-6 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No results found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          </CommandEmpty>

          {/* Recent Issues */}
          {recentIssues.length > 0 && (
            <>
              <CommandGroup heading="Recent Issues">
                {recentIssues.map((issue) => {
                  const TypeIcon = typeIcons[issue.type] || FileText;
                  return (
                    <CommandItem
                      key={issue.id}
                      value={`${issue.id} ${issue.title}`}
                      onSelect={() => navigateToIssue(issue.id)}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] px-1.5 py-0 ${priorityColors[issue.priority]}`}
                        >
                          {issue.priority.charAt(0).toUpperCase()}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground flex-shrink-0">
                          {issue.id}
                        </span>
                        <span className="truncate">{issue.title}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-aria-selected:opacity-100 transition-opacity" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Navigation */}
          <CommandGroup heading="Navigation">
            {navigationCommands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <CommandItem
                  key={cmd.id}
                  value={`${cmd.label} ${cmd.description || ''}`}
                  onSelect={() => handleSelect(cmd.action)}
                  className="flex items-center gap-3 py-2"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span>{cmd.label}</span>
                    {cmd.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {cmd.description}
                      </span>
                    )}
                  </div>
                  {cmd.shortcut && (
                    <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          {/* Quick Actions */}
          <CommandGroup heading="Quick Actions">
            {quickActions.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <CommandItem
                  key={cmd.id}
                  value={`${cmd.label} ${cmd.description || ''}`}
                  onSelect={() => handleSelect(cmd.action)}
                  className="flex items-center gap-3 py-2"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span>{cmd.label}</span>
                    {cmd.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {cmd.description}
                      </span>
                    )}
                  </div>
                  {cmd.shortcut && (
                    <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>

        {/* Footer with hint */}
        <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">esc</kbd>
              close
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            Type issue ID to jump
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
};
