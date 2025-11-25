/**
 * Admin Notifications Tab Component
 * Allows super admins to broadcast notifications via Email, SMS, WhatsApp
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Mail,
  MessageSquare,
  Phone,
  Users,
  Building2,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  History,
} from "lucide-react";
import { logger } from "@/lib/logger";
import ClientDate from "@/components/ClientDate";

interface NotificationHistory {
  _id: string;
  senderId: string;
  senderEmail: string;
  recipients: {
    type: string;
    count: number;
  };
  channels: string[];
  subject: string;
  message: string;
  priority: string;
  sentAt: string;
  results: {
    email: { sent: number; failed: number };
    sms: { sent: number; failed: number };
    whatsapp: { sent: number; failed: number };
  };
  status: string;
}

export default function AdminNotificationsTab({
  t,
}: {
  t: (_key: string, _defaultText?: string) => string;
}) {
  const [recipientType, setRecipientType] = useState<
    "users" | "tenants" | "corporate" | "all"
  >("users");
  const [channels, setChannels] = useState<Set<"email" | "sms" | "whatsapp">>(
    new Set(["email"]),
  );
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<
    "low" | "normal" | "high" | "urgent"
  >("normal");
  const [isSending, setIsSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const toggleChannel = (channel: "email" | "sms" | "whatsapp") => {
    const newChannels = new Set(channels);
    if (newChannels.has(channel)) {
      newChannels.delete(channel);
    } else {
      newChannels.add(channel);
    }
    setChannels(newChannels);
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch("/api/admin/notifications/history?limit=20");
      const data = await response.json();

      if (data.success) {
        const normalized = (data.data || []).map(
          (item: NotificationHistory & { id?: string }, index: number) => ({
            ...item,
            _id: item._id || item.id || `${item.senderId}-${index}`,
          }),
        );
        setHistory(normalized);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      logger.error("[Admin Notifications] Failed to fetch history", { error });
      setNotification({
        type: "error",
        message: t(
          "admin.notifications.errors.historyFetch",
          "Failed to load notification history",
        ),
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory]);

  const handleSend = async () => {
    // Validation
    if (channels.size === 0) {
      setNotification({
        type: "error",
        message: t(
          "admin.notifications.errors.noChannels",
          "Please select at least one channel",
        ),
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      setNotification({
        type: "error",
        message: t(
          "admin.notifications.errors.emptyFields",
          "Subject and message are required",
        ),
      });
      return;
    }

    setIsSending(true);
    setNotification(null);

    try {
      const response = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: {
            type: recipientType,
            ids: [], // Empty for "all" in selected type
          },
          channels: Array.from(channels),
          subject,
          message,
          priority,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNotification({
          type: "success",
          message: t(
            "admin.notifications.success",
            "Notification sent successfully",
          ),
        });

        // Reset form
        setSubject("");
        setMessage("");
        setChannels(new Set(["email"]));

        // Refresh history
        if (showHistory) {
          fetchHistory();
        }

        logger.info("[Admin Notifications] Broadcast sent", {
          results: data.results,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      logger.error("[Admin Notifications] Send failed", { error });
      setNotification({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : t(
                "admin.notifications.errors.sendFailed",
                "Failed to send notification",
              ),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t("admin.notifications.title", "Send Notification")}
          </h2>
          <p className="text-gray-600 mt-1">
            {t(
              "admin.notifications.subtitle",
              "Broadcast messages via Email, SMS, or WhatsApp",
            )}
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <History size={20} />
          {showHistory
            ? t("admin.notifications.hideHistory", "Hide History")
            : t("admin.notifications.showHistory", "Show History")}
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            notification.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ms-auto">
            ×
          </button>
        </div>
      )}

      {!showHistory ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recipient Type */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">
                {t("admin.notifications.recipientType", "Recipient Type")}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    value: "users",
                    label: t("admin.notifications.recipients.users", "Users"),
                    icon: Users,
                  },
                  {
                    value: "tenants",
                    label: t(
                      "admin.notifications.recipients.tenants",
                      "Tenants",
                    ),
                    icon: Building2,
                  },
                  {
                    value: "corporate",
                    label: t(
                      "admin.notifications.recipients.corporate",
                      "Corporate",
                    ),
                    icon: Globe,
                  },
                  {
                    value: "all",
                    label: t("admin.notifications.recipients.all", "All"),
                    icon: Globe,
                  },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() =>
                      setRecipientType(value as typeof recipientType)
                    }
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      recipientType === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon size={24} />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Channels */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">
                {t("admin.notifications.channels", "Delivery Channels")}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    value: "email",
                    label: "Email",
                    icon: Mail,
                    available: true,
                  },
                  {
                    value: "sms",
                    label: "SMS",
                    icon: MessageSquare,
                    available: true,
                  },
                  {
                    value: "whatsapp",
                    label: "WhatsApp",
                    icon: Phone,
                    available: false,
                  },
                ].map(({ value, label, icon: Icon, available }) => (
                  <button
                    key={value}
                    onClick={() =>
                      available &&
                      toggleChannel(value as "email" | "sms" | "whatsapp")
                    }
                    disabled={!available}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      channels.has(value as "email" | "sms" | "whatsapp")
                        ? "border-primary bg-primary/10 text-primary"
                        : available
                          ? "border-gray-200 hover:border-gray-300"
                          : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <Icon size={24} />
                    <span className="text-sm font-medium">{label}</span>
                    {!available && (
                      <span className="text-xs text-gray-400">
                        {t("admin.notifications.comingSoon", "Coming Soon")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Content */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h3 className="text-lg font-semibold">
                {t("admin.notifications.message", "Message Content")}
              </h3>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("admin.notifications.priority", "Priority")}
                </label>
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as typeof priority)
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="low">
                    {t("admin.notifications.priority.low", "Low")}
                  </option>
                  <option value="normal">
                    {t("admin.notifications.priority.normal", "Normal")}
                  </option>
                  <option value="high">
                    {t("admin.notifications.priority.high", "High")}
                  </option>
                  <option value="urgent">
                    {t("admin.notifications.priority.urgent", "Urgent")}
                  </option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("admin.notifications.subject", "Subject")}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t(
                    "admin.notifications.subjectPlaceholder",
                    "Enter notification subject...",
                  )}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("admin.notifications.messageBody", "Message")}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t(
                    "admin.notifications.messagePlaceholder",
                    "Enter your message here...",
                  )}
                  rows={8}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {message.length}{" "}
                  {t("admin.notifications.characters", "characters")}
                  {channels.has("sms") && message.length > 160 && (
                    <span className="text-amber-600 ms-2">
                      ({Math.ceil(message.length / 160)} SMS segments)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Preview & Stats */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">
                {t("admin.notifications.preview", "Preview")}
              </h3>
              <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
                <div className="text-sm text-gray-500">
                  {t("admin.notifications.to", "To")}:{" "}
                  <span className="font-medium text-gray-700">
                    {recipientType}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {t("admin.notifications.via", "Via")}:{" "}
                  <span className="font-medium text-gray-700">
                    {Array.from(channels).join(", ") ||
                      t("admin.notifications.none", "None")}
                  </span>
                </div>
                <hr className="my-2" />
                <div className="font-semibold text-gray-900">
                  {subject ||
                    t("admin.notifications.noSubject", "[No Subject]")}
                </div>
                <div className="text-sm text-gray-600 whitespace-pre-wrap">
                  {message ||
                    t("admin.notifications.noMessage", "[No Message]")}
                </div>
              </div>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={
                isSending ||
                channels.size === 0 ||
                !subject.trim() ||
                !message.trim()
              }
              className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isSending ? (
                <>
                  <Clock size={20} className="animate-spin" />
                  {t("admin.notifications.sending", "Sending...")}
                </>
              ) : (
                <>
                  <Send size={20} />
                  {t("admin.notifications.send", "Send Notification")}
                </>
              )}
            </button>

            {/* Info */}
            <div className="bg-primary/5 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-primary-dark mb-2 flex items-center gap-2">
                <AlertCircle size={18} />
                {t("admin.notifications.important", "Important")}
              </h4>
              <ul className="text-sm text-primary-dark space-y-1 list-disc list-inside">
                <li>
                  {t(
                    "admin.notifications.info.1",
                    "All notifications are logged for audit",
                  )}
                </li>
                <li>
                  {t(
                    "admin.notifications.info.2",
                    "Email requires SENDGRID_API_KEY",
                  )}
                </li>
                <li>
                  {t(
                    "admin.notifications.info.3",
                    "SMS requires TWILIO credentials",
                  )}
                </li>
                <li>
                  {t("admin.notifications.info.4", "WhatsApp coming soon")}
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        // History View
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t("admin.notifications.historyTitle", "Notification History")}
            </h3>
            {isLoadingHistory ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {t(
                  "admin.notifications.noHistory",
                  "No notifications sent yet",
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div
                    key={item._id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{item.subject}</h4>
                        <p className="text-sm text-gray-500">
                          {t("admin.notifications.sentBy", "Sent by")}{" "}
                          {item.senderEmail} ·{" "}
                          <ClientDate
                            date={item.sentAt}
                            format="medium"
                            className="inline"
                            placeholder="--"
                          />
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          item.priority === "urgent"
                            ? "bg-red-100 text-red-800"
                            : item.priority === "high"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Users size={16} className="text-gray-400" />
                        {item.recipients.count} {item.recipients.type}
                      </span>
                      {item.results.email.sent > 0 && (
                        <span className="flex items-center gap-1 text-success">
                          <Mail size={16} />
                          {item.results.email.sent} <CheckCircle size={14} />
                          {item.results.email.failed > 0 && (
                            <>
                              <XCircle size={14} className="text-destructive" />{" "}
                              {item.results.email.failed}
                            </>
                          )}
                        </span>
                      )}
                      {item.results.sms.sent > 0 && (
                        <span className="flex items-center gap-1 text-success">
                          <MessageSquare size={16} />
                          {item.results.sms.sent} <CheckCircle size={14} />
                          {item.results.sms.failed > 0 && (
                            <>
                              <XCircle size={14} className="text-destructive" />{" "}
                              {item.results.sms.failed}
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
