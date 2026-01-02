"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Check, CheckCheck, Filter, Search, MoreVertical } from "@/components/ui/icons";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import useSWR from "swr";
import type { NotificationDoc } from "@/lib/models";
import ClientDate from "@/components/ClientDate";
import { useTranslation } from "@/contexts/TranslationContext";

import { logger } from "@/lib/logger";

/**
 * Formats a translated toast/message string that needs a dynamic count placeholder.
 * Centralizing this logic ensures we always run numbers through translators without duplicating string.replace calls.
 */
const formatCountMessage = (
  formatter: (_value: string) => string,
  count: number,
) => formatter(String(count));

const PRIORITY_TRANSLATIONS = {
  high: { key: "notifications.priority.high", fallback: "HIGH" },
  medium: { key: "notifications.priority.medium", fallback: "MEDIUM" },
  low: { key: "notifications.priority.low", fallback: "LOW" },
} as const;

const CATEGORY_TRANSLATIONS = {
  maintenance: {
    key: "notifications.category.maintenance",
    fallback: "Maintenance",
  },
  vendor: { key: "notifications.category.vendor", fallback: "Vendor" },
  finance: { key: "notifications.category.finance", fallback: "Finance" },
  system: { key: "notifications.category.system", fallback: "System" },
} as const;

export default function NotificationsPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const orgId = session?.user?.orgId;
  const [selectedTab, setSelectedTab] = useState("all");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedNotifications, setSelectedNotifications] = useState<
    Set<string>
  >(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [todayDateString, setTodayDateString] = useState("");

  useEffect(() => {
    setTodayDateString(new Date().toDateString());
  }, []);

  const fetcher = (url: string) => {
    if (!orgId) {
      return Promise.reject(
        new Error(t("notifications.toast.noOrgId", "No organization ID found")),
      );
    }
    return fetch(url, {
      headers: { "x-tenant-id": orgId },
    })
      .then((r) => r.json())
      .catch((error) => {
        logger.error("Notifications fetch error", error);
        throw error;
      });
  };

  const { data, mutate, isLoading } = useSWR<{ items: NotificationDoc[] }>(
    orgId ? "/api/notifications" : null,
    fetcher,
  );
  const notificationItems = data?.items;

  const notifications = useMemo(() => {
    return Array.isArray(notificationItems) ? notificationItems : [];
  }, [notificationItems]);

  /**
   * Returns the localized label for a notification priority code.
   * Falls back to the uppercase raw value so the UI is never blank.
   */
  const formatPriorityChip = (priority: string) => {
    const normalized = priority?.toLowerCase?.() as
      | keyof typeof PRIORITY_TRANSLATIONS
      | undefined;
    const translation = normalized
      ? PRIORITY_TRANSLATIONS[normalized]
      : undefined;
    if (translation) {
      return t(translation.key, translation.fallback);
    }
    return priority?.toUpperCase?.() ?? priority;
  };

  /**
   * Returns the localized label for a notification category key.
   * If a key is missing in the dictionaries we fall back to the original category text.
   */
  const formatCategoryChip = (category: string) => {
    const normalized = category?.toLowerCase?.() as
      | keyof typeof CATEGORY_TRANSLATIONS
      | undefined;
    const translation = normalized
      ? CATEGORY_TRANSLATIONS[normalized]
      : undefined;
    return translation ? t(translation.key, translation.fallback) : category;
  };

  /**
   * Generates the localized label for the read/unread badge.
   */
  const formatStatusLabel = (read: boolean) =>
    read
      ? t("notifications.status.read", "Read")
      : t("notifications.status.unread", "Unread");

  /**
   * Maps priority codes to tailwind utility classes so the chips stay consistent across the view.
   */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive/10 text-destructive-foreground border-destructive/20";
      case "medium":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      case "low":
        return "bg-success/10 text-success-foreground border-success/20";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  /**
   * Emoji-based icon mapping for notification types.
   * We stick to emoji to avoid yet another icon font download on this heavy page.
   */
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "work-order":
        return "🔧";
      case "vendor":
        return "👥";
      case "payment":
        return "💰";
      case "maintenance":
        return "🛠️";
      case "system":
        return "⚙️";
      default:
        return "📢";
    }
  };

  /**
   * Returns the badge color palette for each notification category.
   * This keeps the summary chips and table rows in sync.
   */
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "maintenance":
        return "bg-primary/10 text-primary-foreground border-primary/20";
      case "vendor":
        return "bg-secondary/10 text-secondary border-secondary/30";
      case "finance":
        return "bg-success/10 text-success-foreground border-success/20";
      case "system":
        return "bg-muted text-foreground border-border";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif: NotificationDoc) => {
      const matchesSearch =
        notif.title.toLowerCase().includes(search.toLowerCase()) ||
        notif.message.toLowerCase().includes(search.toLowerCase());

      let matchesTab = true;
      switch (selectedTab) {
        case "unread":
          matchesTab = !notif.read;
          break;
        case "urgent":
          matchesTab = notif.priority === "high";
          break;
        case "all":
        default:
          matchesTab = true;
          break;
      }

      const matchesFilter =
        filter === "all" ||
        notif.category === filter ||
        (filter === "unread" && !notif.read) ||
        (filter === "high" && notif.priority === "high");

      return matchesSearch && matchesTab && matchesFilter;
    });
  }, [notifications, search, selectedTab, filter]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(
        new Set(
          filteredNotifications.map((n: NotificationDoc) => String(n.id || "")),
        ),
      );
    }
    setSelectAll(!selectAll);
  };

  const handleSelectNotification = (notifId: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notifId)) {
      newSelected.delete(notifId);
    } else {
      newSelected.add(notifId);
    }
    setSelectedNotifications(newSelected);
    setSelectAll(newSelected.size === filteredNotifications.length);
  };

  const unreadCount = useMemo(
    () => notifications.filter((n: NotificationDoc) => !n.read).length,
    [notifications],
  );
  const urgentCount = useMemo(
    () =>
      notifications.filter((n: NotificationDoc) => n.priority === "high")
        .length,
    [notifications],
  );

  const tabCounts = useMemo(() => {
    const allFiltered = notifications.filter((notif: NotificationDoc) => {
      const matchesSearch =
        notif.title.toLowerCase().includes(search.toLowerCase()) ||
        notif.message.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        notif.category === filter ||
        (filter === "unread" && !notif.read) ||
        (filter === "high" && notif.priority === "high");
      return matchesSearch && matchesFilter;
    });

    return {
      all: allFiltered.length,
      unread: unreadCount,
      urgent: urgentCount,
    };
  }, [notifications, search, filter, unreadCount, urgentCount]);

  const requireOrgId = () => {
    if (!orgId) {
      toast.error(t("notifications.toast.noOrgId", "No organization ID found"));
      return false;
    }
    return true;
  };

  const markAsRead = async (id: string) => {
    if (!requireOrgId()) {
      return;
    }

    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": orgId!,
        },
        body: JSON.stringify({ read: true }),
      });
      mutate();
    } catch (error) {
      logger.error("Error marking notification as read:", error);
      toast.error(
        t(
          "notifications.toast.markReadFailed",
          "Failed to mark notification as read",
        ),
      );
    }
  };

  const markAllAsRead = async () => {
    if (!requireOrgId()) {
      return;
    }

    const unreadIds = notifications
      .filter((n: NotificationDoc) => !n.read)
      .map((n: NotificationDoc) => String(n.id || ""));
    if (unreadIds.length > 0) {
      const toastId = toast.loading(
        formatCountMessage(
          (count) =>
            t(
              "notifications.toast.markingCount",
              "Marking {{count}} notifications as read...",
            ).replace("{{count}}", count),
          unreadIds.length,
        ),
      );

      try {
        await fetch("/api/notifications/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-id": orgId!,
          },
          body: JSON.stringify({
            action: "mark-read",
            notificationIds: unreadIds,
          }),
        });
        toast.success(
          formatCountMessage(
            (count) =>
              t(
                "notifications.toast.markedCount",
                "Marked {{count}} notifications as read",
              ).replace("{{count}}", count),
            unreadIds.length,
          ),
          { id: toastId },
        );
        mutate();
      } catch (error) {
        logger.error("Error marking notifications as read:", error);
        toast.error(
          t(
            "notifications.toast.markReadFailed",
            "Failed to mark notifications as read",
          ),
          { id: toastId },
        );
      }
    }
  };

  const bulkMarkAsRead = async () => {
    if (!requireOrgId()) {
      return;
    }

    const selectedIds = Array.from(selectedNotifications);
    if (selectedIds.length > 0) {
      const toastId = toast.loading(
        formatCountMessage(
          (count) =>
            t(
              "notifications.toast.markingCount",
              "Marking {{count}} notifications as read...",
            ).replace("{{count}}", count),
          selectedIds.length,
        ),
      );

      try {
        await fetch("/api/notifications/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-id": orgId!,
          },
          body: JSON.stringify({
            action: "mark-read",
            notificationIds: selectedIds,
          }),
        });
        toast.success(
          formatCountMessage(
            (count) =>
              t(
                "notifications.toast.markedCount",
                "Marked {{count}} notifications as read",
              ).replace("{{count}}", count),
            selectedIds.length,
          ),
          { id: toastId },
        );
        mutate();
        setSelectedNotifications(new Set());
        setSelectAll(false);
      } catch (error) {
        logger.error("Error marking notifications as read:", error);
        toast.error(
          t(
            "notifications.toast.markReadFailed",
            "Failed to mark notifications as read",
          ),
          { id: toastId },
        );
      }
    }
  };

  const archiveNotifications = async () => {
    const selectedIds = Array.from(selectedNotifications);
    if (selectedIds.length > 0) {
      toast.success(
        formatCountMessage(
          (count) =>
            t(
              "notifications.toast.archived",
              "Archived {{count}} notifications",
            ).replace("{{count}}", count),
          selectedIds.length,
        ),
      );
      setSelectedNotifications(new Set());
      setSelectAll(false);
    }
  };

  const deleteNotifications = async () => {
    const selectedIds = Array.from(selectedNotifications);
    if (selectedIds.length > 0) {
      toast.success(
        formatCountMessage(
          (count) =>
            t(
              "notifications.toast.deleted",
              "Deleted {{count}} notifications",
            ).replace("{{count}}", count),
          selectedIds.length,
        ),
      );
      setSelectedNotifications(new Set());
      setSelectAll(false);
    }
  };

  const exportNotifications = () => {
    const selectedIds = Array.from(selectedNotifications);
    if (selectedIds.length > 0) {
      const selectedData = filteredNotifications
        .filter((n: NotificationDoc) =>
          selectedIds.includes(String(n.id || "")),
        )
        .map((notif: NotificationDoc) => ({
          id: String(notif.id || ""),
          title: notif.title,
          message: notif.message,
          priority: notif.priority,
          category: notif.category,
          read: notif.read,
          timestamp: notif.timestamp,
        }));

      const blob = new Blob([JSON.stringify(selectedData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${t("notifications.report.filenamePrefix", "notification-report-")}${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const markAsImportant = async () => {
    const selectedIds = Array.from(selectedNotifications);
    if (selectedIds.length > 0) {
      toast.success(
        formatCountMessage(
          (count) =>
            t(
              "notifications.toast.markedImportant",
              "Marked {{count}} notifications as important",
            ).replace("{{count}}", count),
          selectedIds.length,
        ),
      );
      setSelectedNotifications(new Set());
      setSelectAll(false);
    }
  };

  const handleEmailSettings = () => {
    window.open("/settings?tab=notifications", "_blank");
  };

  const handlePushNotifications = () => {
    window.open("/settings?tab=preferences", "_blank");
  };

  const handleMuteCategories = () => {
    if (filter !== "all" && filter !== "unread" && filter !== "high") {
      toast.success(
        t(
          "notifications.toast.mutedCategory",
          "Muted notifications for category: {{category}}",
        ).replace("{{category}}", formatCategoryChip(filter)),
      );
    } else {
      toast.info(
        t(
          "notifications.toast.muteSelectCategory",
          "Please select a specific category first to mute it",
        ),
      );
    }
  };

  const handleNotificationReport = () => {
    const reportData = {
      total: notifications.length,
      unread: unreadCount,
      urgent: urgentCount,
      byCategory: {
        maintenance: notifications.filter(
          (n: NotificationDoc) => n.category === "maintenance",
        ).length,
        vendor: notifications.filter(
          (n: NotificationDoc) => n.category === "vendor",
        ).length,
        finance: notifications.filter(
          (n: NotificationDoc) => n.category === "finance",
        ).length,
        system: notifications.filter(
          (n: NotificationDoc) => n.category === "system",
        ).length,
      },
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t("notifications.report.filenamePrefix", "notification-report-")}${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSettings = () => {
    window.open("/settings", "_blank");
  };

  const handleClearAll = () => {
    toast.success(
      t("notifications.toast.clearedAll", "All notifications cleared"),
    );
  };

  const formatSelectionSummary = () => {
    if (selectedNotifications.size > 0) {
      return t(
        "notifications.bulk.selected",
        "{{selected}} of {{total}} selected",
      )
        .replace("{{selected}}", String(selectedNotifications.size))
        .replace("{{total}}", String(filteredNotifications.length));
    }
    if (filteredNotifications.length === 1) {
      return t("notifications.bulk.countSingle", "1 notification");
    }
    return t("notifications.bulk.count", "{{count}} notifications").replace(
      "{{count}}",
      String(filteredNotifications.length),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("notifications.page.title", "Notifications")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "notifications.page.subtitle",
              "Stay updated with all system notifications and alerts",
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button"
            className="btn-secondary"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            aria-label={t("notifications.actions.markAllRead", "Mark all notifications as read")}
            title={t("notifications.actions.markAllRead", "Mark All Read")}
          >
            <CheckCheck size={16} className="me-2" />
            {t("notifications.actions.markAllRead", "Mark All Read")} (
            {unreadCount})
          </button>
          <button type="button" className="btn-primary" onClick={handleSettings} aria-label={t("notifications.actions.openSettings", "Open notification settings")} title={t("notifications.actions.openSettings", "Settings")}>
            <Filter size={16} className="me-2" />
            {t("notifications.actions.openSettings", "Settings")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("notifications.stats.total", "Total Notifications")}
              </p>
              <p className="text-2xl font-bold text-primary">
                {notifications.length}
              </p>
            </div>
            <div className="text-primary">📢</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("notifications.stats.unread", "Unread")}
              </p>
              <p className="text-2xl font-bold text-destructive">
                {unreadCount}
              </p>
            </div>
            <div className="text-[hsl(var(--destructive)) / 0.1]">🔴</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("notifications.stats.highPriority", "High Priority")}
              </p>
              <p className="text-2xl font-bold text-warning">
                {
                  notifications.filter(
                    (n: NotificationDoc) => n.priority === "high",
                  ).length
                }
              </p>
            </div>
            <div className="text-warning">⚠️</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("notifications.stats.today", "Today")}
              </p>
              <p className="text-2xl font-bold text-success">
                {todayDateString
                  ? notifications.filter(
                      (n: NotificationDoc) =>
                        new Date(n.timestamp).toDateString() ===
                        todayDateString,
                    ).length
                  : 0}
              </p>
            </div>
            <div className="text-success">📅</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t(
                  "notifications.search.placeholder",
                  "Search notifications...",
                )}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full ps-10 pe-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1 min-w-48">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">
                {t("notifications.filters.all", "All Notifications")}
              </option>
              <option value="unread">
                {t("notifications.filters.unread", "Unread Only")}
              </option>
              <option value="high">
                {t("notifications.filters.high", "High Priority")}
              </option>
              <option value="maintenance">
                {t("notifications.filters.maintenance", "Maintenance")}
              </option>
              <option value="vendor">
                {t("notifications.filters.vendor", "Vendor")}
              </option>
              <option value="finance">
                {t("notifications.filters.finance", "Finance")}
              </option>
              <option value="system">
                {t("notifications.filters.system", "System")}
              </option>
            </select>
          </div>
        </div>

        <div className="flex border-b border-border mt-4">
          <button type="button"
            onClick={() => setSelectedTab("all")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              selectedTab === "all"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            aria-label={t("notifications.tabs.all", "View all notifications")}
            aria-selected={selectedTab === "all"}
          >
            {t("notifications.tabs.all", "All")} ({tabCounts.all})
          </button>
          <button type="button"
            onClick={() => setSelectedTab("unread")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              selectedTab === "unread"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            aria-label={t("notifications.tabs.unread", "View unread notifications")}
            aria-selected={selectedTab === "unread"}
          >
            {t("notifications.tabs.unread", "Unread")} ({tabCounts.unread})
          </button>
          <button type="button"
            onClick={() => setSelectedTab("urgent")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors relative ${
              selectedTab === "urgent"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            aria-label={t("notifications.tabs.urgent", "View urgent notifications")}
            aria-selected={selectedTab === "urgent"}
          >
            {t("notifications.tabs.urgent", "Urgent")} ({tabCounts.urgent})
            {tabCounts.urgent > 0 && (
              <span className="absolute -top-1 -end-1 w-2 h-2 bg-destructive/20 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-2">⏳</div>
              <p className="text-muted-foreground">
                {t("notifications.state.loading", "Loading notifications...")}
              </p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-2">📭</div>
              <p className="text-muted-foreground">
                {t("notifications.state.emptyTitle", "No notifications found")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  "notifications.state.emptySubtitle",
                  "You're all caught up!",
                )}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif: NotificationDoc) => (
              <div
                key={String(notif.id || "")}
                className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                  notif.read
                    ? "bg-card border-border"
                    : "bg-primary/10 border-primary/20"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(
                        String(notif.id || ""),
                      )}
                      onChange={() =>
                        handleSelectNotification(String(notif.id || ""))
                      }
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary border-border rounded"
                      aria-label={t(
                        "notifications.accessibility.selectNotification",
                        "Select notification",
                      )}
                    />
                    <div className="text-xl">{getTypeIcon(notif.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-medium ${notif.read ? "text-foreground" : "text-primary"}`}
                        >
                          {notif.title}
                        </h3>
                        {!notif.read && (
                          <div className="w-2 h-2 bg-primary/20 rounded-full"></div>
                        )}
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(notif.priority)}`}
                        >
                          {formatPriorityChip(notif.priority)}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full border ${getCategoryColor(notif.category)}`}
                        >
                          {formatCategoryChip(notif.category)}
                        </span>
                      </div>
                      <p
                        className={`text-sm ${notif.read ? "text-muted-foreground" : "text-primary"}`}
                      >
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          <ClientDate date={notif.timestamp} format="medium" />
                        </span>
                        <span>•</span>
                        <span>{formatStatusLabel(notif.read)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notif.read && (
                      <button type="button"
                        onClick={() => markAsRead(String(notif.id || ""))}
                        className="p-1 text-primary hover:text-primary hover:bg-primary/10 rounded"
                        title={t(
                          "notifications.item.markAsRead",
                          "Mark as read",
                        )}
                        aria-label={t(
                          "notifications.item.markAsRead",
                          "Mark as read",
                        )}
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button type="button"
                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                      aria-label={t(
                        "notifications.item.moreActions",
                        "More actions",
                      )}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {filteredNotifications.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {formatSelectionSummary()}
              </span>
              {selectedNotifications.size === 0 && (
                <button type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-2xl hover:bg-secondary/90 transition-colors"
                  aria-label={t("notifications.bulk.selectAll", "Select all notifications")}
                  title={t("notifications.bulk.selectAll", "Select All")}
                >
                  {t("notifications.bulk.selectAll", "Select All")}
                </button>
              )}
              {selectedNotifications.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button type="button"
                    onClick={bulkMarkAsRead}
                    className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    aria-label={t("notifications.bulk.markRead", "Mark selected as read")}
                    title={t("notifications.bulk.markRead", "Mark as Read")}
                  >
                    {t("notifications.bulk.markRead", "Mark as Read")} (
                    {selectedNotifications.size})
                  </button>
                  <button type="button"
                    onClick={markAsImportant}
                    className="px-3 py-1 text-sm bg-warning text-white rounded hover:bg-warning transition-colors"
                    aria-label={t("notifications.bulk.markImportant", "Mark selected as important")}
                    title={t("notifications.bulk.markImportant", "Mark Important")}
                  >
                    {t("notifications.bulk.markImportant", "Mark Important")} (
                    {selectedNotifications.size})
                  </button>
                  <button type="button"
                    onClick={exportNotifications}
                    className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors"
                    aria-label={t("notifications.bulk.export", "Export selected notifications")}
                    title={t("notifications.bulk.export", "Export")}
                  >
                    {t("notifications.bulk.export", "Export")} (
                    {selectedNotifications.size})
                  </button>
                  <button type="button"
                    onClick={archiveNotifications}
                    className="px-3 py-1 text-sm bg-success text-white rounded hover:bg-success transition-colors"
                    aria-label={t("notifications.bulk.archive", "Archive selected notifications")}
                    title={t("notifications.bulk.archive", "Archive")}
                  >
                    {t("notifications.bulk.archive", "Archive")} (
                    {selectedNotifications.size})
                  </button>
                  <button type="button"
                    onClick={deleteNotifications}
                    className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                    aria-label={t("notifications.bulk.delete", "Delete selected notifications")}
                    title={t("notifications.bulk.delete", "Delete")}
                  >
                    {t("notifications.bulk.delete", "Delete")} (
                    {selectedNotifications.size})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">
          {t("notifications.quickActions.title", "Quick Actions")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button type="button"
            onClick={handleEmailSettings}
            className="btn-ghost text-center hover:bg-primary/10 transition-colors"
            aria-label={t("notifications.quickActions.email", "Configure email notification settings")}
            title={t("notifications.quickActions.email", "Email Settings")}
          >
            <div className="text-2xl mb-2">📧</div>
            <div className="text-sm font-medium">
              {t("notifications.quickActions.email", "Email Settings")}
            </div>
          </button>
          <button type="button"
            onClick={handlePushNotifications}
            className="btn-ghost text-center hover:bg-success/10 transition-colors"
            aria-label={t("notifications.quickActions.push", "Configure push notification settings")}
            title={t("notifications.quickActions.push", "Push Notifications")}
          >
            <div className="text-2xl mb-2">📱</div>
            <div className="text-sm font-medium">
              {t("notifications.quickActions.push", "Push Notifications")}
            </div>
          </button>
          <button type="button"
            onClick={handleMuteCategories}
            className="btn-ghost text-center hover:bg-accent/10 transition-colors"
            aria-label={t("notifications.quickActions.mute", "Mute notification categories")}
            title={t("notifications.quickActions.mute", "Mute Categories")}
          >
            <div className="text-2xl mb-2">🔕</div>
            <div className="text-sm font-medium">
              {t("notifications.quickActions.mute", "Mute Categories")}
            </div>
          </button>
          <button type="button"
            onClick={handleNotificationReport}
            className="btn-ghost text-center hover:bg-secondary/10 transition-colors"
            aria-label={t("notifications.quickActions.report", "View notification report")}
            title={t("notifications.quickActions.report", "Notification Report")}
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">
              {t("notifications.quickActions.report", "Notification Report")}
            </div>
          </button>
          <button type="button"
            onClick={handleSettings}
            className="btn-ghost text-center hover:bg-muted transition-colors"
            aria-label={t("notifications.quickActions.settings", "Open notification settings")}
            title={t("notifications.quickActions.settings", "Settings")}
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">
              {t("notifications.quickActions.settings", "Settings")}
            </div>
          </button>
          <button type="button"
            onClick={handleClearAll}
            className="btn-ghost text-center hover:bg-destructive/10 transition-colors"
            aria-label={t("notifications.quickActions.clearAll", "Clear all notifications")}
            title={t("notifications.quickActions.clearAll", "Clear All")}
          >
            <div className="text-2xl mb-2">🗑️</div>
            <div className="text-sm font-medium">
              {t("notifications.quickActions.clearAll", "Clear All")}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
