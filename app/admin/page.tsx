"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/skeletons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Page() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [tab, setTab] = useState<'overview'|'users'|'roles'|'audit'|'features'>('overview');
  
  // Users state
  const [userSearch, setUserSearch] = useState('');
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', username: '', firstName: '', lastName: '', role: 'user', phone: '' });
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{id: string; email: string; username: string; firstName: string; lastName: string; phone: string; role: string; status: string} | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userPage, setUserPage] = useState(0);
  const [userLimit] = useState(50);
  
  // Audit logs state
  const [auditPage, setAuditPage] = useState(0);
  const [auditLimit] = useState(25);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState('');
  
  // Users fetch (Super Admin only) with pagination
  const usersUrl = tab === 'users'
    ? `/api/admin/users?search=${encodeURIComponent(userSearch)}&limit=${userLimit}&skip=${userPage * userLimit}${roleFilter ? `&role=${encodeURIComponent(roleFilter)}` : ''}${statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ''}`
    : null;
  const { data: usersData, error: usersError, isLoading: usersLoading, mutate: mutateUsers } = useSWR(usersUrl, fetcher);

  // Audit logs with pagination & filters
  const auditUrl = tab === 'audit' 
    ? `/api/admin/audit-logs?limit=${auditLimit}&skip=${auditPage * auditLimit}${auditSearch ? `&userId=${auditSearch}` : ''}${auditAction ? `&action=${auditAction}` : ''}`
    : null;
  const { data: auditData, error: auditError, isLoading: auditLoading } = useSWR(auditUrl, fetcher);

  // Handlers
  const handleCreateUser = async () => {
    const toastId = toast.loading(t('admin.users.creating', 'Creating user...'));
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t('admin.users.createFailed', 'Failed to create user'));
      }
      toast.success(t('admin.users.createSuccess', 'User created successfully'), { id: toastId });
      setCreateUserOpen(false);
      setNewUser({ email: '', username: '', firstName: '', lastName: '', role: 'user', phone: '' });
      mutateUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.users.createFailed', 'Failed to create user'), { id: toastId });
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    const confirmMsg = t('admin.users.deleteConfirm', `Delete user "${username}"? This cannot be undone.`);
    if (!confirm(confirmMsg.replace('${username}', username))) return;
    const toastId = toast.loading(t('admin.users.deleting', 'Deleting user...'));
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(t('admin.users.deleteFailed', 'Failed to delete user'));
      toast.success(t('admin.users.deleteSuccess', 'User deleted successfully'), { id: toastId });
      mutateUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.users.deleteFailed', 'Failed to delete user'), { id: toastId });
    }
  };

  const openEditUser = (user: {_id: string; email?: string; username?: string; personal?: {firstName?: string; lastName?: string}; phone?: string; professional?: {role?: string}; status?: string}) => {
    setEditingUser({
      id: user._id,
      email: user.email || '',
      username: user.username || '',
      firstName: user.personal?.firstName || '',
      lastName: user.personal?.lastName || '',
      phone: user.phone || '',
      role: user.professional?.role || '',
      status: user.status || 'ACTIVE',
    });
    setEditUserOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser?.id) return;
    const toastId = toast.loading('Updating user...');
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editingUser.email,
          username: editingUser.username,
          firstName: editingUser.firstName,
          lastName: editingUser.lastName,
          phone: editingUser.phone,
          role: editingUser.role,
          status: editingUser.status,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update user');
      }
      toast.success('User updated', { id: toastId });
      setEditUserOpen(false);
      setEditingUser(null);
      mutateUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user', { id: toastId });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (!usersData?.users) return;
    if (selectedUserIds.length === usersData.users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(usersData.users.map((u: {_id: string}) => u._id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return toast('No users selected');
    if (!confirm(`Delete ${selectedUserIds.length} users? This cannot be undone.`)) return;
    const toastId = toast.loading(`Deleting ${selectedUserIds.length} users...`);
    try {
      await Promise.all(selectedUserIds.map(id => fetch(`/api/admin/users/${id}`, { method: 'DELETE' })));
      toast.success(`${selectedUserIds.length} users deleted`, { id: toastId });
      setSelectedUserIds([]);
      mutateUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete some users', { id: toastId });
    }
  };

  const exportUsersCsv = () => {
    if (!usersData?.users || usersData.users.length === 0) return toast('No users to export');
    const rows = [['ID','Username','Email','First Name','Last Name','Role','Status','Phone']];
    for (const u of usersData.users) {
      rows.push([
        u._id || '',
        u.username || '',
        u.email || '',
        u.personal?.firstName || '',
        u.personal?.lastName || '',
        u.professional?.role || '',
        u.status || '',
        u.phone || '',
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${usersData.users.length} users`);
  };

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t('admin.title', 'Admin')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('admin.signInRequired', 'You must be signed in to access admin pages.')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Enforce Super Admin role
  const userRole = session.user?.role?.toLowerCase();
  if (userRole !== 'super_admin' && userRole !== 'superadmin') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t('admin.accessDenied', 'Access Denied')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive font-semibold mb-2">{t('admin.insufficientPerms', 'Insufficient Permissions')}</p>
            <p className="text-muted-foreground">{t('admin.superAdminRequired', 'You must have Super Admin privileges to access this page.')}</p>
            <p className="text-sm text-muted-foreground mt-4">{t('admin.currentRole', 'Current role')}: {session.user?.role || t('common.unknown', 'Unknown')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.console', 'Admin Console')}</h1>
          <p className="text-muted-foreground">{t('admin.consoleDesc', 'Super Admin tools and platform-wide settings.')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={tab === 'overview' ? 'default' : 'ghost'} onClick={() => setTab('overview')}>{t('admin.tabs.overview', 'Overview')}</Button>
          <Button variant={tab === 'users' ? 'default' : 'ghost'} onClick={() => setTab('users')}>{t('admin.tabs.users', 'Users')}</Button>
          <Button variant={tab === 'roles' ? 'default' : 'ghost'} onClick={() => setTab('roles')}>{t('admin.tabs.roles', 'Roles')}</Button>
          <Button variant={tab === 'audit' ? 'default' : 'ghost'} onClick={() => setTab('audit')}>{t('admin.tabs.audit', 'Audit Logs')}</Button>
          <Button variant={tab === 'features' ? 'default' : 'ghost'} onClick={() => setTab('features')}>{t('admin.tabs.features', 'Features')}</Button>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t('admin.overview.title', 'Overview')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('admin.overview.quickLinks', 'Quick links to admin modules:')}</p>
              <div className="mt-4 flex gap-3 flex-wrap">
                <Button onClick={() => setTab('users')}>{t('admin.overview.manageUsers', 'Manage Users')}</Button>
                <Button onClick={() => setTab('roles')}>{t('admin.overview.manageRoles', 'Manage Roles')}</Button>
                <Button onClick={() => setTab('audit')}>{t('admin.overview.viewLogs', 'View Audit Logs')}</Button>
                <Button onClick={() => setTab('features')}>{t('admin.overview.featureSettings', 'Feature Settings')}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t('admin.tabs.users', 'Users')}</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportUsersCsv}>{t('admin.users.exportCsv', 'Export CSV')}</Button>
              <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
                <DialogTrigger asChild>
                  <Button>{t('admin.users.createUser', 'Create User')}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('admin.users.createNewUser', 'Create New User')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="email">{t('admin.users.email', 'Email')}*</Label>
                      <Input id="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
                    </div>
                    <div>
                      <Label htmlFor="username">{t('admin.users.username', 'Username')}*</Label>
                      <Input id="username" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="firstName">{t('admin.users.firstName', 'First Name')}</Label>
                        <Input id="firstName" value={newUser.firstName} onChange={(e) => setNewUser({...newUser, firstName: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="lastName">{t('admin.users.lastName', 'Last Name')}</Label>
                        <Input id="lastName" value={newUser.lastName} onChange={(e) => setNewUser({...newUser, lastName: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone">{t('admin.users.phone', 'Phone')}</Label>
                      <Input id="phone" value={newUser.phone} onChange={(e) => setNewUser({...newUser, phone: e.target.value})} />
                    </div>
                    <div>
                      <Label htmlFor="role">{t('admin.users.role', 'Role')}</Label>
                      <Input id="role" value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} placeholder={t('admin.users.rolePlaceholder', 'user, admin, etc')} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" onClick={() => setCreateUserOpen(false)}>{t('admin.users.cancel', 'Cancel')}</Button>
                      <Button onClick={handleCreateUser}>{t('admin.users.create', 'Create')}</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="mb-4 flex gap-3 items-end">
            <div className="flex-1">
              <Input 
                placeholder={t('admin.users.searchPlaceholder', 'Search by email, name, or username...')}
                value={userSearch} 
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(0); // Reset to first page on search
                }} 
              />
            </div>
            <div>
              <Input 
                placeholder={t('admin.users.filterRole', 'Filter by role...')}
                value={roleFilter} 
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setUserPage(0); // Reset to first page on filter
                }} 
                className="w-40"
              />
            </div>
            <div>
              <Input 
                placeholder={t('admin.users.filterStatus', 'Filter by status...')}
                value={statusFilter} 
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setUserPage(0); // Reset to first page on filter
                }} 
                className="w-40"
              />
            </div>
            {selectedUserIds.length > 0 && (
              <Button variant="outline" onClick={handleBulkDelete} className="border-destructive text-destructive hover:bg-destructive/10">
                {t('admin.users.deleteSelected', 'Delete Selected')} ({selectedUserIds.length})
              </Button>
            )}
          </div>

          {usersLoading && <TableSkeleton rows={8} />}

          {usersError && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-2xl">
              <p className="text-destructive">{t('admin.users.loadFailed', 'Failed to load users.')} {usersError.message || t('admin.users.noAccess', 'You may not have Super Admin access.')}</p>
            </div>
          )}

          {!usersLoading && usersData?.users && (
            <>
              <div className="bg-card rounded-2xl shadow border overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input type="checkbox" checked={selectedUserIds.length === usersData.users.length && usersData.users.length > 0} onChange={toggleSelectAll} className="rounded" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('admin.users.username', 'Username')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('admin.users.email', 'Email')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('admin.users.name', 'Name')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('admin.users.role', 'Role')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('admin.users.status', 'Status')}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t('admin.users.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {usersData.users.map((user: { _id: string; username?: string; email?: string; personal?: { firstName?: string; lastName?: string }; professional?: { role?: string }; status?: string; phone?: string }) => (
                      <tr key={user._id}>
                        <td className="px-6 py-4">
                          <input type="checkbox" checked={selectedUserIds.includes(user._id)} onChange={() => toggleSelect(user._id)} className="rounded" />
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">{user.username}</td>
                        <td className="px-6 py-4 text-sm text-foreground">{user.email}</td>
                        <td className="px-6 py-4 text-sm text-foreground">{user.personal?.firstName} {user.personal?.lastName}</td>
                        <td className="px-6 py-4 text-sm text-foreground">{user.professional?.role || '—'}</td>
                        <td className="px-6 py-4 text-sm text-foreground">{user.status || 'ACTIVE'}</td>
                        <td className="px-6 py-4 text-sm text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditUser(user)}>{t('admin.users.edit', 'Edit')}</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user._id, user.username || user.email || 'user')}>{t('admin.users.delete', 'Delete')}</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {usersData.total > 0 && (
                  <div className="px-6 py-3 bg-muted text-sm text-muted-foreground">
                    {t('admin.users.total', 'Total')}: {usersData.total} {t('admin.users.usersCount', 'users')}
                  </div>
                )}
              </div>

              {/* Users Pagination */}
              {usersData && usersData.total > userLimit && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="ghost"
                    disabled={userPage === 0}
                    onClick={() => setUserPage(p => p - 1)}
                  >
                    {t('admin.users.previous', 'Previous')}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t('admin.users.page', 'Page')} {userPage + 1} {t('admin.users.of', 'of')} {Math.ceil(usersData.total / userLimit)} 
                    ({usersData.total} {t('admin.users.totalUsers', 'total users')})
                  </span>
                  <Button
                    variant="ghost"
                    disabled={(userPage + 1) * userLimit >= usersData.total}
                    onClick={() => setUserPage(p => p + 1)}
                  >
                    {t('admin.users.next', 'Next')}
                  </Button>
                </div>
              )}

              <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('admin.users.editUser', 'Edit User')}</DialogTitle>
                  </DialogHeader>
                  {editingUser && (
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="edit-email">{t('admin.users.email', 'Email')}</Label>
                        <Input id="edit-email" value={editingUser.email} onChange={(e) => setEditingUser({...editingUser, email: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="edit-username">{t('admin.users.username', 'Username')}</Label>
                        <Input id="edit-username" value={editingUser.username} onChange={(e) => setEditingUser({...editingUser, username: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="edit-firstName">{t('admin.users.firstName', 'First Name')}</Label>
                          <Input id="edit-firstName" value={editingUser.firstName} onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})} />
                        </div>
                        <div>
                          <Label htmlFor="edit-lastName">{t('admin.users.lastName', 'Last Name')}</Label>
                          <Input id="edit-lastName" value={editingUser.lastName} onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="edit-phone">{t('admin.users.phone', 'Phone')}</Label>
                        <Input id="edit-phone" value={editingUser.phone} onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="edit-role">{t('admin.users.role', 'Role')}</Label>
                        <Input id="edit-role" value={editingUser.role} onChange={(e) => setEditingUser({...editingUser, role: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="edit-status">{t('admin.users.status', 'Status')}</Label>
                        <Input id="edit-status" value={editingUser.status} onChange={(e) => setEditingUser({...editingUser, status: e.target.value})} placeholder={t('admin.users.statusPlaceholder', 'ACTIVE, SUSPENDED, etc')} />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setEditUserOpen(false)}>{t('admin.users.cancel', 'Cancel')}</Button>
                        <Button onClick={handleUpdateUser}>{t('admin.users.saveChanges', 'Save Changes')}</Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      )}

      {tab === 'roles' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">{t('admin.roles.title', 'Roles & Permissions')}</h2>
          <Card className="rounded-2xl">
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">{t('admin.roles.comingSoon', 'Roles and permissions management UI coming soon. Current roles defined in codebase:')}</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
                <li><strong>SUPER_ADMIN</strong> / super_admin - {t('admin.roles.superAdminDesc', 'Full platform access')}</li>
                <li><strong>ADMIN</strong> - {t('admin.roles.adminDesc', 'Organization admin')}</li>
                <li><strong>MANAGER</strong> - {t('admin.roles.managerDesc', 'Department/team manager')}</li>
                <li><strong>USER</strong> - {t('admin.roles.userDesc', 'Standard user')}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'audit' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">{t('admin.audit.title', 'Audit Logs')}</h2>

          <div className="mb-4 flex gap-3">
            <Input 
              placeholder={t('admin.audit.filterUser', 'Filter by user ID...')}
              value={auditSearch} 
              onChange={(e) => setAuditSearch(e.target.value)} 
              className="max-w-xs"
            />
            <Input 
              placeholder={t('admin.audit.filterAction', 'Filter by action...')}
              value={auditAction} 
              onChange={(e) => setAuditAction(e.target.value)} 
              className="max-w-xs"
            />
            <Button variant="ghost" onClick={() => { setAuditSearch(''); setAuditAction(''); setAuditPage(0); }}>{t('admin.audit.clear', 'Clear')}</Button>
          </div>

          {auditLoading && <TableSkeleton rows={8} />}

          {auditError && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-2xl">
              <p className="text-destructive">{t('admin.audit.loadFailed', 'Failed to load audit logs.')}</p>
            </div>
          )}

          {!auditLoading && auditData?.logs && (
            <>
              <div className="bg-card rounded-2xl shadow border overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('admin.audit.time', 'Time')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('admin.audit.user', 'User')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('admin.audit.action', 'Action')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('admin.audit.entity', 'Entity')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {auditData.logs.map((log: { _id: string; timestamp: string; userId?: string; user?: { name?: string }; action?: string; entityType?: string; entityId?: string }) => (
                      <tr key={log._id}>
                        <td className="px-6 py-4 text-sm text-foreground">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-foreground">{log.user?.name || log.userId || '—'}</td>
                        <td className="px-6 py-4 text-sm text-foreground">{log.action}</td>
                        <td className="px-6 py-4 text-sm text-foreground">{log.entityType} {log.entityId ? `(${log.entityId})` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button variant="ghost" disabled={auditPage === 0} onClick={() => setAuditPage(p => p - 1)}>{t('admin.audit.previous', 'Previous')}</Button>
                <span className="text-sm text-muted-foreground">{t('admin.audit.page', 'Page')} {auditPage + 1}</span>
                <Button variant="ghost" disabled={auditData.logs.length < auditLimit} onClick={() => setAuditPage(p => p + 1)}>{t('admin.audit.next', 'Next')}</Button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'features' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">{t('admin.features.title', 'Feature Settings')}</h2>
          <p className="text-muted-foreground mb-4">{t('admin.features.desc', 'Manage platform feature toggles.')}</p>
          <Button onClick={() => window.location.href = '/admin/feature-settings'}>{t('admin.features.open', 'Open Feature Settings')}</Button>
        </div>
      )}
    </div>
  );
}

