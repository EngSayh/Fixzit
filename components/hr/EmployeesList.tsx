/**
 * Employees List - HR Module
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
import { formatDistanceToNowStrict, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "@/components/ui/chip";
import { Users, Plus, RefreshCcw, Search, Filter, UserCheck, UserX } from "lucide-react";

import { DataTableStandard, DataTableColumn } from "@/components/tables/DataTableStandard";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TableFilterDrawer } from "@/components/tables/TableFilterDrawer";
import { ActiveFiltersChips } from "@/components/tables/ActiveFiltersChips";
import { TableDensityToggle } from "@/components/tables/TableDensityToggle";
import { FacetMultiSelect } from "@/components/tables/filters/FacetMultiSelect";
import { DateRangePicker } from "@/components/tables/filters/DateRangePicker";
import { useTableQueryState } from "@/hooks/useTableQueryState";
import { toast } from "sonner";

type EmployeeRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  status: "ACTIVE" | "ON_LEAVE" | "INACTIVE" | "TERMINATED";
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
  joiningDate: string;
  managerId?: string;
  managerName?: string;
  nextReviewDate?: string;
};

type ApiResponse = {
  items: EmployeeRecord[];
  page: number;
  limit: number;
  total: number;
};

const STATUS_OPTIONS = ["ACTIVE", "ON_LEAVE", "INACTIVE", "TERMINATED"];
const EMPLOYMENT_TYPE_OPTIONS = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"];
const DEPARTMENT_OPTIONS = ["Engineering", "Operations", "Finance", "HR", "Sales", "Marketing", "Support"];

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success border border-success/20",
  ON_LEAVE: "bg-warning/10 text-warning border border-warning/20",
  INACTIVE: "bg-muted text-foreground border border-border",
  TERMINATED: "bg-destructive/10 text-destructive border border-destructive/20",
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`Failed to load employees (${response.status})`);
  return response.json() as Promise<ApiResponse>;
};

export type EmployeesListProps = {
  orgId: string;
};

export function EmployeesList({ orgId }: EmployeesListProps) {
  const { state, updateState, resetState } = useTableQueryState("employees", {
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
    if (state.filters?.department) params.set("department", String(state.filters.department));
    if (state.filters?.employmentType) params.set("employmentType", String(state.filters.employmentType));
    return params.toString();
  }, [orgId, state]);

  const { data, error: _error, isLoading, mutate, isValidating } = useSWR(
    `/api/hr/employees?${query}`,
    fetcher,
    { keepPreviousData: true }
  );

  const employees = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || 20))) : 1;
  const totalCount = data?.total ?? 0;

  // Quick chips (P0)
  const quickChips = [
    { key: "active", label: "Active", onClick: () => updateState({ filters: { status: "ACTIVE" }, page: 1 }) },
    { key: "leave", label: "On Leave", onClick: () => updateState({ filters: { status: "ON_LEAVE" }, page: 1 }) },
    { key: "new-hires", label: "New Hires", onClick: () => updateState({ filters: { joiningDateDays: 30 }, page: 1 }) },
    { key: "review-due", label: "Review Due", onClick: () => updateState({ filters: { reviewDueDays: 7 }, page: 1 }) },
  ];

  // Active filters
  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; onRemove: () => void }> = [];
    
    if (state.filters?.status) {
      filters.push({
        key: "status",
        label: `Status: ${state.filters.status.toString().replace(/_/g, " ")}`,
        onRemove: () => {
          const { status: _status, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }
    
    if (state.filters?.department) {
      filters.push({
        key: "department",
        label: `Department: ${state.filters.department}`,
        onRemove: () => {
          const { department: _department, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }
    
    if (state.filters?.employmentType) {
      filters.push({
        key: "employmentType",
        label: `Type: ${state.filters.employmentType.toString().replace(/_/g, " ")}`,
        onRemove: () => {
          const { employmentType: _employmentType, ...rest } = state.filters || {};
          updateState({ filters: rest });
        },
      });
    }
    
    return filters;
  }, [state.filters, updateState]);

  // Table columns
  const columns: DataTableColumn<EmployeeRecord>[] = [
    {
      id: "name",
      header: "Name",
      cell: (row) => (
        <div>
          <div className="font-medium">{`${row.firstName} ${row.lastName}`}</div>
          <div className="text-sm text-muted-foreground">{row.email}</div>
        </div>
      ),
    },
    {
      id: "position",
      header: "Position",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.position}</div>
          <div className="text-sm text-muted-foreground">{row.department}</div>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => {
        const Icon = row.status === "ACTIVE" ? UserCheck : UserX;
        return (
          <div className="flex items-center gap-2">
            <Icon className="w-3 h-3" />
            <Badge className={statusStyles[row.status]}>
              {row.status.replace(/_/g, " ")}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline">{row.employmentType.replace(/_/g, " ")}</Badge>
      ),
    },
    {
      id: "manager",
      header: "Manager",
      cell: (row) => row.managerName || <span className="text-muted-foreground">—</span>,
    },
    {
      id: "joining",
      header: "Joining Date",
      cell: (row) => {
        const joining = new Date(row.joiningDate);
        const daysAgo = Math.floor((Date.now() - joining.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <div>
            <div className="font-medium">{format(joining, "MMM d, yyyy")}</div>
            {daysAgo < 30 && (
              <div className="text-xs text-success">New hire ({daysAgo}d)</div>
            )}
          </div>
        );
      },
    },
    {
      id: "review",
      header: "Next Review",
      cell: (row) => {
        if (!row.nextReviewDate) return <span className="text-muted-foreground">—</span>;
        const review = new Date(row.nextReviewDate);
        const daysUntil = Math.floor((review.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return (
          <span className={daysUntil < 7 ? "text-warning" : ""}>
            {formatDistanceToNowStrict(review, { addSuffix: true })}
          </span>
        );
      },
    },
  ];

  const emptyState = (
    <EmptyState
      icon={Users}
      title="No employees found"
      description="Adjust filters or add a new employee to get started."
      action={
        activeFilters.length > 0 ? (
          <Button variant="outline" onClick={() => resetState()}>
            Clear all filters
          </Button>
        ) : (
          <Button onClick={() => toast.info("Add employee flow")}>
            <Plus className="w-4 h-4 me-2" />
            Add Employee
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
            Employees
            {totalCount > 0 && <span className="ms-2 text-muted-foreground">({totalCount})</span>}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage employee records, performance reviews, and attendance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isValidating}>
            <RefreshCcw className={`w-4 h-4 me-2 ${isValidating ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 me-2" />
            Add Employee
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
                placeholder="Search employees by name or email..."
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
        data={employees}
        loading={isLoading}
        emptyState={emptyState}
        onRowClick={(row) => toast.info(`Open employee ${row.id}`)}
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
        title="Filter Employees"
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
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
            selected={Array.isArray(draftFilters.status) ? draftFilters.status : draftFilters.status ? [String(draftFilters.status)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, status: values[0] })}
          />
          
          <FacetMultiSelect
            label="Department"
            options={DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
            selected={Array.isArray(draftFilters.department) ? draftFilters.department : draftFilters.department ? [String(draftFilters.department)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, department: values[0] })}
          />
          
          <FacetMultiSelect
            label="Employment Type"
            options={EMPLOYMENT_TYPE_OPTIONS.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))}
            selected={Array.isArray(draftFilters.employmentType) ? draftFilters.employmentType : draftFilters.employmentType ? [String(draftFilters.employmentType)] : []}
            onChange={(values) => setDraftFilters({ ...draftFilters, employmentType: values[0] })}
          />
          
          <DateRangePicker
            label="Joining Date Range"
            value={{ from: draftFilters.joiningFrom as string, to: draftFilters.joiningTo as string }}
            onChange={(range) => setDraftFilters({ ...draftFilters, joiningFrom: range.from, joiningTo: range.to })}
          />
        </div>
      </TableFilterDrawer>
    </div>
  );
}
