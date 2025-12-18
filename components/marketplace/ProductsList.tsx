/**
 * Products List - Souq (Marketplace) Module
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
import { Package, Plus, RefreshCcw, Search, Filter, Star } from "lucide-react";

import { DataTableStandard, DataTableColumn } from "@/components/tables/DataTableStandard";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TableFilterDrawer } from "@/components/tables/TableFilterDrawer";
import { ActiveFiltersChips } from "@/components/tables/ActiveFiltersChips";
import { TableDensityToggle } from "@/components/tables/TableDensityToggle";
import { FacetMultiSelect } from "@/components/tables/filters/FacetMultiSelect";
import { NumericRangeFilter } from "@/components/tables/filters/NumericRangeFilter";
import { FilterPresetsDropdown } from "@/components/common/FilterPresetsDropdown";
import {
  buildActiveFilterChips,
  serializeFilters,
  type FilterSchema,
} from "@/components/tables/utils/filterSchema";
import { pickSchemaFilters } from "@/lib/filters/preset-utils";
import { useTableQueryState } from "@/hooks/useTableQueryState";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/TranslationContext";
import { SavedCartBanner } from "./SavedCartBanner";
import { RecentlyViewed } from "./RecentlyViewed";

type ProductRecord = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  currency: string;
  stock: number;
  rating: number;
  reviewCount: number;
  status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK" | "DISCONTINUED";
  sellerType: "FIXZIT" | "VENDOR" | "PARTNER";
  featured: boolean;
  createdAt: string;
  imageUrl?: string;
};

type ApiResponse = {
  items: ProductRecord[];
  page: number;
  limit: number;
  total: number;
};

const CATEGORY_OPTIONS = ["FM Supplies", "Tools & Equipment", "Safety Gear", "Cleaning Products", "Electronics", "Office Supplies"];
const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "OUT_OF_STOCK", "DISCONTINUED"];
const SELLER_TYPE_OPTIONS = ["FIXZIT", "VENDOR", "PARTNER"];

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success border border-success/20",
  INACTIVE: "bg-muted text-foreground border border-border",
  OUT_OF_STOCK: "bg-warning/10 text-warning border border-warning/20",
  DISCONTINUED: "bg-destructive/10 text-destructive border border-destructive/20",
};

export type ProductFilters = {
  category?: string;
  status?: string;
  sellerType?: string;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
};

export const PRODUCT_FILTER_SCHEMA: FilterSchema<ProductFilters>[] = [
  { key: "category", param: "category", label: (f) => `Category: ${f.category}` },
  { key: "status", param: "status", label: (f) => `Status: ${f.status}` },
  { key: "sellerType", param: "sellerType", label: (f) => `Seller: ${f.sellerType}` },
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
    key: "ratingMin",
    param: "ratingMin",
    label: (f) => `Rating ≥ ${f.ratingMin}`,
  },
];

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`Failed to load products (${response.status})`);
  return response.json() as Promise<ApiResponse>;
};

export type ProductsListProps = {
  orgId: string;
};

export function ProductsList({ orgId }: ProductsListProps) {
  const { t } = useTranslation();
  const { state, updateState, resetState } = useTableQueryState("souq-products", {
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
    serializeFilters(state.filters as ProductFilters, PRODUCT_FILTER_SCHEMA, params);
    return params.toString();
  }, [orgId, state, tenantMissing]);

  const { data, isLoading, mutate, isValidating } = useSWR(
    tenantMissing ? null : `/api/marketplace/products?${query}`,
    fetcher,
    { keepPreviousData: true }
  );

  const products = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || 20))) : 1;
  const totalCount = data?.total ?? 0;
  const filters = state.filters as ProductFilters;
  const currentFilters = state.filters || {};

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
      buildActiveFilterChips(state.filters as ProductFilters, PRODUCT_FILTER_SCHEMA, (next) =>
        updateState({ filters: next })
      ),
    [state.filters, updateState]
  );

  // Early return AFTER all hooks
  if (tenantMissing) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Package}
          title={t("marketplace.products.orgRequiredTitle", "Organization required")}
          description={t(
            "marketplace.products.orgRequiredDesc",
            "Tenant context is missing. Please select an organization to view products.",
          )}
        />
      </div>
    );
  }

  // Quick chips (P0)
  const quickChips = [
    {
      key: "fm-supplies",
      label: "FM Supplies",
      onClick: () => updateState({ filters: { category: "FM Supplies" }, page: 1 }),
      selected: filters.category === "FM Supplies",
    },
    {
      key: "tools",
      label: "Tools",
      onClick: () => updateState({ filters: { category: "Tools & Equipment" }, page: 1 }),
      selected: filters.category === "Tools & Equipment",
    },
    {
      key: "highly-rated",
      label: "Highly Rated",
      onClick: () => updateState({ filters: { ratingMin: 4.5 }, page: 1 }),
      selected: filters.ratingMin === 4.5,
    },
    {
      key: "verified",
      label: "Verified Sellers",
      onClick: () => updateState({ filters: { sellerType: "FIXZIT" }, page: 1 }),
      selected: filters.sellerType === "FIXZIT",
    },
  ];

  // Table columns
  const columns: DataTableColumn<ProductRecord>[] = [
    {
      id: "product",
      header: "Product",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.imageUrl && (
            <img src={row.imageUrl} alt={row.name} className="w-12 h-12 rounded object-cover" />
          )}
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-sm text-muted-foreground">SKU: {row.sku}</div>
          </div>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: (row) => (
        <Badge variant="outline">{row.category}</Badge>
      ),
    },
    {
      id: "price",
      header: "Price",
      cell: (row) => (
        <div className="font-semibold">
          {row.currency} {row.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      id: "stock",
      header: "Stock",
      cell: (row) => (
        <span className={row.stock === 0 ? "text-destructive font-medium" : row.stock < 10 ? "text-warning" : ""}>
          {row.stock === 0 ? "Out of stock" : `${row.stock} units`}
        </span>
      ),
    },
    {
      id: "rating",
      header: "Rating",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 fill-warning text-warning" />
          <span className="font-medium">{row.rating.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">({row.reviewCount})</span>
        </div>
      ),
    },
    {
      id: "seller",
      header: "Seller",
      cell: (row) => (
        <Badge variant={row.sellerType === "FIXZIT" ? "default" : "outline"}>{row.sellerType}</Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.featured && <Badge variant="secondary" className="text-xs">⭐ Featured</Badge>}
          <Badge className={statusStyles[row.status]}>{row.status.replace(/_/g, " ")}</Badge>
        </div>
      ),
    },
  ];

  // Card view
  const CardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition cursor-pointer"
          onClick={() =>
            toast.info(
              t("marketplace.products.openProduct", "Open product {{id}}", {
                id: product.id,
              }),
            )
          }
        >
          {product.imageUrl && (
            <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover" />
          )}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-muted-foreground">{product.category}</p>
              </div>
              {product.featured && <Badge variant="secondary" className="text-xs">⭐</Badge>}
            </div>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-lg">
                {product.currency} {product.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-warning text-warning" />
                <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>Stock: {product.stock === 0 ? <span className="text-destructive">Out</span> : product.stock}</div>
              <Badge variant="outline">{product.sellerType}</Badge>
            </div>
            <div className="pt-2 border-t">
              <Badge className={statusStyles[product.status]}>{product.status.replace(/_/g, " ")}</Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const emptyState = (
    <EmptyState
      icon={Package}
      title="No products found"
      description="Adjust filters or add a new product to get started."
      action={
        activeFilters.length > 0 ? (
          <Button variant="outline" onClick={() => resetState()}>
            Clear all filters
          </Button>
        ) : (
          <Button
            onClick={() =>
              toast.info(t("marketplace.products.addProduct", "Add product flow"))
            }
          >
            <Plus className="w-4 h-4 me-2" />
            Add Product
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

  const handleLoadPreset = (
    presetFilters: Record<string, unknown>,
    _sort?: { field: string; direction: "asc" | "desc" },
    search?: string
  ) => {
    const normalizedFilters = pickSchemaFilters<ProductFilters>(
      presetFilters,
      PRODUCT_FILTER_SCHEMA
    );
    setDraftFilters(normalizedFilters);
    updateState({
      filters: normalizedFilters,
      q: typeof search === "string" ? search : "",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-3 md:grid-cols-2">
        <SavedCartBanner />
        <RecentlyViewed />
      </div>
      {/* PageHeader */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Marketplace Products
            {totalCount > 0 && <span className="ms-2 text-muted-foreground">({totalCount})</span>}
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage products in Fixzit Souq
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isValidating}>
            <RefreshCcw className={`w-4 h-4 me-2 ${isValidating ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 me-2" />
            Add Product
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
                placeholder="Search products by name or SKU..."
                value={state.q || ""}
                onChange={(e) => updateState({ q: e.target.value, page: 1 })}
                className="ps-9"
              />
            </div>
            <div className="flex gap-2">
              {quickChips.map((chip) => (
                <Chip key={chip.key} onClick={chip.onClick} selected={chip.selected}>
                  {chip.label}
                </Chip>
              ))}
            </div>
          </>
        }
        end={
          <>
            <div className="hidden md:flex gap-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                aria-pressed={viewMode === "table"}
                aria-label="Show table view"
              >
                Table
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("cards")}
                aria-pressed={viewMode === "cards"}
                aria-label="Show card view"
              >
                Cards
              </Button>
            </div>
            <TableDensityToggle density={density} onChange={setDensity} />
            <FilterPresetsDropdown
              entityType="products"
              currentFilters={pickSchemaFilters<ProductFilters>(
                currentFilters,
                PRODUCT_FILTER_SCHEMA
              )}
              currentSearch={state.q}
              normalizeFilters={(filters) =>
                pickSchemaFilters<ProductFilters>(
                  filters,
                  PRODUCT_FILTER_SCHEMA
                )
              }
              onLoadPreset={handleLoadPreset}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterDrawerOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={filterDrawerOpen}
            >
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
        <div className="text-center py-12 text-muted-foreground">Loading products...</div>
      ) : products.length === 0 ? (
        emptyState
      ) : viewMode === "cards" ? (
        <CardView />
      ) : (
        <DataTableStandard
          columns={columns}
          data={products}
          loading={isLoading}
          emptyState={emptyState}
          density={density}
          onRowClick={(row) =>
            toast.info(
              t("marketplace.products.openProduct", "Open product {{id}}", {
                id: row.id,
              }),
            )
          }
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
        title="Filter Products"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        }
      >
        <div className="space-y-6">
          <FacetMultiSelect
            label="Category"
            options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))}
            selected={Array.isArray(draftFilters.category) ? draftFilters.category : draftFilters.category ? [String(draftFilters.category)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, category: values[0] })}
          />
          
          <FacetMultiSelect
            label="Status"
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
            selected={Array.isArray(draftFilters.status) ? draftFilters.status : draftFilters.status ? [String(draftFilters.status)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, status: values[0] })}
          />
          
          <FacetMultiSelect
            label="Seller Type"
            options={SELLER_TYPE_OPTIONS.map((s) => ({ value: s, label: s }))}
            selected={Array.isArray(draftFilters.sellerType) ? draftFilters.sellerType : draftFilters.sellerType ? [String(draftFilters.sellerType)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, sellerType: values[0] })}
          />
          
          <NumericRangeFilter
            label="Price"
            value={{ min: draftFilters.priceMin as number, max: draftFilters.priceMax as number }}
            onChange={(range) => setDraftFilters({ ...draftFilters, priceMin: range.min, priceMax: range.max })}
            prefix="SAR"
          />
          
          <NumericRangeFilter
            label="Minimum Rating"
            value={{ min: draftFilters.ratingMin as number, max: 5 }}
            onChange={(range) => setDraftFilters({ ...draftFilters, ratingMin: range.min })}
            step={0.5}
          />
        </div>
      </TableFilterDrawer>
    </div>
  );
}
