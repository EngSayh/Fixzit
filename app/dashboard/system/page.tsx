'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Shield, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemCounters {
  system: { users: number; roles: number; tenants: number };
}

export default function SystemDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [counters, setCounters] = useState<SystemCounters | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/counters');
        if (!response.ok) throw new Error('Failed to fetch counters');
        const data = await response.json();
        setCounters({
          system: data.system || { users: 0, roles: 0, tenants: 0 },
        });
        setLoading(false);
      } catch (error) {
        logger.error('Failed to load system data:', error as Error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const tabs = [
    { id: 'users', label: 'Users', count: counters?.system.users },
    { id: 'roles', label: 'Roles & Permissions' },
    { id: 'billing', label: 'Billing' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'settings', label: 'System Settings' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Admin</h1>
        <p className="text-muted-foreground">Manage users, roles, and system settings</p>
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

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : counters?.system.users || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Roles</CardTitle>
              <Shield className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{loading ? '...' : counters?.system.roles || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tenants</CardTitle>
              <Building className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{loading ? '...' : counters?.system.tenants || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {['roles', 'billing', 'integrations', 'settings'].includes(activeTab) && (
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
