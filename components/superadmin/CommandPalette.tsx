/**
 * Command Palette (Cmd+K)
 * Global search for users, orgs, settings, navigation
 */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Search, Users, Building2, Settings, FileText, Clock } from '@/components/ui/icons';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  category: string;
}

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  const commands: CommandItem[] = [
    {
      id: 'tenants',
      label: 'View Tenants',
      icon: Building2,
      action: () => router.push('/superadmin/tenants'),
      category: 'Navigation',
    },
    {
      id: 'users',
      label: 'Manage Users',
      icon: Users,
      action: () => router.push('/superadmin/users'),
      category: 'Navigation',
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      action: () => router.push('/superadmin/system'),
      category: 'Navigation',
    },
    {
      id: 'issues',
      label: 'Issue Tracker',
      icon: FileText,
      action: () => router.push('/superadmin/issues'),
      category: 'Navigation',
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: Clock,
      action: () => router.push('/superadmin/audit'),
      category: 'Navigation',
    },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (command: CommandItem) => {
    command.action();
    setOpen(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <div className="flex items-center border-b px-4 py-3">
          <Search className="w-5 h-5 text-gray-400 me-3" />
          <Input
            placeholder="Search commands, users, tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 text-base"
            autoFocus
          />
          <kbd className="ms-auto px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">⌘K</kbd>
        </div>
        
        <div className="max-h-96 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No results found
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((command) => {
                const Icon = command.icon;
                return (
                  <button
                    key={command.id}
                    onClick={() => handleSelect(command)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-start"
                  >
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="flex-1">{command.label}</span>
                    <span className="text-xs text-gray-500">{command.category}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
