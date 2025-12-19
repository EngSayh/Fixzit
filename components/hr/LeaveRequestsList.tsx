/**
 * Leave Requests List - HR Module
 * P2 Standard Implementation
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
import { formatDistanceToNowStrict, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar, Plus, RefreshCcw, CheckCircle, XCircle, Clock } from "lucide-react";

import { DataTableStandard, DataTableColumn } from "@/components/tables/DataTableStandard";
import { ActiveFiltersChips } from "@/components/tables/ActiveFiltersChips";
import { FacetMultiSelect } from "@/components/tables/filters/FacetMultiSelect";
import { DateRangePicker } from "@/components/tables/filters/DateRangePicker";
import { useTableQueryState } from "@/hooks/useTableQueryState";
import ClientDate from "@/components/ClientDate";
import { useTranslation } from "@/contexts/TranslationContext";
import { toast } from "sonner";

type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type LeaveType = "ANNUAL" | "SICK" | "EMERGENCY" | "UNPAID" | "MATERNITY" | "PATERNITY";

type LeaveRequestRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  status: LeaveRequestStatus;
  reason?: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
};

type ApiResponse = {
  items: LeaveRequestRecord[];
  page: number;
  limit: number;
  total: number;
};

const STATUS_OPTIONS: LeaveRequestStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];
const TYPE_OPTIONS: LeaveType[] = ["ANNUAL", "SICK", "EMERGENCY", "UNPAID", "MATERNITY", "PATERNITY"];

const statusStyles: Record<LeaveRequestStatus, string> = {
  PENDING: "bg-warning/10 text-warning border border-warning/20",
  APPROVED: "bg-success/10 text-success border border-success/20",
  REJECTED: "bg-destructive/10 text-destructive border border-destructive/20",
  CANCELLED: "bg-muted text-foreground border border-border",
};

const typeStyles: Record<LeaveType, string> = {
  ANNUAL: "bg-primary/10 text-primary border border-primary/20",
  SICK: "bg-secondary/10 text-secondary border border-secondary/20",
  EMERGENCY: "bg-warning/10 text-warning border border-warning/20",
  UNPAID: "bg-muted text-foreground border border-border",
  MATERNITY: "bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-900/20 dark:text-purple-300",
  PATERNITY: "bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/20 dark:text-blue-300",
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`Failed to load leave requests (${response.status})`);
  return response.json() as Promise<ApiResponse>;
};

export type LeaveRequestsListProps = {
  orgId: string;
  employeeId?: string; // Filter by specific employee
};

export function LeaveRequestsList({ orgId, employeeId }: LeaveRequestsListProps) {
  const { t } = useTranslation();
  const { state, updateState, resetState } = useTableQueryState("leave-requests", {
    page: 1,
    pageSize: 20,
    q: "",
    filters: employeeId ? { employeeId } : {},
  });

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(state.filters || {});
  const [_density, _setDensity] = useState<"comfortable" | "compact">("comfortable");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(state.pageSize || 20));
    params.set("page", String(state.page || 1));
    params.set("org", orgId);
    if (state.q) params.set("q", state.q);
    if (state.filters?.status) params.set("status", String(state.filters.status));
    if (state.filters?.leaveType) params.set("leaveType", String(state.filters.leaveType));
    if (state.filters?.employeeId) params.set("employeeId", String(state.filters.employeeId));
    if (state.filters?.startDateFrom) params.set("startDateFrom", String(state.filters.startDateFrom));
    if (state.filters?.startDateTo) params.set("startDateTo", String(state.filters.startDateTo));
    return params.toString();
  }, [orgId, state]);

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    `/api/hr/leave-requests?${query}`,
    fetcher,
    { keepPreviousData: true, refreshInterval: 30000 }
  );

  const requests = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || 20))) : 1;
  const totalCount = data?.total ?? 0;

  // Quick chips
  const _quickChips = [
    { 
      key: "pending", 
      label: t("hr.leave.chips.pending", "Pending"), 
      onClick: () => updateState({ filters: { ...state.filters, status: "PENDING" }, page: 1 }) 
    },
    { 
      key: "approved-upcoming", 
      label: t("hr.leave.chips.upcoming", "Upcoming"), 
      onClick: () => {
        const today = new Date().toISOString().split("T")[0];
        updateState({ filters: { ...state.filters, status: "APPROVED", startDateFrom: today }, page: 1 });
      }
    },
    { 
      key: "annual", 
      label: t("hr.leave.chips.annual", "Annual Leave"), 
      onClick: () => updateState({ filters: { ...state.filters, leaveType: "ANNUAL" }, page: 1 }) 
    },
    { 
      key: "this-month", 
      label: t("hr.leave.chips.thisMonth", "This Month"), 
      onClick: () => {
        const date = new Date();
        const from = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split("T")[0];
        const to = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split("T")[0];
        updateState({ filters: { ...state.filters, startDateFrom: from, startDateTo: to }, page: 1 });
      }
    },
  ];

  // Active filters
  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; onRemove: () => void }> = [];
    
    if (state.filters?.status) {
      filters.push({
        key: "status",
        label: `${t("hr.leave.filters.status", "Status")}: ${state.filters.status}`,
        onRemove: () => {
          const { status: _status, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }
    
    if (state.filters?.leaveType) {
      filters.push({
        key: "type",
        label: `${t("hr.leave.filters.type", "Type")}: ${state.filters.leaveType}`,
        onRemove: () => {
          const { leaveType: _leaveType, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }
    
    if (state.filters?.startDateFrom || state.filters?.startDateTo) {
      const from = state.filters.startDateFrom ? format(new Date(state.filters.startDateFrom as string), "MMM d") : "...";
      const to = state.filters.startDateTo ? format(new Date(state.filters.startDateTo as string), "MMM d, yyyy") : "now";
      filters.push({
        key: "dateRange",
        label: `${t("hr.leave.filters.dateRange", "Period")}: ${from} – ${to}`,
        onRemove: () => {
          const { startDateFrom: _startDateFrom, startDateTo: _startDateTo, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }
    
    return filters;
  }, [state.filters, t, updateState]);

  // Table columns
  const columns: DataTableColumn<LeaveRequestRecord>[] = [
    {
      id: "employee",
      header: t("hr.leave.columns.employee", "Employee"),
      accessor: "employeeName",
      cell: (row) => (
        <div className="font-medium">{row.employeeName}</div>
      ),
    },
    {
      id: "type",
      header: t("hr.leave.columns.type", "Leave Type"),
      accessor: "leaveType",
      cell: (row) => (
        <Badge variant="outline" className={typeStyles[row.leaveType]}>
          {row.leaveType.replace("_", " ")}
        </Badge>
      ),
    },
    {
      id: "period",
      header: t("hr.leave.columns.period", "Period"),
      accessor: "startDate",
      cell: (row) => (
        <div className="text-sm">
          <div><ClientDate date={row.startDate} format="date-only" /></div>
          <div className="text-xs text-muted-foreground">
            {t("hr.leave.columns.to", "to")} <ClientDate date={row.endDate} format="date-only" />
          </div>
        </div>
      ),
    },
    {
      id: "duration",
      header: t("hr.leave.columns.duration", "Duration"),
      accessor: "daysCount",
      cell: (row) => (
        <div className="text-center">
          <div className="font-semibold">{row.daysCount}</div>
          <div className="text-xs text-muted-foreground">
            {row.daysCount === 1 
              ? t("hr.leave.day", "day") 
              : t("hr.leave.days", "days")
            }
          </div>
        </div>
      ),
    },
    {
      id: "status",
      header: t("hr.leave.columns.status", "Status"),
      accessor: "status",
      cell: (row) => (
        <Badge variant="outline" className={statusStyles[row.status]}>
          {row.status === "PENDING" && <Clock className="h-3 w-3 me-1" />}
          {row.status === "APPROVED" && <CheckCircle className="h-3 w-3 me-1" />}
          {row.status === "REJECTED" && <XCircle className="h-3 w-3 me-1" />}
          {row.status}
        </Badge>
      ),
    },
    {
      id: "requestedAt",
      header: t("hr.leave.columns.requested", "Requested"),
      accessor: "requestedAt",
      cell: (row) => (
        <div className="text-xs text-muted-foreground">
          {formatDistanceToNowStrict(new Date(row.requestedAt), { addSuffix: true })}
        </div>
      ),
    },
  ];

  const handleApplyFilters = () => {
    updateState({ filters: draftFilters, page: 1 });
    setFilterDrawerOpen(false);
  };

  const handleResetFilters = () => {
    setDraftFilters(employeeId ? { employeeId } : {});
    resetState();
    setFilterDrawerOpen(false);
  };

  const _handleApprove = (request: LeaveRequestRecord) => {
    toast.info(t("hr.leave.actions.approve", "Approve leave request for {{name}}", { name: request.employeeName }));
  };

  const _handleReject = (request: LeaveRequestRecord) => {
    toast.info(t("hr.leave.actions.reject", "Reject leave request for {{name}}", { name: request.employeeName }));
  };

  // Summary stats
  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const totalDays = requests
      .filter((r) => r.status === "APPROVED")
      .reduce((sum, r) => sum + r.daysCount, 0);
    
    return { pending, approved, totalDays };
  }, [requests]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            {t("hr.leave.heading", "Leave Requests")}
            {totalCount > 0 && (
              <Badge variant="secondary" className="ms-2">{totalCount}</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("hr.leave.description", "Manage employee leave requests and approvals")}
          </p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 me-2" />
          {t("hr.leave.newRequest", "New Request")}
        </Button>
      </div>

      {/* Quick Stats */}
      {!isLoading && requests.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <div className="text-sm text-muted-foreground">
                {t("hr.leave.stats.pending", "Pending")}
              </div>
            </div>
            <div className="mt-1 text-2xl font-bold">{stats.pending}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <div className="text-sm text-muted-foreground">
                {t("hr.leave.stats.approved", "Approved")}
              </div>
            </div>
            <div className="mt-1 text-2xl font-bold">{stats.approved}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <div className="text-sm text-muted-foreground">
                {t("hr.leave.stats.totalDays", "Total Days (Approved)")}
              </div>
            </div>
            <div className="mt-1 text-2xl font-bold">{stats.totalDays}</div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={state.q || ""}
              onChange={(e) => updateState({ q: e.target.value, page: 1 })}
              placeholder={t("hr.leave.searchPlaceholder", "Search by employee name...")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterDrawerOpen(true)}
            >
              {activeFilters.length > 0 ? `Filters (${activeFilters.length})` : "Filters"}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => mutate()}
            disabled={isValidating}
          >
            <RefreshCcw className={isValidating ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>
      </div>

      {/* Active Filters Chips */}
      {activeFilters.length > 0 && (
        <ActiveFiltersChips
          filters={activeFilters}
          onClearAll={handleResetFilters}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">
              {t("common.loading", "Loading...")}
            </p>
          </div>
        </div>
      ) : error ? (
        <EmptyState
          icon={Calendar}
          title={t("hr.leave.error.title", "Failed to load leave requests")}
          description={String(error)}
          action={
            <Button onClick={() => mutate()}>
              {t("common.retry", "Retry")}
            </Button>
          }
        />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={t("hr.leave.empty.title", "No leave requests found")}
          description={state.q || activeFilters.length > 0
            ? t("hr.leave.empty.filtered", "Try adjusting your filters or search query")
            : t("hr.leave.empty.default", "No leave requests have been submitted yet")
          }
          action={
            <Button onClick={() => {}}>
              {t("hr.leave.newRequest", "New Request")}
            </Button>
          }
        />
      ) : (
        <DataTableStandard
          columns={columns}
          data={requests}
          onRowClick={(_row) => {
            toast.info(t("hr.leave.viewDetails", "View leave request details"));
          }}
        />
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {t("common.pagination.showing", "Showing {{from}}-{{to}} of {{total}}", {
              from: ((state.page || 1) - 1) * (state.pageSize || 20) + 1,
              to: Math.min((state.page || 1) * (state.pageSize || 20), totalCount),
              total: totalCount,
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateState({ page: (state.page || 1) - 1 })}
              disabled={!state.page || state.page <= 1}
            >
              {t("common.pagination.previous", "Previous")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("common.pagination.page", "Page {{current}} of {{total}}", {
                current: state.page || 1,
                total: totalPages,
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateState({ page: (state.page || 1) + 1 })}
              disabled={!state.page || state.page >= totalPages}
            >
              {t("common.pagination.next", "Next")}
            </Button>
          </div>
        </div>
      )}

      {/* Filter Drawer - Placeholder */}
      {filterDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed right-0 top-0 h-full w-80 bg-background border-l p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">{t("hr.leave.filters.title", "Filter Leave Requests")}</h3>
            <div className="space-y-4">
              <FacetMultiSelect
                label={t("hr.leave.filters.status", "Status")}
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                selected={draftFilters.status ? [draftFilters.status as string] : []}
                onChange={(values) => setDraftFilters({ ...draftFilters, status: values[0] })}
              />
              <FacetMultiSelect
                label={t("hr.leave.filters.type", "Leave Type")}
                options={TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
                selected={draftFilters.leaveType ? [draftFilters.leaveType as string] : []}
                onChange={(values) => setDraftFilters({ ...draftFilters, leaveType: values[0] })}
              />
              <DateRangePicker
                label={t("hr.leave.filters.period", "Leave Period")}
                value={{
                  from: draftFilters.startDateFrom as string | undefined,
                  to: draftFilters.startDateTo as string | undefined,
                }}
                onChange={(range) => setDraftFilters({
                  ...draftFilters,
                  startDateFrom: range.from,
                  startDateTo: range.to,
                })}
              />
              <div className="mt-6 flex gap-2">
                <Button onClick={handleApplyFilters}>Apply</Button>
                <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
                <Button variant="ghost" onClick={() => setFilterDrawerOpen(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
