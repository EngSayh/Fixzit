"use client";

/**
 * Superadmin Webhook Management
 * CRUD for webhook configurations, test delivery, and view logs
 * 
 * @module app/superadmin/webhooks/page
 * @status IMPLEMENTED [AGENT-001-A]
 * @issue SA-WEBHOOK-001
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { IconButton } from "@/components/ui/IconButton";
import { SimpleFilterBar } from "@/components/ui/compact-filter-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Plus,
  Trash2,
  Play,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Webhook,
  Eye,
  Copy,
} from "@/components/ui/icons";
import { useSuperadminSession } from "@/components/superadmin/superadmin-session";
import { useActionFeedback } from "@/components/ui/action-feedback";

// ============================================================================
// TYPES
// ============================================================================

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string;
  enabled: boolean;
  events: string[];
  createdAt: string;
  lastTriggered: string | null;
  successCount: number;
  failureCount: number;
  retryPolicy: "none" | "linear" | "exponential";
  maxRetries: number;
  status: "active" | "paused" | "failing";
}

interface DeliveryLog {
  id: string;
  webhookId: string;
  event: string;
  status: "success" | "failed" | "pending" | "retrying";
  statusCode: number | null;
  responseTime: number | null;
  attemptCount: number;
  createdAt: string;
  payload: string;
  response: string | null;
}

const AVAILABLE_EVENTS = [
  { value: "tenant.created", label: "Tenant Created" },
  { value: "tenant.updated", label: "Tenant Updated" },
  { value: "tenant.deleted", label: "Tenant Deleted" },
  { value: "user.created", label: "User Created" },
  { value: "user.updated", label: "User Updated" },
  { value: "subscription.created", label: "Subscription Created" },
  { value: "subscription.cancelled", label: "Subscription Cancelled" },
  { value: "payment.completed", label: "Payment Completed" },
  { value: "payment.failed", label: "Payment Failed" },
  { value: "invoice.generated", label: "Invoice Generated" },
  { value: "workorder.created", label: "Work Order Created" },
  { value: "workorder.completed", label: "Work Order Completed" },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: WebhookConfig["status"] }) {
  const config = {
    active: { color: "bg-green-500/10 text-green-500", label: "Active" },
    paused: { color: "bg-yellow-500/10 text-yellow-500", label: "Paused" },
    failing: { color: "bg-red-500/10 text-red-500", label: "Failing" },
  };
  const { color, label } = config[status];
  return <Badge className={color}>{label}</Badge>;
}

function DeliveryStatusBadge({ status }: { status: DeliveryLog["status"] }) {
  const config = {
    success: { color: "bg-green-500/10 text-green-500", icon: CheckCircle },
    failed: { color: "bg-red-500/10 text-red-500", icon: XCircle },
    pending: { color: "bg-blue-500/10 text-blue-500", icon: Clock },
    retrying: { color: "bg-yellow-500/10 text-yellow-500", icon: RefreshCw },
  };
  const { color, icon: Icon } = config[status];
  return (
    <Badge className={`${color} gap-1`}>
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WebhooksPage() {
  const { t } = useI18n();
  const _session = useSuperadminSession();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Inline confirmation feedback
  const createFeedback = useActionFeedback();
  const deleteFeedback = useActionFeedback();
  const toggleFeedback = useActionFeedback();
  const testFeedback = useActionFeedback();
  const copyFeedback = useActionFeedback();
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  // Edit dialog reserved for future implementation
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    events: [] as string[],
    retryPolicy: "exponential" as "none" | "linear" | "exponential",
    maxRetries: 3,
  });

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/superadmin/webhooks", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch webhooks");
      const data = await response.json();
      setWebhooks(data.webhooks || []);
      setLogs(data.recentDeliveries || []);
    } catch {
      toast.error("Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleCreate = async () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }
    
    // Validate URL format
    try {
      const parsedUrl = new URL(formData.url);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        toast.error("Please enter a valid HTTP or HTTPS URL");
        return;
      }
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    
    try {
      const response = await fetch("/api/superadmin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          url: formData.url,
          events: formData.events,
          retryPolicy: formData.retryPolicy,
          maxRetries: formData.maxRetries,
        }),
      });
      if (!response.ok) throw new Error("Failed to create webhook");
      const data = await response.json();
      setWebhooks(prev => [...prev, data.webhook]);
      setShowCreateDialog(false);
      setFormData({ name: "", url: "", events: [], retryPolicy: "exponential", maxRetries: 3 });
      createFeedback.showSuccess("Created", "add");
    } catch {
      createFeedback.showError("Failed");
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/superadmin/webhooks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error("Failed to toggle webhook");
      setWebhooks(prev => prev.map(w => 
        w.id === id ? { ...w, enabled, status: enabled ? "active" : "paused" } : w
      ));
      toggleFeedback.showSuccess(enabled ? "Enabled" : "Paused", "save");
    } catch {
      toggleFeedback.showError("Failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) return;
    
    try {
      const response = await fetch(`/api/superadmin/webhooks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete webhook");
      setWebhooks(prev => prev.filter(w => w.id !== id));
      deleteFeedback.showSuccess("Deleted", "delete");
    } catch {
      deleteFeedback.showError("Failed");
    }
  };

  const handleTest = async (webhook: WebhookConfig) => {
    setTestingId(webhook.id);
    try {
      const response = await fetch(`/api/superadmin/webhooks/${webhook.id}/test`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Test failed");
      testFeedback.showSuccess("Sent", "generic");
    } catch {
      testFeedback.showError("Failed");
    } finally {
      setTestingId(null);
    }
  };

  const copySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      copyFeedback.showSuccess("Copied", "copy");
    } catch {
      copyFeedback.showError("Failed");
    }
  };

  const viewLogs = async (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setShowLogsDialog(true);
    try {
      const response = await fetch(`/api/superadmin/webhooks/${webhook.id}/logs`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        // API returns { logs, pagination } - use data.logs instead of data.deliveries
        setLogs(data.logs || []);
      } else {
        toast.error("Failed to load delivery logs");
      }
    } catch {
      toast.error("Failed to load delivery logs");
    }
  };

  const filteredWebhooks = webhooks.filter(w => 
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.url.toLowerCase().includes(search.toLowerCase())
  );

  const webhookLogs = logs.filter(l => l.webhookId === selectedWebhook?.id);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Webhook className="h-6 w-6" />
            {t("superadmin.webhooks.title", "Webhook Management")}
          </h1>
          <p className="text-muted-foreground">
            {t("superadmin.webhooks.subtitle", "Configure webhook endpoints for event notifications")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchWebhooks} disabled={loading}>
            <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh", "Refresh")}
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t("superadmin.webhooks.create", "Create Webhook")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Webhooks</p>
                <p className="text-2xl font-bold">{webhooks.length}</p>
              </div>
              <Webhook className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-500">
                  {webhooks.filter(w => w.status === "active").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {webhooks.length > 0 
                    ? Math.round(
                        (webhooks.reduce((s, w) => s + w.successCount, 0) /
                        Math.max(1, webhooks.reduce((s, w) => s + w.successCount + w.failureCount, 0))) * 100
                      )
                    : 0}%
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deliveries</p>
                <p className="text-2xl font-bold">
                  {webhooks.reduce((s, w) => s + w.successCount + w.failureCount, 0)}
                </p>
              </div>
              <ExternalLink className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <SimpleFilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t("superadmin.webhooks.search", "Search webhooks..."),
        }}
        onClear={() => setSearch("")}
      />

      {/* Webhooks Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("superadmin.webhooks.name", "Name")}</TableHead>
                <TableHead>{t("superadmin.webhooks.url", "URL")}</TableHead>
                <TableHead>{t("superadmin.webhooks.events", "Events")}</TableHead>
                <TableHead>{t("superadmin.webhooks.deliveries", "Deliveries")}</TableHead>
                <TableHead>{t("superadmin.webhooks.status", "Status")}</TableHead>
                <TableHead>{t("superadmin.webhooks.enabled", "Enabled")}</TableHead>
                <TableHead>{t("common.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [1, 2, 3].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredWebhooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t("superadmin.webhooks.noWebhooks", "No webhooks configured")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredWebhooks.map(webhook => (
                  <TableRow key={webhook.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{webhook.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(webhook.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-xs">
                        <code className="text-xs truncate">{webhook.url}</code>
                        <IconButton
                          icon={<Copy className="h-3 w-3" />}
                          tooltip={t("common.copySecret", "Copy secret")}
                          variant="ghost"
                          size="sm"
                          onClick={() => copySecret(webhook.secret)}
                          aria-label={t("common.copySecret", "Copy secret")}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{webhook.events.length} events</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-green-500">{webhook.successCount}</span>
                        {" / "}
                        <span className="text-red-500">{webhook.failureCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={webhook.status} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={webhook.enabled}
                        onCheckedChange={(checked) => handleToggle(webhook.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <IconButton
                          icon={<Play className={`h-4 w-4 ${testingId === webhook.id ? "animate-pulse" : ""}`} />}
                          tooltip={t("superadmin.webhooks.test", "Test webhook")}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTest(webhook)}
                          disabled={testingId === webhook.id}
                          aria-label={t("superadmin.webhooks.test", "Test webhook")}
                        />
                        <IconButton
                          icon={<Eye className="h-4 w-4" />}
                          tooltip={t("superadmin.webhooks.viewLogs", "View logs")}
                          variant="ghost"
                          size="sm"
                          onClick={() => viewLogs(webhook)}
                          aria-label={t("superadmin.webhooks.viewLogs", "View logs")}
                        />
                        <IconButton
                          icon={<Trash2 className="h-4 w-4" />}
                          tooltip={t("common.delete", "Delete")}
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(webhook.id)}
                          aria-label={t("common.delete", "Delete")}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Webhook Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("superadmin.webhooks.createTitle", "Create Webhook")}</DialogTitle>
            <DialogDescription>
              {t("superadmin.webhooks.createDescription", "Configure a new webhook endpoint")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("superadmin.webhooks.name", "Name")}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("superadmin.webhooks.url", "Endpoint URL")}</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("superadmin.webhooks.events", "Events")}</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {AVAILABLE_EVENTS.map(event => (
                  <div key={event.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={event.value}
                      checked={formData.events.includes(event.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({ ...prev, events: [...prev.events, event.value] }));
                        } else {
                          setFormData(prev => ({ ...prev, events: prev.events.filter(e => e !== event.value) }));
                        }
                      }}
                    />
                    <label htmlFor={event.value} className="text-sm">{event.label}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("superadmin.webhooks.retryPolicy", "Retry Policy")}</Label>
                <Select
                  value={formData.retryPolicy}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, retryPolicy: v as typeof formData.retryPolicy }))}
                  placeholder="Select retry policy"
                >
                  <SelectTrigger>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Retry</SelectItem>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="exponential">Exponential</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("superadmin.webhooks.maxRetries", "Max Retries")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={formData.maxRetries}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={handleCreate}>
              {t("common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {t("superadmin.webhooks.deliveryLogs", "Delivery Logs")} - {selectedWebhook?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhookLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No delivery logs
                    </TableCell>
                  </TableRow>
                ) : (
                  webhookLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <code className="text-xs">{log.event}</code>
                      </TableCell>
                      <TableCell>
                        <DeliveryStatusBadge status={log.status} />
                      </TableCell>
                      <TableCell>
                        {log.statusCode && (
                          <Badge variant={log.statusCode < 400 ? "secondary" : "destructive"}>
                            {log.statusCode}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.responseTime ? `${log.responseTime}ms` : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogsDialog(false)}>
              {t("common.close", "Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
