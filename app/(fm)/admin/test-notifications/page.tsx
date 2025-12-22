"use client";

/**
 * Notification Test Page
 * SUPER_ADMIN only - Test SMS and WhatsApp notifications
 *
 * Features:
 * - Send test SMS via Taqnyat
 * - Send test WhatsApp via Meta Business API
 * - View delivery status
 * - Check configuration status
 *
 * @version 1.0.0
 * @date 2024-12-04
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  MessageSquare,
  Phone,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Settings,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/TranslationContext";

interface ConfigStatus {
  sms: {
    configured: boolean;
    accountSid?: string;
    phoneNumber?: string;
  };
  whatsapp: {
    configured: boolean;
    phoneNumber?: string;
  };
  email: {
    configured: boolean;
    provider?: string;
  };
}

interface TestResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export default function NotificationTestPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session, status } = useSession();

  // Form state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState(
    "This is a test notification from Fixzit. If you received this, your notification system is working correctly!",
  );
  const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");

  // Status state
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  // Auth check
  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/login?callbackUrl=/admin/test-notifications");
      return;
    }

    if (session.user.role !== "SUPER_ADMIN") {
      toast.error(t("admin.accessDenied", "Access Denied: SUPER_ADMIN only"));
      router.push("/dashboard");
    }
  }, [session, status, router, t]);

  // Load configuration status
  useEffect(() => {
    if (session?.user?.role !== "SUPER_ADMIN") return;

    const loadConfig = async () => {
      try {
        const response = await fetch("/api/admin/notifications/config");
        if (response.ok) {
          const data = await response.json();
          setConfigStatus(data);
        }
      } catch {
        // Config loading failed - silently continue, user will see empty config
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadConfig();
  }, [session]);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      toast.error(t("admin.notifications.phoneRequired", "Phone number is required"));
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/admin/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          to: phoneNumber,
          message,
        }),
      });

      const data = await response.json();

      const result: TestResult = {
        success: response.ok,
        messageId: data.messageId,
        error: data.error,
        timestamp: new Date(),
      };

      setTestResults((prev) => [result, ...prev].slice(0, 10));

      if (response.ok) {
        toast.success(
          t("admin.notifications.sent", "Test message sent successfully!"),
        );
      } else {
        toast.error(data.error || t("admin.notifications.failed", "Failed to send"));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setTestResults((prev) =>
        [
          { success: false, error: errorMsg, timestamp: new Date() },
          ...prev,
        ].slice(0, 10),
      );
      toast.error(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  if (status === "loading" || session?.user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          {t("admin.notifications.testTitle", "Notification Testing")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t(
            "admin.notifications.testSubtitle",
            "Test SMS and WhatsApp notifications to verify your configuration",
          )}
        </p>
      </div>

      {/* Configuration Status */}
      <div className="bg-card rounded-xl border p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("admin.notifications.configStatus", "Configuration Status")}
          </h2>
          <button type="button"
            onClick={() => window.location.reload()}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            {t("common.refresh", "Refresh")}
          </button>
        </div>

        {isLoadingConfig ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("common.loading", "Loading...")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SMS Status */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-5 w-5" />
                <span className="font-medium">SMS (Taqnyat)</span>
              </div>
              {configStatus?.sms?.configured ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {t("admin.notifications.configured", "Configured")}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {t("admin.notifications.notConfigured", "Not Configured")}
                  </span>
                </div>
              )}
              {configStatus?.sms?.phoneNumber && (
                <p className="text-xs text-muted-foreground mt-1">
                  From: {configStatus.sms.phoneNumber}
                </p>
              )}
            </div>

            {/* WhatsApp Status */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-5 w-5" />
                <span className="font-medium">WhatsApp</span>
              </div>
              {configStatus?.whatsapp?.configured ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {t("admin.notifications.configured", "Configured")}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {t("admin.notifications.notConfigured", "Not Configured")}
                  </span>
                </div>
              )}
              {configStatus?.whatsapp?.phoneNumber && (
                <p className="text-xs text-muted-foreground mt-1">
                  From: {configStatus.whatsapp.phoneNumber}
                </p>
              )}
            </div>

            {/* Email Status */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Email</span>
              </div>
              {configStatus?.email?.configured ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {configStatus.email.provider || "Configured"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {t("admin.notifications.notConfigured", "Not Configured")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Test Form */}
      <div className="bg-card rounded-xl border p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">
          {t("admin.notifications.sendTest", "Send Test Message")}
        </h2>

        <form onSubmit={handleSendTest} className="space-y-4">
          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("admin.notifications.channel", "Channel")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="channel"
                  value="sms"
                  checked={channel === "sms"}
                  onChange={() => setChannel("sms")}
                  className="w-4 h-4 text-primary"
                />
                <Phone className="h-4 w-4" />
                <span>{t("admin.notifications.sms", "SMS")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="channel"
                  value="whatsapp"
                  checked={channel === "whatsapp"}
                  onChange={() => setChannel("whatsapp")}
                  className="w-4 h-4 text-primary"
                />
                <MessageSquare className="h-4 w-4" />
                <span>{t("admin.notifications.whatsapp", "WhatsApp")}</span>
              </label>
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("admin.notifications.phoneNumber", "Phone Number")}
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+966501234567"
              className="w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:border-primary"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                "admin.notifications.phoneHint",
                "Enter phone in E.164 format (e.g., +966501234567)",
              )}
            </p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("admin.notifications.message", "Message")}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length}/1600{" "}
              {t("admin.notifications.characters", "characters")}
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSending || !phoneNumber.trim()}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            {isSending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("admin.notifications.sending", "Sending...")}
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                {t("admin.notifications.sendButton", "Send Test Message")}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-card rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">
            {t("admin.notifications.results", "Test Results")}
          </h2>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success
                    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                    : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span
                      className={
                        result.success ? "text-green-700" : "text-red-700"
                      }
                    >
                      {result.success
                        ? t("admin.notifications.success", "Success")
                        : t("admin.notifications.failure", "Failed")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                {result.messageId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Message ID: {result.messageId}
                  </p>
                )}
                {result.error && (
                  <p className="text-sm text-red-600 mt-1">{result.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 p-6 bg-muted/30 rounded-xl border border-dashed">
        <h3 className="font-semibold mb-2">
          {t("admin.notifications.helpTitle", "Configuration Help")}
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>
            • SMS (Taqnyat) requires:{" "}
            <code className="bg-muted px-1 rounded">TAQNYAT_BEARER_TOKEN</code>,{" "}
            <code className="bg-muted px-1 rounded">TAQNYAT_SENDER_NAME</code>
          </li>
          <li>
            • WhatsApp requires:{" "}
            <code className="bg-muted px-1 rounded">WHATSAPP_BUSINESS_API_KEY</code>{" "}
            and{" "}
            <code className="bg-muted px-1 rounded">WHATSAPP_PHONE_NUMBER_ID</code>
          </li>
          <li>
            • For WhatsApp sandbox, ensure recipients are allowed in your WhatsApp Business setup
          </li>
        </ul>
      </div>
    </div>
  );
}
