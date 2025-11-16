'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UserCog, Users, FileSignature } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CRMCounters {
  customers: { leads: number; active: number; contracts: number };
}

export default function CRMDashboard() {
  const [activeTab, setActiveTab] = useState('customers');
  const [counters, setCounters] = useState<CRMCounters | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/counters');
        if (!response.ok) throw new Error('Failed to fetch counters');
        const data = await response.json();
        setCounters({
          customers: data.customers || { leads: 0, active: 0, contracts: 0 },
        });
        setLoading(false);
      } catch (error) {
        logger.error('Failed to load CRM data:', error as Error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const tabs = [
    { id: 'customers', label: 'Customers', count: counters?.customers.active },
    { id: 'leads', label: 'Leads', count: counters?.customers.leads },
    { id: 'contracts', label: 'Contracts', count: counters?.customers.contracts },
    { id: 'feedback', label: 'Feedback' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">CRM</h1>
        <p className="text-muted-foreground">Manage customers, leads, and relationships</p>
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
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Customers</CardTitle>
              <Users className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{loading ? '...' : counters?.customers.active || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Leads</CardTitle>
              <UserCog className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{loading ? '...' : counters?.customers.leads || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contracts</CardTitle>
              <FileSignature className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{loading ? '...' : counters?.customers.contracts || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {['leads', 'contracts', 'feedback'].includes(activeTab) && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="font-medium">{tabs.find(t => t.id === activeTab)?.label}</p>
              <p className="text-sm mt-2">Content will be implemented here</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
