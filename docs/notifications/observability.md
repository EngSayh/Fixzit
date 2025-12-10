# FM Notifications – Durability & Observability

This document captures the operational contract for the FM notification engine introduced in November 2025. It covers persistence, retention, DLQ handling, metrics, and alerting so SRE/Platform teams can plug the pipeline into Grafana/Prometheus or CloudWatch.

## Persistence & Retention

| Store             | Collection               | Purpose                                                                                          | Retention                                                                                                  |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Primary audit log | `NotificationLog`        | One document per notification (payload, recipients, channel results, metrics, telemetry issues). | `NOTIFICATION_LOG_TTL_DAYS` (default **90** days). TTL index is applied on `createdAt`.                    |
| Dead letter queue | `NotificationDeadLetter` | One document per failed channel attempt + recipient metadata.                                    | `NOTIFICATION_DLQ_TTL_DAYS` (default **30** days). TTL index ensures the backlog can never grow unbounded. |

> Both TTLs are configurable via `.env` / infra secret managers so compliance teams can tighten/relax retention per region.

## Durable Logging Flow

1. `sendNotification` now seeds an audit document before dispatch so every notification has traceability even if providers time out.
2. When dispatch completes, the document is updated with:
   - per-channel success/failure counters,
   - structured issues (`userId`, `channel`, `type`, `reason`, attempt number, timestamp),
   - timing metadata (`sentAt`, `failureReason`).
3. Failed channel attempts are inserted into the DLQ with recipient contact data so replay jobs can rehydrate the message.

## Dead Letter Operations

- **Monitoring:** `fixzit_notification_dlq_backlog{channel="<channel>"}` exposes the pending queue depth per transport (push/email/sms/whatsapp).
- **Replay strategy:** run `pnpm notifications:replay-dlq --channel email --limit 25` (script lives in `scripts/notifications/replay-dlq.ts`). The script:
  1. Queries `NotificationDeadLetter` for `status: 'pending'`.
  2. Replays channel-specific senders (SendGrid/Taqnyat/FCM/WhatsApp).
  3. Marks documents as `status: 'replayed'` (success) or leaves them pending with incremented attempt metadata.
  4. Updates `NotificationLog.channelResults` so audit records stay in sync.
- **Alerting guidance:**
  - Trigger PagerDuty/SNS when `fixzit_notification_dlq_backlog` > 25 per channel for >5 minutes.
  - Trigger warning dashboards when backlog increases steadily (use Grafana Rate/Delta panels).

## Prometheus Metrics

Metrics are registered under a shared registry (`lib/monitoring/metrics-registry.ts`) and are exposed via **`GET /api/metrics`** (Node runtime only).

| Metric                                          | Type      | Labels                        | Description                                                    |
| ----------------------------------------------- | --------- | ----------------------------- | -------------------------------------------------------------- |
| `fixzit_notifications_dispatched_total`         | Counter   | `event`, `status`, `priority` | Number of notifications finalized (sent, failed, partial).     |
| `fixzit_notification_channel_attempts_total`    | Counter   | `event`, `channel`, `outcome` | Per-channel successes/failures/skips.                          |
| `fixzit_notification_dispatch_duration_seconds` | Histogram | `event`                       | End-to-end dispatch latency buckets.                           |
| `fixzit_notification_issues_total`              | Counter   | `channel`, `type`             | Structured issue log (failed/skipped).                         |
| `fixzit_notification_dlq_backlog`               | Gauge     | `channel`                     | Pending DLQ entries (auto-refreshed after each failure batch). |

### Grafana/Alerting Playbook

1. **Dashboards**
   - Panel 1: Notification volume (`fixzit_notifications_dispatched_total` rate) split by event + status.
   - Panel 2: Latency histogram overlay vs. SLA (p50/p95 from PromQL quantiles).
   - Panel 3: Channel failure rates (failed / (failed + succeeded)).
   - Panel 4: DLQ backlog gauge with sparkline.
2. **Alerts**
   - **High latency:** `histogram_quantile(0.95, rate(fixzit_notification_dispatch_duration_seconds_bucket[5m])) > 15`.
   - **Channel outage:** `rate(fixzit_notification_channel_attempts_total{outcome="failed"}[5m]) > 0` AND success rate < 80% for same channel.
   - **DLQ backlog:** gauge > threshold for configurable duration.

## Integrations

- **Prometheus:** Scrape `/api/metrics` from the Next.js server or via the provided Docker compose stack (port 9090). A ready-to-use config lives in `deployment/prometheus.yml` and targets the `web:3000` service automatically.
- **CloudWatch/Datadog:** Use the same registry output if you proxy metrics via the statd or OpenMetrics sidecar.
- **Telemetry Webhook:** `NOTIFICATIONS_TELEMETRY_WEBHOOK` still receives JSON payloads for ops teams that prefer push-based monitoring (Datadog/PagerDuty Events API).

## Runbook Checklist

- [ ] Set `NOTIFICATION_LOG_TTL_DAYS` / `NOTIFICATION_DLQ_TTL_DAYS` in the environment (match org retention policy).
- [ ] Configure Grafana dashboard + alerts using the metrics listed above.
- [ ] Ensure SRE on-call has access to `/api/metrics` (network / auth rules).
- [ ] Schedule DLQ replay job or manual SOP (documented per tenant).

With these pieces in place the FM notification engine now has durable audit logs, recoverable DLQ workflows, and observable metrics for proactive alerting.
