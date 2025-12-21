/**
 * Properties List - Aqar (Real Estate) Module
 * P0 Standard Implementation + CardList Mobile
 * 
 * ✅ PageHeader + count + CTA
 * ✅ TableToolbar + search + quick chips
 * ✅ ActiveFiltersChips
 * ✅ DataTableStandard (Desktop)
 * ✅ CardList (Mobile - No horizontal scroll)
 * ✅ URL sync
 * ✅ Filter drawer (draft/apply)
 */
"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "@/components/ui/chip";
import { Home, Plus, RefreshCcw, Search, Filter, Bed, Bath, Maximize } from "lucide-react";

import { DataTableStandard, DataTableColumn } from "@/components/tables/DataTableStandard";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { ActiveFiltersChips } from "@/components/tables/ActiveFiltersChips";
import { TableDensityToggle } from "@/components/tables/TableDensityToggle";
import { TableFilterDrawer } from "@/components/tables/TableFilterDrawer";
import { FacetMultiSelect } from "@/components/tables/filters/FacetMultiSelect";
import { NumericRangeFilter } from "@/components/tables/filters/NumericRangeFilter";
import {
  buildActiveFilterChips,
  serializeFilters,
  type FilterSchema,
} from "@/components/tables/utils/filterSchema";
import { useTableQueryState } from "@/hooks/useTableQueryState";
import { toast } from "sonner";

type PropertyRecord = {
  id: string;
  title: string;
  type: "APARTMENT" | "VILLA" | "OFFICE" | "WAREHOUSE" | "LAND";
  listingType: "RENT" | "SALE";
  price: number;
  currency: string;
  city: string;
  region: string;
  bedrooms?: number;
  bathrooms?: number;
  area: number;
  status: "AVAILABLE" | "RENTED" | "SOLD" | "RESERVED";
  featured: boolean;
  createdAt: string;
  imageUrl?: string;
};

type ApiResponse = {
  items: PropertyRecord[];
  page: number;
  limit: number;
  total: number;
};

const TYPE_OPTIONS = ["APARTMENT", "VILLA", "OFFICE", "WAREHOUSE", "LAND"];
const LISTING_OPTIONS = ["RENT", "SALE"];
const _STATUS_OPTIONS = ["AVAILABLE", "RENTED", "SOLD", "RESERVED"];
const CITY_OPTIONS = ["Riyadh", "Jeddah", "Dammam", "Mecca", "Medina"];

const statusStyles: Record<string, string> = {
  AVAILABLE: "bg-success/10 text-success border border-success/20",
  RENTED: "bg-info/10 text-info border border-info/20",
  SOLD: "bg-muted text-muted-foreground border border-border",
  RESERVED: "bg-warning/10 text-warning border border-warning/20",
};

type PropertyFilters = {
  type?: string;
  listingType?: string;
  city?: string;
  priceMin?: number;
  priceMax?: number;
  featured?: boolean;
  bedroomsMin?: number;
  bedroomsMax?: number;
  bathroomsMin?: number;
  bathroomsMax?: number;
};

const PROPERTY_FILTER_SCHEMA: FilterSchema<PropertyFilters>[] = [
  { key: "type", param: "type", label: (f) => `Type: ${f.type}` },
  { key: "listingType", param: "listingType", label: (f) => `Listing: ${f.listingType}` },
  { key: "city", param: "city", label: (f) => `City: ${f.city}` },
  {
    key: "featured",
    param: "featured",
    toParam: () => true,
    label: () => "Featured",
  },
  {
    key: "priceMin",
    param: "priceMin",
    isActive: (f) => Boolean(f.priceMin || f.priceMax !== undefined),
    label: (f) => `Price: ${f.priceMin || 0}-${f.priceMax || "∞"}`,
    clear: (f) => {
      const { priceMin: _min, priceMax: _max, ...rest } = f;
      return rest;
    },
  },
  {
    key: "priceMax",
    param: "priceMax",
    isActive: (f) => Boolean(f.priceMin || f.priceMax !== undefined),
    label: (f) => `Price: ${f.priceMin || 0}-${f.priceMax || "∞"}`,
    clear: (f) => {
      const { priceMin: _min, priceMax: _max, ...rest } = f;
      return rest;
    },
  },
  {
    key: "bedroomsMin",
    param: "bedroomsMin",
    isActive: (f) => Boolean(f.bedroomsMin || f.bedroomsMax !== undefined),
    label: (f) => `Bedrooms: ${f.bedroomsMin || 0}-${f.bedroomsMax || "∞"}`,
    clear: (f) => {
      const { bedroomsMin: _min, bedroomsMax: _max, ...rest } = f;
      return rest;
    },
  },
  {
    key: "bedroomsMax",
    param: "bedroomsMax",
    isActive: (f) => Boolean(f.bedroomsMin || f.bedroomsMax !== undefined),
    label: (f) => `Bedrooms: ${f.bedroomsMin || 0}-${f.bedroomsMax || "∞"}`,
    clear: (f) => {
      const { bedroomsMin: _min, bedroomsMax: _max, ...rest } = f;
      return rest;
    },
  },
  {
    key: "bathroomsMin",
    param: "bathroomsMin",
    isActive: (f) => Boolean(f.bathroomsMin || f.bathroomsMax !== undefined),
    label: (f) => `Bathrooms: ${f.bathroomsMin || 0}-${f.bathroomsMax || "∞"}`,
    clear: (f) => {
      const { bathroomsMin: _min, bathroomsMax: _max, ...rest } = f;
      return rest;
    },
  },
  {
    key: "bathroomsMax",
    param: "bathroomsMax",
    isActive: (f) => Boolean(f.bathroomsMin || f.bathroomsMax !== undefined),
    label: (f) => `Bathrooms: ${f.bathroomsMin || 0}-${f.bathroomsMax || "∞"}`,
    clear: (f) => {
      const { bathroomsMin: _min, bathroomsMax: _max, ...rest } = f;
      return rest;
    },
  },
];

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`Failed to load properties (${response.status})`);
  return response.json() as Promise<ApiResponse>;
};

export type PropertiesListProps = {
  orgId: string;
};

export function PropertiesList({ orgId }: PropertiesListProps) {
  const { state, updateState, resetState } = useTableQueryState("aqar-properties", {
    page: 1,
    pageSize: 20,
    q: "",
    filters: {},
  });

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(state.filters || {});
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const tenantMissing = !orgId;

  const query = useMemo(() => {
    if (tenantMissing) return "";
    const params = new URLSearchParams();
    params.set("limit", String(state.pageSize || 20));
    params.set("page", String(state.page || 1));
    params.set("org", orgId);
    if (state.q) params.set("q", state.q);
    serializeFilters(state.filters as PropertyFilters, PROPERTY_FILTER_SCHEMA, params);
    return params.toString();
  }, [orgId, state, tenantMissing]);

  const { data, error: _error, isLoading, mutate, isValidating } = useSWR(
    tenantMissing ? null : `/api/aqar/properties?${query}`,
    fetcher,
    { keepPreviousData: true }
  );

  const properties = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || 20))) : 1;
  const totalCount = data?.total ?? 0;

  // Auto-switch to cards on mobile
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode("cards");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Active filters
  const activeFilters = useMemo(
    () =>
      buildActiveFilterChips(state.filters as PropertyFilters, PROPERTY_FILTER_SCHEMA, (next) =>
        updateState({ filters: next })
      ),
    [state.filters, updateState]
  );

  // Early return AFTER all hooks
  if (tenantMissing) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Home}
          title="Organization required"
          description="Tenant context is missing. Please select an organization to view properties."
        />
      </div>
    );
  }

  // Quick chips (P0)
  const quickChips = [
    { key: "rent", label: "Rent", onClick: () => updateState({ filters: { listingType: "RENT" }, page: 1 }) },
    { key: "sale", label: "Sale", onClick: () => updateState({ filters: { listingType: "SALE" }, page: 1 }) },
    { key: "featured", label: "Featured", onClick: () => updateState({ filters: { featured: true }, page: 1 }) },
    { key: "riyadh", label: "Riyadh", onClick: () => updateState({ filters: { city: "Riyadh" }, page: 1 }) },
    { key: "2-3br", label: "2-3 BR", onClick: () => updateState({ filters: { bedroomsMin: 2, bedroomsMax: 3 }, page: 1 }) },
  ];

  // Table columns
  const columns: DataTableColumn<PropertyRecord>[] = [
    {
      id: "property",
      header: "Property",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.imageUrl && (
            <img src={row.imageUrl} alt={row.title} className="w-12 h-12 rounded object-cover" />
          )}
          <div>
            <div className="font-medium">{row.title}</div>
            <div className="text-sm text-muted-foreground">{row.type}</div>
          </div>
        </div>
      ),
    },
    {
      id: "listing",
      header: "Listing",
      cell: (row) => (
        <Badge variant="outline">{row.listingType}</Badge>
      ),
    },
    {
      id: "price",
      header: "Price",
      cell: (row) => (
        <div className="font-semibold">
          {row.currency} {row.price.toLocaleString("en-US")}
          {row.listingType === "RENT" && <span className="text-xs text-muted-foreground">/mo</span>}
        </div>
      ),
    },
    {
      id: "location",
      header: "Location",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.city}</div>
          <div className="text-sm text-muted-foreground">{row.region}</div>
        </div>
      ),
    },
    {
      id: "details",
      header: "Details",
      cell: (row) => (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {row.bedrooms && (
            <div className="flex items-center gap-1">
              <Bed className="w-3 h-3" />
              <span>{row.bedrooms}</span>
            </div>
          )}
          {row.bathrooms && (
            <div className="flex items-center gap-1">
              <Bath className="w-3 h-3" />
              <span>{row.bathrooms}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Maximize className="w-3 h-3" />
            <span>{row.area}m²</span>
          </div>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.featured && <Badge variant="secondary" className="text-xs">⭐ Featured</Badge>}
          <Badge className={statusStyles[row.status]}>{row.status}</Badge>
        </div>
      ),
    },
  ];

  // Card view
  const CardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {properties.map((property) => (
        <div key={property.id} className="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition cursor-pointer" onClick={() => toast.info(`Open property ${property.id}`)}>
          {property.imageUrl && (
            <img src={property.imageUrl} alt={property.title} className="w-full h-48 object-cover" />
          )}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{property.title}</h3>
                <p className="text-sm text-muted-foreground">{property.type}</p>
              </div>
              {property.featured && <Badge variant="secondary" className="text-xs">⭐</Badge>}
            </div>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-lg">
                {property.currency} {property.price.toLocaleString("en-US")}
                {property.listingType === "RENT" && <span className="text-xs text-muted-foreground">/mo</span>}
              </div>
              <Badge variant="outline">{property.listingType}</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {property.bedrooms && (
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  <span>{property.bedrooms}</span>
                </div>
              )}
              {property.bathrooms && (
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  <span>{property.bathrooms}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Maximize className="w-4 h-4" />
                <span>{property.area}m²</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm">{property.city}, {property.region}</div>
              <Badge className={statusStyles[property.status]}>{property.status}</Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const emptyState = (
    <EmptyState
      icon={Home}
      title="No properties found"
      description="Adjust filters or list a new property to get started."
      action={
        activeFilters.length > 0 ? (
          <Button variant="outline" onClick={() => resetState()}>
            Clear all filters
          </Button>
        ) : (
          <Button onClick={() => toast.info("Add property flow")}>
            <Plus className="w-4 h-4 me-2" />
            List Property
          </Button>
        )
      }
    />
  );

  const handleApplyFilters = () => {
    updateState({ filters: draftFilters, page: 1 });
    setFilterDrawerOpen(false);
  };

  const handleResetFilters = () => {
    setDraftFilters({});
    updateState({ filters: {}, page: 1 });
    setFilterDrawerOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      {/* PageHeader */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Properties
            {totalCount > 0 && <span className="ms-2 text-muted-foreground">({totalCount})</span>}
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage real estate listings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isValidating}>
            <RefreshCcw className={`w-4 h-4 me-2 ${isValidating ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 me-2" />
            List Property
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <TableToolbar
        start={
          <>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search properties..."
                value={state.q || ""}
                onChange={(e) => updateState({ q: e.target.value, page: 1 })}
                className="ps-9"
              />
            </div>
            <div className="flex gap-2">
              {quickChips.map((chip) => (
                <Chip key={chip.key} onClick={chip.onClick}>
                  {chip.label}
                </Chip>
              ))}
            </div>
          </>
        }
        end={
          <>
            <div className="hidden md:flex gap-2">
              <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")}>
                Table
              </Button>
              <Button variant={viewMode === "cards" ? "default" : "outline"} size="sm" onClick={() => setViewMode("cards")}>
                Cards
              </Button>
            </div>
            <TableDensityToggle density={density} onChange={setDensity} />
            <Button variant="outline" size="sm" onClick={() => setFilterDrawerOpen(true)}>
              <Filter className="w-4 h-4 me-2" />
              Filters
              {activeFilters.length > 0 && (
                <span className="ms-2 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                  {activeFilters.length}
                </span>
              )}
            </Button>
          </>
        }
      />

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <ActiveFiltersChips filters={activeFilters} onClearAll={() => resetState()} />
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading properties...</div>
      ) : properties.length === 0 ? (
        emptyState
      ) : viewMode === "cards" ? (
        <CardView />
      ) : (
        <DataTableStandard
          columns={columns}
          data={properties}
          loading={isLoading}
          emptyState={emptyState}
          density={density}
          onRowClick={(row) => toast.info(`Open property ${row.id}`)}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((state.page || 1) - 1) * (state.pageSize || 20) + 1} to{" "}
            {Math.min((state.page || 1) * (state.pageSize || 20), totalCount)} of {totalCount} results
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={(state.page || 1) === 1}
              onClick={() => updateState({ page: (state.page || 1) - 1 })}
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-sm">
              Page {state.page || 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={(state.page || 1) >= totalPages}
              onClick={() => updateState({ page: (state.page || 1) + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Filter Drawer */}
      <TableFilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        title="Filter Properties"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        }
      >
        <div className="space-y-6">
          <FacetMultiSelect
            label="Property Type"
            options={TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
            selected={Array.isArray(draftFilters.type) ? draftFilters.type : draftFilters.type ? [String(draftFilters.type)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, type: values[0] })}
          />
          
          <FacetMultiSelect
            label="Listing Type"
            options={LISTING_OPTIONS.map((l) => ({ value: l, label: l }))}
            selected={Array.isArray(draftFilters.listingType) ? draftFilters.listingType : draftFilters.listingType ? [String(draftFilters.listingType)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, listingType: values[0] })}
          />
          
          <FacetMultiSelect
            label="City"
            options={CITY_OPTIONS.map((c) => ({ value: c, label: c }))}
            selected={Array.isArray(draftFilters.city) ? draftFilters.city : draftFilters.city ? [String(draftFilters.city)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, city: values[0] })}
          />
          
          <NumericRangeFilter
            label="Price"
            value={{ min: draftFilters.priceMin as number, max: draftFilters.priceMax as number }}
            onChange={(range) => setDraftFilters({ ...draftFilters, priceMin: range.min, priceMax: range.max })}
            prefix="SAR"
          />
          
          <NumericRangeFilter
            label="Bedrooms"
            value={{ min: draftFilters.bedroomsMin as number, max: draftFilters.bedroomsMax as number }}
            onChange={(range) => setDraftFilters({ ...draftFilters, bedroomsMin: range.min, bedroomsMax: range.max })}
          />
          
          <NumericRangeFilter
            label="Bathrooms"
            value={{ min: draftFilters.bathroomsMin as number, max: draftFilters.bathroomsMax as number }}
            onChange={(range) => setDraftFilters({ ...draftFilters, bathroomsMin: range.min, bathroomsMax: range.max })}
          />
        </div>
      </TableFilterDrawer>
    </div>
  );
}
