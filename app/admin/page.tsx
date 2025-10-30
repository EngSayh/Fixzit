"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/skeletons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Page() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<'overview'|'users'|'roles'|'audit'|'features'>('overview');
  
  // Users state
  const [userSearch, setUserSearch] = useState('');
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', username: '', firstName: '', lastName: '', role: 'user', phone: '' });
  
  // Audit logs state
  const [auditPage, setAuditPage] = useState(0);
  const [auditLimit] = useState(25);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState('');
  
  // Users fetch (Super Admin only)
  const { data: usersData, error: usersError, isLoading: usersLoading, mutate: mutateUsers } = useSWR(
    tab === 'users' ? `/api/admin/users?search=${userSearch}&limit=100` : null,
    fetcher
  );

  // Audit logs with pagination & filters
  const auditUrl = tab === 'audit' 
    ? `/api/admin/audit-logs?limit=${auditLimit}&skip=${auditPage * auditLimit}${auditSearch ? `&userId=${auditSearch}` : ''}${auditAction ? `&action=${auditAction}` : ''}`
    : null;
  const { data: auditData, error: auditError, isLoading: auditLoading } = useSWR(auditUrl, fetcher);

  // Handlers
  const handleCreateUser = async () => {
    const toastId = toast.loading('Creating user...');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
      }
      toast.success('User created successfully', { id: toastId });
      setCreateUserOpen(false);
      setNewUser({ email: '', username: '', firstName: '', lastName: '', role: 'user', phone: '' });
      mutateUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user', { id: toastId });
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    const toastId = toast.loading('Deleting user...');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      toast.success('User deleted successfully', { id: toastId });
      mutateUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user', { id: toastId });
    }
  };

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
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Console</h1>
          <p className="text-gray-600">Super Admin tools and platform-wide settings.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={tab === 'overview' ? 'default' : 'ghost'} onClick={() => setTab('overview')}>Overview</Button>
          <Button variant={tab === 'users' ? 'default' : 'ghost'} onClick={() => setTab('users')}>Users</Button>
          <Button variant={tab === 'roles' ? 'default' : 'ghost'} onClick={() => setTab('roles')}>Roles</Button>
          <Button variant={tab === 'audit' ? 'default' : 'ghost'} onClick={() => setTab('audit')}>Audit Logs</Button>
          <Button variant={tab === 'features' ? 'default' : 'ghost'} onClick={() => setTab('features')}>Features</Button>
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
              <div className="mt-4 flex gap-3 flex-wrap">
                <Button onClick={() => setTab('users')}>Manage Users</Button>
                <Button onClick={() => setTab('roles')}>Manage Roles</Button>
                <Button onClick={() => setTab('audit')}>View Audit Logs</Button>
                <Button onClick={() => setTab('features')}>Feature Settings</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Users</h2>
            <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
              <DialogTrigger asChild>
                <Button>Create User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="email">Email*</Label>
                    <Input id="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
                  </div>
                  <div>
                    <Label htmlFor="username">Username*</Label>
                    <Input id="username" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" value={newUser.firstName} onChange={(e) => setNewUser({...newUser, firstName: e.target.value})} />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" value={newUser.lastName} onChange={(e) => setNewUser({...newUser, lastName: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={newUser.phone} onChange={(e) => setNewUser({...newUser, phone: e.target.value})} />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} placeholder="user, admin, etc" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setCreateUserOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateUser}>Create</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mb-4">
            <Input 
              placeholder="Search by email, name, or username..." 
              value={userSearch} 
              onChange={(e) => setUserSearch(e.target.value)} 
            />
          </div>

          {usersLoading && <TableSkeleton rows={8} />}

          {usersError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700">Failed to load users. {usersError.message || 'You may not have Super Admin access.'}</p>
            </div>
          )}

          {!usersLoading && usersData?.users && (
            <div className="bg-white rounded-lg shadow border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {usersData.users.map((user: { _id: string; username?: string; email?: string; personal?: { firstName?: string; lastName?: string }; professional?: { role?: string }; status?: string }) => (
                    <tr key={user._id}>
                      <td className="px-6 py-4 text-sm text-gray-700">{user.username}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{user.personal?.firstName} {user.personal?.lastName}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{user.professional?.role || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{user.status || 'ACTIVE'}</td>
                      <td className="px-6 py-4 text-sm text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => toast.info('Edit user UI coming soon')}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user._id, user.username || user.email || 'user')}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {usersData.total > 0 && (
                <div className="px-6 py-3 bg-gray-50 text-sm text-gray-600">
                  Total: {usersData.total} users
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'roles' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Roles & Permissions</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-600 mb-4">Roles and permissions management UI coming soon. Current roles defined in codebase:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li><strong>SUPER_ADMIN</strong> / super_admin - Full platform access</li>
                <li><strong>ADMIN</strong> - Organization admin</li>
                <li><strong>MANAGER</strong> - Department/team manager</li>
                <li><strong>USER</strong> - Standard user</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'audit' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Audit Logs</h2>

          <div className="mb-4 flex gap-3">
            <Input 
              placeholder="Filter by user ID..." 
              value={auditSearch} 
              onChange={(e) => setAuditSearch(e.target.value)} 
              className="max-w-xs"
            />
            <Input 
              placeholder="Filter by action..." 
              value={auditAction} 
              onChange={(e) => setAuditAction(e.target.value)} 
              className="max-w-xs"
            />
            <Button variant="ghost" onClick={() => { setAuditSearch(''); setAuditAction(''); setAuditPage(0); }}>Clear</Button>
          </div>

          {auditLoading && <TableSkeleton rows={8} />}

          {auditError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700">Failed to load audit logs.</p>
            </div>
          )}

          {!auditLoading && auditData?.logs && (
            <>
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
                    {auditData.logs.map((log: { _id: string; timestamp: string; userId?: string; user?: { name?: string }; action?: string; entityType?: string; entityId?: string }) => (
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
              <div className="flex justify-between items-center mt-4">
                <Button variant="ghost" disabled={auditPage === 0} onClick={() => setAuditPage(p => p - 1)}>Previous</Button>
                <span className="text-sm text-gray-600">Page {auditPage + 1}</span>
                <Button variant="ghost" disabled={auditData.logs.length < auditLimit} onClick={() => setAuditPage(p => p + 1)}>Next</Button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'features' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Feature Settings</h2>
          <p className="text-gray-600 mb-4">Manage platform feature toggles.</p>
          <Button onClick={() => window.location.href = '/admin/feature-settings'}>Open Feature Settings</Button>
        </div>
      )}
    </div>
  );
}

