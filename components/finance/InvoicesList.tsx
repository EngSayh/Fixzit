/**
 * Invoices List - Finance Module
 * P0 Standard Implementation
 * 
 * ✅ PageHeader + count + CTA
 * ✅ TableToolbar + search + quick chips
 * ✅ ActiveFiltersChips
 * ✅ DataTableStandard
 * ✅ URL sync
 * ✅ Filter drawer (draft/apply)
 * ✅ Totals row (sum of filtered invoices)
 */
"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { formatDistanceToNowStrict, format, isPast } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "@/components/ui/chip";
import { Receipt, Plus, RefreshCcw, Search, Filter, AlertCircle } from "lucide-react";

import { DataTableStandard, DataTableColumn } from "@/components/tables/DataTableStandard";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TableFilterDrawer } from "@/components/tables/TableFilterDrawer";
import { ActiveFiltersChips } from "@/components/tables/ActiveFiltersChips";
import { TableDensityToggle } from "@/components/tables/TableDensityToggle";
import { FacetMultiSelect } from "@/components/tables/filters/FacetMultiSelect";
import { NumericRangeFilter } from "@/components/tables/filters/NumericRangeFilter";
import { DateRangePicker } from "@/components/tables/filters/DateRangePicker";
import { useTableQueryState } from "@/hooks/useTableQueryState";
import { toast } from "sonner";

type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  currency: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  issueDate: string;
  dueDate: string;
  paidDate?: string;
};

type ApiResponse = {
  items: InvoiceRecord[];
  page: number;
  limit: number;
  total: number;
  totalAmount?: number;
};

const STATUS_OPTIONS = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"];

const statusStyles: Record<string, string> = {
  DRAFT: "bg-muted text-foreground border border-border",
  SENT: "bg-info/10 text-info border border-info/20",
  PAID: "bg-success/10 text-success border border-success/20",
  OVERDUE: "bg-destructive/10 text-destructive border border-destructive/20",
  CANCELLED: "bg-muted text-muted-foreground border border-border",
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`Failed to load invoices (${response.status})`);
  return response.json() as Promise<ApiResponse>;
};

export type InvoicesListProps = {
  orgId: string;
};

export function InvoicesList({ orgId }: InvoicesListProps) {
  const { state, updateState, resetState } = useTableQueryState("invoices", {
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
    if (state.filters?.status) params.set("status", String(state.filters.status));
    if (state.filters?.amountMin) params.set("amountMin", String(state.filters.amountMin));
    if (state.filters?.amountMax) params.set("amountMax", String(state.filters.amountMax));
    if (state.filters?.dateRange) params.set("dateRange", String(state.filters.dateRange));
    if (state.filters?.issueFrom) params.set("issueFrom", String(state.filters.issueFrom));
    if (state.filters?.issueTo) params.set("issueTo", String(state.filters.issueTo));
    if (state.filters?.dueFrom) params.set("dueFrom", String(state.filters.dueFrom));
    if (state.filters?.dueTo) params.set("dueTo", String(state.filters.dueTo));
    return params.toString();
  }, [orgId, state]);

  const { data, error: _error, isLoading, mutate, isValidating } = useSWR(
    `/api/finance/invoices?${query}`,
    fetcher,
    { keepPreviousData: true }
  );

  const invoices = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || 20))) : 1;
  const totalCount = data?.total ?? 0;
  const totalAmount = data?.totalAmount ?? 0;

  // Quick chips (P0)
  const quickChips = [
    { key: "unpaid", label: "Unpaid", onClick: () => updateState({ filters: { status: "SENT" }, page: 1 }) },
    { key: "overdue", label: "Overdue", onClick: () => updateState({ filters: { status: "OVERDUE" }, page: 1 }) },
    { key: "paid", label: "Paid", onClick: () => updateState({ filters: { status: "PAID" }, page: 1 }) },
    { key: "this-month", label: "This Month", onClick: () => updateState({ filters: { dateRange: "month" }, page: 1 }) },
  ];

  // Active filters
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
    
    if (state.filters?.amountMin || state.filters?.amountMax) {
      filters.push({
        key: "amount",
        label: `Amount: ${state.filters.amountMin || 0}-${state.filters.amountMax || "∞"}`,
        onRemove: () => {
          const { amountMin: _amountMin, amountMax: _amountMax, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }

    if (state.filters?.dateRange) {
      filters.push({
        key: "dateRange",
        label: `Date range: ${state.filters.dateRange}`,
        onRemove: () => {
          const { dateRange: _dateRange, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }

    if (state.filters?.issueFrom || state.filters?.issueTo) {
      filters.push({
        key: "issueRange",
        label: `Issue: ${state.filters?.issueFrom || "any"} → ${state.filters?.issueTo || "any"}`,
        onRemove: () => {
          const { issueFrom: _issueFrom, issueTo: _issueTo, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }

    if (state.filters?.dueFrom || state.filters?.dueTo) {
      filters.push({
        key: "dueRange",
        label: `Due: ${state.filters?.dueFrom || "any"} → ${state.filters?.dueTo || "any"}`,
        onRemove: () => {
          const { dueFrom: _dueFrom, dueTo: _dueTo, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }
    
    return filters;
  }, [state.filters, updateState]);

  // Table columns
  const columns: DataTableColumn<InvoiceRecord>[] = [
    {
      id: "invoice",
      header: "Invoice",
      cell: (row) => (
        <div>
          <div className="font-medium font-mono">{row.invoiceNumber}</div>
          <div className="text-sm text-muted-foreground">{row.customerName}</div>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      cell: (row) => (
        <div className="font-semibold">
          {row.currency} {row.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.status === "OVERDUE" && <AlertCircle className="w-3 h-3 text-destructive" />}
          <Badge className={statusStyles[row.status]}>{row.status}</Badge>
        </div>
      ),
    },
    {
      id: "issue",
      header: "Issue Date",
      cell: (row) => format(new Date(row.issueDate), "MMM d, yyyy"),
    },
    {
      id: "due",
      header: "Due Date",
      cell: (row) => {
        const due = new Date(row.dueDate);
        const isOverdue = isPast(due) && row.status !== "PAID" && row.status !== "CANCELLED";
        return (
          <div className={isOverdue ? "text-destructive font-medium" : ""}>
            <div>{format(due, "MMM d, yyyy")}</div>
            {isOverdue && (
              <div className="text-xs">
                {formatDistanceToNowStrict(due, { addSuffix: true })}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "paid",
      header: "Paid Date",
      cell: (row) => {
        if (!row.paidDate) return <span className="text-muted-foreground">—</span>;
        return format(new Date(row.paidDate), "MMM d, yyyy");
      },
    },
  ];

  const emptyState = (
    <EmptyState
      icon={Receipt}
      title="No invoices found"
      description="Adjust filters or create a new invoice to get started."
      action={
        activeFilters.length > 0 ? (
          <Button variant="outline" onClick={() => resetState()}>
            Clear all filters
          </Button>
        ) : (
          <Button onClick={() => toast.info("Create invoice flow")}>
            <Plus className="w-4 h-4 me-2" />
            Create Invoice
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
            Invoices
            {totalCount > 0 && <span className="ms-2 text-muted-foreground">({totalCount})</span>}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage customer invoices, payments, and receivables
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isValidating}>
            <RefreshCcw className={`w-4 h-4 me-2 ${isValidating ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 me-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Totals Card */}
      {totalAmount > 0 && (
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total (Filtered)</div>
              <div className="text-2xl font-bold">
                SAR {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <Badge variant="outline">{totalCount} invoice{totalCount !== 1 ? "s" : ""}</Badge>
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
                placeholder="Search invoices by number or customer..."
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

      {/* Table */}
      <DataTableStandard
        columns={columns}
        data={invoices}
        loading={isLoading}
        emptyState={emptyState}
        density={density}
        onRowClick={(row) => toast.info(`Open invoice ${row.id}`)}
      />

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
        title="Filter Invoices"
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
          
          <NumericRangeFilter
            label="Amount"
            value={{ min: draftFilters.amountMin as number, max: draftFilters.amountMax as number }}
            onChange={(range) => setDraftFilters({ ...draftFilters, amountMin: range.min, amountMax: range.max })}
            prefix="SAR"
          />
          
          <DateRangePicker
            label="Issue Date Range"
            value={{ from: draftFilters.issueFrom as string, to: draftFilters.issueTo as string }}
            onChange={(range) => setDraftFilters({ ...draftFilters, issueFrom: range.from, issueTo: range.to })}
          />
          
          <DateRangePicker
            label="Due Date Range"
            value={{ from: draftFilters.dueFrom as string, to: draftFilters.dueTo as string }}
            onChange={(range) => setDraftFilters({ ...draftFilters, dueFrom: range.from, dueTo: range.to })}
          />
        </div>
      </TableFilterDrawer>
    </div>
  );
}
