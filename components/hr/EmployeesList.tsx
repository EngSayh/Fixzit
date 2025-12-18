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
  ACTIVE: "bg-[#00A859]/10 text-[#00A859] border border-[#00A859]/20",
  ON_LEAVE: "bg-[#FFB400]/10 text-[#FFB400] border border-[#FFB400]/30",
  INACTIVE: "bg-muted text-foreground border border-border",
  TERMINATED: "bg-destructive/10 text-destructive border border-destructive/20",
};

type EmployeeFilters = {
  status?: string;
  department?: string;
  employmentType?: string;
  joiningDateDays?: number;
  reviewDueDays?: number;
  joiningFrom?: string;
  joiningTo?: string;
};

const EMPLOYEE_FILTER_SCHEMA: FilterSchema<EmployeeFilters>[] = [
  { key: "status", param: "status", label: (f) => `Status: ${f.status?.toString().replace(/_/g, " ")}` },
  { key: "department", param: "department", label: (f) => `Department: ${f.department}` },
  { key: "employmentType", param: "employmentType", label: (f) => `Type: ${f.employmentType?.toString().replace(/_/g, " ")}` },
  {
    key: "joiningDateDays",
    param: "joiningDateDays",
    label: (f) => `New hires (${f.joiningDateDays}d)`,
  },
  {
    key: "reviewDueDays",
    param: "reviewDueDays",
    label: (f) => `Reviews due (${f.reviewDueDays}d)`,
  },
  {
    key: "joiningFrom",
    param: "joiningFrom",
    isActive: (f) => Boolean(f.joiningFrom || f.joiningTo),
    toParam: (f) => f.joiningFrom,
    label: (f) => `Joining: ${f.joiningFrom || "any"} → ${f.joiningTo || "any"}`,
    clear: (f) => {
      const { joiningFrom: _from, joiningTo: _to, ...rest } = f;
      return rest;
    },
  },
  {
    key: "joiningTo",
    param: "joiningTo",
    isActive: (f) => Boolean(f.joiningFrom || f.joiningTo),
    toParam: (f) => f.joiningTo,
    label: (f) => `Joining: ${f.joiningFrom || "any"} → ${f.joiningTo || "any"}`,
    clear: (f) => {
      const { joiningFrom: _from, joiningTo: _to, ...rest } = f;
      return rest;
    },
  },
];

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`Failed to load employees (${response.status})`);
  return response.json() as Promise<ApiResponse>;
};

export type EmployeesListProps = {
  orgId: string;
};

export function buildEmployeesQuery(state: ReturnType<typeof useTableQueryState>["state"], orgId: string) {
  const params = new URLSearchParams();
  params.set("limit", String(state.pageSize || 20));
  params.set("page", String(state.page || 1));
  params.set("org", orgId);
  if (state.q) params.set("q", state.q);
  serializeFilters(state.filters as EmployeeFilters, EMPLOYEE_FILTER_SCHEMA, params);
  return params.toString();
}

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
    return buildEmployeesQuery(state, orgId);
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
  const activeFilters = useMemo(
    () =>
      buildActiveFilterChips(state.filters as EmployeeFilters, EMPLOYEE_FILTER_SCHEMA, (next) =>
        updateState({ filters: next })
      ),
    [state.filters, updateState]
  );

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

      {/* Mobile CardList */}
      <div className="lg:hidden">
        <CardList
          data={employees}
          primaryAccessor={(emp) => `${emp.firstName} ${emp.lastName}`}
          secondaryAccessor={(emp) => emp.email}
          statusAccessor={(emp) => {
            const statusStyles = {
              ACTIVE: "bg-success-subtle text-success border-success",
              INACTIVE: "bg-muted text-muted-foreground",
              ON_LEAVE: "bg-warning-subtle text-warning border-warning",
              TERMINATED: "bg-destructive-subtle text-destructive",
            };
            return <Badge className={statusStyles[emp.status]}>{emp.status}</Badge>;
          }}
          metadataAccessor={(emp) => 
            `${emp.department} • ${emp.position} • Joined ${formatDistanceToNowStrict(new Date(emp.joiningDate), { addSuffix: true })}`
          }
          onRowClick={(emp) => toast.info(`Open employee ${emp.id}`)}
          loading={isLoading}
          emptyMessage="No employees found"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <DataTableStandard
          columns={columns}
          data={employees}
          loading={isLoading}
          emptyState={emptyState}
          density={density}
          onRowClick={(row) => toast.info(`Open employee ${row.id}`)}
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
