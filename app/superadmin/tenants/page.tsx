"use client";

/**
 * Superadmin Tenants/Orgs Management
 * Full CRUD interface for managing all organizations
 * 
 * @module app/superadmin/tenants/page
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
} from "@/components/ui/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Types
interface Organization {
  _id: string;
  name: string;
  code?: string;
  slug?: string;
  type: "CORPORATE" | "GOVERNMENT" | "INDIVIDUAL" | "NONPROFIT" | "STARTUP";
  subscriptionStatus: "ACTIVE" | "SUSPENDED" | "CANCELLED" | "TRIAL" | "EXPIRED";
  complianceStatus?: "COMPLIANT" | "NON_COMPLIANT" | "PENDING_REVIEW" | "UNDER_AUDIT";
  contactEmail?: string;
  contactPhone?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  createdAt: string;
  updatedAt?: string;
  features?: {
    maxUsers?: number;
  };
  usage?: {
    currentUsers?: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ListResponse {
  organizations: Organization[];
  pagination: Pagination;
}

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
  TRIAL: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  SUSPENDED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
  EXPIRED: "bg-muted text-muted-foreground border-border",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  ACTIVE: <CheckCircle className="h-3 w-3" />,
  TRIAL: <Clock className="h-3 w-3" />,
  SUSPENDED: <AlertCircle className="h-3 w-3" />,
  CANCELLED: <XCircle className="h-3 w-3" />,
  EXPIRED: <XCircle className="h-3 w-3" />,
};

const TYPE_LABELS: Record<string, string> = {
  CORPORATE: "Corporate",
  GOVERNMENT: "Government",
  INDIVIDUAL: "Individual",
  NONPROFIT: "Non-Profit",
  STARTUP: "Startup",
};

export default function SuperadminTenantsPage() {
  const { t } = useI18n();

  // State
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Dialog state
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch organizations
  const fetchOrganizations = useCallback(async () => {
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
      if (typeFilter !== "all") params.set("type", typeFilter);

      const response = await fetch(`/api/superadmin/tenants?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data: ListResponse = await response.json();
      setOrganizations(data.organizations);
      setPagination(data.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load organizations";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, typeFilter]);

  // Initial load and filter changes
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Handle delete
  const handleDelete = async () => {
    if (!selectedOrg) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/superadmin/tenants/${selectedOrg._id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete organization");
      }

      toast.success(`Organization "${selectedOrg.name}" has been suspended`);
      setDeleteDialogOpen(false);
      setSelectedOrg(null);
      fetchOrganizations();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t("superadmin.nav.tenants")}
          </h1>
          <p className="text-muted-foreground">
            Manage all organizations and tenant accounts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrganizations}
            disabled={loading}
            className="border-input text-muted-foreground"
            aria-label={t("common.refresh", "Refresh organizations list")}
            title={t("common.refresh", "Refresh organizations list")}
          >
            <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
            <Link href="/superadmin/tenants/new" aria-label={t("superadmin.tenants.add", "Add new organization")} title={t("superadmin.tenants.add", "Add new organization")}>
              <Plus className="h-4 w-4 me-2" />
              Add Organization
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-10 bg-muted border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter} placeholder="Status" className="w-full sm:w-40 bg-muted border-input text-foreground">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter} placeholder="Type" className="w-full sm:w-40 bg-muted border-input text-foreground">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="CORPORATE">Corporate</SelectItem>
              <SelectItem value="GOVERNMENT">Government</SelectItem>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              <SelectItem value="NONPROFIT">Non-Profit</SelectItem>
              <SelectItem value="STARTUP">Startup</SelectItem>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Building2 className="h-5 w-5" />
            Organizations
            {pagination && (
              <span className="text-sm font-normal text-muted-foreground">
                ({pagination.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && organizations.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={fetchOrganizations} aria-label={t("common.tryAgain", "Try again to load organizations")} title={t("common.tryAgain", "Try again to load organizations")}>
                Try Again
              </Button>
            </div>
          ) : organizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No organizations found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or create a new organization
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Organization</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Users</TableHead>
                    <TableHead className="text-muted-foreground">Country</TableHead>
                    <TableHead className="text-muted-foreground">Created</TableHead>
                    <TableHead className="text-muted-foreground text-end">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow
                      key={org._id}
                      className="border-border hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{org.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {org.code || org.slug || org._id.slice(-6)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {TYPE_LABELS[org.type] || org.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${STATUS_COLORS[org.subscriptionStatus] || ""} flex items-center gap-1 w-fit`}
                        >
                          {STATUS_ICONS[org.subscriptionStatus]}
                          {org.subscriptionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {org.usage?.currentUsers ?? 0}
                          {org.features?.maxUsers && (
                            <span className="text-muted-foreground">
                              /{org.features.maxUsers}
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{org.country || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {formatDate(org.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            aria-label={`View details for ${org.name}`}
                            title={`View ${org.name} details`}
                            onClick={() => {
                              setSelectedOrg(org);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-400"
                            asChild
                          >
                            <Link href={`/superadmin/tenants/${org._id}/edit`} aria-label={`Edit ${org.name}`} title={`Edit ${org.name} settings`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                            aria-label={`Suspend ${org.name}`}
                            title={`Suspend ${org.name} organization`}
                            onClick={() => {
                              setSelectedOrg(org);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrev || loading}
                  onClick={() => setPage((p) => p - 1)}
                  className="border-input"
                  aria-label={t("pagination.previous", "Go to previous page")}
                  title={t("pagination.previous", "Go to previous page")}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="border-input"
                  aria-label={t("pagination.next", "Go to next page")}
                  title={t("pagination.next", "Go to next page")}
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
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Details
            </DialogTitle>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedOrg.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Code</p>
                  <p className="font-medium">{selectedOrg.code || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{TYPE_LABELS[selectedOrg.type]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={STATUS_COLORS[selectedOrg.subscriptionStatus]}>
                    {selectedOrg.subscriptionStatus}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact Email</p>
                  <p className="font-medium">{selectedOrg.contactEmail || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">{selectedOrg.country || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timezone</p>
                  <p className="font-medium">{selectedOrg.timezone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Currency</p>
                  <p className="font-medium">{selectedOrg.currency || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(selectedOrg.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Users</p>
                  <p className="font-medium">
                    {selectedOrg.usage?.currentUsers ?? 0}
                    {selectedOrg.features?.maxUsers && ` / ${selectedOrg.features.maxUsers}`}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
              className="border-input"
              aria-label={t("common.close", "Close details dialog")}
              title={t("common.close", "Close details dialog")}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              Suspend Organization?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will suspend the organization &quot;{selectedOrg?.name}&quot; and
              prevent all users from accessing the system. This action can be
              reversed by changing the status back to Active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-input"
              disabled={actionLoading}
              aria-label={t("common.cancel", "Cancel suspension")}
              title={t("common.cancel", "Cancel suspension")}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading}
              aria-label={t("superadmin.tenants.suspend", "Suspend organization")}
              title={t("superadmin.tenants.suspend", "Suspend organization")}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : null}
              Suspend Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

