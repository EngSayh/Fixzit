"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/skeletons';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Page() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<'overview'|'audit'|'features'|'users'>('overview');

  // Audit logs (Super Admin only) - server route verifies session/role
  const { data: auditData, error: auditError, isLoading: auditLoading } = useSWR(
    tab === 'audit' ? '/api/admin/audit-logs?limit=50' : null,
    fetcher
  );

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">You must be signed in to access admin pages.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Console</h1>
          <p className="text-gray-600">Super Admin tools and platform-wide settings.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={tab === 'overview' ? 'default' : 'ghost'} onClick={() => setTab('overview')}>Overview</Button>
          <Button variant={tab === 'audit' ? 'default' : 'ghost'} onClick={() => setTab('audit')}>Audit Logs</Button>
          <Button variant={tab === 'features' ? 'default' : 'ghost'} onClick={() => setTab('features')}>Feature Settings</Button>
          <Button variant={tab === 'users' ? 'default' : 'ghost'} onClick={() => setTab('users')}>Users</Button>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">Quick links to admin modules:</p>
              <div className="mt-4 flex gap-3">
                <Button onClick={() => setTab('audit')}>View Audit Logs</Button>
                <Button onClick={() => setTab('features')}>Feature Settings</Button>
                <Button onClick={() => setTab('users')}>Manage Users</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'audit' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Audit Logs</h2>

          {auditLoading && <TableSkeleton rows={8} />}

          {auditError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700">Failed to load audit logs.</p>
            </div>
          )}

          {!auditLoading && auditData?.logs && (
            <div className="bg-white rounded-lg shadow border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {auditData.logs.map((log: any) => (
                    <tr key={log._id}>
                      <td className="px-6 py-4 text-sm text-gray-700">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{log.user?.name || log.userId || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{log.action}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{log.entityType} {log.entityId ? `(${log.entityId})` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'features' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Feature Settings</h2>
          <p className="text-gray-600 mb-4">This links to the feature flags UI.</p>
          <div>
            <Button onClick={() => window.location.href = '/admin/feature-settings'}>Open Feature Settings</Button>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Users</h2>
          <p className="text-gray-600 mb-4">User management UI is not implemented yet. Use server scripts or the Super Admin API to manage users.</p>
          <div className="flex gap-2">
            <Button onClick={() => toast.info('User management API not implemented yet')}>Create User</Button>
            <Button onClick={() => toast.info('User management API not implemented yet')}>Invite</Button>
          </div>
        </div>
      )}
    </div>
  );
}

