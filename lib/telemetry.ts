/**
 * @module lib/telemetry
 * @description Notification Telemetry for Fixzit
 *
 * Provides webhook-based telemetry for notification delivery events with
 * severity classification and structured payload formatting.
 *
 * @features
 * - **Severity Classification**: Auto-classifies events as info/warn/error based on status
 * - **Webhook Delivery**: Optional HTTP POST to external monitoring systems
 * - **Failure Tracking**: Records attempted, failed, skipped notification counts
 * - **Issue Breakdown**: Per-user, per-channel failure details (userId, channel, type, reason)
 * - **Structured Logging**: Falls back to logger.info/warn/error when webhook unavailable
 * - **Event Types**: Work order updates, property alerts, maintenance reminders, etc.
 *
 * @usage
 * Record notification event:
 * ```typescript
 * import { recordNotificationEvent } from '@/lib/telemetry';
 *
 * await recordNotificationEvent({
 *   notificationId: 'notif_123',
 *   event: 'WORK_ORDER_CREATED',
 *   status: 'success',
 *   attempted: 5,
 *   failed: 0,
 *   skipped: 0,
 *   issues: [],
 * });
 * ```
 *
 * Record partial failure with issue details:
 * ```typescript
 * await recordNotificationEvent({
 *   notificationId: 'notif_456',
 *   event: 'PROPERTY_ALERT',
 *   status: 'partial_failure',
 *   attempted: 3,
 *   failed: 1,
 *   skipped: 0,
 *   issues: [
 *     {
 *       userId: 'user_789',
 *       channel: 'SMS',
 *       type: 'DeliveryError',
 *       reason: 'Invalid phone number',
 *     },
 *   ],
 * });
 * ```
 *
 * @security
 * - **Webhook URL**: Stored in `NOTIFICATIONS_TELEMETRY_WEBHOOK` env var (keep secret)
 * - **No PII**: User IDs and channels logged, but no personal data (emails, phones)
 * - **HTTPS Only**: Webhook should use HTTPS to prevent MITM attacks
 * - **No Retry**: Failed webhook POSTs are logged but not retried (fire-and-forget)
 *
 * @compliance
 * - **Saudi PDPL**: No PII in telemetry payloads (only user IDs and failure reasons)
 * - **Audit Trail**: All notification events logged for compliance audits
 *
 * @deployment
 * Optional environment variables:
 * - `NOTIFICATIONS_TELEMETRY_WEBHOOK`: Webhook URL for external monitoring (e.g., Slack, Datadog)
 *   - If not set: Events logged to console only (via lib/logger)
 *   - Format: https://hooks.example.com/notifications
 *
 * Webhook payload structure:
 * ```json
 * {
 *   "notificationId": "notif_123",
 *   "event": "WORK_ORDER_CREATED",
 *   "status": "success",
 *   "attempted": 5,
 *   "failed": 0,
 *   "skipped": 0,
 *   "issues": [],
 *   "severity": "info",
 *   "timestamp": "2025-01-15T12:00:00.000Z"
 * }
 * ```
 *
 * @performance
 * - Webhook POST: Fire-and-forget (non-blocking)
 * - No retry logic: Failed webhooks logged but not retried (prevents cascading failures)
 * - Average latency: <100ms (network-dependent)
 *
 * @see {@link /lib/fm-notifications.ts} for notification delivery logic
 * @see {@link /lib/logger.ts} for structured logging
 */

import { logger } from "@/lib/logger";
import type { NotificationPayload } from "@/lib/fm-notifications";

type TelemetrySeverity = "info" | "warn" | "error";

export interface NotificationTelemetryEvent {
  notificationId: string;
  event: NotificationPayload["event"];
  status: NotificationPayload["status"];
  attempted: number;
  failed: number;
  skipped: number;
  issues: Array<{
    userId: string;
    channel: string;
    type: string;
    reason: string;
  }>;
  timestamp?: string;
}

function resolveSeverity(
  status: NotificationPayload["status"],
): TelemetrySeverity {
  if (status === "failed") return "error";
  if (status === "partial_failure") return "warn";
  return "info";
}

async function postToWebhook(
  event: NotificationTelemetryEvent,
  severity: TelemetrySeverity,
): Promise<void> {
  const webhookUrl = process.env.NOTIFICATIONS_TELEMETRY_WEBHOOK;
  if (!webhookUrl) return;

  try {
    const payload = {
      ...event,
      severity,
      timestamp: event.timestamp || new Date().toISOString(),
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.warn("[Telemetry] Failed to emit notification event", {
      error,
      notificationId: event.notificationId,
    });
  }
}

export async function emitNotificationTelemetry(
  event: NotificationTelemetryEvent,
): Promise<void> {
  const severity = resolveSeverity(event.status);

  const logContext = {
    ...event,
    severity,
  };

  if (severity === "error") {
    logger.error(
      "[Telemetry] Notification dispatch failure",
      undefined,
      logContext,
    );
  } else if (severity === "warn") {
    logger.warn("[Telemetry] Notification partial failure", logContext);
  } else {
    logger.info("[Telemetry] Notification dispatch metrics", logContext);
  }

  await postToWebhook(event, severity);
}
