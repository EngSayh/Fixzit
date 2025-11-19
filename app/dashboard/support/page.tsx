'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

interface SupportCounters {
  support: { open: number; pending: number; resolved: number };
}

export default function SupportDashboard() {
  const auto = useAutoTranslator('dashboard.support');
  const [activeTab, setActiveTab] = useState('tickets');
  const [counters, setCounters] = useState<SupportCounters | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/counters');
        if (!response.ok) throw new Error(auto('Failed to fetch counters', 'errors.fetch'));
        const data = await response.json();
        setCounters({
          support: data.support || { open: 0, pending: 0, resolved: 0 },
        });
        setLoading(false);
      } catch (error) {
        logger.error('Failed to load support data:', error as Error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const tabs = [
    { id: 'tickets', label: auto('Tickets', 'tabs.tickets'), count: counters?.support.open },
    { id: 'knowledge', label: auto('Knowledge Base', 'tabs.knowledge') },
    { id: 'chat', label: auto('Live Chat', 'tabs.chat') },
    { id: 'sla', label: auto('SLA Management', 'tabs.sla') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {auto('Support', 'header.title')}
        </h1>
        <p className="text-muted-foreground">
          {auto('Manage tickets, KB, and customer support', 'header.subtitle')}
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
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ms-2 px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto('Open Tickets', 'metrics.open')}
              </CardTitle>
              <MessageSquare className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{loading ? '...' : counters?.support.open || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto('Pending', 'metrics.pending')}
              </CardTitle>
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{loading ? '...' : counters?.support.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {auto('Resolved', 'metrics.resolved')}
              </CardTitle>
              <CheckCircle className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{loading ? '...' : counters?.support.resolved || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {['knowledge', 'chat', 'sla'].includes(activeTab) && (
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
      )}
    </div>
  );
}
