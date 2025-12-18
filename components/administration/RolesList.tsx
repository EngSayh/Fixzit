/**
 * Roles List - Administration Module
 * P0 Standard Implementation
 * 
 * ✅ PageHeader + count + CTA
 * ✅ TableToolbar + search + quick chips
 * ✅ ActiveFiltersChips
 * ✅ DataTableStandard
 * ✅ URL sync
 * ✅ Filter drawer (draft/apply)
 */
"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "@/components/ui/chip";
import { Shield, Plus, RefreshCcw, Search, Filter, Users as UsersIcon } from "lucide-react";

import { DataTableStandard, DataTableColumn } from "@/components/tables/DataTableStandard";
import { CardList } from "@/components/tables/CardList";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TableFilterDrawer } from "@/components/tables/TableFilterDrawer";
import { ActiveFiltersChips } from "@/components/tables/ActiveFiltersChips";
import { TableDensityToggle } from "@/components/tables/TableDensityToggle";
import { FacetMultiSelect } from "@/components/tables/filters/FacetMultiSelect";
import { NumericRangeFilter } from "@/components/tables/filters/NumericRangeFilter";
import { DateRangePicker } from "@/components/tables/filters/DateRangePicker";
import { FilterPresetsDropdown } from "@/components/common/FilterPresetsDropdown";
import {
  buildActiveFilterChips,
  serializeFilters,
  type FilterSchema,
} from "@/components/tables/utils/filterSchema";
import { pickSchemaFilters } from "@/lib/filters/preset-utils";
import { useTableQueryState } from "@/hooks/useTableQueryState";
import { toast } from "sonner";

type RoleRecord = {
  id: string;
  name: string;
  description?: string;
  type: "SYSTEM" | "CUSTOM";
  membersCount: number;
  userCount?: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

type ApiResponse = {
  items: RoleRecord[];
  page: number;
  limit: number;
  total: number;
};

const TYPE_OPTIONS = ["SYSTEM", "CUSTOM"];
const STATUS_OPTIONS = ["ACTIVE", "INACTIVE"];

const typeStyles: Record<string, string> = {
  SYSTEM: "bg-[#0061A8]/10 text-[#0061A8] border border-[#0061A8]/20",
  CUSTOM: "bg-[#00A859]/10 text-[#00A859] border border-[#00A859]/20",
};

export type RoleFilters = {
  type?: string;
  status?: string;
  membersMin?: number;
  membersMax?: number;
  createdFrom?: string;
  createdTo?: string;
};

export const ROLE_FILTER_SCHEMA: FilterSchema<RoleFilters>[] = [
  { key: "type", param: "type", label: (f) => `Type: ${f.type}` },
  { key: "status", param: "status", label: (f) => `Status: ${f.status}` },
  {
    key: "membersMin",
    param: "membersMin",
    isActive: (f) => Boolean(f.membersMin || f.membersMax !== undefined),
    label: (f) => `Members: ${f.membersMin || 0}-${f.membersMax || "∞"}`,
    clear: (f) => {
      const { membersMin: _min, membersMax: _max, ...rest } = f;
      return rest;
    },
  },
  {
    key: "membersMax",
    param: "membersMax",
    isActive: (f) => Boolean(f.membersMin || f.membersMax !== undefined),
    label: (f) => `Members: ${f.membersMin || 0}-${f.membersMax || "∞"}`,
    clear: (f) => {
      const { membersMin: _min, membersMax: _max, ...rest } = f;
      return rest;
    },
  },
  {
    key: "createdFrom",
    param: "createdFrom",
    isActive: (f) => Boolean(f.createdFrom || f.createdTo),
    toParam: (f) => f.createdFrom,
    label: (f) => `Created: ${f.createdFrom || "any"} → ${f.createdTo || "any"}`,
    clear: (f) => {
      const { createdFrom: _from, createdTo: _to, ...rest } = f;
      return rest;
    },
  },
  {
    key: "createdTo",
    param: "createdTo",
    isActive: (f) => Boolean(f.createdFrom || f.createdTo),
    toParam: (f) => f.createdTo,
    label: (f) => `Created: ${f.createdFrom || "any"} → ${f.createdTo || "any"}`,
    clear: (f) => {
      const { createdFrom: _from, createdTo: _to, ...rest } = f;
      return rest;
    },
  },
];

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`Failed to load roles (${response.status})`);
  return response.json() as Promise<ApiResponse>;
};

export type RolesListProps = {
  orgId: string;
};

export function RolesList({ orgId }: RolesListProps) {
  const { state, updateState, resetState } = useTableQueryState("roles", {
    page: 1,
    pageSize: 20,
    q: "",
    filters: {},
  });

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(state.filters || {});
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(state.pageSize || 20));
    params.set("page", String(state.page || 1));
    params.set("org", orgId);
    if (state.q) params.set("q", state.q);
    serializeFilters(state.filters as RoleFilters, ROLE_FILTER_SCHEMA, params);
    return params.toString();
  }, [orgId, state]);

  const { data, error: _error, isLoading, mutate, isValidating } = useSWR(
    `/api/roles?${query}`,
    fetcher,
    { keepPreviousData: true }
  );

  const roles = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || 20))) : 1;
  const totalCount = data?.total ?? 0;
  const filters = state.filters as RoleFilters;
  const currentFilters = state.filters || {};

  // handleLoadPreset for filter presets
  const handleLoadPreset = (
    presetFilters: Record<string, unknown>,
    _sort?: { field: string; direction: "asc" | "desc" },
    search?: string
  ) => {
    const normalizedFilters = pickSchemaFilters<RoleFilters>(
      presetFilters,
      ROLE_FILTER_SCHEMA
    );
    setDraftFilters(normalizedFilters);
    updateState({
      filters: normalizedFilters,
      q: typeof search === "string" ? search : "",
    });
  };

  // Quick chips (P0)
  const quickChips = [
    {
      key: "system",
      label: "System Roles",
      onClick: () => updateState({ filters: { type: "SYSTEM" }, page: 1 }),
      selected: filters.type === "SYSTEM",
    },
    {
      key: "custom",
      label: "Custom Roles",
      onClick: () => updateState({ filters: { type: "CUSTOM" }, page: 1 }),
      selected: filters.type === "CUSTOM",
    },
    {
      key: "active",
      label: "Active",
      onClick: () => updateState({ filters: { status: "ACTIVE" }, page: 1 }),
      selected: filters.status === "ACTIVE",
    },
    {
      key: "unused",
      label: "Unused",
      onClick: () => updateState({ filters: { membersMax: 0 }, page: 1 }),
      selected: filters.membersMax === 0,
    },
  ];

  // Active filters
  const activeFilters = useMemo(
    () =>
      buildActiveFilterChips(state.filters as RoleFilters, ROLE_FILTER_SCHEMA, (next) =>
        updateState({ filters: next })
      ),
    [state.filters, updateState]
  );

  // Table columns - memoized to prevent unnecessary re-renders
  const columns = useMemo<DataTableColumn<RoleRecord>[]>(() => [
    {
      id: "name",
      header: "Role Name",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          {row.description && (
            <div className="text-sm text-muted-foreground mt-0.5">{row.description}</div>
          )}
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: (row) => (
        <Badge className={typeStyles[row.type]}>{row.type}</Badge>
      ),
    },
    {
      id: "members",
      header: "Members",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <UsersIcon className="w-3 h-3 text-muted-foreground" />
          <span className={row.membersCount === 0 ? "text-muted-foreground" : "font-medium"}>
            {row.membersCount}
          </span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === "ACTIVE" ? "default" : "outline"}>
          {row.status}
        </Badge>
      ),
    },
    {
      id: "created",
      header: "Created",
      cell: (row) => formatDistanceToNowStrict(new Date(row.createdAt), { addSuffix: true }),
    },
  ], []);

  const emptyState = (
    <EmptyState
      icon={Shield}
      title="No roles found"
      description="Adjust filters or create a custom role to get started."
      action={
        activeFilters.length > 0 ? (
          <Button variant="outline" onClick={() => resetState()}>
            Clear all filters
          </Button>
        ) : (
          <Button onClick={() => toast.info("Create role flow")}>
            <Plus className="w-4 h-4 me-2" />
            Create Role
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
            Roles & Permissions
            {totalCount > 0 && <span className="ms-2 text-muted-foreground">({totalCount})</span>}
          </h1>
          <p className="text-muted-foreground mt-1">
            Define roles and permission sets for your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isValidating}>
            <RefreshCcw className={`w-4 h-4 me-2 ${isValidating ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 me-2" />
            Create Role
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
                placeholder="Search roles..."
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
            <TableDensityToggle density={density} onChange={setDensity} />
            <FilterPresetsDropdown
              entityType="roles"
              currentFilters={pickSchemaFilters<RoleFilters>(
                currentFilters,
                ROLE_FILTER_SCHEMA
              )}
              currentSearch={state.q}
              normalizeFilters={(filters) =>
                pickSchemaFilters<RoleFilters>(filters, ROLE_FILTER_SCHEMA)
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

      {/* Mobile CardList */}
      <div className="lg:hidden">
        <CardList
          data={roles}
          primaryAccessor={(role) => role.name}
          secondaryAccessor={(role) => role.description || "No description"}
          metadataAccessor={(role) => 
            `${role.type} • ${role.membersCount || role.userCount || 0} users`
          }
          onRowClick={(role) => toast.info(`Open role ${role.id}`)}
          loading={isLoading}
          emptyMessage="No roles found"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <DataTableStandard
          columns={columns}
          data={roles}
          loading={isLoading}
          emptyState={emptyState}
          density={density}
          onRowClick={(row) => toast.info(`Open role ${row.id}`)}
        />
      </div>

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
        title="Filter Roles"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        }
      >
        <div className="space-y-6">
          <FacetMultiSelect
            label="Type"
            options={TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
            selected={Array.isArray(draftFilters.type) ? draftFilters.type : draftFilters.type ? [String(draftFilters.type)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, type: values[0] })}
          />
          
          <FacetMultiSelect
            label="Status"
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            selected={Array.isArray(draftFilters.status) ? draftFilters.status : draftFilters.status ? [String(draftFilters.status)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, status: values[0] })}
          />
          
          <NumericRangeFilter
            label="Members Count"
            value={{ min: draftFilters.membersMin as number, max: draftFilters.membersMax as number }}
            onChange={(range) => setDraftFilters({ ...draftFilters, membersMin: range.min, membersMax: range.max })}
          />
          
          <DateRangePicker
            label="Created Date"
            value={{ from: draftFilters.createdFrom as string, to: draftFilters.createdTo as string }}
            onChange={(range) => setDraftFilters({ ...draftFilters, createdFrom: range.from, createdTo: range.to })}
          />
        </div>
      </TableFilterDrawer>
    </div>
  );
}
