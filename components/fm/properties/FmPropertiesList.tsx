"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  Plus,
  Eye,
  Edit,
  Trash2,
  Home,
  Building,
  Factory,
  Map,
  Search,
  Filter,
} from "@/components/ui/icons";
import { useTranslation } from "@/contexts/TranslationContext";
import { logger } from "@/lib/logger";

// Centralized table components
import { DataTableStandard, type DataTableColumn } from "@/components/tables/DataTableStandard";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TableFilterDrawer } from "@/components/tables/TableFilterDrawer";
import { ActiveFiltersChips, type ActiveFilter } from "@/components/tables/ActiveFiltersChips";
import { TableSkeleton } from "@/components/tables/TableSkeleton";

// Form component - extracted from page
import { CreatePropertyForm } from "./CreatePropertyForm";

interface PropertyUnit {
  status?: string;
}

export interface PropertyItem {
  id: string;
  name?: string;
  code?: string;
  type?: string;
  status?: string;
  address?: {
    city?: string;
    region?: string;
    street?: string;
  };
  details?: {
    totalArea?: number;
    occupancyRate?: number;
  };
  financial?: {
    monthlyRent?: number;
  };
  units?: PropertyUnit[];
  [key: string]: unknown; // Index signature for DataTableStandard compatibility
}

export interface FmPropertiesListProps {
  orgId: string;
  embedded?: boolean;
  onAddProperty?: () => void;
  onEditProperty?: (property: PropertyItem) => void;
  onViewProperty?: (property: PropertyItem) => void;
}

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "MIXED_USE", label: "Mixed Use" },
  { value: "LAND", label: "Land" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

export function FmPropertiesList({
  orgId,
  embedded = false,
  onAddProperty,
  onEditProperty,
  onViewProperty,
}: FmPropertiesListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const fetcher = (url: string) => {
    if (!orgId) {
      return Promise.reject(new Error("No organization ID"));
    }
    return fetch(url, {
      headers: { "x-tenant-id": orgId },
    })
      .then((r) => r.json())
      .catch((error) => {
        logger.error("FM properties fetch error", error);
        throw error;
      });
  };

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (typeFilter) queryParams.set("type", typeFilter);
  if (statusFilter) queryParams.set("status", statusFilter);

  const { data, mutate, isLoading } = useSWR(
    orgId ? [`/api/fm/properties?${queryParams.toString()}`, orgId] : null,
    ([url]) => fetcher(url)
  );

  const properties: PropertyItem[] = data?.items || [];

  // Active filters for chips - using correct ActiveFilter interface
  const activeFiltersChips: ActiveFilter[] = useMemo(() => {
    const filters: ActiveFilter[] = [];
    if (typeFilter) {
      const typeLabel = TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label || typeFilter;
      filters.push({ 
        key: "type", 
        label: `Type: ${typeLabel}`, 
        onRemove: () => setTypeFilter("") 
      });
    }
    if (statusFilter) {
      const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || statusFilter;
      filters.push({ 
        key: "status", 
        label: `Status: ${statusLabel}`, 
        onRemove: () => setStatusFilter("") 
      });
    }
    return filters;
  }, [typeFilter, statusFilter]);

  const handleClearAllFilters = () => {
    setTypeFilter("");
    setStatusFilter("");
    setSearch("");
  };

  const handleDelete = async (property: PropertyItem) => {
    const confirmMessage = t(
      "fm.properties.confirmDelete",
      'Delete property "{{name}}"? This cannot be undone.'
    ).replace("{{name}}", property.name || "");
    if (!confirm(confirmMessage)) return;

    const toastId = toast.loading(t("fm.properties.toast.deleting", "Deleting property..."));
    try {
      const res = await fetch(`/api/fm/properties/${property.id}`, {
        method: "DELETE",
        headers: { "x-tenant-id": orgId },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        const message =
          error && typeof error === "object" && "error" in error && typeof error.error === "string"
            ? error.error
            : t("fm.properties.errors.deleteUnknown", "Failed to delete property");
        throw new Error(message);
      }
      toast.success(t("fm.properties.toast.deleteSuccess", "Property deleted successfully"), {
        id: toastId,
      });
      mutate();
    } catch (_error) {
      const message =
        _error instanceof Error
          ? _error.message
          : t("fm.properties.errors.deleteUnknown", "Failed to delete property");
      toast.error(
        t("fm.properties.toast.deleteFailed", "Failed to delete property: {{message}}").replace(
          "{{message}}",
          message
        ),
        { id: toastId }
      );
    }
  };

  const handleRowClick = (property: PropertyItem) => {
    if (onViewProperty) {
      onViewProperty(property);
    } else {
      router.push(`/fm/properties/${property.id}`);
    }
  };

  const handleEditClick = (property: PropertyItem) => {
    if (onEditProperty) {
      onEditProperty(property);
    } else {
      router.push(`/fm/properties/${property.id}/edit`);
    }
  };

  const handleAddClick = () => {
    if (onAddProperty) {
      onAddProperty();
    } else {
      setCreateOpen(true);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "RESIDENTIAL":
        return <Home className="w-4 h-4" />;
      case "COMMERCIAL":
        return <Building className="w-4 h-4" />;
      case "INDUSTRIAL":
        return <Factory className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "RESIDENTIAL":
        return "bg-primary/10 text-primary-foreground";
      case "COMMERCIAL":
        return "bg-success/10 text-success-foreground";
      case "INDUSTRIAL":
        return "bg-warning/10 text-warning";
      case "MIXED_USE":
        return "bg-secondary/10 text-secondary";
      case "LAND":
        return "bg-warning/10 text-warning-foreground";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "bg-success/10 text-success-foreground";
      case "INACTIVE":
        return "bg-destructive/10 text-destructive-foreground";
      case "MAINTENANCE":
        return "bg-warning/10 text-warning";
      default:
        return "bg-muted text-foreground";
    }
  };

  // Table columns
  const columns: DataTableColumn<PropertyItem>[] = [
    {
      id: "name",
      header: t("fm.properties.propertyName", "Property"),
      cell: (row) => (
        <div className="flex items-center gap-2">
          {getTypeIcon(row.type || "")}
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.code}</div>
          </div>
        </div>
      ),
    },
    {
      id: "type",
      header: t("fm.properties.type", "Type"),
      cell: (row) => (
        <Badge className={getTypeColor(row.type || "")}>
          {t(`fm.properties.${row.type?.toLowerCase() || "unknown"}`, row.type || "Unknown")}
        </Badge>
      ),
    },
    {
      id: "location",
      header: t("fm.properties.location", "Location"),
      cell: (row) => (
        <span className="text-sm">
          {row.address?.city}, {row.address?.region}
        </span>
      ),
    },
    {
      id: "area",
      header: t("fm.properties.totalArea", "Area"),
      cell: (row) => (
        <span className="text-sm">
          {row.details?.totalArea?.toLocaleString() || t("common.na", "N/A")} sqm
        </span>
      ),
    },
    {
      id: "occupancy",
      header: t("fm.properties.occupancy", "Occupancy"),
      cell: (row) => {
        const rate = row.details?.occupancyRate || 0;
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-muted rounded-full h-2">
              <div
                className="bg-success h-2 rounded-full"
                style={{ width: `${rate}%` }}
              />
            </div>
            <span className="text-sm">{rate}%</span>
          </div>
        );
      },
    },
    {
      id: "rent",
      header: t("fm.properties.monthlyRent", "Monthly Rent"),
      cell: (row) => (
        <span className="text-sm font-medium">
          {row.financial?.monthlyRent?.toLocaleString() || t("common.na", "N/A")} SAR
        </span>
      ),
    },
    {
      id: "status",
      header: t("fm.properties.status", "Status"),
      cell: (row) => (
        <Badge className={getStatusColor(row.status || "")}>
          {t(`fm.properties.status.${row.status?.toLowerCase() || "active"}`, row.status || "Active")}
        </Badge>
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

  return (
    <div className="space-y-4">
      {/* Page header (if not embedded) */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("fm.properties.title", "Property Management")}</h1>
            <p className="text-muted-foreground">
              {t("fm.properties.subtitle", "Real estate portfolio and tenant management")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              {t("fm.properties.viewMap", "View Map")}
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-success hover:bg-success/90" onClick={handleAddClick}>
                  <Plus className="w-4 h-4 me-2" />
                  {t("fm.properties.newProperty", "New Property")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>{t("fm.properties.addProperty", "Add New Property")}</DialogTitle>
                </DialogHeader>
                <CreatePropertyForm
                  orgId={orgId}
                  onCreated={() => {
                    mutate();
                    setCreateOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Toolbar with search and filter toggle */}
      <TableToolbar
        start={
          <div className="relative flex-1 min-w-64">
            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t("fm.properties.searchProperties", "Search properties...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-10"
            />
          </div>
        }
        end={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterDrawerOpen(true)}
          >
            <Filter className="w-4 h-4 me-2" />
            {t("common.filters", "Filters")}
            {activeFiltersChips.length > 0 && (
              <Badge variant="secondary" className="ms-2">
                {activeFiltersChips.length}
              </Badge>
            )}
          </Button>
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
      ) : properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t("fm.properties.noProperties", "No Properties Found")}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t("fm.properties.noPropertiesText", "Get started by adding your first property to the portfolio.")}
          </p>
          <Button onClick={handleAddClick} className="bg-success hover:bg-success/90">
            <Plus className="w-4 h-4 me-2" />
            {t("fm.properties.addProperty", "Add Property")}
          </Button>
        </div>
      ) : (
        <DataTableStandard<PropertyItem>
          columns={columns}
          data={properties}
          onRowClick={handleRowClick}
          density="comfortable"
          rowKey="id"
        />
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
              {t("fm.properties.propertyType", "Property Type")}
            </label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("fm.properties.allTypes", "All Types")} />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                    {t(`fm.properties.${opt.value.toLowerCase() || "allTypes"}`, opt.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("fm.properties.status", "Status")}
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("fm.properties.allStatus", "All Status")} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                    {t(`fm.properties.status.${opt.value.toLowerCase() || "all"}`, opt.label)}
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
