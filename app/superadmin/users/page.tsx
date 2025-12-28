"use client";

/**
 * Superadmin Users Management
 * Full interface for managing all users across tenants
 * Features: Multi-select, bulk actions, organization filter, notifications
 * 
 * @module app/superadmin/users/page
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useI18n } from "@/i18n/useI18n";
import {
  Users,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Shield,
  Building2,
  Edit,
  Trash2,
  Bell,
  Mail,
  MoreHorizontal,
  CheckSquare,
  Square,
  MinusSquare,
} from "@/components/ui/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// Types
interface UserData {
  _id: string;
  email: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";
  role?: string;
  professional?: {
    role?: string;
  };
  personal?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  orgId?: string;
  orgName?: string;
  isSuperAdmin?: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface Organization {
  _id: string;
  name: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
  PENDING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  INACTIVE: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  SUSPENDED: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  ACTIVE: <CheckCircle className="h-3 w-3" />,
  PENDING: <Clock className="h-3 w-3" />,
  INACTIVE: <XCircle className="h-3 w-3" />,
  SUSPENDED: <AlertCircle className="h-3 w-3" />,
};

const USER_TYPES = [
  { value: "all", label: "All Types" },
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
];

export default function SuperadminUsersPage() {
  const { t } = useI18n();

  // State
  const [users, setUsers] = useState<UserData[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog states
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editStatusDialogOpen, setEditStatusDialogOpen] = useState(false);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Bulk action state
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationSubject, setNotificationSubject] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (orgFilter !== "all") params.set("orgId", orgFilter);
      if (userTypeFilter !== "all") params.set("userType", userTypeFilter);

      const response = await fetch(`/api/superadmin/users?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
      // Clear selection on filter change
      setSelectedIds(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, orgFilter, userTypeFilter]);

  // Fetch organizations for filter
  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await fetch("/api/superadmin/organizations?limit=100", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch {
      // Silently fail - filter will just not have orgs
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    const timeout = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Selection helpers
  const allSelected = useMemo(() => {
    if (users.length === 0) return false;
    return users.every(user => selectedIds.has(user._id));
  }, [users, selectedIds]);

  const someSelected = useMemo(() => {
    return selectedIds.size > 0 && !allSelected;
  }, [selectedIds, allSelected]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u._id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Bulk actions
  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    
    setActionLoading(true);
    try {
      const response = await fetch("/api/superadmin/users/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userIds: Array.from(selectedIds),
          updates: { status: bulkStatus },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update users");
      }

      toast.success(`Updated ${selectedIds.size} users`);
      setBulkStatusDialogOpen(false);
      setBulkStatus("");
      setSelectedIds(new Set());
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update users");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationSubject || !notificationMessage || selectedIds.size === 0) return;
    
    setActionLoading(true);
    try {
      const response = await fetch("/api/superadmin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userIds: Array.from(selectedIds),
          subject: notificationSubject,
          message: notificationMessage,
          type: "email",
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send notifications");
      }

      toast.success(`Sent notification to ${selectedIds.size} users`);
      setNotificationDialogOpen(false);
      setNotificationSubject("");
      setNotificationMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send notifications");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setActionLoading(true);
    try {
      const response = await fetch("/api/superadmin/users/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userIds: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete users");
      }

      toast.success(`Deleted ${selectedIds.size} users`);
      setDeleteDialogOpen(false);
      setSelectedIds(new Set());
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete users");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSingleStatusChange = async (userId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update user");
      }

      toast.success("User status updated");
      setEditStatusDialogOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getUserName = (user: UserData) => {
    const first = user.personal?.firstName || "";
    const last = user.personal?.lastName || "";
    return (first + " " + last).trim() || "—";
  };

  const getUserRole = (user: UserData) => {
    return user.professional?.role || user.role || "—";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {t("superadmin.nav.users")}
          </h1>
          <p className="text-slate-400">
            Manage all system users across all tenants
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-blue-600 text-blue-400">
                  <MoreHorizontal className="h-4 w-4 me-2" />
                  Bulk Actions ({selectedIds.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-800 border-slate-700">
                <DropdownMenuItem 
                  onClick={() => setBulkStatusDialogOpen(true)}
                  className="text-slate-200 hover:bg-slate-700"
                >
                  <Edit className="h-4 w-4 me-2" />
                  Change Status
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setNotificationDialogOpen(true)}
                  className="text-slate-200 hover:bg-slate-700"
                >
                  <Bell className="h-4 w-4 me-2" />
                  Send Notification
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem 
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-400 hover:bg-slate-700"
                >
                  <Trash2 className="h-4 w-4 me-2" />
                  Delete Users
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="border-slate-700 text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search row */}
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by email, name, phone, or organization..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            {/* Filter row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
                placeholder="Status"
                className="w-full sm:w-40 bg-slate-800 border-slate-700 text-white"
              >
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </Select>
              
              <Select 
                value={orgFilter} 
                onValueChange={setOrgFilter}
                placeholder="Organization"
                className="w-full sm:w-48 bg-slate-800 border-slate-700 text-white"
              >
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org._id} value={org._id}>
                    {org.name}
                  </SelectItem>
                ))}
              </Select>
              
              <Select 
                value={userTypeFilter} 
                onValueChange={setUserTypeFilter}
                placeholder="User Type"
                className="w-full sm:w-40 bg-slate-800 border-slate-700 text-white"
              >
                {USER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5" />
            Users
            {pagination && (
              <span className="text-sm font-normal text-slate-400">
                ({pagination.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={fetchUsers}>
                Try Again
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Users className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="w-12 text-slate-400">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center w-5 h-5 text-slate-400 hover:text-white"
                        title={allSelected ? "Deselect all" : "Select all"}
                      >
                        {allSelected ? (
                          <CheckSquare className="h-4 w-4 text-blue-500" />
                        ) : someSelected ? (
                          <MinusSquare className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="text-slate-400">User</TableHead>
                    <TableHead className="text-slate-400">Role</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Organization</TableHead>
                    <TableHead className="text-slate-400">Created</TableHead>
                    <TableHead className="text-slate-400 text-end">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user._id}
                      className={`border-slate-800 hover:bg-slate-800/50 ${selectedIds.has(user._id) ? "bg-blue-900/20" : ""}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(user._id)}
                          onCheckedChange={() => toggleSelect(user._id)}
                          className="border-slate-600 data-[state=checked]:bg-blue-600"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{getUserName(user)}</span>
                            {user.isSuperAdmin && (
                              <span title="Super Admin">
                                <Shield className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-slate-300 border-slate-600">
                          {getUserRole(user)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${STATUS_COLORS[user.status] || ""} flex items-center gap-1 w-fit`}
                        >
                          {STATUS_ICONS[user.status]}
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-300">
                          <Building2 className="h-3 w-3 text-slate-500" />
                          {user.orgName || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-400 text-sm">
                          {formatDate(user.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setViewDialogOpen(true);
                              }}
                              className="text-slate-200 hover:bg-slate-700"
                            >
                              <Eye className="h-4 w-4 me-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setEditStatusDialogOpen(true);
                              }}
                              className="text-slate-200 hover:bg-slate-700"
                            >
                              <Edit className="h-4 w-4 me-2" />
                              Change Status
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedIds(new Set([user._id]));
                                setNotificationDialogOpen(true);
                              }}
                              className="text-slate-200 hover:bg-slate-700"
                            >
                              <Mail className="h-4 w-4 me-2" />
                              Send Notification
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-800">
              <p className="text-sm text-slate-400">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrev || loading}
                  onClick={() => setPage((p) => p - 1)}
                  className="border-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="border-slate-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Details
            </DialogTitle>
            <DialogDescription>
              View detailed information about this user
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="font-medium">{getUserName(selectedUser)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Role</p>
                  <p className="font-medium">{getUserRole(selectedUser)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  <Badge className={STATUS_COLORS[selectedUser.status]}>
                    {selectedUser.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Organization</p>
                  <p className="font-medium">{selectedUser.orgName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Phone</p>
                  <p className="font-medium">{selectedUser.personal?.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Created</p>
                  <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Last Login</p>
                  <p className="font-medium">{formatDate(selectedUser.lastLogin)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
              className="border-slate-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog (Single User) */}
      <Dialog open={editStatusDialogOpen} onOpenChange={setEditStatusDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Change User Status</DialogTitle>
            <DialogDescription>
              Update the status for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select 
                value={bulkStatus} 
                onValueChange={setBulkStatus}
                placeholder="Select status"
                className="w-full bg-slate-800 border-slate-700 text-white"
              >
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStatusDialogOpen(false)} className="border-slate-700">
              Cancel
            </Button>
            <Button 
              onClick={() => selectedUser && handleSingleStatusChange(selectedUser._id, bulkStatus)}
              disabled={!bulkStatus || actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Status Change</DialogTitle>
            <DialogDescription>
              Update status for {selectedIds.size} selected users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select 
                value={bulkStatus} 
                onValueChange={setBulkStatus}
                placeholder="Select status"
                className="w-full bg-slate-800 border-slate-700 text-white"
              >
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)} className="border-slate-700">
              Cancel
            </Button>
            <Button 
              onClick={handleBulkStatusChange}
              disabled={!bulkStatus || actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              Update {selectedIds.size} Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Send Notification
            </DialogTitle>
            <DialogDescription>
              Send an email notification to {selectedIds.size} selected user{selectedIds.size !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={notificationSubject}
                onChange={(e) => setNotificationSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Enter your message..."
                rows={5}
                className="bg-slate-800 border-slate-700 text-white resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotificationDialogOpen(false)} className="border-slate-700">
              Cancel
            </Button>
            <Button 
              onClick={handleSendNotification}
              disabled={!notificationSubject || !notificationMessage || actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Mail className="h-4 w-4 me-2" />}
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} user{selectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-400">
              This will permanently remove the selected users and all their associated data.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="border-slate-700">
              Cancel
            </Button>
            <Button 
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Trash2 className="h-4 w-4 me-2" />}
              Delete Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
