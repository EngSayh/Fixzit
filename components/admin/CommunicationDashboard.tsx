"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Mail,
  Phone,
  MessageCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
} from "@/components/ui/icons";
import { logger } from "@/lib/logger";

interface CommunicationLog {
  _id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  channel: "sms" | "email" | "whatsapp" | "otp";
  type: string;
  recipient: string;
  subject?: string;
  message: string;
  status: "pending" | "sent" | "delivered" | "failed" | "read";
  metadata?: Record<string, unknown>;
  createdAt: string;
  deliveredAt?: string;
  failedAt?: string;
  errorMessage?: string;
}

interface Statistics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalPending: number;
  smsCount: number;
  emailCount: number;
  whatsappCount: number;
  otpCount: number;
  deliveryRate: string;
  failureRate: string;
}

interface CommunicationDashboardProps {
  t: (key: string, fallback: string) => string;
  isRTL: boolean;
}

export default function CommunicationDashboard({
  t,
  isRTL,
}: CommunicationDashboardProps) {
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<CommunicationLog | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const limit = 50;

  // Fetch communications
  const fetchCommunications = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        skip: ((page - 1) * limit).toString(),
      });

      if (channelFilter && channelFilter !== "all") {
        params.append("channel", channelFilter);
      }

      if (statusFilter) {
        params.append("status", statusFilter);
      }

      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      const response = await fetch(`/api/admin/communications?${params}`);
      const data = await response.json();

      if (data.success) {
        const pages = Math.max(1, data.data.pagination.pages || 1);
        setCommunications(data.data.communications);
        setStatistics(data.data.statistics);
        setTotalPages(pages);
        if (page > pages) {
          setPage(pages);
        }
      } else {
        logger.error(
          "[CommunicationDashboard] Fetch failed",
          new Error(data.error),
        );
      }
    } catch (error) {
      logger.error("[CommunicationDashboard] Fetch error", error as Error);
    } finally {
      setLoading(false);
    }
  }, [channelFilter, debouncedSearch, limit, page, statusFilter]);

  // Initial fetch
  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [channelFilter, statusFilter]);

  // Channel icons
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "sms":
      case "otp":
        return <Phone className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "whatsapp":
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      sent: "bg-primary/10 text-primary-dark",
      delivered: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      read: "bg-purple-100 text-purple-800",
    };

    return (
      <span
        className={`px-2 py-1 text-xs rounded-full ${colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}`}
      >
        {status}
      </span>
    );
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Date",
      "User",
      "Channel",
      "Type",
      "Recipient",
      "Status",
      "Message",
    ];
    const rows = communications.map((log) => [
      new Date(log.createdAt).toLocaleString(),
      log.userName || log.userEmail || "Unknown",
      log.channel,
      log.type,
      log.recipient,
      log.status,
      log.message.substring(0, 100),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `communications-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t("communications.title", "Communication Dashboard")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t(
              "communications.subtitle",
              "Track all SMS, Email, and WhatsApp communications",
            )}
          </p>
        </div>
        <div
          className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
        >
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            disabled={communications.length === 0}
            className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
            aria-label={t("communications.export", "Export")}
          >
            <Download className="h-4 w-4" />
            {t("communications.export", "Export")}
          </Button>
          <Button
            onClick={fetchCommunications}
            variant="outline"
            size="sm"
            disabled={loading}
            className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
            aria-label={t("communications.refresh", "Refresh")}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("communications.refresh", "Refresh")}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Sent */}
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div
              className={`flex items-center justify-between mb-2 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <span className="text-muted-foreground text-sm">
                {t("communications.stats.totalSent", "Total Sent")}
              </span>
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">
              {statistics.totalSent.toLocaleString()}
            </p>
          </div>

          {/* Delivery Rate */}
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div
              className={`flex items-center justify-between mb-2 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <span className="text-muted-foreground text-sm">
                {t("communications.stats.deliveryRate", "Delivery Rate")}
              </span>
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <p className="text-3xl font-bold text-success">
              {statistics.deliveryRate}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {statistics.totalDelivered.toLocaleString()} delivered
            </p>
          </div>

          {/* Failure Rate */}
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div
              className={`flex items-center justify-between mb-2 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <span className="text-muted-foreground text-sm">
                {t("communications.stats.failureRate", "Failure Rate")}
              </span>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-3xl font-bold text-destructive">
              {statistics.failureRate}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {statistics.totalFailed.toLocaleString()} failed
            </p>
          </div>

          {/* By Channel */}
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div
              className={`flex items-center justify-between mb-2 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <span className="text-muted-foreground text-sm">
                {t("communications.stats.byChannel", "By Channel")}
              </span>
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1 text-sm">
              <div
                className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <span className="text-muted-foreground">SMS:</span>
                <span className="font-medium">{statistics.smsCount}</span>
              </div>
              <div
                className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{statistics.emailCount}</span>
              </div>
              <div
                className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <span className="text-muted-foreground">WhatsApp:</span>
                <span className="font-medium">{statistics.whatsappCount}</span>
              </div>
              <div
                className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <span className="text-muted-foreground">OTP:</span>
                <span className="font-medium">{statistics.otpCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-2xl p-4 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-start">
          {/* Search */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t(
                "communications.search",
                "Search by user, phone, email...",
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>

          {/* Channel Filter */}
          <div className="relative">
            <Filter className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full h-10 ps-10 text-start border border-border rounded-md bg-background"
            >
              <option value="all">
                {t("communications.filter.allChannels", "All Channels")}
              </option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="otp">OTP</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 border border-border rounded-md bg-background text-start"
            >
              <option value="">
                {t("communications.filter.allStatuses", "All Statuses")}
              </option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Communications Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-foreground text-start">
                  {t("communications.table.date", "Date")}
                </th>
                <th className="px-4 py-3 text-sm font-medium text-foreground text-start">
                  {t("communications.table.user", "User")}
                </th>
                <th className="px-4 py-3 text-sm font-medium text-foreground text-start">
                  {t("communications.table.channel", "Channel")}
                </th>
                <th className="px-4 py-3 text-sm font-medium text-foreground text-start">
                  {t("communications.table.recipient", "Recipient")}
                </th>
                <th className="px-4 py-3 text-sm font-medium text-foreground text-start">
                  {t("communications.table.status", "Status")}
                </th>
                <th className="px-4 py-3 text-sm font-medium text-foreground text-start">
                  {t("communications.table.message", "Message")}
                </th>
                <th className="px-4 py-3 text-sm font-medium text-foreground text-start">
                  {t("communications.table.actions", "Actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {t("communications.loading", "Loading communications...")}
                  </td>
                </tr>
              ) : communications.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {t("communications.noData", "No communications found")}
                  </td>
                </tr>
              ) : (
                communications.map((log) => (
                  <tr
                    key={log._id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-foreground">
                      {new Date(log.createdAt).toLocaleDateString()}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      <div>
                        <div className="font-medium">
                          {log.userName || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.userEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(log.channel)}
                        <span className="text-sm capitalize">
                          {log.channel}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {log.recipient}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <div className="max-w-xs truncate">{log.message}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        onClick={() => setSelectedLog(log)}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1"
                        aria-label={t("communications.viewDetails", "View communication details")}
                      >
                        <Eye className="h-4 w-4" />
                        {t("communications.view", "View")}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className={`px-4 py-3 border-t border-border flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              variant="outline"
              size="sm"
              aria-label={t("communications.previousPage", "Go to previous page")}
            >
              {t("communications.previous", "Previous")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("communications.page", "Page")} {page}{" "}
              {t("communications.of", "of")} {totalPages}
            </span>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              variant="outline"
              size="sm"
              aria-label={t("communications.nextPage", "Go to next page")}
            >
              {t("communications.next", "Next")}
            </Button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-card rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between mb-4 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <h3 className="text-xl font-bold text-foreground">
                {t("communications.details.title", "Communication Details")}
              </h3>
              <button type="button"
                onClick={() => setSelectedLog(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={t("communications.closeDetails", "Close details")}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("communications.details.user", "User")}
                </label>
                <p className="text-foreground">
                  {selectedLog.userName || "Unknown"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedLog.userEmail}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("communications.details.channel", "Channel")}
                  </label>
                  <p className="text-foreground capitalize">
                    {selectedLog.channel}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("communications.details.status", "Status")}
                  </label>
                  <div>{getStatusBadge(selectedLog.status)}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("communications.details.recipient", "Recipient")}
                </label>
                <p className="text-foreground">{selectedLog.recipient}</p>
              </div>

              {selectedLog.subject && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("communications.details.subject", "Subject")}
                  </label>
                  <p className="text-foreground">{selectedLog.subject}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("communications.details.message", "Message")}
                </label>
                <p className="text-foreground whitespace-pre-wrap">
                  {selectedLog.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("communications.details.sent", "Sent At")}
                  </label>
                  <p className="text-foreground">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedLog.deliveredAt && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      {t("communications.details.delivered", "Delivered At")}
                    </label>
                    <p className="text-foreground">
                      {new Date(selectedLog.deliveredAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {selectedLog.errorMessage && (
                <div>
                  <label className="text-sm font-medium text-destructive">
                    {t("communications.details.error", "Error")}
                  </label>
                  <p className="text-destructive text-sm">
                    {selectedLog.errorMessage}
                  </p>
                </div>
              )}

              {selectedLog.metadata &&
                Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("communications.details.metadata", "Metadata")}
                    </label>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
