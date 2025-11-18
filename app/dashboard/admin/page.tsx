'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

export default function AdminDashboard() {
  const auto = useAutoTranslator('dashboard.admin');
  const [activeTab, setActiveTab] = useState('doa');

  const tabs = [
    { id: 'doa', label: auto('DOA & Policies', 'tabs.doa') },
    { id: 'assets', label: auto('Assets', 'tabs.assets') },
    { id: 'facilities', label: auto('Facilities', 'tabs.facilities') },
    { id: 'documents', label: auto('Documents', 'tabs.documents') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {auto('Admin & Operations', 'header.title')}
        </h1>
        <p className="text-muted-foreground">
          {auto('Manage policies, assets, and facilities', 'header.subtitle')}
        </p>
      </div>

      <div className="flex items-center gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p className="font-medium">{tabs.find(t => t.id === activeTab)?.label}</p>
            <p className="text-sm mt-2">
              {auto('Content will be implemented here', 'placeholder.description')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
