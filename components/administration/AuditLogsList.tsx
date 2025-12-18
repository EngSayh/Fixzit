/**
 * Audit Logs List - Administration Module
 * P0 Standard Implementation
 * 
 * ✅ PageHeader + count
 * ✅ TableToolbar + search + quick chips
 * ✅ ActiveFiltersChips
 * ✅ DataTableStandard
 * ✅ URL sync
 * ✅ Filter drawer (draft/apply)
 */
"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { formatDistanceToNowStrict, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "@/components/ui/chip";
import { FileText, RefreshCcw, Search, Filter, CheckCircle, XCircle, AlertCircle } from "lucide-react";

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

type AuditLogRecord = {
  id: string;
  timestamp: string;
  createdAt?: string;
  userId: string;
  userName?: string;
  actorEmail?: string;
  actorId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  status: "SUCCESS" | "FAILURE" | "WARNING";
  ipAddress?: string;
  details?: string;
};

type ApiResponse = {
  items: AuditLogRecord[];
  page: number;
  limit: number;
  total: number;
};

export type AuditFilters = {
  eventType?: string;
  status?: string;
  userId?: string;
  ipAddress?: string;
  dateRange?: string;
  action?: string;
  timestampFrom?: string;
  timestampTo?: string;
};

export const AUDIT_FILTER_SCHEMA: FilterSchema<AuditFilters>[] = [
  { key: "eventType", param: "eventType", label: (f) => `Event: ${f.eventType}` },
  { key: "status", param: "status", label: (f) => `Status: ${f.status}` },
  { key: "userId", param: "userId", label: (f) => `User: ${f.userId}` },
  { key: "ipAddress", param: "ipAddress", label: (f) => `IP: ${f.ipAddress}` },
  { key: "action", param: "action", label: (f) => `Action: ${f.action}` },
  { key: "dateRange", param: "dateRange", label: (f) => `Range: ${f.dateRange}` },
  {
    key: "timestampFrom",
    param: "timestampFrom",
    isActive: (f) => Boolean(f.timestampFrom || f.timestampTo),
    toParam: (f) => f.timestampFrom,
    label: (f) => `Timestamp: ${f.timestampFrom || "any"} → ${f.timestampTo || "any"}`,
    clear: (f) => {
      const { timestampFrom: _from, timestampTo: _to, ...rest } = f;
      return rest;
    },
  },
  {
    key: "timestampTo",
    param: "timestampTo",
    isActive: (f) => Boolean(f.timestampFrom || f.timestampTo),
    toParam: (f) => f.timestampTo,
    label: (f) => `Timestamp: ${f.timestampFrom || "any"} → ${f.timestampTo || "any"}`,
    clear: (f) => {
      const { timestampFrom: _from, timestampTo: _to, ...rest } = f;
      return rest;
    },
  },
];

const EVENT_TYPE_OPTIONS = ["LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "EXPORT", "IMPORT"];
const STATUS_OPTIONS = ["SUCCESS", "FAILURE", "WARNING"];

const statusStyles: Record<string, string> = {
  SUCCESS: "bg-success/10 text-success border border-success/20",
  FAILURE: "bg-destructive/10 text-destructive border border-destructive/20",
  WARNING: "bg-warning/10 text-warning border border-warning/20",
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`Failed to load audit logs (${response.status})`);
  return response.json() as Promise<ApiResponse>;
};

export type AuditLogsListProps = {
  orgId: string;
};

export function buildAuditLogsQuery(state: ReturnType<typeof useTableQueryState>["state"], orgId: string) {
  const params = new URLSearchParams();
  params.set("limit", String(state.pageSize || 50));
  params.set("page", String(state.page || 1));
  params.set("org", orgId);
  if (state.q) params.set("q", state.q);
  serializeFilters(state.filters as AuditFilters, AUDIT_FILTER_SCHEMA, params);
  return params.toString();
}

export function AuditLogsList({ orgId }: AuditLogsListProps) {
  const { state, updateState, resetState } = useTableQueryState("audit-logs", {
    page: 1,
    pageSize: 50,
    q: "",
    filters: {},
  });

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(state.filters || {});
  const [density, setDensity] = useState<"comfortable" | "compact">("compact");

  const query = useMemo(() => {
    return buildAuditLogsQuery(state, orgId);
  }, [orgId, state]);

  const { data, error: _error, isLoading, mutate, isValidating } = useSWR(
    `/api/audit-logs?${query}`,
    fetcher,
    { keepPreviousData: true, refreshInterval: 30000 }
  );

  const logs = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || 50))) : 1;
  const totalCount = data?.total ?? 0;
  const filters = state.filters as AuditFilters;
  const currentFilters = state.filters || {};

  // Quick chips (P0)
  const quickChips = [
    {
      key: "today",
      label: "Today",
      onClick: () => updateState({ filters: { dateRange: "today" }, page: 1 }),
      selected: filters.dateRange === "today",
    },
    {
      key: "7d",
      label: "Last 7 days",
      onClick: () => updateState({ filters: { dateRange: "7d" }, page: 1 }),
      selected: filters.dateRange === "7d",
    },
    {
      key: "logins",
      label: "Login Events",
      onClick: () => updateState({ filters: { eventType: "LOGIN" }, page: 1 }),
      selected: filters.eventType === "LOGIN",
    },
    {
      key: "admin",
      label: "Admin Actions",
      onClick: () => updateState({ filters: { action: "admin" }, page: 1 }),
      selected: filters.action === "admin",
    },
    {
      key: "errors",
      label: "Errors",
      onClick: () => updateState({ filters: { status: "FAILURE" }, page: 1 }),
      selected: filters.status === "FAILURE",
    },
  ];

  // Active filters
  const activeFilters = useMemo(
    () =>
      buildActiveFilterChips(state.filters as AuditFilters, AUDIT_FILTER_SCHEMA, (next) =>
        updateState({ filters: next })
      ),
    [state.filters, updateState]
  );

  // Table columns
  const columns: DataTableColumn<AuditLogRecord>[] = [
    {
      id: "timestamp",
      header: "Timestamp",
      cell: (row) => (
        <div>
          <div className="font-mono text-sm">{format(new Date(row.timestamp), "HH:mm:ss")}</div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNowStrict(new Date(row.timestamp), { addSuffix: true })}
          </div>
        </div>
      ),
    },
    {
      id: "user",
      header: "User",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.userName || row.userId}</div>
          {row.userName && <div className="text-xs text-muted-foreground">{row.userId}</div>}
        </div>
      ),
    },
    {
      id: "action",
      header: "Action",
      cell: (row) => (
        <Badge variant="outline">{row.action}</Badge>
      ),
    },
    {
      id: "resource",
      header: "Resource",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.resource}</div>
          {row.resourceId && (
            <div className="text-xs text-muted-foreground font-mono">{row.resourceId}</div>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => {
        const Icon = row.status === "SUCCESS" ? CheckCircle : row.status === "FAILURE" ? XCircle : AlertCircle;
        return (
          <div className="flex items-center gap-2">
            <Icon className="w-3 h-3" />
            <Badge className={statusStyles[row.status]}>{row.status}</Badge>
          </div>
        );
      },
    },
    {
      id: "ip",
      header: "IP Address",
      cell: (row) => (
        <span className="font-mono text-sm">{row.ipAddress || <span className="text-muted-foreground">—</span>}</span>
      ),
    },
  ];

  const emptyState = (
    <EmptyState
      icon={FileText}
      title="No audit logs found"
      description="Adjust filters to view activity history."
      action={
        activeFilters.length > 0 && (
          <Button variant="outline" onClick={() => resetState()}>
            Clear all filters
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
    const normalizedFilters = pickSchemaFilters<AuditFilters>(
      presetFilters,
      AUDIT_FILTER_SCHEMA
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
            Audit Logs
            {totalCount > 0 && <span className="ms-2 text-muted-foreground">({totalCount})</span>}
          </h1>
          <p className="text-muted-foreground mt-1">
            Track all user actions and system events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isValidating}>
            <RefreshCcw className={`w-4 h-4 me-2 ${isValidating ? "animate-spin" : ""}`} />
            Refresh
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
                placeholder="Search logs by action, user, or resource..."
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
              entityType="auditLogs"
              currentFilters={pickSchemaFilters<AuditFilters>(
                currentFilters,
                AUDIT_FILTER_SCHEMA
              )}
              currentSearch={state.q}
              normalizeFilters={(filters) =>
                pickSchemaFilters<AuditFilters>(filters, AUDIT_FILTER_SCHEMA)
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
          data={logs}
          primaryAccessor={(log) => log.action}
          secondaryAccessor={(log) => log.actorEmail || log.actorId}
          statusAccessor={(log) => {
            const actionStyles = {
              CREATE: "bg-success-subtle text-success",
              UPDATE: "bg-info-subtle text-info",
              DELETE: "bg-destructive-subtle text-destructive",
              LOGIN: "bg-muted",
              LOGOUT: "bg-muted",
            };
            return <Badge className={actionStyles[log.action as keyof typeof actionStyles] || "bg-muted"}>{log.action}</Badge>;
          }}
          metadataAccessor={(log) => 
            `${log.resource} • ${log.createdAt ? formatDistanceToNowStrict(new Date(log.createdAt), { addSuffix: true }) : "Recently"}`
          }
          onRowClick={(log) => toast.info(`View log details ${log.id}`)}
          loading={isLoading}
          emptyMessage="No audit logs found"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <DataTableStandard
          columns={columns}
          data={logs}
          loading={isLoading}
          emptyState={emptyState}
          density={density}
          onRowClick={(row) => toast.info(`View log details ${row.id}`)}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((state.page || 1) - 1) * (state.pageSize || 50) + 1} to{" "}
            {Math.min((state.page || 1) * (state.pageSize || 50), totalCount)} of {totalCount} results
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
        title="Filter Audit Logs"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        }
      >
        <div className="space-y-6">
          <FacetMultiSelect
            label="Event Type"
            options={EVENT_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
            selected={Array.isArray(draftFilters.eventType) ? draftFilters.eventType : draftFilters.eventType ? [String(draftFilters.eventType)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, eventType: values[0] })}
          />
          
          <FacetMultiSelect
            label="Status"
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            selected={Array.isArray(draftFilters.status) ? draftFilters.status : draftFilters.status ? [String(draftFilters.status)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, status: values[0] })}
          />
          
          <DateRangePicker
            label="Timestamp Range"
            value={{ from: draftFilters.timestampFrom as string, to: draftFilters.timestampTo as string }}
            onChange={(range) => setDraftFilters({ ...draftFilters, timestampFrom: range.from, timestampTo: range.to })}
          />
          
          <div>
            <label className="text-sm font-medium mb-2 block">IP Address</label>
            <Input
              type="text"
              placeholder="e.g., 192.168.1.100"
              value={(draftFilters.ipAddress as string) || ""}
              onChange={(e) => setDraftFilters({ ...draftFilters, ipAddress: e.target.value })}
            />
          </div>
        </div>
      </TableFilterDrawer>
    </div>
  );
}
