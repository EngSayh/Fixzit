"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Star,
  Phone,
  Mail,
  MapPin,
  Filter,
  Plus,
  Users,
} from "@/components/ui/icons";
import { useTranslation } from "@/contexts/TranslationContext";
import { logger } from "@/lib/logger";

// Centralized table components
import { DataTableStandard, type DataTableColumn } from "@/components/tables/DataTableStandard";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TableFilterDrawer } from "@/components/tables/TableFilterDrawer";
import { ActiveFiltersChips, type ActiveFilter } from "@/components/tables/ActiveFiltersChips";
import { TableSkeleton } from "@/components/tables/TableSkeleton";

export interface Vendor {
  id: string;
  code: string;
  name: string;
  type: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED" | "BLACKLISTED";
  contact?: {
    primary?: {
      name?: string;
      email?: string;
      phone?: string;
      mobile?: string;
    };
    address?: {
      street?: string;
      city?: string;
      region?: string;
      postalCode?: string;
    };
  };
  business?: {
    specializations?: string[];
  };
  rating?: number;
  responseTime?: string;
  [key: string]: unknown; // Index signature for DataTableStandard compatibility
}

export interface FmVendorsListProps {
  orgId: string;
  embedded?: boolean;
  supportBanner?: ReactNode | null;
  onAddVendor?: () => void;
  onEditVendor?: (vendor: Vendor) => void;
  onViewVendor?: (vendor: Vendor) => void;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "APPROVED", label: "Approved" },
  { value: "PENDING", label: "Pending" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "REJECTED", label: "Rejected" },
  { value: "BLACKLISTED", label: "Blacklisted" },
];

const fetcher = async (url: string, orgId: string) => {
  try {
    const res = await fetch(url, {
      headers: { "x-tenant-id": orgId },
    });
    if (!res.ok) throw new Error("Failed to fetch vendors");
    return res.json();
  } catch (_error) {
    logger.error("FM vendors fetch error", _error as Error);
    throw _error;
  }
};

export function FmVendorsList({
  orgId,
  embedded = false,
  supportBanner,
  onAddVendor,
  onEditVendor,
  onViewVendor,
}: FmVendorsListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showingAll, setShowingAll] = useState(false);

  // Fetch vendors with pagination
  const vendorsUrl = orgId
    ? `/api/vendors?page=${page}&limit=${pageSize}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`
    : null;

  const {
    data: vendorsData,
    error,
    isLoading,
    mutate,
  } = useSWR(
    vendorsUrl ? [vendorsUrl, orgId] : null,
    ([url, id]: [string, string]) => fetcher(url, id)
  );

  const vendors: Vendor[] = vendorsData?.items || [];
  const totalPages = vendorsData?.pages || 1;

  // Active filters for chips
  const activeFiltersChips: ActiveFilter[] = useMemo(() => {
    const filters: ActiveFilter[] = [];
    if (statusFilter) {
      const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || statusFilter;
      filters.push({
        key: "status",
        label: `Status: ${statusLabel}`,
        onRemove: () => setStatusFilter(""),
      });
    }
    return filters;
  }, [statusFilter]);

  const handleClearAllFilters = () => {
    setStatusFilter("");
    setSearchTerm("");
    setPage(1);
  };

  const handleDelete = async (vendor: Vendor) => {
    const confirmMessage = t(
      "vendors.confirmDelete",
      'Delete vendor "{{name}}"? This cannot be undone.'
    ).replace("{{name}}", vendor.name);
    if (!confirm(confirmMessage)) return;

    const toastId = toast.loading(t("vendors.toast.deleting", "Deleting vendor..."));
    try {
      const res = await fetch(`/api/vendors/${vendor.id}`, {
        method: "DELETE",
        headers: { "x-tenant-id": orgId },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        const message =
          error && typeof error === "object" && "error" in error && typeof error.error === "string"
            ? error.error
            : t("vendors.errors.deleteUnknown", "Failed to delete vendor");
        throw new Error(message);
      }
      toast.success(t("vendors.toast.deleteSuccess", "Vendor deleted successfully"), {
        id: toastId,
      });
      mutate();
    } catch (_error) {
      const message =
        _error instanceof Error
          ? _error.message
          : t("vendors.errors.deleteUnknown", "Failed to delete vendor");
      toast.error(
        t("vendors.toast.deleteFailed", "Failed to delete vendor: {{message}}").replace(
          "{{message}}",
          message
        ),
        { id: toastId }
      );
    }
  };

  const handleRowClick = (vendor: Vendor) => {
    if (onViewVendor) {
      onViewVendor(vendor);
    } else {
      router.push(`/fm/vendors/${vendor.id}`);
    }
  };

  const handleEditClick = (vendor: Vendor) => {
    if (onEditVendor) {
      onEditVendor(vendor);
    } else {
      router.push(`/fm/vendors/${vendor.id}/edit`);
    }
  };

  const handleAddClick = () => {
    if (onAddVendor) {
      onAddVendor();
    } else {
      router.push("/fm/marketplace/vendors/new");
    }
  };

  const exportVendorsCsv = () => {
    if (vendors.length === 0) {
      return toast(t("vendors.export.empty", "No vendors to export"));
    }
    const rows = [["Code", "Name", "Type", "Status", "Contact", "Email", "Location"]];
    for (const v of vendors) {
      rows.push([
        v.code || "",
        v.name || "",
        v.type || "",
        v.status || "",
        v.contact?.primary?.phone || v.contact?.primary?.mobile || "",
        v.contact?.primary?.email || "",
        v.contact?.address?.city || "",
      ]);
    }
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendors-export-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      t("vendors.export.success", "Exported {{count}} vendors").replace(
        "{{count}}",
        String(vendors.length)
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return "bg-success/10 text-success-foreground border-success/20";
      case "PENDING":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      case "SUSPENDED":
        return "bg-warning/10 text-warning border-warning";
      case "REJECTED":
        return "bg-destructive/10 text-destructive-foreground border-destructive/20";
      case "BLACKLISTED":
        return "bg-destructive text-destructive-foreground border-destructive";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  // Table columns
  const columns: DataTableColumn<Vendor>[] = [
    {
      id: "name",
      header: t("vendor.name", "Vendor"),
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.code}</div>
          </div>
          {row.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="text-sm font-medium">{row.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "type",
      header: t("vendor.type", "Type"),
      cell: (row) => (
        <span className="text-sm">{row.type?.replace("_", " ") || "N/A"}</span>
      ),
    },
    {
      id: "status",
      header: t("vendor.status", "Status"),
      cell: (row) => (
        <Badge className={getStatusColor(row.status)}>
          {t(`status.${row.status.toLowerCase()}`, row.status)}
        </Badge>
      ),
    },
    {
      id: "contact",
      header: t("vendor.contact", "Contact"),
      cell: (row) => (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3 w-3" />
            {row.contact?.primary?.phone || row.contact?.primary?.mobile || "N/A"}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3 w-3" />
            {row.contact?.primary?.email || "N/A"}
          </div>
        </div>
      ),
    },
    {
      id: "location",
      header: t("vendor.location", "Location"),
      cell: (row) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {row.contact?.address?.city || "N/A"}, {row.contact?.address?.region || ""}
        </div>
      ),
    },
    {
      id: "services",
      header: t("vendor.services", "Services"),
      cell: (row) => (
        <div className="flex flex-wrap gap-1 max-w-48">
          {row.business?.specializations?.slice(0, 3).map((service) => (
            <Badge key={service} variant="outline" className="text-xs">
              {service}
            </Badge>
          ))}
          {(row.business?.specializations?.length || 0) > 3 && (
            <Badge variant="outline" className="text-xs">
              +{(row.business?.specializations?.length || 0) - 3}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick(row);
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(row);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive/90"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        {t("vendors.errors.loadFailed", "Failed to load vendors: {{message}}").replace(
          "{{message}}",
          error.message
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {supportBanner}

      {/* Page header (if not embedded) */}
      {!embedded && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t("nav.vendors", "Vendors")}
            </h1>
            <p className="text-muted-foreground">
              {t("vendors.description", "Manage your vendor relationships and service providers")}
            </p>
          </div>
          <Button onClick={handleAddClick} className="bg-success hover:bg-success/90">
            <Plus className="w-4 h-4 me-2" />
            {t("vendors.addVendor", "Add Vendor")}
          </Button>
        </div>
      )}

      {/* Toolbar with search and actions */}
      <TableToolbar
        start={
          <div className="relative flex-1 min-w-64">
            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search", "Search vendors...")}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="ps-10"
            />
          </div>
        }
        end={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterDrawerOpen(true)}
            >
              <Filter className="h-4 w-4 me-2" />
              {t("common.filters", "Filters")}
              {activeFiltersChips.length > 0 && (
                <Badge variant="secondary" className="ms-2">
                  {activeFiltersChips.length}
                </Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={exportVendorsCsv}>
              <Download className="h-4 w-4 me-2" />
              {t("common.export", "Export")}
            </Button>
          </div>
        }
      />

      {/* Active filter chips */}
      {activeFiltersChips.length > 0 && (
        <ActiveFiltersChips
          filters={activeFiltersChips}
          onClearAll={handleClearAllFilters}
        />
      )}

      {/* Data table */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : vendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t("vendors.empty.title", "No Vendors Found")}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t("vendors.empty.description", "No vendors match your search criteria")}
          </p>
          <Button onClick={handleAddClick}>
            {t("vendors.empty.cta", "Add First Vendor")}
          </Button>
        </div>
      ) : (
        <>
          <DataTableStandard<Vendor>
            columns={columns}
            data={vendors}
            onRowClick={handleRowClick}
            density="comfortable"
            rowKey="id"
          />

          {/* Pagination */}
          {totalPages >= 1 && (
            <div className="mt-6 border rounded-lg border-border bg-card">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={vendorsData?.total || 0}
                itemsPerPage={pageSize}
                showingAll={showingAll}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  if (size === "all") {
                    setShowingAll(true);
                    setPageSize(vendorsData?.total || 100);
                  } else {
                    setShowingAll(false);
                    setPageSize(size);
                  }
                  setPage(1);
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Filter drawer */}
      <TableFilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        title={t("common.filters", "Filters")}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("vendor.status", "Status")}
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.all", "All Status")} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                    {t(`status.${opt.value.toLowerCase() || "all"}`, opt.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClearAllFilters} className="flex-1">
              {t("common.clearFilters", "Clear Filters")}
            </Button>
            <Button onClick={() => setFilterDrawerOpen(false)} className="flex-1">
              {t("common.apply", "Apply")}
            </Button>
          </div>
        </div>
      </TableFilterDrawer>
    </div>
  );
}
