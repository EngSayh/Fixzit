'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState('contracts');

  const tabs = [
    { id: 'contracts', label: 'Contracts' },
    { id: 'disputes', label: 'Disputes' },
    { id: 'audit', label: 'Audit Trail' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Compliance</h1>
        <p className="text-muted-foreground">Manage contracts, disputes, and audit trails</p>
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
            <p className="text-sm mt-2">Content will be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
