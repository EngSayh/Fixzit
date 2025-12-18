/**
 * Work Orders List - P0 Reference Implementation
 * 
 * ✅ PageHeader (title + count + CTA)
 * ✅ TableToolbar (search + quick chips + filters button)
 * ✅ ActiveFiltersChips row (removable + clear all)
 * ✅ DataTableStandard (consistent table)
 * ✅ Pagination (page + size + total)
 * ✅ URL-synced state (shareable deep links)
 * ✅ Skeleton loading
 * ✅ Empty state
 * ✅ Draft/Apply filter model
 */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { formatDistanceToNowStrict } from "date-fns";
import { useTranslation } from "@/contexts/TranslationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "@/components/ui/chip";
import {
  Plus,
  RefreshCcw,
  Search,
  Filter,
  FileText,
  AlertCircle,
} from "lucide-react";

// Foundation Components
import { DataTableStandard, DataTableColumn } from "@/components/tables/DataTableStandard";
import { CardList } from "@/components/tables/CardList";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TableFilterDrawer } from "@/components/tables/TableFilterDrawer";
import { ActiveFiltersChips } from "@/components/tables/ActiveFiltersChips";
import { TableDensityToggle } from "@/components/tables/TableDensityToggle";
import { FacetMultiSelect } from "@/components/tables/filters/FacetMultiSelect";
import { DateRangePicker } from "@/components/tables/filters/DateRangePicker";
import { FilterPresetsDropdown } from "@/components/common/FilterPresetsDropdown";
import { ExportCenterDrawer } from "@/components/export/ExportCenterDrawer";
import {
  buildActiveFilterChips,
  serializeFilters,
  type FilterSchema,
} from "@/components/tables/utils/filterSchema";
import { pickSchemaFilters } from "@/lib/filters/preset-utils";
import { useTableQueryState } from "@/hooks/useTableQueryState";

import ClientDate from "@/components/ClientDate";
import { WorkOrderPriority } from "@/lib/sla";
import { toast } from "sonner";

// Types
type WorkOrderRecord = {
  id: string;
  code?: string;
  workOrderNumber?: string;
  title: string;
  description?: string;
  status: "SUBMITTED" | "DISPATCHED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "VERIFIED" | "CLOSED" | "CANCELLED";
  priority: WorkOrderPriority;
  createdAt?: string;
  dueAt?: string;
  propertyId?: string;
  assigneeUserId?: string;
  assigneeVendorId?: string;
  category?: string;
};

type ApiResponse = {
  items: WorkOrderRecord[];
  page: number;
  limit: number;
  total: number;
};

// Constants
const STATUS_OPTIONS = ["SUBMITTED", "DISPATCHED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "VERIFIED", "CLOSED", "CANCELLED"];
const PRIORITY_OPTIONS: WorkOrderPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const statusStyles: Record<string, string> = {
  SUBMITTED: "bg-[#FFB400]/10 text-[#FFB400] border border-[#FFB400]/30",
  DISPATCHED: "bg-[#0061A8]/10 text-[#0061A8] border border-[#0061A8]/30",
  IN_PROGRESS: "bg-[#0061A8]/10 text-[#0061A8] border border-[#0061A8]/30",
  ON_HOLD: "bg-muted text-foreground border border-border",
  COMPLETED: "bg-[#00A859]/10 text-[#00A859] border border-[#00A859]/30",
  VERIFIED: "bg-[#00A859]/10 text-[#00A859] border border-[#00A859]/30",
  CLOSED: "bg-[#00A859]/10 text-[#00A859] border border-[#00A859]/30",
  CANCELLED: "bg-destructive/10 text-destructive border border-destructive/20",
};

const priorityStyles: Record<string, string> = {
  LOW: "bg-muted text-foreground border border-border",
  MEDIUM: "bg-[#0061A8]/10 text-[#0061A8] border border-[#0061A8]/30",
  HIGH: "bg-[#FFB400]/10 text-[#FFB400] border border-[#FFB400]/30",
  CRITICAL: "bg-destructive/10 text-destructive border border-destructive/20",
};

export type WorkOrderFilters = {
  status?: string;
  priority?: WorkOrderPriority;
  overdue?: boolean;
  assignedToMe?: boolean;
  unassigned?: boolean;
  slaRisk?: boolean;
  dueDateFrom?: string;
  dueDateTo?: string;
};

export const WORK_ORDER_FILTER_SCHEMA: FilterSchema<WorkOrderFilters>[] = [
  {
    key: "status",
    param: "status",
    label: (f) => `Status: ${f.status}`,
  },
  {
    key: "priority",
    param: "priority",
    label: (f) => `Priority: ${f.priority}`,
  },
  {
    key: "overdue",
    param: "overdue",
    toParam: () => true,
    label: () => "Overdue",
  },
  {
    key: "assignedToMe",
    param: "assignedToMe",
    toParam: () => true,
    label: () => "Assigned to me",
  },
  {
    key: "unassigned",
    param: "unassigned",
    toParam: () => true,
    label: () => "Unassigned",
  },
  {
    key: "slaRisk",
    param: "slaRisk",
    toParam: () => true,
    label: () => "SLA Risk",
  },
  {
    key: "dueDateFrom",
    param: "dueDateFrom",
    isActive: (f) => Boolean(f.dueDateFrom || f.dueDateTo),
    toParam: (f) => f.dueDateFrom,
    label: (f) => `Due: ${f.dueDateFrom || "any"} → ${f.dueDateTo || "any"}`,
    clear: (f) => {
      const { dueDateFrom: _from, dueDateTo: _to, ...rest } = f;
      return rest;
    },
  },
  {
    key: "dueDateTo",
    param: "dueDateTo",
    isActive: (f) => Boolean(f.dueDateFrom || f.dueDateTo),
    toParam: (f) => f.dueDateTo,
    label: (f) => `Due: ${f.dueDateFrom || "any"} → ${f.dueDateTo || "any"}`,
    clear: (f) => {
      const { dueDateFrom: _from, dueDateTo: _to, ...rest } = f;
      return rest;
    },
  },
];

// Fetcher
const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`Failed to load work orders (${response.status})`);
  return response.json() as Promise<ApiResponse>;
};

export type WorkOrdersViewProps = {
  orgId: string;
  heading?: string;
  description?: string;
};

export function buildWorkOrdersQuery(state: ReturnType<typeof useTableQueryState>["state"], orgId: string) {
  const params = new URLSearchParams();
  params.set("limit", String(state.pageSize || 20));
  params.set("page", String(state.page || 1));
  params.set("org", orgId);
  if (state.q) params.set("q", state.q);
  serializeFilters(state.filters as WorkOrderFilters, WORK_ORDER_FILTER_SCHEMA, params);
  return params.toString();
}

export function WorkOrdersView({ heading, description, orgId }: WorkOrdersViewProps) {
  const { t } = useTranslation();
  
  // Table state with URL sync
  const { state, updateState, resetState } = useTableQueryState("work-orders", {
    page: 1,
    pageSize: 20,
    q: "",
    filters: {},
  });

  // Drawer state
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(state.filters || {});
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  // Build API query
  const query = useMemo(() => {
    return buildWorkOrdersQuery(state, orgId);
  }, [orgId, state]);

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    `/api/fm/work-orders?${query}`,
    fetcher,
    { keepPreviousData: true }
  );

  const workOrders = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || 20))) : 1;
  const totalCount = data?.total ?? 0;
  const filters = state.filters as WorkOrderFilters;
  const currentFilters = state.filters || {};

  // Quick filter chips (P0 requirement)
  const quickChips = [
    {
      key: "open",
      label: "Open",
      onClick: () => updateState({ filters: { status: "SUBMITTED" }, page: 1 }),
      selected: filters.status === "SUBMITTED",
    },
    {
      key: "overdue",
      label: "Overdue",
      onClick: () => updateState({ filters: { overdue: true }, page: 1 }),
      selected: Boolean(filters.overdue),
    },
    {
      key: "mine",
      label: "Mine",
      onClick: () => updateState({ filters: { assignedToMe: true }, page: 1 }),
      selected: Boolean(filters.assignedToMe),
    },
    {
      key: "unassigned",
      label: "Unassigned",
      onClick: () => updateState({ filters: { unassigned: true }, page: 1 }),
      selected: Boolean(filters.unassigned),
    },
    {
      key: "high",
      label: "High Priority",
      onClick: () => updateState({ filters: { priority: "HIGH" }, page: 1 }),
      selected: filters.priority === "HIGH",
    },
    {
      key: "sla-risk",
      label: "SLA Risk",
      onClick: () => updateState({ filters: { slaRisk: true }, page: 1 }),
      selected: Boolean(filters.slaRisk),
    },
  ];

  // Active filters chips
  const activeFilters = useMemo(
    () =>
      buildActiveFilterChips(state.filters as WorkOrderFilters, WORK_ORDER_FILTER_SCHEMA, (next) =>
        updateState({ filters: next })
      ),
    [state.filters, updateState]
  );

  // Table columns
  const columns: DataTableColumn<WorkOrderRecord>[] = [
    {
      id: "code",
      header: "Code",
      cell: (row) => (
        <span className="font-mono text-xs">{row.code || row.workOrderNumber || row.id.slice(-6)}</span>
      ),
    },
    {
      id: "title",
      header: "Title",
      cell: (row) => (
        <div className="min-w-[200px]">
          <div className="font-medium">{row.title}</div>
          {row.description && (
            <div className="text-sm text-muted-foreground truncate max-w-[300px]">
              {row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <Badge className={statusStyles[row.status]}>
          {row.status}
        </Badge>
      ),
    },
    {
      id: "priority",
      header: "Priority",
      cell: (row) => (
        <Badge className={priorityStyles[row.priority]}>{row.priority}</Badge>
      ),
    },
    {
      id: "created",
      header: "Created",
      cell: (row) => row.createdAt ? <ClientDate date={row.createdAt} format="relative" /> : "—",
    },
    {
      id: "due",
      header: "Due",
      cell: (row) => {
        if (!row.dueAt) return <span className="text-muted-foreground">Not scheduled</span>;
        const dueDate = new Date(row.dueAt);
        const overdue = dueDate.getTime() < Date.now();
        return (
          <span className={overdue ? "text-destructive font-medium" : ""}>
            {overdue && <AlertCircle className="inline w-3 h-3 me-1" />}
            {formatDistanceToNowStrict(dueDate, { addSuffix: true })}
          </span>
        );
      },
    },
  ];

  // Empty state
  const emptyState = (
    <EmptyState
      icon={FileText}
      title="No work orders found"
      description="Adjust filters or create a new work order to get started."
      action={
        activeFilters.length > 0 ? (
          <Button variant="outline" onClick={() => resetState()}>
            Clear all filters
          </Button>
        ) : (
          <Button onClick={() => toast.info("Create work order flow")}>
            <Plus className="w-4 h-4 me-2" />
            Create Work Order
          </Button>
        )
      }
    />
  );

  // Apply draft filters
  const handleApplyFilters = () => {
    updateState({ filters: draftFilters, page: 1 });
    setFilterDrawerOpen(false);
  };

  // Reset draft filters
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
    const normalizedFilters = pickSchemaFilters<WorkOrderFilters>(
      presetFilters,
      WORK_ORDER_FILTER_SCHEMA
    );
    setDraftFilters(normalizedFilters);
    updateState({
      filters: normalizedFilters,
      q: typeof search === "string" ? search : "",
      page: 1,
    });
  };

  // Auto-apply default preset when none is set in state (handled by FilterPresetsDropdown)
  useEffect(() => {
    // no-op: handled by dropdown through onLoadPreset + autoloadDefault
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* PageHeader (P0) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {heading || t("workOrders.list.heading", "Work Orders")}
            {totalCount > 0 && <span className="ms-2 text-muted-foreground">({totalCount})</span>}
          </h1>
          <p className="text-muted-foreground mt-1">
            {description || t("workOrders.list.description", "Manage and track work orders across all properties")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isValidating}>
            <RefreshCcw className={`w-4 h-4 me-2 ${isValidating ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 me-2" />
            New Work Order
          </Button>
        </div>
      </div>

      {error && (
        <div
          className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive"
          role="alert"
        >
          <div>
            <p className="font-semibold">
              {t("workOrders.list.errorTitle", "Unable to load work orders")}
            </p>
            <p className="text-sm text-destructive/80">
              {error instanceof Error
                ? error.message
                : t("workOrders.list.errorUnknown", "Unexpected error")}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => mutate()}
            disabled={isValidating}
          >
            {t("common.retry", "Retry")}
          </Button>
        </div>
      )}

      {/* Toolbar (P0) */}
      <TableToolbar
        start={
          <>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search work orders..."
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
              entityType="workOrders"
              currentFilters={pickSchemaFilters<WorkOrderFilters>(
                currentFilters,
                WORK_ORDER_FILTER_SCHEMA
              )}
              currentSearch={state.q}
              normalizeFilters={(filters) =>
                pickSchemaFilters<WorkOrderFilters>(
                  filters,
                  WORK_ORDER_FILTER_SCHEMA
                )
              }
              onLoadPreset={handleLoadPreset}
            />
            <ExportCenterDrawer
              entityType="workOrders"
              currentFilters={pickSchemaFilters<WorkOrderFilters>(
                currentFilters,
                WORK_ORDER_FILTER_SCHEMA
              )}
              currentSearch={state.q}
              selectedIds={[]}
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

      {/* Active Filters Chips (P0) */}
      {activeFilters.length > 0 && (
        <ActiveFiltersChips filters={activeFilters} onClearAll={() => resetState()} />
      )}

      {/* Mobile CardList (P0) */}
      <div className="lg:hidden">
        <CardList
          data={workOrders}
          primaryAccessor={(wo) => wo.title || wo.code || wo.workOrderNumber || `WO-${wo.id.slice(-6)}`}
          secondaryAccessor={(wo) => (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge className={statusStyles[wo.status]}>{wo.status}</Badge>
              <Badge className={priorityStyles[wo.priority]}>{wo.priority}</Badge>
            </div>
          )}
          metadataAccessor={(wo) => 
            `Created ${wo.createdAt ? formatDistanceToNowStrict(new Date(wo.createdAt), { addSuffix: true }) : "—"}`
          }
          onRowClick={(wo) => toast.info(`Open work order ${wo.id}`)}
          loading={isLoading}
          emptyMessage="No work orders found"
        />
      </div>

      {/* Desktop Table (P0) */}
      <div className="hidden lg:block">
        <DataTableStandard
          columns={columns}
          data={workOrders}
          loading={isLoading}
          emptyState={emptyState}
          density={density}
          onRowClick={(row) => toast.info(`Open work order ${row.id}`)}
        />
      </div>

      {/* Pagination (P0) */}
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

      {/* Filter Drawer (P0 - Draft/Apply model) */}
      <TableFilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        title="Filter Work Orders"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        }
      >
        <div className="space-y-6">
          <FacetMultiSelect
            label="Status"
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            selected={Array.isArray(draftFilters.status) ? draftFilters.status : draftFilters.status ? [String(draftFilters.status)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, status: values[0] })}
          />
          
          <FacetMultiSelect
            label="Priority"
            options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
            selected={Array.isArray(draftFilters.priority) ? draftFilters.priority : draftFilters.priority ? [String(draftFilters.priority)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, priority: values[0] })}
          />
          
          <DateRangePicker
            label="Due Date"
            value={{ from: draftFilters.dueDateFrom as string, to: draftFilters.dueDateTo as string }}
            onChange={(range) => setDraftFilters({ ...draftFilters, dueDateFrom: range.from, dueDateTo: range.to })}
          />
        </div>
      </TableFilterDrawer>
    </div>
  );
}
