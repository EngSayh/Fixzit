import client, {
  type Counter,
  type CounterConfiguration,
  type Gauge,
  type GaugeConfiguration,
  type Histogram,
  type HistogramConfiguration,
} from "prom-client";
import type {
  NotificationPayload,
  NotificationChannel,
} from "@/lib/fm-notifications";
import type { BulkNotificationResult } from "@/lib/integrations/notifications";
import { metricsRegistry } from "@/lib/monitoring/metrics-registry";

type NotificationChannelLabel = NotificationChannel;

const CHANNELS: NotificationChannelLabel[] = [
  "push",
  "email",
  "sms",
  "whatsapp",
];

function getOrCreateCounter<T extends string>(
  config: CounterConfiguration<T>,
): Counter<T> {
  const existing = metricsRegistry.getSingleMetric(config.name) as
    | Counter<T>
    | undefined;
  if (existing) {
    return existing;
  }

  const counter = new client.Counter({
    ...config,
    registers: [metricsRegistry],
  });
  return counter;
}

function getOrCreateHistogram<T extends string>(
  config: HistogramConfiguration<T>,
): Histogram<T> {
  const existing = metricsRegistry.getSingleMetric(config.name) as
    | Histogram<T>
    | undefined;
  if (existing) {
    return existing;
  }

  const histogram = new client.Histogram({
    ...config,
    registers: [metricsRegistry],
  });
  return histogram;
}

function getOrCreateGauge<T extends string>(
  config: GaugeConfiguration<T>,
): Gauge<T> {
  const existing = metricsRegistry.getSingleMetric(config.name) as
    | Gauge<T>
    | undefined;
  if (existing) {
    return existing;
  }

  const gauge = new client.Gauge({
    ...config,
    registers: [metricsRegistry],
  });
  return gauge;
}

const notificationDispatchCounter = getOrCreateCounter({
  name: "fixzit_notifications_dispatched_total",
  help: "Total FM notifications dispatched by event, status, and priority",
  labelNames: ["event", "status", "priority"],
});

const notificationChannelCounter = getOrCreateCounter({
  name: "fixzit_notification_channel_attempts_total",
  help: "Notification channel attempts grouped by outcome",
  labelNames: ["event", "channel", "outcome"],
});

const notificationDurationHistogram = getOrCreateHistogram({
  name: "fixzit_notification_dispatch_duration_seconds",
  help: "Notification dispatch latency in seconds",
  labelNames: ["event"],
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 15, 30, 60],
});

const notificationIssueCounter = getOrCreateCounter({
  name: "fixzit_notification_issues_total",
  help: "Notification issues by channel and type",
  labelNames: ["channel", "type"],
});

const notificationDlqGauge = getOrCreateGauge({
  name: "fixzit_notification_dlq_backlog",
  help: "Pending notification DLQ entries per channel",
  labelNames: ["channel"],
});

interface RecordMetricsParams {
  notification: NotificationPayload;
  result: BulkNotificationResult;
  durationMs: number;
}

export function recordNotificationMetrics({
  notification,
  result,
  durationMs,
}: RecordMetricsParams): void {
  notificationDispatchCounter.inc({
    event: notification.event,
    status: notification.status,
    priority: notification.priority,
  });

  notificationDurationHistogram.observe(
    { event: notification.event },
    Math.max(durationMs, 0) / 1000,
  );

  Object.values(result.channelMetrics).forEach((metric) => {
    if (metric.succeeded > 0) {
      notificationChannelCounter.inc(
        {
          event: notification.event,
          channel: metric.channel,
          outcome: "succeeded",
        },
        metric.succeeded,
      );
    }
    if (metric.failed > 0) {
      notificationChannelCounter.inc(
        {
          event: notification.event,
          channel: metric.channel,
          outcome: "failed",
        },
        metric.failed,
      );
    }
    if (metric.skipped > 0) {
      notificationChannelCounter.inc(
        {
          event: notification.event,
          channel: metric.channel,
          outcome: "skipped",
        },
        metric.skipped,
      );
    }
  });

  result.issues.forEach((issue) => {
    notificationIssueCounter.inc({
      channel: issue.channel,
      type: issue.type,
    });
  });
}

export function setDeadLetterBacklog(
  counts: Partial<Record<NotificationChannelLabel, number>>,
): void {
  CHANNELS.forEach((channel) => {
    notificationDlqGauge.set({ channel }, counts[channel] ?? 0);
  });
}
