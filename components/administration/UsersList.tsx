/**
 * Users List - Administration Module
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
import { Users, Plus, RefreshCcw, Search, Filter, Lock, CheckCircle, XCircle } from "lucide-react";

import { DataTableStandard, DataTableColumn } from "@/components/tables/DataTableStandard";
import { CardList } from "@/components/tables/CardList";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TableFilterDrawer } from "@/components/tables/TableFilterDrawer";
import { ActiveFiltersChips } from "@/components/tables/ActiveFiltersChips";
import { TableDensityToggle } from "@/components/tables/TableDensityToggle";
import { FacetMultiSelect } from "@/components/tables/filters/FacetMultiSelect";
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

type UserRecord = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: "ACTIVE" | "INACTIVE" | "LOCKED";
  department?: string;
  lastLoginAt?: string;
  createdAt: string;
};

type ApiResponse = {
  items: UserRecord[];
  page: number;
  limit: number;
  total: number;
};

const ROLE_OPTIONS = ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "MEMBER", "VIEWER"];
const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "LOCKED"];
const DEPARTMENT_OPTIONS = ["Engineering", "Operations", "Finance", "HR", "Sales", "Marketing"];

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-[#00A859]/10 text-[#00A859] border border-[#00A859]/20",
  INACTIVE: "bg-muted text-foreground border border-border",
  LOCKED: "bg-[#FFB400]/10 text-[#FFB400] border border-[#FFB400]/30",
};

export type UserFilters = {
  role?: string;
  status?: string;
  department?: string;
  inactiveDays?: number;
  lastLoginFrom?: string;
  lastLoginTo?: string;
};

export const USER_FILTER_SCHEMA: FilterSchema<UserFilters>[] = [
  { key: "status", param: "status", label: (f) => `Status: ${f.status}` },
  { key: "role", param: "role", label: (f) => `Role: ${f.role}` },
  { key: "department", param: "department", label: (f) => `Department: ${f.department}` },
  {
    key: "inactiveDays",
    param: "inactiveDays",
    label: (f) => `Inactive > ${f.inactiveDays}d`,
  },
  {
    key: "lastLoginFrom",
    param: "lastLoginFrom",
    isActive: (f) => Boolean(f.lastLoginFrom || f.lastLoginTo),
    toParam: (f) => f.lastLoginFrom,
    label: (f) => `Last login: ${f.lastLoginFrom || "any"} → ${f.lastLoginTo || "any"}`,
    clear: (f) => {
      const { lastLoginFrom: _from, lastLoginTo: _to, ...rest } = f;
      return rest;
    },
  },
  {
    key: "lastLoginTo",
    param: "lastLoginTo",
    isActive: (f) => Boolean(f.lastLoginFrom || f.lastLoginTo),
    toParam: (f) => f.lastLoginTo,
    label: (f) => `Last login: ${f.lastLoginFrom || "any"} → ${f.lastLoginTo || "any"}`,
    clear: (f) => {
      const { lastLoginFrom: _from, lastLoginTo: _to, ...rest } = f;
      return rest;
    },
  },
];

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`Failed to load users (${response.status})`);
  return response.json() as Promise<ApiResponse>;
};

export type UsersListProps = {
  orgId: string;
};

export function buildUsersQuery(state: ReturnType<typeof useTableQueryState>["state"], orgId: string) {
  const params = new URLSearchParams();
  params.set("limit", String(state.pageSize || 20));
  params.set("page", String(state.page || 1));
  params.set("org", orgId);
  if (state.q) params.set("q", state.q);
  serializeFilters(state.filters as UserFilters, USER_FILTER_SCHEMA, params);
  return params.toString();
}

export function UsersList({ orgId }: UsersListProps) {
  const { state, updateState, resetState } = useTableQueryState("users", {
    page: 1,
    pageSize: 20,
    q: "",
    filters: {},
  });

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(state.filters || {});
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  const query = useMemo(() => {
    return buildUsersQuery(state, orgId);
  }, [orgId, state]);

  const { data, error: _error, isLoading, mutate, isValidating } = useSWR(
    `/api/users?${query}`,
    fetcher,
    { keepPreviousData: true }
  );

  const users = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || 20))) : 1;
  const totalCount = data?.total ?? 0;
  const filters = state.filters as UserFilters;
  const currentFilters = state.filters || {};

  // Quick chips (P0)
  const quickChips = [
    {
      key: "active",
      label: "Active",
      onClick: () => updateState({ filters: { status: "ACTIVE" }, page: 1 }),
      selected: filters.status === "ACTIVE",
    },
    {
      key: "locked",
      label: "Locked",
      onClick: () => updateState({ filters: { status: "LOCKED" }, page: 1 }),
      selected: filters.status === "LOCKED",
    },
    {
      key: "admins",
      label: "Admins",
      onClick: () => updateState({ filters: { role: "ORG_ADMIN" }, page: 1 }),
      selected: filters.role === "ORG_ADMIN",
    },
    {
      key: "inactive-30d",
      label: "Inactive > 30d",
      onClick: () => updateState({ filters: { inactiveDays: 30 }, page: 1 }),
      selected: filters.inactiveDays === 30,
    },
  ];

  // Active filters
  const activeFilters = useMemo(
    () =>
      buildActiveFilterChips(state.filters as UserFilters, USER_FILTER_SCHEMA, (next) =>
        updateState({ filters: next })
      ),
    [state.filters, updateState]
  );

  // Table columns - memoized to prevent unnecessary re-renders
  const columns = useMemo<DataTableColumn<UserRecord>[]>(() => [
    {
      id: "name",
      header: "Name",
      cell: (row) => (
        <div>
          <div className="font-medium">
            {row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : row.email}
          </div>
          <div className="text-sm text-muted-foreground">{row.email}</div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (row) => (
        <Badge variant="outline">{row.role.replace(/_/g, " ")}</Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => {
        const Icon = row.status === "ACTIVE" ? CheckCircle : row.status === "LOCKED" ? Lock : XCircle;
        return (
          <div className="flex items-center gap-2">
            <Icon className="w-3 h-3" />
            <Badge className={statusStyles[row.status]}>{row.status}</Badge>
          </div>
        );
      },
    },
    {
      id: "department",
      header: "Department",
      cell: (row) => row.department || <span className="text-muted-foreground">—</span>,
    },
    {
      id: "lastLogin",
      header: "Last Login",
      cell: (row) => {
        if (!row.lastLoginAt) return <span className="text-muted-foreground">Never</span>;
        const lastLogin = new Date(row.lastLoginAt);
        const daysAgo = Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <span className={daysAgo > 30 ? "text-warning" : ""}>
            {formatDistanceToNowStrict(lastLogin, { addSuffix: true })}
          </span>
        );
      },
    },
    {
      id: "created",
      header: "Created",
      cell: (row) => formatDistanceToNowStrict(new Date(row.createdAt), { addSuffix: true }),
    },
  ], []);

  const emptyState = (
    <EmptyState
      icon={Users}
      title="No users found"
      description="Adjust filters or invite a new user to get started."
      action={
        activeFilters.length > 0 ? (
          <Button variant="outline" onClick={() => resetState()}>
            Clear all filters
          </Button>
        ) : (
          <Button onClick={() => toast.info("Invite user flow")}>
            <Plus className="w-4 h-4 me-2" />
            Invite User
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
    const normalizedFilters = pickSchemaFilters<UserFilters>(
      presetFilters,
      USER_FILTER_SCHEMA
    );
    setDraftFilters(normalizedFilters);
    updateState({
      filters: normalizedFilters,
      q: typeof search === "string" ? search : "",
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* PageHeader */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Users
            {totalCount > 0 && <span className="ms-2 text-muted-foreground">({totalCount})</span>}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isValidating}>
            <RefreshCcw className={`w-4 h-4 me-2 ${isValidating ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 me-2" />
            Invite User
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
                placeholder="Search users by name or email..."
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
              entityType="users"
              currentFilters={pickSchemaFilters<UserFilters>(
                currentFilters,
                USER_FILTER_SCHEMA
              )}
              currentSearch={state.q}
              normalizeFilters={(filters) =>
                pickSchemaFilters<UserFilters>(filters, USER_FILTER_SCHEMA)
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
          data={users}
          primaryAccessor={(user) => `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email}
          secondaryAccessor={(user) => user.email}
          statusAccessor={(user) => {
            const statusStyles = {
              ACTIVE: "bg-success-subtle text-success border-success",
              INACTIVE: "bg-muted text-muted-foreground",
              LOCKED: "bg-destructive-subtle text-destructive border-destructive",
            };
            return <Badge className={statusStyles[user.status]}>{user.status}</Badge>;
          }}
          metadataAccessor={(user) => 
            `${user.role} • Last login: ${user.lastLoginAt ? formatDistanceToNowStrict(new Date(user.lastLoginAt), { addSuffix: true }) : "Never"}`
          }
          onRowClick={(user) => toast.info(`Open user ${user.id}`)}
          loading={isLoading}
          emptyMessage="No users found"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <DataTableStandard
          columns={columns}
          data={users}
          loading={isLoading}
          emptyState={emptyState}
          density={density}
          onRowClick={(row) => toast.info(`Open user ${row.id}`)}
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
        title="Filter Users"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        }
      >
        <div className="space-y-6">
          <FacetMultiSelect
            label="Role"
            options={ROLE_OPTIONS.map((r) => ({ value: r, label: r.replace(/_/g, " ") }))}
            selected={Array.isArray(draftFilters.role) ? draftFilters.role : draftFilters.role ? [String(draftFilters.role)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, role: values[0] })}
          />
          
          <FacetMultiSelect
            label="Status"
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            selected={Array.isArray(draftFilters.status) ? draftFilters.status : draftFilters.status ? [String(draftFilters.status)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, status: values[0] })}
          />
          
          <FacetMultiSelect
            label="Department"
            options={DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
            selected={Array.isArray(draftFilters.department) ? draftFilters.department : draftFilters.department ? [String(draftFilters.department)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, department: values[0] })}
          />
          
          <DateRangePicker
            label="Last Login Date"
            value={{ from: draftFilters.lastLoginFrom as string, to: draftFilters.lastLoginTo as string }}
            onChange={(range) => setDraftFilters({ ...draftFilters, lastLoginFrom: range.from, lastLoginTo: range.to })}
          />
        </div>
      </TableFilterDrawer>
    </div>
  );
}
