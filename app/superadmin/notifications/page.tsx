"use client";

/**
 * Superadmin Notifications Management
 * Real notification history and configuration using /api/superadmin/notifications/*
 * 
 * @module app/superadmin/notifications/page
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Bell, RefreshCw, Send, Eye, ChevronLeft, ChevronRight,
  Mail, MessageSquare, Smartphone, Clock, AlertCircle, CheckCircle, XCircle,
} from "lucide-react";

interface NotificationLog {
  _id: string;
  type: string;
  title: string;
  message?: string;
  status: string;
  channelResults?: Array<{ channel: string; status: string; attempts: number; succeeded: number; failedCount: number }>;
  recipients?: Array<{ userId: string }>;
  metrics?: { attempted: number; succeeded: number; failed: number; skipped: number };
  createdAt: string;
}

interface NotificationConfig {
  email?: { enabled: boolean; provider?: string };
  sms?: { enabled: boolean; provider?: string };
  push?: { enabled: boolean };
  whatsapp?: { enabled: boolean };
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  push: <Smartphone className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  partial: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function SuperadminNotificationsPage() {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [selectedNotification, setSelectedNotification] = useState<NotificationLog | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendForm, setSendForm] = useState({ title: "", message: "", channels: ["email"] });
  const [sending, setSending] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (channelFilter !== "all") params.set("channel", channelFilter);
      
      const response = await fetch(`/api/superadmin/notifications/history?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load notifications");
      const data = await response.json();
      setNotifications(data.notifications || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [page, channelFilter]);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/superadmin/notifications/config", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config || data);
      }
    } catch {
      // Config may not exist yet
    }
  }, []);

  useEffect(() => { fetchNotifications(); fetchConfig(); }, [fetchNotifications, fetchConfig]);

  const handleSendNotification = async () => {
    if (!sendForm.title || !sendForm.message) {
      toast.error("Title and message are required");
      return;
    }
    try {
      setSending(true);
      const response = await fetch("/api/superadmin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sendForm),
      });
      if (!response.ok) throw new Error("Failed to send");
      toast.success("Notification sent successfully");
      setSendDialogOpen(false);
      setSendForm({ title: "", message: "", channels: ["email"] });
      fetchNotifications();
    } catch {
      toast.error("Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const handleTestChannel = async (channel: string) => {
    try {
      const response = await fetch("/api/superadmin/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ channel }),
      });
      if (!response.ok) throw new Error("Test failed");
      toast.success(`Test ${channel} notification sent`);
    } catch {
      toast.error(`Failed to test ${channel}`);
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t("superadmin.nav.notifications")}</h1>
          <p className="text-slate-400">System-wide notification management and history</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setSendDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Send className="h-4 w-4 me-2" />Send Notification
          </Button>
          <Button variant="outline" size="sm" onClick={fetchNotifications} disabled={loading} className="border-slate-700 text-slate-300">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="history" className="data-[state=active]:bg-slate-700">History</TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-slate-700">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Channel" /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="push">Push</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="flex items-center gap-2 text-white"><Bell className="h-5 w-5" />Notification History</CardTitle>
              <CardDescription className="text-slate-400">All sent notifications and their delivery status</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-slate-500" /></div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12"><AlertCircle className="h-12 w-12 text-red-500 mb-4" /><p className="text-red-400">{error}</p></div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12"><Bell className="h-12 w-12 text-slate-600 mb-4" /><p className="text-slate-400">No notifications found</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Timestamp</TableHead>
                      <TableHead className="text-slate-400">Title</TableHead>
                      <TableHead className="text-slate-400">Channels</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400">Metrics</TableHead>
                      <TableHead className="text-slate-400 w-[80px]">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((n) => (
                      <TableRow key={n._id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="text-slate-300"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-500" />{formatDate(n.createdAt)}</div></TableCell>
                        <TableCell className="text-white font-medium">{n.title}</TableCell>
                        <TableCell><div className="flex gap-1">{n.channelResults?.map((ch) => (<span key={ch.channel} className="text-slate-400">{CHANNEL_ICONS[ch.channel]}</span>))}</div></TableCell>
                        <TableCell><Badge variant="outline" className={STATUS_COLORS[n.status] || ""}>{n.status}</Badge></TableCell>
                        <TableCell className="text-slate-300">{n.metrics ? `${n.metrics.succeeded}/${n.metrics.attempted}` : "—"}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => { setSelectedNotification(n); setViewDialogOpen(true); }}><Eye className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-slate-800">
                  <p className="text-sm text-slate-400">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {["email", "sms", "push", "whatsapp"].map((channel) => (
              <Card key={channel} className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white capitalize">{CHANNEL_ICONS[channel]}{channel}</CardTitle>
                  <CardDescription className="text-slate-400">
                    {config?.[channel as keyof NotificationConfig]?.enabled ? "Enabled" : "Disabled"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {config?.[channel as keyof NotificationConfig]?.enabled ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="text-slate-300">
                        {config?.[channel as keyof NotificationConfig]?.enabled ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleTestChannel(channel)}>
                      Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription className="text-slate-400">Send a system-wide notification</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={sendForm.title} onChange={(e) => setSendForm(f => ({ ...f, title: e.target.value }))} className="bg-slate-800 border-slate-700" /></div>
            <div><Label>Message</Label><Textarea value={sendForm.message} onChange={(e) => setSendForm(f => ({ ...f, message: e.target.value }))} className="bg-slate-800 border-slate-700" rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendNotification} disabled={sending}>{sending ? "Sending..." : "Send"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-slate-400">Title</p><p className="text-white">{selectedNotification.title}</p></div>
                <div><p className="text-sm text-slate-400">Status</p><Badge className={STATUS_COLORS[selectedNotification.status]}>{selectedNotification.status}</Badge></div>
                <div><p className="text-sm text-slate-400">Sent At</p><p className="text-white">{formatDate(selectedNotification.createdAt)}</p></div>
                <div><p className="text-sm text-slate-400">Recipients</p><p className="text-white">{selectedNotification.recipients?.length || 0}</p></div>
              </div>
              {selectedNotification.message && (<div><p className="text-sm text-slate-400 mb-1">Message</p><p className="text-white bg-slate-800 p-3 rounded-lg">{selectedNotification.message}</p></div>)}
              {selectedNotification.channelResults && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">Channel Results</p>
                  <div className="space-y-2">
                    {selectedNotification.channelResults.map((ch, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                        <div className="flex items-center gap-2">{CHANNEL_ICONS[ch.channel]}<span className="capitalize">{ch.channel}</span></div>
                        <div className="text-sm"><span className="text-green-400">{ch.succeeded}</span>/<span className="text-slate-400">{ch.attempts}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
