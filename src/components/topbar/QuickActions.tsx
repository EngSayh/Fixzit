// src/components/topbar/QuickActions.tsx
'use client';
import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { MODULES } from '@/src/config/dynamic-modules';
import { useAppScope } from '@/src/contexts/AppScopeContext';

interface QuickActionsProps {
  perms?: string[];
}

export default function QuickActions({ perms = [] }: QuickActionsProps) {
  const { moduleId, language } = useAppScope();
  const mod = MODULES.find(m => m.id === moduleId);
  
  if (!mod || !mod.quickActions.length) return null;
  
  // Filter actions based on permissions
  const availableActions = mod.quickActions.filter(a => 
    perms.length === 0 || perms.includes(a.perm)
  );

  if (availableActions.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {availableActions.map(action => (
        <Link 
          key={action.href} 
          href={action.href} 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00A859] hover:bg-[#00A859]/90 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? action.labelAr : action.label}</span>
        </Link>
      ))}
    </div>
  );
}