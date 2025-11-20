'use client';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { formatDistanceToNowStrict } from 'date-fns';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, RefreshCcw, Search, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { WorkOrderPriority } from '@/lib/sla';
import ClientDate from '@/components/ClientDate';
import { getWorkOrderStatusLabel } from '@/lib/work-orders/status';

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

const PRIORITY_LABELS: Record<WorkOrderPriority, { key: string; fallback: string }> = {
  LOW: { key: 'workOrders.priority.low', fallback: 'Low' },
  MEDIUM: { key: 'workOrders.priority.medium', fallback: 'Medium' },
  HIGH: { key: 'workOrders.priority.high', fallback: 'High' },
  CRITICAL: { key: 'workOrders.priority.critical', fallback: 'Critical' },
};

const getPriorityLabelText = (t: (key: string, fallback?: string) => string, priority: WorkOrderPriority) => {
  const config = PRIORITY_LABELS[priority];
  return config ? t(config.key, config.fallback) : priority;
};

const PRIORITY_OPTIONS: WorkOrderPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_OPTIONS = ['SUBMITTED', 'DISPATCHED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'VERIFIED', 'CLOSED', 'CANCELLED'];
const PAGE_SIZE = 10;

function isWorkOrderPriority(value: string): value is WorkOrderPriority {
  return (PRIORITY_OPTIONS as string[]).includes(value);
}

type WorkOrderAttachment = {
  key: string;
  url?: string;
  fileUrl?: string;
  name?: string;
  fileName?: string;
  originalName?: string;
  size?: number;
  fileSize?: number;
  scanStatus?: string;
};

type WorkOrderRecord = {
  id: string;
  code?: string;
  workOrderNumber?: string;
  title: string;
  description?: string;
  status: 'SUBMITTED' | 'DISPATCHED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'VERIFIED' | 'CLOSED' | 'CANCELLED';
  priority: WorkOrderPriority;
  createdAt?: string;
  dueAt?: string;
  slaMinutes?: number;
  propertyId?: string;
  location?: { propertyId?: string; unitNumber?: string };
  sla?: {
    resolutionDeadline?: string;
    resolutionTimeMinutes?: number;
  };
  assignment?: {
    assignedTo?: {
      userId?: string;
      vendorId?: string;
    };
  };
  assigneeUserId?: string;
  assigneeVendorId?: string;
  category?: string;
  attachments?: WorkOrderAttachment[];
};

type ApiResponse = {
  items: WorkOrderRecord[];
  page: number;
  limit: number;
  total: number;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Failed to load work orders (${response.status})`);
  }
  return response.json() as Promise<ApiResponse>;
};

function getDueMeta(t: (key: string, fallback?: string) => string, dueAt?: string) {
  const notScheduled = t('workOrders.list.values.notScheduled', 'Not scheduled');
  if (!dueAt) return { label: notScheduled, overdue: false };
  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) return { label: notScheduled, overdue: false };
  return {
    label: formatDistanceToNowStrict(dueDate, { addSuffix: true }),
    overdue: dueDate.getTime() < Date.now(),
  };
}

export type WorkOrdersViewProps = {
  orgId: string;
  heading?: string;
  description?: string;
};

export function WorkOrdersView({ heading, description, orgId }: WorkOrdersViewProps) {
  const { t } = useTranslation();
  const resolvedHeading = heading ?? t('workOrders.list.heading', 'Work Orders');
  const resolvedDescription = description ?? t('workOrders.list.description', 'Manage and track work orders across all properties');
  const [clientReady, setClientReady] = useState(() => typeof window !== 'undefined');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!clientReady) {
      setClientReady(true);
    }
  }, [clientReady]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== search) {
        setSearch(trimmed);
        setPage(1);
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [search, searchInput]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('page', String(page));
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (search) params.set('q', search);
    params.set('org', orgId);
    return params.toString();
  }, [orgId, page, priorityFilter, statusFilter, search]);

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    clientReady ? `/api/work-orders?${query}` : null,
    fetcher,
    { keepPreviousData: true }
  );

  const workOrders = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || PAGE_SIZE))) : 1;

  const statusPlaceholder = t('workOrders.list.filters.status', 'Status');
  const statusAllLabel = t('workOrders.list.filters.statusAll', 'All Statuses');
  const priorityPlaceholder = t('workOrders.list.filters.priority', 'Priority');
  const priorityAllLabel = t('workOrders.list.filters.priorityAll', 'All Priorities');
  const refreshLabel = t('workOrders.list.filters.refresh', 'Refresh');
  const loadingLabel = t('workOrders.list.loading', 'Loading work orders…');
  const propertyLabel = t('workOrders.list.labels.property', 'Property:');
  const assignedLabel = t('workOrders.list.labels.assigned', 'Assigned to:');
  const categoryLabel = t('workOrders.list.labels.category', 'Category:');
  const createdLabel = t('workOrders.list.labels.created', 'Created:');
  const priorityLabel = t('workOrders.list.labels.priority', 'Priority:');
  const codeLabel = t('workOrders.list.labels.code', 'Code:');
  const slaWindowLabel = t('workOrders.list.labels.slaWindow', 'SLA window:');
  const dueLabel = t('workOrders.list.labels.due', 'Due');
  const notLinkedText = t('workOrders.list.values.notLinked', 'Not linked');
  const unassignedText = t('workOrders.list.values.unassigned', 'Unassigned');
  const generalText = t('workOrders.list.values.general', 'General');
  const unknownText = t('workOrders.list.values.unknown', 'Unknown');
  const emptyTitle = t('workOrders.list.empty.title', 'No work orders match the current filters.');
  const emptySubtitle = t('workOrders.list.empty.subtitle', 'Adjust filters or create a new work order to get started.');
  const searchPlaceholder = t('workOrders.list.searchPlaceholder', 'Search by title or description');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{resolvedHeading}</h1>
          <p className="text-muted-foreground">{resolvedDescription}</p>
        </div>
        <WorkOrderCreateDialog onCreated={() => mutate()} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
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
              placeholder={statusPlaceholder}
              className="lg:w-48"
            >
              <SelectContent>
                <SelectItem value="">{statusAllLabel}</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {getWorkOrderStatusLabel(t, status)}
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
              placeholder={priorityPlaceholder}
              className="lg:w-40"
            >
              <SelectContent>
                <SelectItem value="">{priorityAllLabel}</SelectItem>
                {PRIORITY_OPTIONS.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {getPriorityLabelText(t, priority)}
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
              {refreshLabel}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/20 bg-destructive/10">
          <CardContent className="py-6">
            <p className="text-sm text-destructive-dark">{error.message}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading && !data ? (
          <Card className="border border-dashed">
            <CardContent className="flex items-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {loadingLabel}
            </CardContent>
          </Card>
        ) : null}

        {workOrders.map((workOrder, index) => {
          const dueAt = workOrder.sla?.resolutionDeadline || workOrder.dueAt;
          const dueMeta = getDueMeta(t, dueAt);
          const slaWindowMinutes = workOrder.sla?.resolutionTimeMinutes ?? workOrder.slaMinutes;
          const code = workOrder.workOrderNumber || workOrder.code || workOrder.id;
          const assignedUser = workOrder.assignment?.assignedTo?.userId || workOrder.assigneeUserId;
          const assignedVendor = workOrder.assignment?.assignedTo?.vendorId || workOrder.assigneeVendorId;
          const propertyId = workOrder.location?.propertyId || workOrder.propertyId;
          const workOrderKey = workOrder.id || workOrder.workOrderNumber || workOrder.code || `work-order-${index}`;
          const priorityName = getPriorityLabelText(t, workOrder.priority);
          const attachmentCount = workOrder.attachments?.length || 0;
          return (
            <Card key={workOrderKey} className="border border-border shadow-sm">
              <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg font-semibold text-foreground">{workOrder.title}</CardTitle>
                    <Badge className={priorityStyles[workOrder.priority] || priorityStyles.MEDIUM}>
                      {priorityLabel} {priorityName}
                    </Badge>
                    <Badge className={statusStyles[workOrder.status] || 'bg-muted text-foreground border border-border'}>
                      {getWorkOrderStatusLabel(t, workOrder.status)}
                    </Badge>
                    {attachmentCount > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        📎 {attachmentCount} {attachmentCount === 1 ? 'file' : 'files'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{codeLabel} {code}</p>
                </div>
                <div className="text-end text-sm text-muted-foreground">
                  <p>
                    {slaWindowLabel}{' '}
                    {slaWindowMinutes
                      ? t('workOrders.list.values.slaHours', '{{hours}}h').replace(
                        '{{hours}}',
                        String(Math.round(slaWindowMinutes / 60))
                      )
                      : t('common.notAvailable', 'N/A')}
                  </p>
                  <p className={dueMeta.overdue ? 'text-destructive font-semibold' : ''}>{dueLabel} {dueMeta.label}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {workOrder.description && (
                  <p className="text-sm text-foreground">{workOrder.description}</p>
                )}
                <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground md:grid-cols-2">
                  <div>
                    <span className="font-medium text-foreground">{propertyLabel}</span>{' '}
                    {propertyId || notLinkedText}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{assignedLabel}</span>{' '}
                    {assignedUser || assignedVendor || unassignedText}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{categoryLabel}</span>{' '}
                    {workOrder.category || generalText}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{createdLabel}</span>{' '}
                    {workOrder.createdAt ? <ClientDate date={workOrder.createdAt} format="medium" /> : unknownText}
                  </div>
                </div>
                {attachmentCount > 0 && workOrder.attachments && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('workOrders.attachments', 'Attachments')} ({attachmentCount})
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {workOrder.attachments.slice(0, 4).map((att, idx) => {
                        const status = att.scanStatus as string;
                        const name = att.name || (att as any).fileName || (att as any).originalName || 'Attachment';
                        const url = att.url || (att as any).fileUrl;
                        const content = (
                          <>
                            <span className="truncate flex-1">{name}</span>
                            {status === 'clean' && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                            {(!status || status === 'pending') && <Loader2 className="h-3 w-3 animate-spin text-amber-600" />}
                            {status === 'infected' && <ShieldAlert className="h-3 w-3 text-red-600" />}
                            {status === 'error' && <AlertCircle className="h-3 w-3 text-slate-600" />}
                          </>
                        );

                        if (!url) {
                          return (
                            <div
                              key={att.key || idx}
                              className="flex items-center gap-2 rounded border border-border bg-muted/30 px-2 py-1.5 text-xs opacity-70"
                              title={t('workOrders.attachments.missingUrl', 'Attachment URL unavailable')}
                            >
                              {content}
                            </div>
                          );
                        }

                        return (
                          <a
                            key={att.key || idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded border border-border bg-muted/30 px-2 py-1.5 text-xs hover:bg-muted/50"
                          >
                            {content}
                          </a>
                        );
                      })}
                      {attachmentCount > 4 && (
                        <span className="text-xs text-muted-foreground">
                          +{attachmentCount - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && workOrders.length === 0 && !error && (
        <Card className="border border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="font-medium text-foreground">{emptyTitle}</p>
            <p className="text-sm">{emptySubtitle}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col items-center gap-3 border-t pt-4 sm:flex-row sm:justify-between">
        <span className="text-sm text-muted-foreground">
          {t('workOrders.list.pagination.summary', 'Showing {{count}} of {{total}} work orders')
            .replace('{{count}}', String(data ? data.items.length : 0))
            .replace('{{total}}', String(data?.total ?? 0))}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            {t('workOrders.list.pagination.previous', 'Previous')}
          </Button>
          <span className="text-sm text-foreground">
            {t('workOrders.list.pagination.pageXofY', 'Page {{page}} of {{total}}')
              .replace('{{page}}', String(page))
              .replace('{{total}}', String(totalPages))}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            {t('workOrders.list.pagination.next', 'Next')}
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
  const { t } = useTranslation();
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
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to create work order');
      }

      onCreated();
      toast.success(t('workOrders.create.toast.success', 'Work order created'));
      reset();
      setOpen(false);
    } catch (error: unknown) {
      logger.error('Failed to create work order', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t('workOrders.create.toast.error', 'Unable to create work order'), {
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!submitting) setOpen(nextOpen); }}>
      <DialogTrigger asChild>
        <Button className="bg-success hover:bg-success-dark">
          <Plus className="me-2 h-4 w-4" />
          {t('workOrders.create.button', 'New Work Order')}
        </Button>
      </DialogTrigger>
    <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>{t('workOrders.create.title', 'Create work order')}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {t('workOrders.create.form.titleLabel', 'Title *')}
            </label>
            <Input
              required
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {t('workOrders.create.form.descriptionLabel', 'Description')}
            </label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                {t('workOrders.create.form.priorityLabel', 'Priority')}
              </label>
              <Select
                value={form.priority}
                onValueChange={(value) => {
                  if (isWorkOrderPriority(value)) {
                    setForm(prev => ({ ...prev, priority: value }));
                  }
                }}
                placeholder={t('workOrders.create.form.priorityPlaceholder', 'Select priority')}
              >
                <SelectTrigger>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {getPriorityLabelText(t, priority)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                {t('workOrders.create.form.categoryLabel', 'Category')}
              </label>
              <Input
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {t('workOrders.create.form.propertyIdLabel', 'Property ID')}
            </label>
            <Input
              placeholder={t('workOrders.create.form.propertyIdPlaceholder', 'Optional — link to a property')}
              value={form.propertyId}
              onChange={(event) => setForm((prev) => ({ ...prev, propertyId: event.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { reset(); setOpen(false); }} disabled={submitting}>
              {t('workOrders.create.form.cancelButton', 'Cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('workOrders.create.form.submitButton', 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default WorkOrdersView;
