'use client&apos;;

import { useEffect, useMemo, useState } from &apos;react&apos;;
import useSWR from 'swr&apos;;
import { formatDistanceToNowStrict } from &apos;date-fns&apos;;
import { Card, CardContent, CardHeader, CardTitle } from &apos;@/src/components/ui/card&apos;;
import { Badge } from &apos;@/src/components/ui/badge&apos;;
import { Button } from &apos;@/src/components/ui/button&apos;;
import { Input } from &apos;@/src/components/ui/input&apos;;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &apos;@/src/components/ui/select&apos;;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from &apos;@/src/components/ui/dialog&apos;;
import { Textarea } from &apos;@/src/components/ui/textarea&apos;;
import { Loader2, Plus, RefreshCcw, Search } from &apos;lucide-react&apos;;
import { WorkOrderPriority } from &apos;@/src/lib/sla&apos;;

const fallbackUser = JSON.stringify({ id: &apos;demo-admin&apos;, role: &apos;SUPER_ADMIN&apos;, tenantId: &apos;demo-tenant&apos; });

function buildHeaders(extra: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    &apos;x-tenant-id&apos;: &apos;demo-tenant&apos;,
    ...extra,
  };
  if (typeof window !== &apos;undefined&apos;) {
    const token = localStorage.getItem(&apos;fixzit_token&apos;);
    if (token) headers[&apos;Authorization&apos;] = `Bearer ${token}`;
    const sessionUser = localStorage.getItem(&apos;x-user&apos;);
    headers[&apos;x-user&apos;] = sessionUser || fallbackUser;
  } else {
    headers[&apos;x-user&apos;] = fallbackUser;
  }
  return headers;
}

const statusStyles: Record<string, string> = {
  SUBMITTED: &apos;bg-amber-100 text-amber-800 border border-amber-200&apos;,
  DISPATCHED: &apos;bg-sky-100 text-sky-800 border border-sky-200&apos;,
  IN_PROGRESS: &apos;bg-blue-100 text-blue-800 border border-blue-200&apos;,
  ON_HOLD: &apos;bg-gray-100 text-gray-700 border border-gray-200&apos;,
  COMPLETED: &apos;bg-emerald-100 text-emerald-800 border border-emerald-200&apos;,
  VERIFIED: &apos;bg-teal-100 text-teal-800 border border-teal-200&apos;,
  CLOSED: &apos;bg-green-100 text-green-800 border border-green-200&apos;,
  CANCELLED: &apos;bg-rose-100 text-rose-800 border border-rose-200&apos;,
};

const priorityStyles: Record<string, string> = {
  LOW: &apos;bg-slate-100 text-slate-700 border border-slate-200&apos;,
  MEDIUM: &apos;bg-indigo-100 text-indigo-800 border border-indigo-200&apos;,
  HIGH: &apos;bg-orange-100 text-orange-800 border border-orange-200&apos;,
  CRITICAL: &apos;bg-red-100 text-red-800 border border-red-200&apos;,
};

const statusLabels: Record<string, string> = {
  SUBMITTED: &apos;Submitted&apos;,
  DISPATCHED: &apos;Dispatched&apos;,
  IN_PROGRESS: &apos;In Progress&apos;,
  ON_HOLD: &apos;On Hold&apos;,
  COMPLETED: &apos;Completed&apos;,
  VERIFIED: &apos;Verified&apos;,
  CLOSED: &apos;Closed&apos;,
  CANCELLED: &apos;Cancelled&apos;,
};

const PRIORITY_OPTIONS: WorkOrderPriority[] = [&apos;LOW&apos;, &apos;MEDIUM&apos;, &apos;HIGH&apos;, &apos;CRITICAL&apos;];
const STATUS_OPTIONS = Object.keys(statusLabels);
const PAGE_SIZE = 10;

function isWorkOrderPriority(value: string): value is WorkOrderPriority {
  return (PRIORITY_OPTIONS as string[]).includes(value);
}

type WorkOrderRecord = {
  _id: string;
  code: string;
  title: string;
  description?: string;
  status: keyof typeof statusLabels;
  priority: WorkOrderPriority;
  createdAt?: string;
  dueAt?: string;
  slaMinutes?: number;
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

const fetcher = async (url: string) => {
  const response = await fetch(url, { headers: buildHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to load work orders (${response.status})`);
  }
  return response.json() as Promise<ApiResponse>;
};

function getDueMeta(dueAt?: string) {
  if (!dueAt) return { label: &apos;Not scheduled&apos;, overdue: false };
  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) return { label: &apos;Not scheduled&apos;, overdue: false };
  return {
    label: formatDistanceToNowStrict(dueDate, { addSuffix: true }),
    overdue: dueDate.getTime() < Date.now(),
  };
}

export type WorkOrdersViewProps = {
  heading?: string;
  description?: string;
};

export function WorkOrdersView({ heading = &apos;Work Orders&apos;, description = &apos;Manage and track work orders across all properties&apos; }: WorkOrdersViewProps) {
  const [clientReady, setClientReady] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(&apos;');
  const [priorityFilter, setPriorityFilter] = useState(&apos;');
  const [searchInput, setSearchInput] = useState(&apos;');
  const [search, setSearch] = useState(&apos;');

  useEffect(() => setClientReady(true), []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set(&apos;limit&apos;, String(PAGE_SIZE));
    params.set(&apos;page&apos;, String(page));
    if (statusFilter) params.set('status&apos;, statusFilter);
    if (priorityFilter) params.set(&apos;priority&apos;, priorityFilter);
    if (search) params.set(&apos;q', search);
    return params.toString();
  }, [page, priorityFilter, statusFilter, search]);

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    clientReady ? `/api/work-orders?${query}` : null,
    fetcher,
    { keepPreviousData: true }
  );

  const workOrders = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || PAGE_SIZE))) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{heading}</h1>
          <p className="text-gray-600">{description}</p>
        </div>
        <WorkOrderCreateDialog onCreated={() => mutate()} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by title or description"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="lg:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={priorityFilter}
              onValueChange={(value) => {
                setPriorityFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="lg:w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Priorities</SelectItem>
                {PRIORITY_OPTIONS.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority.charAt(0) + priority.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="lg:ml-auto"
              onClick={() => mutate()}
              disabled={isValidating}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${isValidating ? &apos;animate-spin&apos; : &apos;'}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6">
            <p className="text-sm text-red-700">{error.message}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading && !data ? (
          <Card className="border border-dashed">
            <CardContent className="flex items-center gap-3 py-16 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading work orders…
            </CardContent>
          </Card>
        ) : null}

        {workOrders.map((workOrder) => {
          const dueMeta = getDueMeta(workOrder.dueAt);
          return (
            <Card key={workOrder._id} className="border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg font-semibold text-gray-900">{workOrder.title}</CardTitle>
                    <Badge className={priorityStyles[workOrder.priority] || priorityStyles.MEDIUM}>
                      Priority: {workOrder.priority}
                    </Badge>
                    <Badge className={statusStyles[workOrder.status] || &apos;bg-gray-100 text-gray-700 border border-gray-200&apos;}>
                      {statusLabels[workOrder.status] ?? workOrder.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">Code: {workOrder.code}</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>SLA window: {workOrder.slaMinutes ? `${Math.round(workOrder.slaMinutes / 60)}h` : &apos;N/A&apos;}</p>
                  <p className={dueMeta.overdue ? &apos;text-red-600 font-semibold&apos; : &apos;'}>Due {dueMeta.label}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {workOrder.description && (
                  <p className="text-sm text-gray-700">{workOrder.description}</p>
                )}
                <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 md:grid-cols-2">
                  <div>
                    <span className="font-medium text-gray-700">Property:</span>{&apos; '}
                    {workOrder.propertyId || &apos;Not linked&apos;}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Assigned to:</span>{&apos; '}
                    {workOrder.assigneeUserId || workOrder.assigneeVendorId || &apos;Unassigned&apos;}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Category:</span>{&apos; '}
                    {workOrder.category || &apos;General&apos;}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>{&apos; '}
                    {workOrder.createdAt ? new Date(workOrder.createdAt).toLocaleString() : &apos;Unknown&apos;}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && workOrders.length === 0 && !error && (
        <Card className="border border-gray-200">
          <CardContent className="py-12 text-center text-gray-600">
            <p className="font-medium text-gray-900">No work orders match the current filters.</p>
            <p className="text-sm">Adjust filters or create a new work order to get started.</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col items-center gap-3 border-t pt-4 sm:flex-row sm:justify-between">
        <span className="text-sm text-gray-600">
          Showing {(data ? data.items.length : 0)} of {data?.total ?? 0} work orders
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

type WorkOrderFormState = {
  title: string;
  description: string;
  priority: WorkOrderPriority;
  category: string;
  propertyId: string;
};

function WorkOrderCreateDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<WorkOrderFormState>({
    title: &apos;',
    description: &apos;',
    priority: &apos;MEDIUM&apos;,
    category: &apos;GENERAL&apos;,
    propertyId: &apos;',
  });

  const reset = () => {
    setForm({ title: &apos;', description: &apos;', priority: &apos;MEDIUM&apos;, category: &apos;GENERAL&apos;, propertyId: &apos;' });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        priority: form.priority,
        category: form.category,
      };
      if (form.propertyId) payload.propertyId = form.propertyId;

      const response = await fetch(&apos;/api/work-orders&apos;, {
        method: &apos;POST&apos;,
        headers: buildHeaders({ &apos;Content-Type&apos;: &apos;application/json&apos; }),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || &apos;Failed to create work order&apos;);
      }

      onCreated();
      reset();
      setOpen(false);
    } catch (error: any) {
      console.error(&apos;Failed to create work order&apos;, error);
      const message = error?.message ?? &apos;Unknown error&apos;;
      if (typeof window !== &apos;undefined&apos;) {
        window.alert(`Unable to create work order: ${message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!submitting) setOpen(nextOpen); }}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="mr-2 h-4 w-4" />
          New Work Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create work order</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
            <Input
              required
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
              <Select
                value={form.priority}
                onValueChange={(value) => {
                  if (isWorkOrderPriority(value)) {
                    setForm(prev => ({ ...prev, priority: value }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0) + priority.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <Input
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Property ID</label>
            <Input
              placeholder="Optional — link to a property"
              value={form.propertyId}
              onChange={(event) => setForm((prev) => ({ ...prev, propertyId: event.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { reset(); setOpen(false); }} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default WorkOrdersView;
