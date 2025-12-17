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

import React, { useState, useMemo } from "react";
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
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TableFilterDrawer } from "@/components/tables/TableFilterDrawer";
import { ActiveFiltersChips } from "@/components/tables/ActiveFiltersChips";
import { TableDensityToggle } from "@/components/tables/TableDensityToggle";
import { FacetMultiSelect } from "@/components/tables/filters/FacetMultiSelect";
import { DateRangePicker } from "@/components/tables/filters/DateRangePicker";
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
  SUBMITTED: "bg-warning/10 text-warning border border-warning/20",
  DISPATCHED: "bg-primary/10 text-primary border border-primary/20",
  IN_PROGRESS: "bg-primary/10 text-primary border border-primary/20",
  ON_HOLD: "bg-muted text-foreground border border-border",
  COMPLETED: "bg-success/10 text-success border border-success/20",
  VERIFIED: "bg-success/10 text-success border border-success/20",
  CLOSED: "bg-success/10 text-success border border-success/20",
  CANCELLED: "bg-destructive/10 text-destructive border border-destructive/20",
};

const priorityStyles: Record<string, string> = {
  LOW: "bg-muted text-foreground border border-border",
  MEDIUM: "bg-secondary/10 text-secondary border border-secondary/20",
  HIGH: "bg-warning/10 text-warning border border-warning/20",
  CRITICAL: "bg-destructive/10 text-destructive border border-destructive/20",
};

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
    const params = new URLSearchParams();
    params.set("limit", String(state.pageSize || 20));
    params.set("page", String(state.page || 1));
    params.set("org", orgId);
    if (state.q) params.set("q", state.q);
    if (state.filters?.status) params.set("status", String(state.filters.status));
    if (state.filters?.priority) params.set("priority", String(state.filters.priority));
    if (state.filters?.overdue) params.set("overdue", "true");
    if (state.filters?.assignedToMe) params.set("assignedToMe", "true");
    if (state.filters?.unassigned) params.set("unassigned", "true");
    if (state.filters?.slaRisk) params.set("slaRisk", "true");
    if (state.filters?.dueDateFrom) params.set("dueDateFrom", String(state.filters.dueDateFrom));
    if (state.filters?.dueDateTo) params.set("dueDateTo", String(state.filters.dueDateTo));
    return params.toString();
  }, [orgId, state]);

  const { data, error: _error, isLoading, mutate, isValidating } = useSWR(
    `/api/work-orders?${query}`,
    fetcher,
    { keepPreviousData: true }
  );

  const workOrders = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || 20))) : 1;
  const totalCount = data?.total ?? 0;

  // Quick filter chips (P0 requirement)
  const quickChips = [
    { key: "open", label: "Open", onClick: () => updateState({ filters: { status: "SUBMITTED" }, page: 1 }) },
    { key: "overdue", label: "Overdue", onClick: () => updateState({ filters: { overdue: true }, page: 1 }) },
    { key: "mine", label: "Mine", onClick: () => updateState({ filters: { assignedToMe: true }, page: 1 }) },
    { key: "unassigned", label: "Unassigned", onClick: () => updateState({ filters: { unassigned: true }, page: 1 }) },
    { key: "high", label: "High Priority", onClick: () => updateState({ filters: { priority: "HIGH" }, page: 1 }) },
    { key: "sla-risk", label: "SLA Risk", onClick: () => updateState({ filters: { slaRisk: true }, page: 1 }) },
  ];

  // Active filters chips
  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; onRemove: () => void }> = [];
    
    if (state.filters?.status) {
      filters.push({
        key: "status",
        label: `Status: ${state.filters.status}`,
        onRemove: () => {
          const { status: _status, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }
    
    if (state.filters?.priority) {
      filters.push({
        key: "priority",
        label: `Priority: ${state.filters.priority}`,
        onRemove: () => {
          const { priority: _priority, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }

    if (state.filters?.overdue) {
      filters.push({
        key: "overdue",
        label: "Overdue",
        onRemove: () => {
          const { overdue: _overdue, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }

    if (state.filters?.assignedToMe) {
      filters.push({
        key: "assignedToMe",
        label: "Assigned to me",
        onRemove: () => {
          const { assignedToMe: _assignedToMe, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }

    if (state.filters?.unassigned) {
      filters.push({
        key: "unassigned",
        label: "Unassigned",
        onRemove: () => {
          const { unassigned: _unassigned, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }

    if (state.filters?.slaRisk) {
      filters.push({
        key: "slaRisk",
        label: "SLA Risk",
        onRemove: () => {
          const { slaRisk: _slaRisk, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }

    if (state.filters?.dueDateFrom || state.filters?.dueDateTo) {
      filters.push({
        key: "dueRange",
        label: `Due: ${state.filters?.dueDateFrom || "any"} → ${state.filters?.dueDateTo || "any"}`,
        onRemove: () => {
          const { dueDateFrom: _dueDateFrom, dueDateTo: _dueDateTo, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }
    
    return filters;
  }, [state.filters, updateState]);

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

      {/* Active Filters Chips (P0) */}
      {activeFilters.length > 0 && (
        <ActiveFiltersChips filters={activeFilters} onClearAll={() => resetState()} />
      )}

      {/* Table (P0) */}
      <DataTableStandard
        columns={columns}
        data={workOrders}
        loading={isLoading}
        emptyState={emptyState}
        density={density}
        onRowClick={(row) => toast.info(`Open work order ${row.id}`)}
      />

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
