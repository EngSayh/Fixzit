"use client";

/**
 * Superadmin Audit Logs
 * Real-time audit trail viewer using /api/superadmin/audit-logs
 * 
 * @module app/superadmin/audit/page
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { IconButton } from "@/components/ui/action-feedback";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { 
  FileText, 
  RefreshCw, 
  Search, 
  Download, 
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "@/components/ui/icons";

interface AuditLog {
  _id: string;
  orgId: string;
  action: string;
  entityType: string;
  entityId?: string;
  description?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  metadata?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-500/20 text-green-400 border-green-500/30",
  UPDATE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
  LOGIN: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  LOGOUT: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  EXPORT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  IMPORT: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  APPROVE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  REJECT: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

const ACTION_TYPES = [
  "CREATE", "READ", "UPDATE", "DELETE", "LOGIN", "LOGOUT",
  "EXPORT", "IMPORT", "APPROVE", "REJECT", "SEND", "RECEIVE",
  "UPLOAD", "DOWNLOAD", "SHARE", "ARCHIVE", "RESTORE",
];

const ENTITY_TYPES = [
  "USER", "PROPERTY", "TENANT", "OWNER", "CONTRACT", "PAYMENT",
  "INVOICE", "WORKORDER", "TICKET", "PROJECT", "BID", "VENDOR",
  "SERVICE_PROVIDER", "DOCUMENT", "SETTING", "OTHER",
];

export default function SuperadminAuditPage() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("userId", search);
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (entityFilter !== "all") params.set("entityType", entityFilter);

      const response = await fetch(`/api/superadmin/audit-logs?${params}`, { credentials: "include" });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setLogs(data.logs || []);
      setPagination({ page: data.page || page, limit: data.limit || limit, total: data.total || 0, pages: data.pages || 1 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load audit logs";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, actionFilter, entityFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (entityFilter !== "all") params.set("entityType", entityFilter);
      const response = await fetch(`/api/superadmin/audit/export?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Audit logs exported successfully");
    } catch {
      toast.error("Failed to export audit logs");
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.audit")}</h1>
          <p className="text-muted-foreground">System-wide audit trail and security events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="border-input text-muted-foreground">
            <Download className="h-4 w-4 me-2" />Export
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="border-input text-muted-foreground">
            <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by user ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10 bg-muted border-input text-foreground" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[160px] bg-muted border-input text-foreground"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent className="bg-muted border-input">
                <SelectItem value="all">All Actions</SelectItem>
                {ACTION_TYPES.map((action) => (<SelectItem key={action} value={action}>{action}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[160px] bg-muted border-input text-foreground"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent className="bg-muted border-input">
                <SelectItem value="all">All Entities</SelectItem>
                {ENTITY_TYPES.map((entity) => (<SelectItem key={entity} value={entity}>{entity}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="h-5 w-5" />Audit Logs
            {pagination && <Badge variant="outline" className="ms-2 text-muted-foreground border-input">{pagination.total.toLocaleString()} total</Badge>}
          </CardTitle>
          <CardDescription className="text-muted-foreground">Complete audit trail of all system actions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" /><p className="text-red-400">{error}</p>
              <Button variant="outline" onClick={fetchLogs} className="mt-4">Retry</Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Timestamp</TableHead>
                  <TableHead className="text-muted-foreground">Action</TableHead>
                  <TableHead className="text-muted-foreground">Entity</TableHead>
                  <TableHead className="text-muted-foreground">User</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground w-[80px]">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id} className="border-border hover:bg-muted/50">
                    <TableCell className="text-muted-foreground"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />{formatDate(log.createdAt)}</div></TableCell>
                    <TableCell><Badge variant="outline" className={ACTION_COLORS[log.action] || "bg-muted/50 text-muted-foreground"}>{log.action}</Badge></TableCell>
                    <TableCell className="text-muted-foreground"><div className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" />{log.entityType}{log.entityId && <span className="text-muted-foreground text-xs">({log.entityId.slice(-8)})</span>}</div></TableCell>
                    <TableCell className="text-muted-foreground"><div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{log.userEmail || log.userName || log.userId?.slice(-8) || "System"}</div></TableCell>
                    <TableCell>{log.success !== false ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</TableCell>
                    <TableCell><IconButton icon={<Eye className="h-4 w-4" />} tooltip={t("superadmin.audit.viewDetails", "View log details")} onClick={() => { setSelectedLog(log); setViewDialogOpen(true); }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <SimpleTooltip content={t("common.previousPage", "Previous page")}>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.page <= 1} className="border-input"><ChevronLeft className="h-4 w-4" /></Button>
                </SimpleTooltip>
                <SimpleTooltip content={t("common.nextPage", "Next page")}>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={pagination.page >= pagination.pages} className="border-input"><ChevronRight className="h-4 w-4" /></Button>
                </SimpleTooltip>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Audit Log Details</DialogTitle>
            <DialogDescription className="text-muted-foreground">Complete details for this audit event</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Action</p><Badge className={ACTION_COLORS[selectedLog.action] || ""}>{selectedLog.action}</Badge></div>
                <div><p className="text-sm text-muted-foreground">Entity Type</p><p className="text-foreground">{selectedLog.entityType}</p></div>
                <div><p className="text-sm text-muted-foreground">Entity ID</p><p className="text-foreground font-mono text-sm">{selectedLog.entityId || "—"}</p></div>
                <div><p className="text-sm text-muted-foreground">Timestamp</p><p className="text-foreground">{formatDate(selectedLog.createdAt)}</p></div>
                <div><p className="text-sm text-muted-foreground">User</p><p className="text-foreground">{selectedLog.userEmail || selectedLog.userId || "System"}</p></div>
                <div><p className="text-sm text-muted-foreground">IP Address</p><p className="text-foreground font-mono text-sm">{selectedLog.ipAddress || "—"}</p></div>
              </div>
              {selectedLog.description && (<div><p className="text-sm text-muted-foreground mb-1">Description</p><p className="text-foreground bg-muted p-3 rounded-lg">{selectedLog.description}</p></div>)}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (<div><p className="text-sm text-muted-foreground mb-1">Metadata</p><pre className="text-xs text-muted-foreground bg-muted p-3 rounded-lg overflow-x-auto">{JSON.stringify(selectedLog.metadata, null, 2)}</pre></div>)}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
