import { logger } from '@/lib/logger';
import type { NotificationPayload } from '@/lib/fm-notifications';

type TelemetrySeverity = 'info' | 'warn' | 'error';

export interface NotificationTelemetryEvent {
  notificationId: string;
  event: NotificationPayload['event'];
  status: NotificationPayload['status'];
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

function resolveSeverity(status: NotificationPayload['status']): TelemetrySeverity {
  if (status === 'failed') return 'error';
  if (status === 'partial_failure') return 'warn';
  return 'info';
}

async function postToWebhook(event: NotificationTelemetryEvent, severity: TelemetrySeverity): Promise<void> {
  const webhookUrl = process.env.NOTIFICATIONS_TELEMETRY_WEBHOOK;
  if (!webhookUrl) return;

  try {
    const payload = {
      ...event,
      severity,
      timestamp: event.timestamp || new Date().toISOString()
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.warn('[Telemetry] Failed to emit notification event', {
      error,
      notificationId: event.notificationId
    });
  }
}

export async function emitNotificationTelemetry(event: NotificationTelemetryEvent): Promise<void> {
  const severity = resolveSeverity(event.status);

  const logContext = {
    ...event,
    severity
  };

  if (severity === 'error') {
    logger.error('[Telemetry] Notification dispatch failure', undefined, logContext);
  } else if (severity === 'warn') {
    logger.warn('[Telemetry] Notification partial failure', logContext);
  } else {
    logger.info('[Telemetry] Notification dispatch metrics', logContext);
  }

  await postToWebhook(event, severity);
}
