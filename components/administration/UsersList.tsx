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
import { Users, Plus, RefreshCcw, Search, Filter, Lock, CheckCircle, XCircle } from "@/components/ui/icons";

import { DataTableStandard, DataTableColumn } from "@/components/tables/DataTableStandard";
import { CardList } from "@/components/tables/CardList";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TableFilterDrawer } from "@/components/tables/TableFilterDrawer";
import { ActiveFiltersChips } from "@/components/tables/ActiveFiltersChips";
import { TableDensityToggle } from "@/components/tables/TableDensityToggle";
import { FacetMultiSelect } from "@/components/tables/filters/FacetMultiSelect";
import { DateRangePicker } from "@/components/tables/filters/DateRangePicker";
import {
  buildActiveFilterChips,
  serializeFilters,
  type FilterSchema,
} from "@/components/tables/utils/filterSchema";
import { useTableQueryState } from "@/hooks/useTableQueryState";

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
  ACTIVE: "bg-[var(--color-status-active-bg)] text-[var(--color-status-active)] border border-[var(--color-status-active)]/20",
  INACTIVE: "bg-muted text-foreground border border-border",
  LOCKED: "bg-[var(--color-status-pending-bg)] text-[var(--color-status-pending)] border border-[var(--color-status-pending)]/30",
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
  onAddUser?: () => void;
  onEditUser?: (user: UserRecord) => void;
  /** Delete user callback - not yet implemented in table */
  _onDeleteUser?: (userId: string) => void;
  /** Toggle status callback - not yet implemented in table */
  _onToggleStatus?: (userId: string, currentStatus: string) => void;
  /** Hide the page header when embedded in another page */
  embedded?: boolean;
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

export function UsersList({ 
  orgId, 
  onAddUser, 
  onEditUser, 
  _onDeleteUser, 
  _onToggleStatus,
  embedded = false,
}: UsersListProps) {
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

  // Quick chips (P0)
  const quickChips = [
    { key: "active", label: "Active", onClick: () => updateState({ filters: { status: "ACTIVE" }, page: 1 }) },
    { key: "locked", label: "Locked", onClick: () => updateState({ filters: { status: "LOCKED" }, page: 1 }) },
    { key: "admins", label: "Admins", onClick: () => updateState({ filters: { role: "ORG_ADMIN" }, page: 1 }) },
    { key: "inactive-30d", label: "Inactive > 30d", onClick: () => updateState({ filters: { inactiveDays: 30 }, page: 1 }) },
  ];

  // Active filters
  const activeFilters = useMemo(
    () =>
      buildActiveFilterChips(state.filters as UserFilters, USER_FILTER_SCHEMA, (next) =>
        updateState({ filters: next })
      ),
    [state.filters, updateState]
  );

  // Table columns
  const columns: DataTableColumn<UserRecord>[] = [
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
  ];

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
          <Button onClick={onAddUser}>
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

  return (
    <div className={`space-y-6 ${embedded ? '' : 'p-6'}`}>
      {/* PageHeader - hidden when embedded */}
      {!embedded && (
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
          <Button size="sm" onClick={onAddUser}>
            <Plus className="w-4 h-4 me-2" />
            Invite User
          </Button>
        </div>
      </div>
      )}

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
                <Chip key={chip.key} onClick={chip.onClick}>
                  {chip.label}
                </Chip>
              ))}
            </div>
          </>
        }
        end={
          <>
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
          onRowClick={(user) => onEditUser?.(user)}
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
          onRowClick={(row) => onEditUser?.(row)}
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
