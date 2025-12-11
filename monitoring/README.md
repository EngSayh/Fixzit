# Fixzit Monitoring Configuration

This directory contains Grafana dashboards and alert rules for monitoring the Fixzit application.

## Directory Structure

```
monitoring/
├── grafana/
│   ├── dashboards/
│   │   ├── fixzit-overview.json    # Application overview metrics
│   │   ├── fixzit-database.json    # MongoDB metrics
│   │   └── fixzit-payments.json    # Payment processing metrics
│   └── alerts/
│       └── fixzit-alerts.yaml      # Alert rules (Grafana Alerting format)
└── README.md
```

## Dashboards

### Fixzit Overview (`fixzit-overview.json`)

Main application dashboard showing:
- Health status
- Request rate & error rate
- Response time (p95, p99)
- Memory usage
- Active users
- Top endpoints

### Fixzit Database (`fixzit-database.json`)

MongoDB monitoring:
- Connection pool status
- Query latency by collection
- Operations by type (find, insert, update, delete)
- Document counts
- Index hit ratio
- Slow queries
- Replica set status

### Fixzit Payments (`fixzit-payments.json`)

TAP/PayTabs payment monitoring:
- Payment success rate
- Transaction volume
- Revenue by currency (OMR, SAR)
- Gateway latency
- Failure reasons
- Webhook processing
- Subscription renewals

## Alert Rules

Alerts are defined in `alerts/fixzit-alerts.yaml` following Grafana Alerting format.

### Availability Alerts

| Alert | Threshold | Severity |
|-------|-----------|----------|
| Health Check Failed | down for 2m | 🔴 Critical |
| High Error Rate | >5% for 2m | 🔴 Critical |
| Elevated Error Rate | >2% for 5m | 🟡 Warning |

### Performance Alerts

| Alert | Threshold | Severity |
|-------|-----------|----------|
| High Latency (p95) | >1.5s for 5m | 🟡 Warning |
| Critical Latency (p99) | >2.5s for 2m | 🔴 Critical |

### Resource Alerts

| Alert | Threshold | Severity |
|-------|-----------|----------|
| High Memory Usage | >85% for 10m | 🟡 Warning |
| Potential Memory Leak | +128MB heap/hour | 🟡 Warning |

### Payment Alerts

| Alert | Threshold | Severity |
|-------|-----------|----------|
| Payment Failure Rate | >3% for 5m | 🔴 Critical |
| Consecutive Failures | 10+ failures | 🔴 Critical |

### Database Alerts

| Alert | Threshold | Severity |
|-------|-----------|----------|
| MongoDB Connection Failure | Any failure | 🔴 Critical |
| High Slow Query Count | >50 in 5m | 🟡 Warning |

### Queue Alerts

| Alert | Threshold | Severity |
|-------|-----------|----------|
| High Queue Depth | >1000 jobs for 10m | 🟡 Warning |

## Installation

### Option 1: Import via UI

1. Open Grafana → Dashboards → Import
2. Upload JSON file or paste contents
3. Select Prometheus datasource
4. Click Import

### Option 2: Provisioning (Recommended for Production)

Add to your Grafana provisioning configuration:

```yaml
# /etc/grafana/provisioning/dashboards/fixzit.yaml
apiVersion: 1

providers:
  - name: Fixzit
    orgId: 1
    folder: Fixzit
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /var/lib/grafana/dashboards/fixzit
```

Copy dashboard files to `/var/lib/grafana/dashboards/fixzit/`.

### Alert Rules Provisioning

```yaml
# /etc/grafana/provisioning/alerting/fixzit.yaml
# Copy contents of alerts/fixzit-alerts.yaml
```

## Required Metrics

These dashboards expect the following Prometheus metrics:

### HTTP Metrics
- `http_requests_total{status, route}` - Counter
- `http_request_duration_seconds_bucket{le, route}` - Histogram

### Node.js Metrics
- `process_resident_memory_bytes` - Gauge
- `nodejs_heap_size_used_bytes` - Gauge

### MongoDB Metrics
- `mongodb_connections_current` - Gauge
- `mongodb_query_duration_seconds_bucket` - Histogram
- `mongodb_operations_total{operation}` - Counter
- `mongodb_slow_queries_total` - Counter

### Payment Metrics
- `payment_transactions_total{status}` - Counter
- `payment_amount_total{currency, status}` - Counter
- `payment_gateway_duration_seconds_bucket{gateway}` - Histogram
- `payment_failures_total{reason}` - Counter
- `webhook_processed_total{provider}` - Counter

## Customization

1. Modify JSON files as needed
2. Update alert thresholds in `fixzit-alerts.yaml`
3. Reimport or restart Grafana to apply changes

## Integration with Datadog

These metrics can also be sent to Datadog using the OpenTelemetry Collector with Datadog exporter. See `lib/tracing.ts` for OTLP configuration.

```yaml
# otel-collector-config.yaml
exporters:
  datadog:
    api:
      key: ${DD_API_KEY}
      site: datadoghq.com
```

## Related Documentation

- [RUNBOOK.md](../docs/operations/RUNBOOK.md) - Alert response procedures
- [lib/monitoring/memory-leak-detector.ts](../lib/monitoring/memory-leak-detector.ts) - Heap monitoring
- [lib/tracing.ts](../lib/tracing.ts) - OpenTelemetry integration
