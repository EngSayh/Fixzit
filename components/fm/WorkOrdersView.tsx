'use client';
import { logger } from '@/lib/logger';

import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { formatDistanceToNowStrict } from 'date-fns';
import { STORAGE_KEYS } from '@/config/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, RefreshCcw, Search } from 'lucide-react';
import { WorkOrderPriority } from '@/lib/sla';

const fallbackUser = JSON.stringify({ id: 'demo-admin', role: 'SUPER_ADMIN', tenantId: 'demo-tenant' });

function buildHeaders(extra: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    'x-tenant-id': 'demo-tenant',
    ...extra,
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('fixzit_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const sessionUser = localStorage.getItem(STORAGE_KEYS.userSession);
    headers['x-user'] = sessionUser || fallbackUser;
  } else {
    headers['x-user'] = fallbackUser;
  }
  return headers;
}

const statusStyles: Record<string, string> = {
  SUBMITTED: 'bg-warning/10 text-warning border border-warning/20',
  DISPATCHED: 'bg-primary/10 text-primary border border-primary/20',
  IN_PROGRESS: 'bg-primary/10 text-primary border border-primary/20',
  ON_HOLD: 'bg-muted text-foreground border border-border',
  COMPLETED: 'bg-success/10 text-success border border-success/20',
  VERIFIED: 'bg-success/10 text-success border border-success/20',
  CLOSED: 'bg-success/10 text-success border border-success/20',
  CANCELLED: 'bg-destructive/10 text-destructive border border-destructive/20',
};

const priorityStyles: Record<string, string> = {
  LOW: 'bg-muted text-foreground border border-border',
  MEDIUM: 'bg-secondary/10 text-secondary border border-secondary/20',
  HIGH: 'bg-warning/10 text-warning border border-warning/20',
  CRITICAL: 'bg-destructive/10 text-destructive border border-destructive/20',
};

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted',
  DISPATCHED: 'Dispatched',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  VERIFIED: 'Verified',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

const PRIORITY_OPTIONS: WorkOrderPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_OPTIONS = Object.keys(statusLabels);
const PAGE_SIZE = 10;

function isWorkOrderPriority(value: string): value is WorkOrderPriority {
  return (PRIORITY_OPTIONS as string[]).includes(value);
}

type WorkOrderRecord = {
  id: string;
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
  if (!dueAt) return { label: 'Not scheduled', overdue: false };
  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) return { label: 'Not scheduled', overdue: false };
  return {
    label: formatDistanceToNowStrict(dueDate, { addSuffix: true }),
    overdue: dueDate.getTime() < Date.now(),
  };
}

export type WorkOrdersViewProps = {
  heading?: string;
  description?: string;
};

export function WorkOrdersView({ heading = 'Work Orders', description = 'Manage and track work orders across all properties' }: WorkOrdersViewProps) {
  const [clientReady, setClientReady] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

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
    params.set('limit', String(PAGE_SIZE));
    params.set('page', String(page));
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (search) params.set('q', search);
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
          <h1 className="text-3xl font-bold text-foreground">{heading}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <WorkOrderCreateDialog onCreated={() => mutate()} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title or description"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="ps-9"
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
              className="lg:ms-auto"
              onClick={() => mutate()}
              disabled={isValidating}
            >
              <RefreshCcw className={`me-2 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/20 bg-[var(--fixzit-danger-lightest)]">
          <CardContent className="py-6">
            <p className="text-sm text-[var(--fixzit-danger-dark)]">{error.message}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading && !data ? (
          <Card className="border border-dashed">
            <CardContent className="flex items-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading work orders…
            </CardContent>
          </Card>
        ) : null}

        {workOrders.map((workOrder) => {
          const dueMeta = getDueMeta(workOrder.dueAt);
          return (
            <Card key={workOrder.id} className="border border-border shadow-sm">
              <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg font-semibold text-foreground">{workOrder.title}</CardTitle>
                    <Badge className={priorityStyles[workOrder.priority] || priorityStyles.MEDIUM}>
                      Priority: {workOrder.priority}
                    </Badge>
                    <Badge className={statusStyles[workOrder.status] || 'bg-muted text-foreground border border-border'}>
                      {statusLabels[workOrder.status] ?? workOrder.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Code: {workOrder.code}</p>
                </div>
                <div className="text-end text-sm text-muted-foreground">
                  <p>SLA window: {workOrder.slaMinutes ? `${Math.round(workOrder.slaMinutes / 60)}h` : 'N/A'}</p>
                  <p className={dueMeta.overdue ? 'text-destructive font-semibold' : ''}>Due {dueMeta.label}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {workOrder.description && (
                  <p className="text-sm text-foreground">{workOrder.description}</p>
                )}
                <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground md:grid-cols-2">
                  <div>
                    <span className="font-medium text-foreground">Property:</span>{' '}
                    {workOrder.propertyId || 'Not linked'}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Assigned to:</span>{' '}
                    {workOrder.assigneeUserId || workOrder.assigneeVendorId || 'Unassigned'}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Category:</span>{' '}
                    {workOrder.category || 'General'}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Created:</span>{' '}
                    {workOrder.createdAt ? new Date(workOrder.createdAt).toLocaleString() : 'Unknown'}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && workOrders.length === 0 && !error && (
        <Card className="border border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="font-medium text-foreground">No work orders match the current filters.</p>
            <p className="text-sm">Adjust filters or create a new work order to get started.</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col items-center gap-3 border-t pt-4 sm:flex-row sm:justify-between">
        <span className="text-sm text-muted-foreground">
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
          <span className="text-sm text-foreground">
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
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: 'GENERAL',
    propertyId: '',
  });

  const reset = () => {
    setForm({ title: '', description: '', priority: 'MEDIUM', category: 'GENERAL', propertyId: '' });
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

      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to create work order');
      }

      onCreated();
      reset();
      setOpen(false);
    } catch (error: unknown) {
      logger.error('Failed to create work order', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (typeof window !== 'undefined') {
        window.alert(`Unable to create work order: ${message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!submitting) setOpen(nextOpen); }}>
      <DialogTrigger asChild>
        <Button className="bg-[var(--fixzit-success)] hover:bg-[var(--fixzit-success-dark)]">
          <Plus className="me-2 h-4 w-4" />
          New Work Order
        </Button>
      </DialogTrigger>
    <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>Create work order</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Title *</label>
            <Input
              required
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Priority</label>
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
              <label className="mb-1 block text-sm font-medium text-foreground">Category</label>
              <Input
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Property ID</label>
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
              {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default WorkOrdersView;

