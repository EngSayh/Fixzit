"use client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { formatDistanceToNowStrict } from "date-fns";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Filter,
  WifiOff,
} from "@/components/ui/icons";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { WorkOrderPriority } from "@/lib/sla";
import ClientDate from "@/components/ClientDate";
import { getWorkOrderStatusLabel } from "@/lib/work-orders/status";
import { TableSkeleton } from "@/components/tables/TableSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "@/components/ui/chip";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TableFilterDrawer } from "@/components/tables/TableFilterDrawer";
import { ActiveFiltersChips } from "@/components/tables/ActiveFiltersChips";
import { TableDensityToggle } from "@/components/tables/TableDensityToggle";
import { useOnlineStatus } from "@/components/common/OfflineIndicator";
import { SubmitOfflineWarning } from "@/components/common/FormOfflineBanner";
import {
  queueOfflineWorkOrder,
  readWorkOrdersCache,
  syncOfflineWorkOrders,
  writeWorkOrdersCache,
  type WorkOrdersCacheEntry,
} from "@/lib/offline/work-orders";
import {
  useOfflineWorkOrderQueue,
  useOfflineWorkOrderSync,
} from "@/hooks/fm/useOfflineWorkOrders";

const statusStyles: Record<string, string> = {
  SUBMITTED: "bg-warning/10 text-warning border border-warning/20",
  DISPATCHED: "bg-primary/10 text-primary border border-primary/20",
  IN_PROGRESS: "bg-primary/10 text-primary border border-primary/20",
  ON_HOLD: "bg-muted text-foreground border border-border",
  COMPLETED: "bg-success/10 text-success border border-success/20",
  VERIFIED: "bg-success/10 text-success border border-success/20",
  CLOSED: "bg-success/10 text-success border border-success/20",
  CANCELLED: "bg-destructive/10 text-destructive border border-destructive/20",
  DRAFT: "bg-muted text-foreground border border-border",
};

const priorityStyles: Record<string, string> = {
  LOW: "bg-muted text-foreground border border-border",
  MEDIUM: "bg-secondary/10 text-secondary border border-secondary/20",
  HIGH: "bg-warning/10 text-warning border border-warning/20",
  CRITICAL: "bg-destructive/10 text-destructive border border-destructive/20",
};

const PRIORITY_LABELS: Record<
  WorkOrderPriority,
  { key: string; fallback: string }
> = {
  LOW: { key: "workOrders.priority.low", fallback: "Low" },
  MEDIUM: { key: "workOrders.priority.medium", fallback: "Medium" },
  HIGH: { key: "workOrders.priority.high", fallback: "High" },
  CRITICAL: { key: "workOrders.priority.critical", fallback: "Critical" },
};

const getPriorityLabelText = (
  t: (key: string, fallback?: string) => string,
  priority: WorkOrderPriority,
) => {
  const config = PRIORITY_LABELS[priority];
  return config ? t(config.key, config.fallback) : priority;
};

const PRIORITY_OPTIONS: WorkOrderPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];
const STATUS_OPTIONS = [
  "SUBMITTED",
  "DISPATCHED",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "VERIFIED",
  "CLOSED",
  "CANCELLED",
];
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
  status:
    | "SUBMITTED"
    | "DISPATCHED"
    | "IN_PROGRESS"
    | "ON_HOLD"
    | "COMPLETED"
    | "VERIFIED"
    | "CLOSED"
    | "CANCELLED"
    | "DRAFT";
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
  offlineStatus?: "queued" | "syncing" | "failed";
  offlineError?: string;
};

type ApiResponse = {
  items: WorkOrderRecord[];
  page: number;
  limit: number;
  total: number;
};

type WorkOrdersResponse = ApiResponse & {
  data?: WorkOrderRecord[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Failed to load work orders (${response.status})`);
  }
  return response.json() as Promise<ApiResponse>;
};

function getDueMeta(
  t: (key: string, fallback?: string) => string,
  dueAt?: string,
) {
  const notScheduled = t(
    "workOrders.list.values.notScheduled",
    "Not scheduled",
  );
  if (!dueAt) return { label: notScheduled, overdue: false };
  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime()))
    return { label: notScheduled, overdue: false };
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

export function WorkOrdersView({
  heading,
  description,
  orgId,
}: WorkOrdersViewProps) {
  const { t } = useTranslation();
  const { isOnline } = useOnlineStatus();
  const resolvedHeading =
    heading ?? t("workOrders.list.heading", "Work Orders");
  const resolvedDescription =
    description ??
    t(
      "workOrders.list.description",
      "Manage and track work orders across all properties",
    );
  const [clientReady, setClientReady] = useState(
    () => typeof window !== "undefined",
  );
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [density, setDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [cachedSnapshot, setCachedSnapshot] = useState<
    WorkOrdersCacheEntry<WorkOrdersResponse> | null
  >(null);
  const [manualSyncing, setManualSyncing] = useState(false);

  const { items: offlineQueue } = useOfflineWorkOrderQueue(orgId);

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
    params.set("limit", String(PAGE_SIZE));
    params.set("page", String(page));
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (search) params.set("q", search);
    params.set("org", orgId);
    return params.toString();
  }, [orgId, page, priorityFilter, statusFilter, search]);

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    clientReady ? `/api/work-orders?${query}` : null,
    fetcher,
    { keepPreviousData: true },
  );

  useEffect(() => {
    if (!clientReady) return;
    const cached = readWorkOrdersCache<WorkOrdersResponse>(orgId, query);
    setCachedSnapshot(cached);
  }, [clientReady, orgId, query]);

  useEffect(() => {
    if (!clientReady || !data) return;
    try {
      const entry = writeWorkOrdersCache(orgId, query, data);
      setCachedSnapshot(entry);
    } catch (cacheError) {
      logger.warn("[work-orders] Cache write failed", { cacheError });
    }
  }, [clientReady, data, orgId, query]);

  const handleSyncResult = useCallback(
    (result: { synced: number; failed: number; remaining: number }) => {
      if (result.synced > 0) {
        toast.success(
          t("workOrders.offline.syncSuccess", "Offline work orders synced"),
          {
            description: t(
              "workOrders.offline.syncCount",
              "{{count}} work orders synced",
            ).replace("{{count}}", String(result.synced)),
          },
        );
        void mutate();
      }
      if (result.failed > 0) {
        toast.error(
          t("workOrders.offline.syncFailed", "Some offline work orders failed"),
          {
            description: t(
              "workOrders.offline.syncFailedCount",
              "{{count}} work orders failed to sync",
            ).replace("{{count}}", String(result.failed)),
          },
        );
      }
    },
    [mutate, t],
  );

  useOfflineWorkOrderSync(orgId, handleSyncResult);

  const resolvedResponse = useMemo(() => {
    const response = (data ?? cachedSnapshot?.data) as
      | WorkOrdersResponse
      | undefined;
    const items = Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.data)
        ? response.data
        : [];
    const total =
      typeof response?.total === "number"
        ? response.total
        : typeof response?.pagination?.total === "number"
          ? response.pagination.total
          : items.length;
    const limit =
      typeof response?.limit === "number"
        ? response.limit
        : typeof response?.pagination?.limit === "number"
          ? response.pagination.limit
          : PAGE_SIZE;
    return { items, total, limit };
  }, [cachedSnapshot?.data, data]);

  const totalPages = Math.max(
    1,
    Math.ceil(resolvedResponse.total / (resolvedResponse.limit || PAGE_SIZE)),
  );

  const statusPlaceholder = t("workOrders.list.filters.status", "Status");
  const statusAllLabel = t("workOrders.list.filters.statusAll", "All Statuses");
  const priorityPlaceholder = t("workOrders.list.filters.priority", "Priority");
  const priorityAllLabel = t(
    "workOrders.list.filters.priorityAll",
    "All Priorities",
  );
  const refreshLabel = t("workOrders.list.filters.refresh", "Refresh");
  const retryLabel = t("common.retry", "Retry");
  const filtersLabel = t("workOrders.list.filters.title", "Filters");
  // const loadingLabel = t("workOrders.list.loading", "Loading work orders…"); // unused
  const propertyLabel = t("workOrders.list.labels.property", "Property:");
  const assignedLabel = t("workOrders.list.labels.assigned", "Assigned to:");
  const categoryLabel = t("workOrders.list.labels.category", "Category:");
  const createdLabel = t("workOrders.list.labels.created", "Created:");
  const priorityLabel = t("workOrders.list.labels.priority", "Priority:");
  const codeLabel = t("workOrders.list.labels.code", "Code:");
  const slaWindowLabel = t("workOrders.list.labels.slaWindow", "SLA window:");
  const dueLabel = t("workOrders.list.labels.due", "Due");
  const notLinkedText = t("workOrders.list.values.notLinked", "Not linked");
  const unassignedText = t("workOrders.list.values.unassigned", "Unassigned");
  const generalText = t("workOrders.list.values.general", "General");
  const unknownText = t("workOrders.list.values.unknown", "Unknown");
  const emptyTitle = t(
    "workOrders.list.empty.title",
    "No work orders match the current filters.",
  );
  const emptySubtitle = t(
    "workOrders.list.empty.subtitle",
    "Adjust filters or create a new work order to get started.",
  );
  const searchPlaceholder = t(
    "workOrders.list.searchPlaceholder",
    "Search by title or description",
  );
  const quickFilters = useMemo(
    () => [
      {
        key: "submitted",
        label: t("workOrders.list.quick.submitted", "Submitted"),
        status: "SUBMITTED",
      },
      {
        key: "in-progress",
        label: t("workOrders.list.quick.inProgress", "In Progress"),
        status: "IN_PROGRESS",
      },
      {
        key: "completed",
        label: t("workOrders.list.quick.completed", "Completed"),
        status: "COMPLETED",
      },
      {
        key: "high-priority",
        label: t("workOrders.list.quick.highPriority", "High Priority"),
        status: "",
        priority: "HIGH",
      },
    ],
    [t],
  );

  const offlineQueueCounts = useMemo(() => {
    const queued = offlineQueue.filter((item) => item.status === "queued").length;
    const syncing = offlineQueue.filter((item) => item.status === "syncing").length;
    const failed = offlineQueue.filter((item) => item.status === "failed").length;
    return { queued, syncing, failed, total: offlineQueue.length };
  }, [offlineQueue]);

  const offlineItems = useMemo(() => {
    if (!offlineQueue.length) return [];
    const searchTerm = search.toLowerCase();
    return offlineQueue
      .filter((item) => {
        const status = (item.payload.status || "DRAFT").toUpperCase();
        if (statusFilter && status !== statusFilter) return false;
        if (priorityFilter && item.payload.priority !== priorityFilter) return false;
        if (searchTerm) {
          const haystack = `${item.payload.title} ${item.payload.description || ""}`.toLowerCase();
          if (!haystack.includes(searchTerm)) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .map<WorkOrderRecord>((item) => ({
        id: item.id,
        title: item.payload.title,
        description: item.payload.description,
        status: (item.payload.status || "DRAFT") as WorkOrderRecord["status"],
        priority: item.payload.priority || "MEDIUM",
        createdAt: item.createdAt,
        propertyId: item.payload.propertyId,
        location: {
          propertyId: item.payload.propertyId,
          unitNumber: item.payload.unitNumber,
        },
        category: item.payload.category || "GENERAL",
        offlineStatus: item.status,
        offlineError: item.lastError,
      }));
  }, [offlineQueue, priorityFilter, search, statusFilter]);

  const workOrders = useMemo(() => {
    if (page !== 1 || !offlineItems.length) {
      return resolvedResponse.items;
    }
    return [...offlineItems, ...resolvedResponse.items];
  }, [offlineItems, page, resolvedResponse.items]);

  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; onRemove: () => void }[] = [];
    if (statusFilter) {
      filters.push({
        key: "status",
        label: `${statusPlaceholder}: ${getWorkOrderStatusLabel(
          t,
          statusFilter,
        )}`,
        onRemove: () => {
          setStatusFilter("");
          setPage(1);
        },
      });
    }
    if (priorityFilter) {
      filters.push({
        key: "priority",
        label: `${priorityPlaceholder}: ${getPriorityLabelText(
          t,
          priorityFilter as WorkOrderPriority,
        )}`,
        onRemove: () => {
          setPriorityFilter("");
          setPage(1);
        },
      });
    }
    if (search) {
      filters.push({
        key: "search",
        label: `${t("common.search", "Search")}: ${search}`,
        onRemove: () => {
          setSearchInput("");
          setSearch("");
          setPage(1);
        },
      });
    }
    return filters;
  }, [priorityFilter, priorityPlaceholder, search, statusFilter, statusPlaceholder, t]);

  const cardHeaderClass =
    density === "compact"
      ? "flex flex-col gap-1 pb-3 sm:flex-row sm:items-start sm:justify-between"
      : "flex flex-col gap-2 pb-4 sm:flex-row sm:items-start sm:justify-between";
  const cardContentClass =
    density === "compact" ? "space-y-2" : "space-y-3";

  const lastUpdatedLabel = cachedSnapshot?.savedAt
    ? formatDistanceToNowStrict(new Date(cachedSnapshot.savedAt), {
        addSuffix: true,
      })
    : null;

  const handleManualSync = async () => {
    if (!orgId || manualSyncing) return;
    setManualSyncing(true);
    try {
      const result = await syncOfflineWorkOrders({ orgId });
      if (result.synced > 0) {
        toast.success(
          t("workOrders.offline.syncSuccess", "Offline work orders synced"),
          {
            description: t(
              "workOrders.offline.syncCount",
              "{{count}} work orders synced",
            ).replace("{{count}}", String(result.synced)),
          },
        );
        await mutate();
      }
      if (result.failed > 0) {
        toast.error(
          t("workOrders.offline.syncFailed", "Some offline work orders failed"),
          {
            description: t(
              "workOrders.offline.syncFailedCount",
              "{{count}} work orders failed to sync",
            ).replace("{{count}}", String(result.failed)),
          },
        );
      }
    } catch (syncError) {
      logger.error("[work-orders] Manual sync failed", { syncError });
      toast.error(
        t("workOrders.offline.syncFailed", "Unable to sync offline work orders"),
      );
    } finally {
      setManualSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {resolvedHeading}
          </h1>
          <p className="text-muted-foreground">{resolvedDescription}</p>
        </div>
        <WorkOrderCreateDialog onCreated={() => mutate()} orgId={orgId} />
      </div>

      {!isOnline || offlineQueueCounts.total > 0 ? (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="flex flex-col gap-2 py-4 text-sm text-warning-foreground">
            <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
              <WifiOff className="h-4 w-4 text-warning" />
              {!isOnline
                ? t(
                    "workOrders.offline.banner",
                    "Offline mode: showing cached work orders.",
                  )
                : t(
                    "workOrders.offline.bannerOnline",
                    "Offline work orders queued for sync.",
                  )}
            </div>
            {lastUpdatedLabel && (
              <p className="text-xs text-muted-foreground">
                {t("workOrders.offline.lastUpdated", "Last updated")}:{" "}
                {lastUpdatedLabel}
              </p>
            )}
            {offlineQueueCounts.total > 0 && (
              <p className="text-xs text-muted-foreground">
                {t(
                  "workOrders.offline.queueSummary",
                  "{{total}} queued · {{failed}} failed · {{syncing}} syncing",
                )
                  .replace("{{total}}", String(offlineQueueCounts.total))
                  .replace("{{failed}}", String(offlineQueueCounts.failed))
                  .replace("{{syncing}}", String(offlineQueueCounts.syncing))}
              </p>
            )}
            {isOnline && offlineQueueCounts.total > 0 ? (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualSync}
                  disabled={manualSyncing}
                >
                  {manualSyncing
                    ? t("workOrders.offline.syncing", "Syncing...")
                    : t("workOrders.offline.syncNow", "Sync now")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <TableToolbar
            start={
              <>
                <div className="relative w-full max-w-xl">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    className="ps-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickFilters.map((filter) => {
                    const selectedStatus = statusFilter === filter.status;
                    const selectedPriority =
                      (filter.priority && priorityFilter === filter.priority) ||
                      (!filter.priority && !priorityFilter);
                    const selected = selectedStatus && selectedPriority;
                    return (
                      <Chip
                        key={filter.key}
                        size="sm"
                        selected={selected}
                        onClick={() => {
                          setStatusFilter(filter.status);
                          if (filter.priority) {
                            setPriorityFilter(filter.priority);
                          } else {
                            setPriorityFilter("");
                          }
                          setPage(1);
                        }}
                      >
                        {filter.label}
                      </Chip>
                    );
                  })}
                </div>
              </>
            }
            end={
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                  placeholder={statusPlaceholder}
                  className="min-w-[160px]"
                >
                  <SelectItem value="">{statusAllLabel}</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getWorkOrderStatusLabel(t, status)}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  value={priorityFilter}
                  onValueChange={(value) => {
                    setPriorityFilter(value);
                    setPage(1);
                  }}
                  placeholder={priorityPlaceholder}
                  className="min-w-[160px]"
                >
                  <SelectItem value="">{priorityAllLabel}</SelectItem>
                  {PRIORITY_OPTIONS.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {getPriorityLabelText(t, priority)}
                    </SelectItem>
                  ))}
                </Select>
                <TableDensityToggle
                  density={density}
                  onChange={(next) => setDensity(next)}
                />
                <SimpleTooltip content={t("workOrders.filters.openDrawer", "Open filters")}>
                  <Button
                    variant="outline"
                    onClick={() => setFilterDrawerOpen(true)}
                  >
                    <Filter className="me-2 h-4 w-4" />
                    {filtersLabel}
                    {activeFilters.length > 0
                      ? ` (${activeFilters.length})`
                      : ""}
                  </Button>
                </SimpleTooltip>
                <SimpleTooltip content={t("workOrders.refresh.tooltip", "Refresh work orders list")}>
                  <Button
                    variant="outline"
                    onClick={() => mutate()}
                    disabled={isValidating}
                  >
                    <RefreshCcw
                      className={`me-2 h-4 w-4 ${isValidating ? "animate-spin" : ""}`}
                    />
                    {refreshLabel}
                  </Button>
                </SimpleTooltip>
              </div>
            }
          />
          <ActiveFiltersChips
            filters={activeFilters}
            onClearAll={() => {
              setStatusFilter("");
              setPriorityFilter("");
              setSearch("");
              setSearchInput("");
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      <TableFilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        title={filtersLabel}
        description={t(
          "workOrders.list.filters.description",
          "Refine results by status, priority, or search",
        )}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter("");
                setPriorityFilter("");
                setSearch("");
                setSearchInput("");
                setPage(1);
                setFilterDrawerOpen(false);
              }}
            >
              {t("common.reset", "Reset")}
            </Button>
            <Button
              onClick={() => {
                setPage(1);
                setFilterDrawerOpen(false);
              }}
            >
              {t("common.apply", "Apply")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("common.search", "Search")}
            </label>
            <Input
              placeholder={searchPlaceholder}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {statusPlaceholder}
            </label>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectItem value="">{statusAllLabel}</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {getWorkOrderStatusLabel(t, status)}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {priorityPlaceholder}
            </label>
            <Select
              value={priorityFilter}
              onValueChange={(value) => {
                setPriorityFilter(value);
                setPage(1);
              }}
            >
              <SelectItem value="">{priorityAllLabel}</SelectItem>
              {PRIORITY_OPTIONS.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {getPriorityLabelText(t, priority)}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>
      </TableFilterDrawer>

      {error && (
        <Card className="border-destructive/20 bg-destructive/10">
          <CardContent className="py-6">
            <p className="text-sm text-destructive-dark">{error.message}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading && !data ? (
          <div aria-live="polite">
            <p className="sr-only">Loading work orders</p>
            <TableSkeleton rows={6} />
          </div>
        ) : null}

        {workOrders.map((workOrder, index) => {
          const dueAt = workOrder.sla?.resolutionDeadline || workOrder.dueAt;
          const dueMeta = getDueMeta(t, dueAt);
          const slaWindowMinutes =
            workOrder.sla?.resolutionTimeMinutes ?? workOrder.slaMinutes;
          const code =
            workOrder.workOrderNumber || workOrder.code || workOrder.id;
          const assignedUser =
            workOrder.assignment?.assignedTo?.userId ||
            workOrder.assigneeUserId;
          const assignedVendor =
            workOrder.assignment?.assignedTo?.vendorId ||
            workOrder.assigneeVendorId;
          const propertyId =
            workOrder.location?.propertyId || workOrder.propertyId;
          const workOrderKey =
            workOrder.id ||
            workOrder.workOrderNumber ||
            workOrder.code ||
            `work-order-${index}`;
          const priorityName = getPriorityLabelText(t, workOrder.priority);
          const attachmentCount = workOrder.attachments?.length || 0;
          return (
            <Card key={workOrderKey} className="border border-border shadow-sm">
              <CardHeader className={cardHeaderClass}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg font-semibold text-foreground">
                      {workOrder.title}
                    </CardTitle>
                    <Badge
                      className={
                        priorityStyles[workOrder.priority] ||
                        priorityStyles.MEDIUM
                      }
                    >
                      {priorityLabel} {priorityName}
                    </Badge>
                    <Badge
                      className={
                        statusStyles[workOrder.status] ||
                        "bg-muted text-foreground border border-border"
                      }
                    >
                      {getWorkOrderStatusLabel(t, workOrder.status)}
                    </Badge>
                    {workOrder.offlineStatus && (
                      <Badge
                        className={
                          workOrder.offlineStatus === "failed"
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : workOrder.offlineStatus === "syncing"
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-warning/10 text-warning border border-warning/20"
                        }
                      >
                        {workOrder.offlineStatus === "failed"
                          ? t("workOrders.offline.statusFailed", "Sync failed")
                          : workOrder.offlineStatus === "syncing"
                            ? t("workOrders.offline.statusSyncing", "Syncing")
                            : t("workOrders.offline.statusQueued", "Pending sync")}
                      </Badge>
                    )}
                    {attachmentCount > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        📎 {attachmentCount}{" "}
                        {attachmentCount === 1 ? "file" : "files"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {codeLabel} {code}
                  </p>
                </div>
                <div className="text-end text-sm text-muted-foreground">
                  <p>
                    {slaWindowLabel}{" "}
                    {slaWindowMinutes
                      ? t(
                          "workOrders.list.values.slaHours",
                          "{{hours}}h",
                        ).replace(
                          "{{hours}}",
                          String(Math.round(slaWindowMinutes / 60)),
                        )
                      : t("common.notAvailable", "N/A")}
                  </p>
                  <p
                    className={
                      dueMeta.overdue ? "text-destructive font-semibold" : ""
                    }
                  >
                    {dueLabel} {dueMeta.label}
                  </p>
                </div>
              </CardHeader>
              <CardContent className={cardContentClass}>
                {workOrder.description && (
                  <p className="text-sm text-foreground">
                    {workOrder.description}
                  </p>
                )}
                {workOrder.offlineStatus === "failed" && workOrder.offlineError ? (
                  <p className="text-xs text-destructive">
                    {t("workOrders.offline.error", "Offline sync failed")}:{" "}
                    {workOrder.offlineError}
                  </p>
                ) : null}
                <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground md:grid-cols-2">
                  <div>
                    <span className="font-medium text-foreground">
                      {propertyLabel}
                    </span>{" "}
                    {propertyId || notLinkedText}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      {assignedLabel}
                    </span>{" "}
                    {assignedUser || assignedVendor || unassignedText}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      {categoryLabel}
                    </span>{" "}
                    {workOrder.category || generalText}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      {createdLabel}
                    </span>{" "}
                    {workOrder.createdAt ? (
                      <ClientDate date={workOrder.createdAt} format="medium" />
                    ) : (
                      unknownText
                    )}
                  </div>
                </div>
                {attachmentCount > 0 && workOrder.attachments && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("workOrders.attachments", "Attachments")} (
                      {attachmentCount})
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {workOrder.attachments.slice(0, 4).map((att, idx) => {
                        const status = att.scanStatus as string;
                        // Support legacy field names for backward compatibility
                        const attAny = att as typeof att & {
                          fileName?: string;
                          originalName?: string;
                          fileUrl?: string;
                        };
                        const name =
                          att.name ||
                          attAny.fileName ||
                          attAny.originalName ||
                          "Attachment";
                        const url = att.url || attAny.fileUrl;
                        const content = (
                          <>
                            <span className="truncate flex-1">{name}</span>
                            {status === "clean" && (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            )}
                            {(!status || status === "pending") && (
                              <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                            )}
                            {status === "infected" && (
                              <ShieldAlert className="h-3 w-3 text-red-600" />
                            )}
                            {status === "error" && (
                              <AlertCircle className="h-3 w-3 text-slate-600" />
                            )}
                          </>
                        );

                        if (!url) {
                          return (
                            <div
                              key={att.key || idx}
                              className="flex items-center gap-2 rounded border border-border bg-muted/30 px-2 py-1.5 text-xs opacity-70"
                              title={t(
                                "workOrders.attachments.missingUrl",
                                "Attachment URL unavailable",
                              )}
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
        <EmptyState
          title={emptyTitle}
          description={emptySubtitle}
          action={
            <Button onClick={() => mutate()}>
              <RefreshCcw className="me-2 h-4 w-4" />
              {retryLabel}
            </Button>
          }
        />
      )}

      <div className="border-t border-border">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={resolvedResponse.total}
          itemsPerPage={resolvedResponse.limit || PAGE_SIZE}
          onPageChange={setPage}
          onPageSizeChange={() => {
            // Page size is controlled by PAGE_SIZE constant in this component
            setPage(1);
          }}
        />
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

function WorkOrderCreateDialog({
  onCreated,
  orgId,
}: {
  onCreated: () => void;
  orgId: string;
}) {
  const { t } = useTranslation();
  const { isOnline } = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<WorkOrderFormState>({
    title: "",
    description: "",
    priority: "MEDIUM",
    category: "GENERAL",
    propertyId: "",
  });

  const reset = () => {
    setForm({
      title: "",
      description: "",
      priority: "MEDIUM",
      category: "GENERAL",
      propertyId: "",
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        priority: form.priority,
        category: form.category,
        status: "SUBMITTED",
        ...(form.propertyId ? { propertyId: form.propertyId } : {}),
      };

      if (!isOnline) {
        queueOfflineWorkOrder(payload, orgId);
        toast.success(
          t("workOrders.offline.queued", "Work order saved offline"),
          {
            description: t(
              "workOrders.offline.queueDesc",
              "It will sync automatically when you're back online.",
            ),
          },
        );
        reset();
        setOpen(false);
        return;
      }

      const response = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to create work order");
      }

      onCreated();
      toast.success(t("workOrders.create.toast.success", "Work order created"));
      reset();
      setOpen(false);
    } catch (error: unknown) {
      logger.error("Failed to create work order", { error });
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(
        t("workOrders.create.toast.error", "Unable to create work order"),
        {
          description: message,
        },
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!submitting) setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-success hover:bg-success-dark">
          <Plus className="me-2 h-4 w-4" />
          {t("workOrders.create.button", "New Work Order")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>
            {t("workOrders.create.title", "Create work order")}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {t("workOrders.create.form.titleLabel", "Title *")}
            </label>
            <Input
              required
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {t("workOrders.create.form.descriptionLabel", "Description")}
            </label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                {t("workOrders.create.form.priorityLabel", "Priority")}
              </label>
              <Select
                value={form.priority}
                onValueChange={(value) => {
                  if (isWorkOrderPriority(value)) {
                    setForm((prev) => ({ ...prev, priority: value }));
                  }
                }}
                placeholder={t(
                  "workOrders.create.form.priorityPlaceholder",
                  "Select priority",
                )}
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {getPriorityLabelText(t, priority)}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                {t("workOrders.create.form.categoryLabel", "Category")}
              </label>
              <Input
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {t("workOrders.create.form.propertyIdLabel", "Property ID")}
            </label>
            <Input
              placeholder={t(
                "workOrders.create.form.propertyIdPlaceholder",
                "Optional — link to a property",
              )}
              value={form.propertyId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, propertyId: event.target.value }))
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <SubmitOfflineWarning className="me-auto" />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              disabled={submitting}
            >
              {t("workOrders.create.form.cancelButton", "Cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("workOrders.create.form.submitButton", "Create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default WorkOrdersView;
